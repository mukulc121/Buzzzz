import type { ReactNode } from "react";
import { View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { modalStyles as styles } from "./modalStyles";

interface IPlaygroundModal {
  title: string;
  children: ReactNode;
}

export function PlaygroundModal(props: IPlaygroundModal) {
  const { title, children } = props;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon name="x" size={28} color={colors.navy} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
      </View>
    </SafeAreaView>
  );
}
