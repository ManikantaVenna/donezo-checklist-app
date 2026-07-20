import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { ColorValue, TextStyle, ViewStyle } from "react-native";
import { getStreakTier, isTierBoundary } from "../domain/streakTiers";
import type { StreakTierId } from "../domain/streakTiers";
import { fontFamily } from "../theme/tokens";

type GradientStops = readonly [ColorValue, ColorValue, ColorValue];

type BadgeMaterial = {
  shell: GradientStops;
  face: GradientStops;
  rim: ColorValue;
  innerRim: ColorValue;
  depth: ColorValue;
  glow: ColorValue;
  glint: ColorValue;
  glintSoft: ColorValue;
  number: ColorValue;
  numberShadow: ColorValue;
};

const materials: Record<StreakTierId, BadgeMaterial> = {
  neutral: {
    shell: ["#2A303A", "#151922", "#07090D"],
    face: ["#202630", "#111720", "#050609"],
    rim: "rgba(221,179,79,0.38)",
    innerRim: "rgba(255,255,255,0.07)",
    depth: "rgba(0,0,0,0.38)",
    glow: "rgba(221,179,79,0.14)",
    glint: "rgba(255,255,255,0.16)",
    glintSoft: "rgba(221,179,79,0.12)",
    number: "#B8BFCA",
    numberShadow: "#030407",
  },
  silver: {
    shell: ["#FFFFFF", "#9FAAB8", "#202630"],
    face: ["#586271", "#1F2630", "#080A0F"],
    rim: "#F7FAFF",
    innerRim: "rgba(255,255,255,0.50)",
    depth: "rgba(0,0,0,0.34)",
    glow: "rgba(225,239,255,0.42)",
    glint: "rgba(255,255,255,0.82)",
    glintSoft: "rgba(210,226,243,0.24)",
    number: "#F6FAFF",
    numberShadow: "#0A0D12",
  },
  "rose-gold": {
    shell: ["#FFE3D8", "#C86B57", "#3A1117"],
    face: ["#7D3440", "#3B1319", "#100306"],
    rim: "#FFD0C2",
    innerRim: "rgba(255,221,211,0.44)",
    depth: "rgba(71,14,21,0.42)",
    glow: "rgba(255,154,132,0.40)",
    glint: "rgba(255,239,232,0.76)",
    glintSoft: "rgba(255,170,148,0.24)",
    number: "#FFF0E8",
    numberShadow: "#4D1417",
  },
  gold: {
    shell: ["#FFF3B8", "#D99B17", "#3B2100"],
    face: ["#7C520B", "#2B1900", "#080501"],
    rim: "#FFE38A",
    innerRim: "rgba(255,238,173,0.46)",
    depth: "rgba(76,39,0,0.45)",
    glow: "rgba(255,205,76,0.42)",
    glint: "rgba(255,249,215,0.78)",
    glintSoft: "rgba(255,203,71,0.24)",
    number: "#FFF5BA",
    numberShadow: "#321B00",
  },
  diamond: {
    shell: ["#FFFFFF", "#9AEFFF", "#15597A"],
    face: ["#BFF8FF", "#347FA7", "#071827"],
    rim: "#E8FCFF",
    innerRim: "rgba(255,255,255,0.56)",
    depth: "rgba(6,46,72,0.42)",
    glow: "rgba(147,235,255,0.42)",
    glint: "rgba(255,255,255,0.88)",
    glintSoft: "rgba(191,248,255,0.28)",
    number: "#F9FEFF",
    numberShadow: "#07304B",
  },
  emerald: {
    shell: ["#C8FFE1", "#23CE86", "#053424"],
    face: ["#34D596", "#086848", "#02140E"],
    rim: "#86F7C0",
    innerRim: "rgba(202,255,230,0.44)",
    depth: "rgba(0,45,29,0.48)",
    glow: "rgba(74,235,170,0.42)",
    glint: "rgba(224,255,238,0.76)",
    glintSoft: "rgba(80,235,169,0.24)",
    number: "#E7FFF3",
    numberShadow: "#002217",
  },
  sapphire: {
    shell: ["#C6DCFF", "#397EFF", "#061A52"],
    face: ["#5B92FF", "#153A98", "#020A24"],
    rim: "#8FBAFF",
    innerRim: "rgba(220,235,255,0.42)",
    depth: "rgba(2,12,44,0.50)",
    glow: "rgba(85,144,255,0.46)",
    glint: "rgba(235,244,255,0.78)",
    glintSoft: "rgba(111,163,255,0.24)",
    number: "#F4F8FF",
    numberShadow: "#00184A",
  },
  "black-diamond": {
    shell: ["#C8D0DC", "#3B4451", "#010204"],
    face: ["#313945", "#0D1118", "#000000"],
    rim: "#B8C0CE",
    innerRim: "rgba(255,255,255,0.18)",
    depth: "rgba(0,0,0,0.58)",
    glow: "rgba(210,222,241,0.30)",
    glint: "rgba(255,255,255,0.58)",
    glintSoft: "rgba(172,186,207,0.18)",
    number: "#FFFFFF",
    numberShadow: "#000000",
  },
  legend: {
    shell: ["#FFF3A6", "#CF8B10", "#070401"],
    face: ["#FFE073", "#835203", "#050200"],
    rim: "#FFE18A",
    innerRim: "rgba(255,230,145,0.46)",
    depth: "rgba(55,29,0,0.46)",
    glow: "rgba(255,194,50,0.48)",
    glint: "rgba(255,241,183,0.78)",
    glintSoft: "rgba(255,199,58,0.26)",
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
  const digits = String(safeStreak).length;
  const frameWidth = roomy ? Math.min(58, 36 + digits * 7) : Math.min(52, 32 + digits * 7);
  const frameHeight = roomy ? 38 : 34;
  const numberSize = roomy ? (digits >= 3 ? 15 : 18) : digits >= 3 ? 14 : 17;
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
        {
          borderColor: material.rim,
          shadowColor: material.glow,
          width: frameWidth,
          height: frameHeight,
        } satisfies ViewStyle,
      ]}
    >
      <LinearGradient colors={material.shell} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.innerRim, { borderColor: material.innerRim }]} />
      <LinearGradient colors={material.face} end={{ x: 0.85, y: 1 }} start={{ x: 0.15, y: 0 }} style={styles.face} />
      <View style={[styles.depth, { backgroundColor: material.depth }]} />
      <View style={[styles.topArc, { backgroundColor: material.glint }]} />
      <View style={[styles.leftFacet, { backgroundColor: material.glintSoft }]} />
      <View style={[styles.rightFacet, { backgroundColor: material.glintSoft }]} />
      <View style={[styles.pinSpark, { backgroundColor: material.glint }]} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.58}
        numberOfLines={1}
        style={[
          styles.number,
          {
            color: material.number,
            fontSize: numberSize,
            textShadowColor: material.numberShadow,
          } satisfies TextStyle,
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
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.82,
    shadowRadius: 8,
    elevation: 3,
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
  face: {
    position: "absolute",
    top: 4,
    right: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
  },
  depth: {
    position: "absolute",
    right: 5,
    bottom: 5,
    left: 5,
    height: "34%",
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    opacity: 0.72,
  },
  topArc: {
    position: "absolute",
    top: 6,
    left: 9,
    right: 9,
    height: 5,
    borderRadius: 999,
    opacity: 0.28,
  },
  leftFacet: {
    position: "absolute",
    top: 7,
    bottom: 8,
    left: 7,
    width: 6,
    borderRadius: 999,
    opacity: 0.36,
    transform: [{ rotate: "30deg" }],
  },
  rightFacet: {
    position: "absolute",
    top: 9,
    right: 8,
    width: 4,
    height: 12,
    borderRadius: 999,
    opacity: 0.20,
    transform: [{ rotate: "30deg" }],
  },
  pinSpark: {
    position: "absolute",
    top: 7,
    left: 10,
    width: 3,
    height: 3,
    borderRadius: 999,
    opacity: 0.72,
  },
  number: {
    zIndex: 4,
    width: "100%",
    paddingHorizontal: 5,
    color: "#F5F7FB",
    fontFamily: fontFamily.black,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shine: {
    position: "absolute",
    top: "12%",
    bottom: "12%",
    left: -12,
    width: 7,
    zIndex: 5,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
});
