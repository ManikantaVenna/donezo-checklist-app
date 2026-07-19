import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { ImageSourcePropType, TextStyle } from "react-native";
import { getStreakTier, isTierBoundary } from "../domain/streakTiers";
import type { StreakTierId } from "../domain/streakTiers";
import { fontFamily } from "../theme/tokens";

const badgeSources: Record<Exclude<StreakTierId, "neutral">, ImageSourcePropType> = {
  silver: require("../../assets/streak-badges/silver.png"),
  "rose-gold": require("../../assets/streak-badges/rose-gold.png"),
  gold: require("../../assets/streak-badges/gold.png"),
  diamond: require("../../assets/streak-badges/diamond.png"),
  emerald: require("../../assets/streak-badges/emerald.png"),
  sapphire: require("../../assets/streak-badges/sapphire.png"),
  "black-diamond": require("../../assets/streak-badges/black-diamond.png"),
  legend: require("../../assets/streak-badges/legend.png"),
};

const numberStyles: Record<StreakTierId, TextStyle> = {
  neutral: { color: "#B8BFCA", textShadowColor: "#050609" },
  silver: { color: "#25272B", textShadowColor: "rgba(255,255,255,0.72)" },
  "rose-gold": { color: "#FFE0D1", textShadowColor: "#4D1417" },
  gold: { color: "#FFD873", textShadowColor: "#261500" },
  diamond: { color: "#293757", textShadowColor: "rgba(255,255,255,0.88)" },
  emerald: { color: "#F8D67D", textShadowColor: "#001C13" },
  sapphire: { color: "#EFF3FF", textShadowColor: "#001542" },
  "black-diamond": { color: "#F2F4F7", textShadowColor: "#050609" },
  legend: { color: "#FFD472", textShadowColor: "#1A0D00" },
};

export function StreakBadge({ streak }: { streak: number }) {
  const safeStreak = Math.max(0, Math.floor(streak));
  const tier = getStreakTier(safeStreak);
  const previousStreak = useRef(safeStreak);
  const shine = useRef(new Animated.Value(0)).current;
  const { width: viewportWidth } = useWindowDimensions();
  const roomy = viewportWidth >= 768;
  const frameWidth = roomy ? 66 : 54;
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
      style={[styles.frame, roomy && styles.roomyFrame]}
    >
      {tier.id === "neutral" ? (
        <View style={[StyleSheet.absoluteFill, styles.neutral]} />
      ) : (
        <Image resizeMode="stretch" source={badgeSources[tier.id]} style={StyleSheet.absoluteFill} />
      )}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        numberOfLines={1}
        style={[styles.number, roomy && styles.roomyNumber, numberStyles[tier.id]]}
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
              outputRange: [0, 0.24, 0],
            }),
            transform: [
              { rotate: "12deg" },
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
    width: 54,
    height: 30,
    borderRadius: 999,
    overflow: "hidden",
  },
  roomyFrame: {
    width: 66,
    height: 32,
  },
  neutral: {
    borderWidth: 1,
    borderColor: "rgba(221,179,79,0.42)",
    borderRadius: 999,
    backgroundColor: "#171A20",
  },
  number: {
    position: "absolute",
    top: 0,
    right: 2,
    bottom: 0,
    left: "30%",
    color: "#F5F7FB",
    fontFamily: fontFamily.black,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.2,
  },
  roomyNumber: {
    fontSize: 17,
  },
  shine: {
    position: "absolute",
    top: "14%",
    bottom: "14%",
    left: -12,
    width: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
});
