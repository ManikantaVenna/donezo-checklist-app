import { Modal, StyleSheet, Text, View } from "react-native";
import { useAppUpdate } from "../state/AppUpdateContext";
import { colors, fontFamily, radii } from "../theme/tokens";
import { AppButton } from "./AppButton";

export function AppUpdateNotice() {
  const { availableRelease, dismiss, openDownloadPage } = useAppUpdate();
  if (availableRelease === null) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      transparent
      visible
    >
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>UPDATE AVAILABLE</Text>
          <Text style={styles.title}>{`Donezo ${availableRelease.version} is ready`}</Text>
          <Text style={styles.copy}>A newer Android build is ready to download.</Text>

          <View style={styles.notes}>
            {availableRelease.releaseNotes.slice(0, 3).map((note, index) => (
              <View key={`${index}-${note}`} style={styles.noteRow}>
                <Text style={styles.bullet}>{"\u2022"}</Text>
                <Text style={styles.note}>{note}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <AppButton label="Later" onPress={dismiss} tone="ghost" />
            </View>
            <View style={styles.actionPrimary}>
              <AppButton label="Update Donezo" onPress={() => void openDownloadPage()} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,6,9,0.78)",
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 410,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.goldEdge,
    backgroundColor: colors.panel,
    padding: 20,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: fontFamily.black,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 8,
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 22,
    lineHeight: 27,
  },
  copy: {
    marginTop: 7,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  notes: {
    gap: 8,
    marginTop: 16,
    borderRadius: radii.card,
    backgroundColor: colors.panel2,
    padding: 12,
  },
  noteRow: {
    flexDirection: "row",
    gap: 8,
  },
  bullet: {
    color: colors.accent,
    fontFamily: fontFamily.black,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  action: {
    flex: 0.75,
  },
  actionPrimary: {
    flex: 1.25,
  },
});
