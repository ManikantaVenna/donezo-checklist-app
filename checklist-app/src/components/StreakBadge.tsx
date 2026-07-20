import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { ColorValue, TextStyle, ViewStyle } from "react-native";
import { getStreakTier, isTierBoundary } from "../domain/streakTiers";
import type { StreakTierId } from "../domain/streakTiers";
import { fontFamily } from "../theme/tokens";

type GradientStops = readonly [ColorValue, ColorValue, ColorValue];

type BadgeMaterial = {
  body: GradientStops;
  rim: ColorValue;
  innerRim: ColorValue;
  jewel: GradientStops;
  jewelRim: ColorValue;
  glow: ColorValue;
  gleam: ColorValue;
  number: ColorValue;
  numberShadow: ColorValue;
};

const materials: Record<StreakTierId, BadgeMaterial> = {
  neutral: {
    body: ["#20242C", "#151820", "#090B10"],
    rim: "rgba(221,179,79,0.38)",
    innerRim: "rgba(255,255,255,0.07)",
    jewel: ["#363C47", "#20242C", "#10131A"],
    jewelRim: "rgba(221,179,79,0.28)",
    glow: "rgba(221,179,79,0.14)",
    gleam: "rgba(255,255,255,0.16)",
    number: "#B8BFCA",
    numberShadow: "#030407",
  },
  silver: {
    body: ["#FFFFFF", "#AEB8C4", "#353B46"],
    rim: "#F4F7FB",
    innerRim: "rgba(255,255,255,0.72)",
    jewel: ["#FFFFFF", "#C6D0DC", "#5F6875"],
    jewelRim: "#F9FBFF",
    glow: "rgba(232,242,255,0.40)",
    gleam: "rgba(255,255,255,0.82)",
    number: "#FFFFFF",
    numberShadow: "#1C222B",
  },
  "rose-gold": {
    body: ["#FFE1D2", "#CF735C", "#4E1D22"],
    rim: "#FFC0A9",
    innerRim: "rgba(255,232,220,0.56)",
    jewel: ["#FFF0E8", "#E79278", "#77303A"],
    jewelRim: "#FFD4C5",
    glow: "rgba(255,154,132,0.40)",
    gleam: "rgba(255,239,232,0.78)",
    number: "#FFF0E8",
    numberShadow: "#4D1417",
  },
  gold: {
    body: ["#FFF0A8", "#E4A928", "#4A2A00"],
    rim: "#FFE38A",
    innerRim: "rgba(255,244,188,0.60)",
    jewel: ["#FFF8CC", "#F3C85E", "#875300"],
    jewelRim: "#FFF0A8",
    glow: "rgba(255,205,76,0.42)",
    gleam: "rgba(255,249,215,0.82)",
    number: "#FFF5BA",
    numberShadow: "#321B00",
  },
  diamond: {
    body: ["#F4FDFF", "#8EE6FF", "#154E72"],
    rim: "#CFF8FF",
    innerRim: "rgba(255,255,255,0.66)",
    jewel: ["#FFFFFF", "#B9F3FF", "#287FA9"],
    jewelRim: "#F5FEFF",
    glow: "rgba(147,235,255,0.42)",
    gleam: "rgba(255,255,255,0.86)",
    number: "#F9FEFF",
    numberShadow: "#07304B",
  },
  emerald: {
    body: ["#B8FFD9", "#22C884", "#053B2A"],
    rim: "#75F2B8",
    innerRim: "rgba(202,255,230,0.52)",
    jewel: ["#D8FFE9", "#45E0A1", "#08724E"],
    jewelRim: "#B6FFD9",
    glow: "rgba(74,235,170,0.42)",
    gleam: "rgba(224,255,238,0.76)",
    number: "#E7FFF3",
    numberShadow: "#002217",
  },
  sapphire: {
    body: ["#BFD6FF", "#397EFF", "#061E59"],
    rim: "#7FB1FF",
    innerRim: "rgba(220,235,255,0.48)",
    jewel: ["#E7F0FF", "#75A7FF", "#123D9B"],
    jewelRim: "#B8D4FF",
    glow: "rgba(85,144,255,0.46)",
    gleam: "rgba(235,244,255,0.78)",
    number: "#F4F8FF",
    numberShadow: "#00184A",
  },
  "black-diamond": {
    body: ["#5A6372", "#181C25", "#030406"],
    rim: "#A7AFBC",
    innerRim: "rgba(255,255,255,0.22)",
    jewel: ["#E8EDF5", "#4A5361", "#07090D"],
    jewelRim: "#C9D0DB",
    glow: "rgba(210,222,241,0.30)",
    gleam: "rgba(255,255,255,0.60)",
    number: "#FFFFFF",
    numberShadow: "#000000",
  },
  legend: {
    body: ["#FFE58D", "#B7780E", "#080501"],
    rim: "#FFE18A",
    innerRim: "rgba(255,230,145,0.52)",
    jewel: ["#FFF3B4", "#E2A31B", "#2B1700"],
    jewelRim: "#FFF0A8",
    glow: "rgba(255,194,50,0.48)",
    gleam: "rgba(255,241,183,0.78)",
    number: "#FFE08A",
    numberShadow: "#180C00",
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
  const frameWidth = roomy ? 70 : 62;
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
        { borderColor: material.rim, shadowColor: material.glow } satisfies ViewStyle,
      ]}
    >
      <LinearGradient colors={material.body} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.innerRim, { borderColor: material.innerRim }]} />
      <View style={[styles.glow, { backgroundColor: material.glow }]} />
      <LinearGradient colors={material.jewel} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[styles.jewel, { borderColor: material.jewelRim }]} />
      <View style={[styles.jewelFacet, { backgroundColor: material.gleam }]} />
      <View style={[styles.topGleam, { backgroundColor: material.gleam }]} />
      <View style={[styles.diagonalGleam, { backgroundColor: material.gleam }]} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.58}
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
              outputRange: [0, 0.32, 0],
            }),
            transform: [
              { rotate: "18deg" },
              {
                translateX: shine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, frameWidth + 20],
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
    width: 62,
    height: 32,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 9,
    elevation: 3,
  },
  roomyFrame: {
    width: 70,
    height: 34,
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
  glow: {
    position: "absolute",
    top: -8,
    bottom: -8,
    left: -10,
    width: 42,
    borderRadius: 999,
    opacity: 0.72,
  },
  jewel: {
    position: "absolute",
    top: 5,
    bottom: 5,
    left: 6,
    width: 21,
    borderRadius: 6,
    borderWidth: 1,
    opacity: 0.98,
    transform: [{ rotate: "45deg" }],
  },
  jewelFacet: {
    position: "absolute",
    top: 8,
    left: 15,
    width: 2,
    height: 15,
    opacity: 0.62,
    transform: [{ rotate: "25deg" }],
  },
  topGleam: {
    position: "absolute",
    top: 3,
    right: 8,
    left: 30,
    height: 6,
    borderRadius: 999,
    opacity: 0.34,
  },
  diagonalGleam: {
    position: "absolute",
    top: -5,
    bottom: -5,
    left: 22,
    width: 5,
    opacity: 0.54,
    borderRadius: 999,
    transform: [{ rotate: "24deg" }],
  },
  number: {
    zIndex: 2,
    width: "100%",
    paddingLeft: 22,
    paddingRight: 6,
    color: "#F5F7FB",
    fontFamily: fontFamily.black,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roomyNumber: {
    fontSize: 17,
    paddingLeft: 24,
    paddingRight: 8,
  },
  shine: {
    position: "absolute",
    top: "12%",
    bottom: "12%",
    left: -12,
    width: 8,
    zIndex: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
});
