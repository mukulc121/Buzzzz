import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Presets, usePatternComposer, type Pattern } from 'react-native-pulsar';
import { Fit, RiveView, useRive, useRiveFile, useViewModelInstance, type RiveFile } from '@rive-app/react-native';

// Mirror of studio/src/types.ts `Msg`.
type Msg =
  | { type: 'load'; riv: string; stateMachine?: string; map: Record<string, Pattern> }
  | { type: 'map'; map: Record<string, Pattern> }
  | { type: 'play'; pattern: Pattern }
  | { type: 'fire'; name: string }
  | { type: 'restart' }
  | { type: 'pause'; paused: boolean }
  | { type: 'peers'; phones: number };

type Status = 'idle' | 'connecting' | 'connected' | 'error';

/** rivehaptics://connect?url=ws%3A%2F%2F192.168.0.12%3A5173%2Frelay → ws://192.168.0.12:5173/relay */
const fromDeepLink = (url: string | null) => {
  const m = url?.match(/[?&]url=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

// Same palette as the studio.
const light = {
  bg: '#f7f7f5', panel: '#ffffff', sunken: '#f1f1ee', line: '#e7e6e2',
  fg: '#1a1a1c', fg2: '#4a4a50', muted: '#86858b', accent: '#4f46e5', accentFg: '#ffffff', ok: '#16a34a', err: '#dc2626',
};
const dark: typeof light = {
  bg: '#0f0f11', panel: '#18181b', sunken: '#131315', line: '#27272b',
  fg: '#ededef', fg2: '#b4b4ba', muted: '#7e7e86', accent: '#8b85ff', accentFg: '#0f0f11', ok: '#3ddc84', err: '#f87171',
};
type Theme = typeof light;

export default function App() {
  const t = useColorScheme() === 'dark' ? dark : light;
  const s = useMemo(() => styles(t), [t]);

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [riv, setRiv] = useState<{ url: string; stateMachine?: string } | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [mappedNames, setMappedNames] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [event, setEvent] = useState<{ id: number; text: string } | null>(null);
  const map = useRef<Record<string, Pattern>>({});
  const ws = useRef<WebSocket | null>(null);
  const fireRef = useRef<(name: string) => void>(() => {});
  const pauseRef = useRef<(paused: boolean) => void>(() => {});
  const [lastFired, setLastFired] = useState<{ name: string; id: number } | null>(null);
  const composer = usePatternComposer();

  // ponytail: one composer, re-parsed per play; keep one per trigger if parse latency ever shows
  const play = (p: Pattern) => {
    composer.parse(p);
    composer.play();
  };
  const announce = (text: string) => setEvent({ id: Date.now(), text });

  const send = (m: object) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(m));
  const setMap = (m: Record<string, Pattern>) => {
    map.current = m;
    setMappedNames(Object.keys(m));
  };

  const connect = (url: string) => {
    ws.current?.close();
    setInput(url);
    setStatus('connecting');
    const sock = new WebSocket(`${url}?role=phone`);
    const http = url.replace(/^ws/, 'http').replace(/\/relay$/, '');
    let opened = false;
    ws.current = sock;
    sock.onopen = () => {
      opened = true;
      setStatus('connected');
      Presets.System.notificationSuccess();
      sock.send(JSON.stringify({ type: 'hello', device: `${Platform.OS} ${Platform.Version}` }));
    };
    sock.onmessage = (e) => {
      const m = JSON.parse(e.data) as Msg;
      if (m.type === 'load') {
        setMap(m.map);
        setRiv({ url: http + m.riv, stateMachine: m.stateMachine });
      } else if (m.type === 'map') setMap(m.map);
      else if (m.type === 'play') {
        play(m.pattern);
        announce('Pattern from studio');
      } else if (m.type === 'fire') fireRef.current(m.name);
      else if (m.type === 'restart') {
        setPaused(false);
        setRun((n) => n + 1);
      } else if (m.type === 'pause') {
        pauseRef.current(m.paused);
        setPaused(m.paused);
      }
    };
    sock.onclose = () => {
      if (ws.current !== sock) return; // replaced or disconnected on purpose
      if (!opened) return setStatus('error'); // never reached the studio: let the user fix the URL
      setStatus('connecting');
      setTimeout(() => ws.current === sock && connect(url), 1500);
    };
  };

  const disconnect = () => {
    const sock = ws.current;
    ws.current = null;
    sock?.close();
    setRiv(null);
    setTriggers([]);
    setStatus('idle');
  };

  useEffect(() => {
    Linking.getInitialURL().then((u) => {
      const url = fromDeepLink(u);
      if (url) connect(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const w = fromDeepLink(url);
      if (w) connect(w);
    });
    return () => sub.remove();
  }, []);

  const onTrigger = (name: string) => {
    const p = map.current[name];
    if (p) play(p);
    setLastFired({ name, id: Date.now() });
    announce(p ? `▸ ${name}` : `▸ ${name} · no haptic mapped`);
    send({ type: 'fired', name });
  };

  const host = input.replace(/^ws:\/\//, '').replace(/\/relay$/, '');

  return (
    <View style={s.root}>
      <StatusBar style={t === dark ? 'light' : 'dark'} />

      <View style={s.header}>
        <View style={s.mark}><Text style={s.markText}>⚡︎</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Haptics Preview</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {status === 'connected' ? `Studio · ${host}` : status === 'connecting' ? 'Connecting…' : 'Not connected'}
          </Text>
        </View>
        <View style={[s.pill, status === 'connected' && s.pillOn]}>
          <View style={[s.dot, { backgroundColor: status === 'connected' ? t.ok : status === 'error' ? t.err : t.muted }]} />
          <Text style={s.pillText}>{status === 'connected' ? 'Live' : status === 'connecting' ? '…' : 'Off'}</Text>
        </View>
      </View>

      {status === 'idle' || status === 'error' ? (
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.h1}>Connect to Studio</Text>
          <Text style={s.lead}>Feel your Rive animations and haptic patterns on this phone while you edit them on your Mac.</Text>
          <View style={s.card}>
            <Step n={1} t={t} text="Put this phone on the same Wi-Fi as your Mac" />
            <Step n={2} t={t} text="Scan the QR in the studio’s Phone card with the Camera app" />
            <Step n={3} t={t} text="Or paste the relay URL below" />
          </View>
          <TextInput
            style={[s.input, status === 'error' && { borderColor: t.err }]}
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
          {status === 'error' && <Text style={s.error}>Couldn’t reach the studio. Check the URL and that both devices are on the same Wi-Fi.</Text>}
          <PressableScale style={[s.button, !input && { opacity: 0.5 }]} disabled={!input} onPress={() => connect(input.trim())}>
            <Text style={s.buttonText}>Connect</Text>
          </PressableScale>
        </ScrollView>
      ) : status === 'connecting' && !riv ? (
        <View style={s.center}>
          <ActivityIndicator color={t.accent} />
          <Text style={s.muted}>Connecting to {host}</Text>
          <PressableScale style={s.ghost} onPress={disconnect}><Text style={s.ghostText}>Cancel</Text></PressableScale>
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
              onPress={() => { Presets.System.selection(); setPaused(false); setRun((n) => n + 1); }}
            >
              <Text style={s.buttonText}>▶  Replay with haptics</Text>
            </PressableScale>
            <PressableScale
              style={s.secondary}
              onPress={() => { Presets.System.selection(); pauseRef.current(!paused); setPaused(!paused); }}
            >
              <Text style={s.secondaryText}>{paused ? 'Resume' : 'Pause'}</Text>
            </PressableScale>
          </View>

          {triggers.length > 0 && (
            <>
              <Text style={s.section}>Triggers · tap to fire</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                {triggers.map((name) => (
                  <TriggerChip key={name} name={name} mapped={mappedNames.includes(name)} t={t} firedAt={lastFired?.name === name ? lastFired.id : 0} onPress={() => fireRef.current(name)} />
                ))}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        <View style={s.center}>
          <Text style={s.h2}>Connected</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>Drop a .riv into the studio, or press Play there to feel the current pattern.</Text>
          <PressableScale style={s.ghost} onPress={disconnect}><Text style={s.ghostText}>Disconnect</Text></PressableScale>
        </View>
      )}

      {riv && status !== 'idle' && (
        <Pressable onPress={disconnect} hitSlop={8} style={s.footerLink}>
          <Text style={s.ghostText}>Disconnect</Text>
        </Pressable>
      )}

      <EventToast event={event} t={t} />
    </View>
  );
}

/** Press feedback: a quick spring to 0.97 and back (Emil: subtle, under 160ms feel). */
function PressableScale({ children, style, onPress, disabled }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress: () => void; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Shows which slot just fired: a short accent wash that fades on its own (state indication). */
function TriggerChip({ name, mapped, t, firedAt, onPress }: { name: string; mapped: boolean; t: Theme; firedAt: number; onPress: () => void }) {
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!firedAt) return;
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [firedAt, flash]);

  return (
    <PressableScale onPress={onPress} style={[chip.base, { borderColor: t.line, backgroundColor: t.panel }]}>
      <Animated.View style={[StyleSheet.absoluteFill, chip.wash, { backgroundColor: t.accent, opacity: Animated.multiply(flash, 0.25) }]} />
      <View style={[chip.dot, { backgroundColor: mapped ? t.accent : t.line }]} />
      <Text style={[chip.text, { color: t.fg }]}>{name}</Text>
    </PressableScale>
  );
}

/** Bottom toast for the last haptic: rises in, fades out after a beat. Enters and exits the same edge. */
function EventToast({ event, t }: { event: { id: number; text: string } | null; t: Theme }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!event) return;
    v.stopAnimation();
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(v, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [event, v]);
  if (!event) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[toast.base, { backgroundColor: t.fg, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
    >
      <Text style={[toast.text, { color: t.bg }]}>{event.text}</Text>
    </Animated.View>
  );
}

function Step({ n, text, t }: { n: number; text: string; t: Theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.fg2, fontSize: 12, fontWeight: '600' }}>{n}</Text>
      </View>
      <Text style={{ color: t.fg2, fontSize: 15, flex: 1, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

type SceneProps = {
  stateMachine?: string;
  t: Theme;
  onTrigger: (name: string) => void;
  onTriggers: (names: string[]) => void;
  fireRef: RefObject<(name: string) => void>;
  pauseRef: RefObject<(paused: boolean) => void>;
};

/** Loads the file once; each `run` remounts the scene so the animation restarts from frame 0. */
function RivePlayer({ url, run, ...scene }: SceneProps & { url: string; run: number }) {
  const { riveFile, error } = useRiveFile(url);
  const { t } = scene;
  if (error) return <Text style={{ color: t.err, padding: 20 }}>Could not load Rive file: {error.message}</Text>;
  if (!riveFile) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return <RiveScene key={run} file={riveFile} {...scene} />;
}

function RiveScene({ file, stateMachine, onTrigger, onTriggers, fireRef, pauseRef }: SceneProps & { file: RiveFile }) {
  const { instance } = useViewModelInstance(file, { async: true });
  const { riveViewRef, setHybridRef } = useRive();
  const cb = useRef(onTrigger);
  cb.current = onTrigger;

  useEffect(() => {
    pauseRef.current = (paused) => void (paused ? riveViewRef?.pause() : riveViewRef?.play());
    return () => { pauseRef.current = () => {}; };
  }, [riveViewRef, pauseRef]);

  // Subscribe to every trigger property on the bound view model — these are the haptic slots.
  useEffect(() => {
    if (!instance) return;
    let dead = false;
    const props = new Map<string, NonNullable<ReturnType<typeof instance.triggerProperty>>>();
    const unsubs: (() => void)[] = [];
    instance.getPropertiesAsync().then((list) => {
      if (dead) return;
      for (const { name, type } of list) {
        if (type !== 'trigger') continue;
        const tp = instance.triggerProperty(name);
        if (!tp) continue;
        props.set(name, tp);
        unsubs.push(tp.addListener(() => cb.current(name)));
      }
      onTriggers([...props.keys()]);
    });
    fireRef.current = (name) => props.get(name)?.trigger();
    return () => {
      dead = true;
      unsubs.forEach((u) => u());
      props.forEach((p) => p.dispose());
      fireRef.current = () => {};
    };
  }, [instance, fireRef, onTriggers]);

  return (
    <RiveView
      style={{ flex: 1 }}
      file={file}
      hybridRef={setHybridRef}
      stateMachineName={stateMachine}
      dataBind={instance ?? undefined}
      autoPlay
      fit={Fit.Contain}
    />
  );
}

const chip = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  wash: { borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 14, fontWeight: '600', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});

const toast = StyleSheet.create({
  base: { position: 'absolute', bottom: 44, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  text: { fontSize: 14, fontWeight: '600' },
});

const styles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg, paddingTop: 58 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
    mark: { width: 34, height: 34, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    markText: { color: t.accentFg, fontSize: 17 },
    title: { color: t.fg, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
    subtitle: { color: t.muted, fontSize: 13, marginTop: 1 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: t.sunken },
    pillOn: { backgroundColor: t.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line },
    dot: { width: 7, height: 7, borderRadius: 4 },
    pillText: { color: t.fg2, fontSize: 12, fontWeight: '600' },

    body: { padding: 20, gap: 16 },
    h1: { color: t.fg, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 },
    h2: { color: t.fg, fontSize: 20, fontWeight: '700' },
    lead: { color: t.fg2, fontSize: 16, lineHeight: 23 },
    card: { backgroundColor: t.panel, borderRadius: 16, padding: 16, gap: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line },
    input: { borderWidth: 1, borderColor: t.line, backgroundColor: t.panel, borderRadius: 12, paddingHorizontal: 14, height: 50, color: t.fg, fontSize: 15, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
    error: { color: t.err, fontSize: 13, marginTop: -6 },
    button: { backgroundColor: t.accent, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    buttonText: { color: t.accentFg, fontSize: 16, fontWeight: '700' },
    secondary: { backgroundColor: t.panel, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line },
    secondaryText: { color: t.fg, fontSize: 16, fontWeight: '600' },
    ghost: { paddingHorizontal: 16, paddingVertical: 10 },
    ghostText: { color: t.muted, fontSize: 14, fontWeight: '600' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    muted: { color: t.muted, fontSize: 15 },

    stageWrap: { flex: 1, padding: 16, gap: 14 },
    stage: { flex: 1, borderRadius: 20, backgroundColor: t.panel, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: t.line },
    transport: { flexDirection: 'row', gap: 10 },
    section: { color: t.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
    chips: { gap: 8, paddingRight: 16 },
    footerLink: { alignSelf: 'center', paddingVertical: 10, marginBottom: 20 },
  });
