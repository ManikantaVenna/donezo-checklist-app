import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { getStreakTier, isTierBoundary } from "../domain/streakTiers";
import type { StreakTierId } from "../domain/streakTiers";
import { fontFamily } from "../theme/tokens";

type BadgeMaterial = {
  base: string;
  border: string;
  innerBorder: string;
  topLight: string;
  bottomShade: string;
  sideGlow: string;
  slash: string;
  number: string;
  numberShadow: string;
};

const materials: Record<StreakTierId, BadgeMaterial> = {
  neutral: {
    base: "#171A20",
    border: "rgba(221,179,79,0.42)",
    innerBorder: "rgba(255,255,255,0.06)",
    topLight: "rgba(255,255,255,0.08)",
    bottomShade: "rgba(0,0,0,0.42)",
    sideGlow: "rgba(221,179,79,0.13)",
    slash: "rgba(255,255,255,0.08)",
    number: "#B8BFCA",
    numberShadow: "#050609",
  },
  silver: {
    base: "#252A31",
    border: "#DCE3EA",
    innerBorder: "rgba(255,255,255,0.44)",
    topLight: "rgba(255,255,255,0.42)",
    bottomShade: "rgba(24,28,34,0.62)",
    sideGlow: "rgba(240,246,252,0.30)",
    slash: "rgba(255,255,255,0.70)",
    number: "#F6FAFF",
    numberShadow: "#11151B",
  },
  "rose-gold": {
    base: "#33171A",
    border: "#FFB59D",
    innerBorder: "rgba(255,219,204,0.34)",
    topLight: "rgba(255,206,188,0.34)",
    bottomShade: "rgba(68,19,24,0.70)",
    sideGlow: "rgba(255,161,139,0.32)",
    slash: "rgba(255,226,214,0.70)",
    number: "#FFE0D1",
    numberShadow: "#4D1417",
  },
  gold: {
    base: "#3A2707",
    border: "#F3C85E",
    innerBorder: "rgba(255,236,166,0.36)",
    topLight: "rgba(255,229,133,0.34)",
    bottomShade: "rgba(67,38,0,0.68)",
    sideGlow: "rgba(255,202,82,0.30)",
    slash: "rgba(255,243,183,0.72)",
    number: "#FFE08A",
    numberShadow: "#2B1700",
  },
  diamond: {
    base: "#102336",
    border: "#BFEFFF",
    innerBorder: "rgba(246,254,255,0.46)",
    topLight: "rgba(220,251,255,0.38)",
    bottomShade: "rgba(3,22,36,0.70)",
    sideGlow: "rgba(167,237,255,0.34)",
    slash: "rgba(255,255,255,0.78)",
    number: "#F6FEFF",
    numberShadow: "#082033",
  },
  emerald: {
    base: "#07271D",
    border: "#44E0A1",
    innerBorder: "rgba(176,255,222,0.32)",
    topLight: "rgba(95,255,188,0.28)",
    bottomShade: "rgba(0,28,19,0.74)",
    sideGlow: "rgba(68,224,161,0.32)",
    slash: "rgba(218,255,237,0.70)",
    number: "#DFFFEF",
    numberShadow: "#001C13",
  },
  sapphire: {
    base: "#091A3B",
    border: "#5E95FF",
    innerBorder: "rgba(207,225,255,0.32)",
    topLight: "rgba(116,166,255,0.32)",
    bottomShade: "rgba(2,14,42,0.76)",
    sideGlow: "rgba(87,139,255,0.34)",
    slash: "rgba(231,240,255,0.72)",
    number: "#EFF4FF",
    numberShadow: "#001542",
  },
  "black-diamond": {
    base: "#08090D",
    border: "#8C929E",
    innerBorder: "rgba(255,255,255,0.18)",
    topLight: "rgba(255,255,255,0.16)",
    bottomShade: "rgba(0,0,0,0.86)",
    sideGlow: "rgba(185,199,219,0.22)",
    slash: "rgba(246,249,255,0.58)",
    number: "#F5F7FB",
    numberShadow: "#000000",
  },
  legend: {
    base: "#160C03",
    border: "#FFD66F",
    innerBorder: "rgba(255,232,149,0.40)",
    topLight: "rgba(255,216,111,0.30)",
    bottomShade: "rgba(0,0,0,0.74)",
    sideGlow: "rgba(255,196,61,0.34)",
    slash: "rgba(255,241,179,0.74)",
    number: "#FFD472",
    numberShadow: "#1A0D00",
  },
};

export function StreakBadge({ streak }: { streak: number }) {
  const safeStreak = Math.max(0, Math.floor(streak));
  const tier = getStreakTier(safeStreak);
  const material = materials[tier.id];
  const previousStreak = useRef(safeStreak);
  const shine = useRef(new Animated.Value(0)).current;
  const { width: viewportWidth } = useWindowDimensions();
  const roomy = viewportWidth >= 768;
  const frameWidth = roomy ? 58 : 48;
  const label = `${safeStreak} day streak${tier.id === "neutral" ? "" : `, ${tier.label} tier`}`;

  useEffect(() => {
    const increased = safeStreak > previousStreak.current;
    previousStreak.current = safeStreak;
    if (!increased) return;

    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reducedMotion) => {
        if (!active || reducedMotion) return;
        shine.setValue(0);
        Animated.timing(shine, {
          toValue: 1,
          duration: isTierBoundary(safeStreak) ? 700 : 450,
          useNativeDriver: true,
        }).start();
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [safeStreak, shine]);

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="text"
      style={[
        styles.frame,
        roomy && styles.roomyFrame,
        { backgroundColor: material.base, borderColor: material.border } satisfies ViewStyle,
      ]}
    >
      <View style={[styles.innerRim, { borderColor: material.innerBorder }]} />
      <View style={[styles.topLight, { backgroundColor: material.topLight }]} />
      <View style={[styles.bottomShade, { backgroundColor: material.bottomShade }]} />
      <View style={[styles.sideGlow, { backgroundColor: material.sideGlow }]} />
      <View style={[styles.slash, { backgroundColor: material.slash }]} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        numberOfLines={1}
        style={[
          styles.number,
          roomy && styles.roomyNumber,
          { color: material.number, textShadowColor: material.numberShadow } satisfies TextStyle,
        ]}
      >
        {safeStreak}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shine,
          {
            opacity: shine.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.22, 0],
            }),
            transform: [
              { rotate: "14deg" },
              {
                translateX: shine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, frameWidth + 18],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 48,
    height: 28,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  roomyFrame: {
    width: 58,
    height: 30,
  },
  innerRim: {
    position: "absolute",
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderWidth: 1,
    borderRadius: 999,
  },
  topLight: {
    position: "absolute",
    top: 2,
    right: 4,
    left: 4,
    height: "36%",
    borderRadius: 999,
  },
  bottomShade: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: "42%",
  },
  sideGlow: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: -5,
    width: 20,
    borderRadius: 999,
  },
  slash: {
    position: "absolute",
    top: -4,
    bottom: -4,
    left: 8,
    width: 5,
    opacity: 0.64,
    borderRadius: 999,
    transform: [{ rotate: "24deg" }],
  },
  number: {
    zIndex: 2,
    width: "100%",
    color: "#F5F7FB",
    fontFamily: fontFamily.black,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.2,
  },
  roomyNumber: {
    fontSize: 15,
  },
  shine: {
    position: "absolute",
    top: "15%",
    bottom: "15%",
    left: -12,
    width: 8,
    zIndex: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
});
