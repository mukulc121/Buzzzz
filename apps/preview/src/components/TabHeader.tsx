import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";

export const TAB_CONTENT_INSET = 15;
const ROW_HEIGHT = 50;
const TITLE_HEIGHT = 36;

interface ITabHeader {
  title: string;
  trailing?: ReactNode;
  children?: ReactNode;
}

export function TabHeader(props: ITabHeader) {
  const { title, trailing, children } = props;
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <ThemedText type="title" accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
      {children && <View style={styles.description}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 20 },
  row: { flexDirection: "row", alignItems: "flex-start", minHeight: ROW_HEIGHT, gap: 12 },
  title: { flex: 1, marginTop: (ROW_HEIGHT - TITLE_HEIGHT) / 2 },
  trailing: { minHeight: ROW_HEIGHT, justifyContent: "center" },
  description: { marginTop: 10 },
});
