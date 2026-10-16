import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Presets, usePatternComposer } from "react-native-pulsar";
import type { Pattern } from "@buzzzz/core";
import { usePhoneRelay } from "../features/connection/usePhoneRelay";
import { dark, light } from "../theme/colors";
import { styles } from "./styles";
import { RivePlayer } from "../features/playback/RivePlayer";
import { EventToast } from "../components/EventToast";
import { PressableScale } from "../components/PressableScale";
import { Step } from "../components/Step";
import { TriggerChip } from "../components/TriggerChip";
export default function App() {
  const t = useColorScheme() === "dark" ? dark : light;
  const s = useMemo(() => styles(t), [t]);

  const [riv, setRiv] = useState<{ url: string; stateMachine?: string } | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [mappedNames, setMappedNames] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [event, setEvent] = useState<{ id: number; text: string } | null>(null);
  const map = useRef<Record<string, Pattern>>({});
  const fireRef = useRef<(name: string) => void>(() => {});
  const pauseRef = useRef<(paused: boolean) => void>(() => {});
  const [lastFired, setLastFired] = useState<{ name: string; id: number } | null>(null);
  const composer = usePatternComposer();

  const play = (p: Pattern) => {
    composer.stop();
    composer.parse(p);
    composer.play();
  };
  const announce = (text: string) => setEvent({ id: Date.now(), text });

  const setMap = (value: Record<string, Pattern>) => {
    map.current = value;
    setMappedNames(Object.keys(value));
  };
  const relay = usePhoneRelay((message, base) => {
    if (message.type === "load") {
      setMap(message.map);
      const next = { url: base + message.riv, stateMachine: message.stateMachine };
      if (riv?.url !== next.url || riv.stateMachine !== next.stateMachine) {
        setPaused(false);
        setTriggers([]);
        setRiv(next);
      }
    } else if (message.type === "map") setMap(message.map);
    else if (message.type === "play") {
      play(message.pattern);
      announce("Pattern from studio");
    } else if (message.type === "stop") composer.stop();
    else if (message.type === "fire") fireRef.current(message.name);
    else if (message.type === "restart") {
      setPaused(false);
      setRun((value) => value + 1);
    } else if (message.type === "pause") {
      pauseRef.current(message.paused);
      setPaused(message.paused);
    }
  });
  const { input, setInput, status, connect, send } = relay;
  const disconnect = () => {
    relay.disconnect();
    composer.stop();
    setRiv(null);
    setMap({});
    setTriggers([]);
    setPaused(false);
    setLastFired(null);
  };

  const onTrigger = (name: string) => {
    const p = Object.hasOwn(map.current, name) ? map.current[name] : undefined;
    if (p) play(p);
    setLastFired({ name, id: Date.now() });
    announce(p ? `▸ ${name}` : `▸ ${name} · no haptic mapped`);
    send({ type: "fired", name });
  };

  const host = input.replace(/^wss?:\/\//, "").replace(/\/relay$/, "");

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style={t === dark ? "light" : "dark"} />

      <View style={s.header}>
        <View style={s.mark}>
          <Text style={s.markText}>⚡︎</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Haptics Preview</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {status === "connected"
              ? `Studio · ${host}`
              : status === "connecting"
                ? "Connecting…"
                : "Not connected"}
          </Text>
        </View>
        <View style={[s.pill, status === "connected" && s.pillOn]}>
          <View
            style={[
              s.dot,
              {
                backgroundColor:
                  status === "connected" ? t.ok : status === "error" ? t.err : t.muted,
              },
            ]}
          />
          <Text style={s.pillText}>
            {status === "connected" ? "Live" : status === "connecting" ? "…" : "Off"}
          </Text>
        </View>
      </View>

      {status === "idle" || status === "error" ? (
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.h1}>Connect to Studio</Text>
          <Text style={s.lead}>
            Feel your Rive animations and haptic patterns on this phone while you edit them on your
            Mac.
          </Text>
          <View style={s.card}>
            <Step n={1} t={t} text="Put this phone on the same Wi-Fi as your Mac" />
            <Step n={2} t={t} text="Scan the QR in the studio’s Phone card with the Camera app" />
            <Step n={3} t={t} text="Or paste the relay URL below" />
          </View>
          <TextInput
            accessibilityLabel="Relay address"
            style={[s.input, status === "error" && { borderColor: t.err }]}
            value={input}
            onChangeText={setInput}
            placeholder="ws://192.168.x.x:5173/relay"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={() => input && connect(input.trim())}
          />
          {status === "error" && (
            <Text style={s.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
              Couldn’t reach the studio. Check the URL and that both devices are on the same Wi-Fi.
            </Text>
          )}
          <PressableScale
            style={[s.button, !input && { opacity: 0.5 }]}
            disabled={!input}
            onPress={() => connect(input.trim())}
          >
            <Text style={s.buttonText}>Connect</Text>
          </PressableScale>
        </ScrollView>
      ) : status === "connecting" && !riv ? (
        <View style={s.center}>
          <ActivityIndicator color={t.accent} />
          <Text style={s.muted}>Connecting to {host}</Text>
          <PressableScale style={s.ghost} onPress={disconnect}>
            <Text style={s.ghostText}>Cancel</Text>
          </PressableScale>
        </View>
      ) : riv ? (
        <View style={s.stageWrap}>
          <View style={s.stage}>
            <RivePlayer
              key={riv.url + riv.stateMachine}
              {...riv}
              run={run}
              t={t}
              onTrigger={onTrigger}
              onTriggers={setTriggers}
              fireRef={fireRef}
              pauseRef={pauseRef}
            />
          </View>

          <View style={s.transport}>
            <PressableScale
              style={[s.button, { flex: 1 }]}
              onPress={() => {
                Presets.System.selection();
                setPaused(false);
                setRun((n) => n + 1);
              }}
            >
              <Text style={s.buttonText}>▶ Replay with haptics</Text>
            </PressableScale>
            <PressableScale
              style={s.secondary}
              onPress={() => {
                Presets.System.selection();
                pauseRef.current(!paused);
                setPaused(!paused);
              }}
            >
              <Text style={s.secondaryText}>{paused ? "Resume" : "Pause"}</Text>
            </PressableScale>
          </View>

          {triggers.length > 0 && (
            <>
              <Text style={s.section}>Triggers · tap to fire</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chips}
              >
                {triggers.map((name) => (
                  <TriggerChip
                    key={name}
                    name={name}
                    mapped={mappedNames.includes(name)}
                    t={t}
                    firedAt={lastFired?.name === name ? lastFired.id : 0}
                    onPress={() => fireRef.current(name)}
                  />
                ))}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        <View style={s.center}>
          <Text style={s.h2}>Connected</Text>
          <Text style={[s.muted, { textAlign: "center" }]}>
            Drop a .riv into the studio, or press Play there to feel the current pattern.
          </Text>
          <PressableScale style={s.ghost} onPress={disconnect}>
            <Text style={s.ghostText}>Disconnect</Text>
          </PressableScale>
        </View>
      )}

      {riv && status !== "idle" && (
        <Pressable onPress={disconnect} hitSlop={8} style={s.footerLink}>
          <Text style={s.ghostText}>Disconnect</Text>
        </Pressable>
      )}

      <EventToast event={event} t={t} />
    </SafeAreaView>
  );
}
