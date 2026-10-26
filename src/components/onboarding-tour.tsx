// Tanıtım turu: six swipeable slides that teach the rules in the order you play them.
// Used first-run (before sign-in) and as the "Nasıl oynanır" replay modal.
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { markTourSeen } from "@/lib/tour";
import { Button } from "./button";
import { Hunter, Referee, Runner } from "./characters";
import { AnimatedCircle } from "./characters/parts";
import { AppText } from "./text";

type Mode = "firstRun" | "replay";

type SceneProps = { s: number; active: boolean; motion: boolean };

type Slide = {
  title: string;
  body: string;
  label: string;
  glow: string;
  Scene: (p: SceneProps) => ReactNode;
};

const SLIDES: Slide[] = [
  {
    title: "Mahallen artık oyun alanı",
    body: "Saklambaç sokakta, yürüyerek ve koşarak oynanır; telefonun da hakemin olur.",
    label: "Avcı Doğan, kaçak Çevik ve hakem telefon Düdük yan yana duruyor.",
    glow: Colors.hunter,
    Scene: SceneCast,
  },
  {
    title: "Önce kaçaklar dağılır",
    body: "Avans süresinde kaçaklar bölgenin içinde saklanır, avcılar ise gözünü kapatıp bekler.",
    label: "Kaçak Çevik bölgenin içinde koşuyor, avcı Doğan bölgenin kenarında gözlerini kapatmış bekliyor.",
    glow: Colors.runner,
    Scene: SceneHeadStart,
  },
  {
    title: "Ping! Konumlar bir anlık görünür",
    body: "Avcılar kaçakları yalnızca ping anında haritada görür; aradaki zamanda tahmin etmek gerekir.",
    label: "Hakem telefon ping atıyor, haritada üç kaçak noktası beliriyor.",
    glow: Colors.runner,
    Scene: ScenePing,
  },
  {
    title: "Bölgenin dışına çıkma",
    body: "Bölge dışında 30 saniyeden fazla kalan kaçak, avcılara canlı görünür.",
    label: "Çevik bölge çizgisinin dışına çıkıyor, 30 saniye uyarısı yanıp sönüyor, Düdük düdük çalıyor.",
    glow: Colors.runner,
    Scene: SceneZone,
  },
  {
    title: "Yakala, kaçak onaylasın",
    body: "Yakalama yüz yüze olur; yakalanan kaçak bunu kendi telefonundan onaylar.",
    label: "Doğan, Çevik'in omzuna dokunuyor; Çevik ellerini kaldırmış, üstünde onay işareti var.",
    glow: Colors.hunter,
    Scene: SceneTag,
  },
  {
    title: "Puan topla, zirveye çık",
    body: "Her oyun puan kazandırır; haftalık sıralamada mahallenin en iyisi sen ol.",
    label: "Kürsüde birinci Doğan, ikinci Çevik, üçüncü kupa tutan Düdük sevinçle zıplıyor.",
    glow: Colors.hunter,
    Scene: ScenePodium,
  },
];

export function OnboardingTour({ mode }: { mode: Mode }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const motion = !reduced;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const last = SLIDES.length - 1;
  const isLast = page === last;
  const s = Math.min(width - Spacing.lg * 2, 320, height * 0.46);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)));
  };

  const finish = () => {
    if (mode === "firstRun") {
      // The root layout guard flips to sign-in on its own.
      void markTourSeen();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };
  const next = () => {
    if (isLast) return finish();
    const to = page + 1;
    scrollRef.current?.scrollTo({ x: to * width, animated: !reduced });
    setPage(to);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Turu atla"
          onPress={finish}
          disabled={isLast}
          hitSlop={8}
          style={[styles.skip, isLast && styles.hidden]}
        >
          <AppText variant="label">Atla</AppText>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={slide.label}
              style={{ width: s, height: s }}
            >
              <Glow s={s} color={slide.glow} />
              <slide.Scene s={s} active={page === i} motion={motion} />
            </View>
            <View style={styles.copy}>
              <AppText variant="title" style={styles.title}>
                {slide.title}
              </AppText>
              <AppText variant="body" color={Colors.textMuted} style={styles.body}>
                {slide.body}
              </AppText>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Sayfa ${page + 1} / ${SLIDES.length}`}>
          {SLIDES.map((slide, i) => (
            <Dot key={slide.title} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>
        <Button
          title={isLast ? (mode === "firstRun" ? "Başlayalım" : "Tamam") : "İleri"}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const p = scrollX.get() / Math.max(1, width);
    const t = interpolate(p, [index - 1, index, index + 1], [0, 1, 0], "clamp");
    return {
      width: 6 + 12 * t,
      backgroundColor: interpolateColor(t, [0, 1], [Colors.textFaint, Colors.hunter]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function Glow({ s, color }: { s: number; color: string }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`glow${color.slice(1)}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.12} />
          <Stop offset="0.65" stopColor={color} stopOpacity={0.05} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={160} cy={160} r={160} fill={`url(#glow${color.slice(1)})`} />
    </Svg>
  );
}

// --- animation helpers ---------------------------------------------------------------

/** Plays an entrance (0 → 1) each time the slide becomes active; static at 1 without motion. */
function useEntrance(active: boolean, motion: boolean, delay = 0, kind: "spring" | "timing" = "spring") {
  const t = useSharedValue(motion ? 0 : 1);
  useEffect(() => {
    if (!motion) {
      t.set(1);
      return;
    }
    if (!active) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    t.set(
      withDelay(
        delay,
        kind === "spring"
          ? withSpring(1, { damping: 11, stiffness: 160 })
          : withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [active, motion, delay, kind, t]);
  return t;
}

/** Absolutely placed layer (in 320-unit scene coordinates) with an entrance transform. */
function Place({
  s,
  x,
  y,
  w,
  h,
  active,
  motion,
  delay,
  from,
  kind,
  children,
  style,
}: SceneProps & {
  x: number;
  y: number;
  w: number;
  h: number;
  delay?: number;
  from?: { scale?: number; dx?: number; dy?: number; fade?: boolean };
  kind?: "spring" | "timing";
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const u = s / 320;
  const t = useEntrance(active, motion, delay, kind);
  const scale0 = from?.scale ?? 1;
  const dx = (from?.dx ?? 0) * u;
  const dy = (from?.dy ?? 0) * u;
  const fade = from?.fade ?? true;
  const anim = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: fade ? Math.min(1, Math.max(0, v * 1.5)) : 1,
      transform: [
        { translateX: dx * (1 - v) },
        { translateY: dy * (1 - v) },
        { scale: scale0 + (1 - scale0) * v },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: x * u, top: y * u, width: w * u, height: h * u }, anim, style]}
    >
      {children}
    </Animated.View>
  );
}

/** A character of size `c` (scene units) standing with its feet on `groundY`. */
function feet(c: number, centerX: number, groundY: number) {
  return { x: centerX - c / 2, y: groundY - (c * 184) / 200, w: c, h: c };
}

function useLoopValue(enabled: boolean, durationMs: number) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      cancelAnimation(v);
      v.set(0.45);
      return;
    }
    v.set(0);
    v.set(withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(v);
  }, [enabled, durationMs, v]);
  return v;
}

// --- scenes (320 × 320 units) ----------------------------------------------------------

function SceneCast(p: SceneProps) {
  const { s } = p;
  const c = 124;
  const anim = p.motion && p.active;
  return (
    <>
      <Svg width={s} height={s} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        <Path
          d="M0 262 L0 178 L28 178 L28 156 L58 156 L58 182 L80 164 L102 182 L102 146 L138 146 L138 186 L166 186 L166 160 L196 136 L226 160 L226 180 L252 180 L252 150 L284 150 L284 172 L320 172 L320 262 Z"
          fill={Colors.surfaceRaised}
        />
        {[
          [36, 166], [44, 166], [110, 156], [124, 156], [110, 170], [124, 170], [258, 160], [270, 160], [258, 174],
        ].map(([x, y]) => (
          <Rect key={`${x}-${y}`} x={x} y={y} width={7} height={8} rx={1.5} fill={Colors.border} />
        ))}
        <Rect x={0} y={262} width={320} height={5} fill={Colors.border} />
        {[16, 76, 136, 196, 256].map((x) => (
          <Rect key={x} x={x} y={276} width={34} height={4} rx={2} fill={Colors.surfaceRaised} />
        ))}
      </Svg>
      <Place {...p} {...feet(c, 70, 264)} delay={0} from={{ scale: 0.6 }}>
        <Hunter pose="idle" size={(c * s) / 320} animated={anim} />
      </Place>
      <Place {...p} {...feet(c, 160, 264)} delay={80} from={{ scale: 0.6 }}>
        <Runner pose="idle" size={(c * s) / 320} animated={anim} />
      </Place>
      <Place {...p} {...feet(c, 252, 264)} delay={160} from={{ scale: 0.6 }}>
        <Referee pose="idle" size={(c * s) / 320} animated={anim} mirrored />
      </Place>
    </>
  );
}

function SceneHeadStart(p: SceneProps) {
  const { s, active, motion } = p;
  const R = 116;
  const C = 2 * Math.PI * R;
  const dash = useSharedValue(motion ? C : 0);
  useEffect(() => {
    if (!motion) {
      dash.set(0);
      return;
    }
    if (!active) {
      cancelAnimation(dash);
      dash.set(C);
      return;
    }
    dash.set(withTiming(0, { duration: 2000, easing: Easing.linear }));
  }, [active, motion, C, dash]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: dash.get() }));
  const anim = motion && active;

  return (
    <>
      <Svg width={s} height={s} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        <Circle cx={160} cy={150} r={R} fill="none" stroke={Colors.surfaceRaised} strokeWidth={6} />
        <G transform="rotate(-90 160 150)">
          <AnimatedCircle
            cx={160}
            cy={150}
            r={R}
            fill="none"
            stroke={Colors.hunter}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            animatedProps={ringProps}
          />
        </G>
        <Circle
          cx={160}
          cy={150}
          r={100}
          fill={Colors.runner}
          fillOpacity={0.06}
          stroke={Colors.runner}
          strokeWidth={3}
          strokeDasharray="10 9"
        />
      </Svg>
      <Place {...p} {...feet(128, 172, 206)} delay={60} from={{ dx: -60 }} kind="timing">
        <Runner pose="run" size={(128 * s) / 320} animated={anim} />
      </Place>
      <Place {...p} {...feet(112, 58, 312)} delay={200} from={{ scale: 0.7 }}>
        <Hunter pose="wait" size={(112 * s) / 320} animated={anim} />
      </Place>
    </>
  );
}

function ScenePing(p: SceneProps) {
  const { s, active, motion } = p;
  const anim = motion && active;
  const t = useLoopValue(anim, 1600);
  const ringProps = useAnimatedProps(() => {
    const v = t.get();
    return { r: 70 * (0.4 + 1.2 * v), opacity: 0.8 * (1 - v) };
  });
  const dotProps = useAnimatedProps(() => ({
    opacity: anim ? 0.3 + 0.7 * (1 - Math.min(1, t.get() * 1.6)) : 1,
  }));

  return (
    <>
      <Svg width={s} height={s} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        <Rect x={30} y={34} width={260} height={230} rx={22} fill={Colors.surface} stroke={Colors.border} strokeWidth={2} />
        {[74, 118, 162, 206, 250].map((x) => (
          <Line key={`v${x}`} x1={x} y1={36} x2={x} y2={262} stroke={Colors.surfaceRaised} strokeWidth={2} />
        ))}
        {[78, 122, 166, 210].map((y) => (
          <Line key={`h${y}`} x1={32} y1={y} x2={288} y2={y} stroke={Colors.surfaceRaised} strokeWidth={2} />
        ))}
        <Path d="M32 140 Q120 120 170 170 T288 196" stroke={Colors.border} strokeWidth={8} fill="none" strokeLinecap="round" />
        <AnimatedCircle cx={160} cy={152} r={28} fill="none" stroke={Colors.runner} strokeWidth={3} animatedProps={ringProps} />
        {[
          [70, 74],
          [252, 92],
          [232, 226],
        ].map(([x, y]) => (
          <AnimatedCircle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={8}
            fill={Colors.runner}
            stroke={Colors.text}
            strokeWidth={2.5}
            animatedProps={dotProps}
          />
        ))}
      </Svg>
      <Place {...p} {...feet(132, 160, 236)} from={{ scale: 0.7 }}>
        <Referee pose="ping" size={(132 * s) / 320} animated={anim} />
      </Place>
      <Place {...p} {...feet(108, 266, 314)} delay={160} from={{ dx: 50 }} kind="timing">
        <Hunter pose="look" size={(108 * s) / 320} animated={anim} mirrored />
      </Place>
    </>
  );
}

function SceneZone(p: SceneProps) {
  const { s, active, motion } = p;
  const u = s / 320;
  const anim = motion && active;
  const shake = useSharedValue(0);
  const tint = useSharedValue(motion ? 0 : 1);
  useEffect(() => {
    if (!anim) {
      cancelAnimation(shake);
      cancelAnimation(tint);
      shake.set(0);
      tint.set(motion ? 0 : 1);
      return;
    }
    tint.set(0);
    tint.set(withDelay(600, withTiming(1, { duration: 250 })));
    shake.set(
      withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(6, { duration: 70 }),
            withTiming(-6, { duration: 140 }),
            withTiming(0, { duration: 70 }),
            withTiming(0, { duration: 700 }),
          ),
          -1,
        ),
      ),
    );
  }, [anim, motion, shake, tint]);
  const tintStyle = useAnimatedStyle(() => ({ opacity: 0.2 * tint.get() }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${shake.get()}deg` }] }));

  return (
    <>
      <Svg width={s} height={s} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        <Circle
          cx={10}
          cy={170}
          r={196}
          fill={Colors.runner}
          fillOpacity={0.06}
          stroke={Colors.runner}
          strokeWidth={3}
          strokeDasharray="10 9"
        />
        <Rect x={0} y={282} width={320} height={4} fill={Colors.border} />
      </Svg>
      <Place {...p} {...feet(126, 222, 284)} delay={40} from={{ dx: -70, fade: false }} kind="timing">
        <View>
          <Runner pose="run" size={(126 * s) / 320} animated={anim} />
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { margin: 28 * u, marginTop: 18 * u, borderRadius: 999, backgroundColor: Colors.danger },
              tintStyle,
            ]}
          />
        </View>
      </Place>
      <Place {...p} x={236} y={26} w={64} h={64} delay={500} from={{ scale: 0 }}>
        <Animated.View style={[styles.badge, { borderRadius: 32 * u }, badgeStyle]}>
          <AppText style={{ fontSize: 26 * u, fontWeight: "900" }} color={Colors.text} allowFontScaling={false}>
            30
          </AppText>
        </Animated.View>
      </Place>
      <Place {...p} {...feet(112, 74, 284)} delay={120} from={{ scale: 0.7 }}>
        <Referee pose="whistle" size={(112 * s) / 320} animated={anim} />
      </Place>
    </>
  );
}

function SceneTag(p: SceneProps) {
  const { s } = p;
  const anim = p.motion && p.active;
  return (
    <>
      <Svg width={s} height={s} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        <Rect x={0} y={290} width={320} height={4} fill={Colors.border} />
      </Svg>
      <Place {...p} {...feet(134, 236, 292)} from={{ scale: 0.85 }}>
        <Runner pose="caught" size={(134 * s) / 320} animated={anim} mirrored />
      </Place>
      <Place {...p} {...feet(134, 112, 292)} delay={80} from={{ dx: -120 }} kind="timing">
        <Hunter pose="point" size={(134 * s) / 320} animated={anim} />
      </Place>
      <Place {...p} x={204} y={34} w={64} h={64} delay={650} from={{ scale: 0 }}>
        <Svg width="100%" height="100%" viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={29} fill={Colors.hunter} stroke={Colors.background} strokeWidth={3} />
          <Path d="M19 33 L28 42 L45 23" stroke={Colors.onAccent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Place>
    </>
  );
}

function ScenePodium(p: SceneProps) {
  const { s } = p;
  const u = s / 320;
  const anim = p.motion && p.active;
  const steps = [
    { place: 2, x: 22, top: 222, color: Colors.runner },
    { place: 1, x: 116, top: 194, color: Colors.hunter },
    { place: 3, x: 210, top: 244, color: Colors.textMuted },
  ];
  return (
    <>
      <Place {...p} x={0} y={0} w={320} h={320} from={{ dy: 40 }} kind="timing">
        <Svg width={s} height={s} viewBox="0 0 320 320">
          {steps.map((st) => (
            <G key={st.place}>
              <Rect x={st.x} y={st.top} width={88} height={300 - st.top} rx={10} fill={Colors.surfaceRaised} stroke={Colors.border} strokeWidth={2} />
              <Rect x={st.x} y={st.top} width={88} height={8} rx={4} fill={st.color} />
            </G>
          ))}
          <Rect x={10} y={298} width={300} height={4} rx={2} fill={Colors.border} />
        </Svg>
        {steps.map((st) => (
          <AppText
            key={st.place}
            style={[styles.podiumNumber, { left: st.x * u, top: (st.top + 18) * u, width: 88 * u, fontSize: 30 * u }]}
            color={Colors.textMuted}
            allowFontScaling={false}
          >
            {st.place}
          </AppText>
        ))}
      </Place>
      <Place {...p} {...feet(104, 160, 196)} delay={380} from={{ dy: -30 }}>
        <Hunter pose="cheer" size={(104 * s) / 320} animated={anim} />
      </Place>
      <Place {...p} {...feet(100, 66, 224)} delay={460} from={{ dy: -30 }}>
        <Runner pose="cheer" size={(100 * s) / 320} animated={anim} />
      </Place>
      <Place {...p} {...feet(98, 254, 246)} delay={540} from={{ dy: -30 }}>
        <Referee pose="trophy" size={(98 * s) / 320} animated={anim} mirrored />
      </Place>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: { height: 48, paddingHorizontal: Spacing.md, alignItems: "flex-end", justifyContent: "center" },
  skip: { minHeight: 48, minWidth: 64, paddingHorizontal: Spacing.md, alignItems: "center", justifyContent: "center" },
  hidden: { opacity: 0 },
  pager: { flex: 1 },
  slide: { alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.lg },
  copy: { alignSelf: "stretch", gap: Spacing.sm },
  title: { fontSize: 30, lineHeight: 36 },
  body: { lineHeight: 23 },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.lg },
  dots: { flexDirection: "row", gap: 6, alignSelf: "center", alignItems: "center", height: 8 },
  dot: { height: 6, borderRadius: Radius.pill },
  badge: {
    flex: 1,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.background,
  },
  podiumNumber: { position: "absolute", textAlign: "center", fontWeight: "900" },
});
