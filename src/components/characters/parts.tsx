// Shared building blocks for the cartoon cast (Doğan, Çevik, Düdük).
// Every character draws in a 200×200 viewBox, ground line at y = 184, facing right.
import { useEffect, useId, type ReactNode } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

export const INK = "#0E1116";
export const STROKE = 3;
export const WHITE = "#F2F4F7";
export const SHOE = "#202631";
export const LIMB = "#9AA3B2";
export const PROP_DARK = "#202631";
export const PROP_LIGHT = "#3A4352";
export const DANGER = "#FF5A5F";

export const HUNTER = { base: "#C8F135", shade: "#9DBF1F" } as const;
export const RUNNER = { base: "#3DD6F5", shade: "#22A9C7" } as const;
export const REFEREE = { body: "#202631", border: "#2A313D", screen: "#0E1116" } as const;

export type CharacterProps<P> = {
  pose?: P;
  /** Rendered width and height in px. Default 160. */
  size?: number;
  /** Idle loops (blink, bob, rings). Default true; always off with reduced motion. */
  animated?: boolean;
  /** Face left instead of right. */
  mirrored?: boolean;
};

/** Outline props for the outer silhouette. */
export const outline = { stroke: INK, strokeWidth: STROKE, strokeLinejoin: "round" as const };

export const AnimatedRect = Animated.createAnimatedComponent(Rect);
export const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Loops are allowed: the caller wants them and the OS doesn't ask for reduced motion. */
export function useMotion(animated: boolean | undefined): boolean {
  const reduced = useReducedMotion();
  return animated !== false && !reduced;
}

/** SVG-safe unique id (React ids contain colons). */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** 0 → 1 → 0 blink pulse every `periodMs`. */
export function useBlink(enabled: boolean, periodMs = 3000): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      v.set(0);
      return;
    }
    v.set(
      withRepeat(
        withSequence(
          withDelay(periodMs - 180, withTiming(1, { duration: 90 })),
          withTiming(0, { duration: 90 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(v);
  }, [enabled, periodMs, v]);
  return v;
}

/** 0 → 1 linear loop (for rings and sweeps). */
export function useLoop(enabled: boolean, durationMs: number): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      v.set(0);
      return;
    }
    v.set(withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(v);
  }, [enabled, durationMs, v]);
  return v;
}

export type FrameLoop = "bob" | "jump" | null;

/** Sized Svg canvas with optional mirroring and a whole-body loop (bob/jump). */
export function CharacterFrame({
  size = 160,
  mirrored,
  loop,
  children,
}: {
  size?: number;
  mirrored?: boolean;
  loop: FrameLoop;
  children: ReactNode;
}) {
  const y = useSharedValue(0);
  const unit = size / 200;
  useEffect(() => {
    if (!loop) {
      y.set(0);
      return;
    }
    if (loop === "bob") {
      y.set(
        withRepeat(
          withSequence(
            withTiming(-4 * unit, { duration: 200, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
          ),
          -1,
        ),
      );
    } else {
      y.set(
        withRepeat(
          withSequence(
            withTiming(-6 * unit, { duration: 200, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 500 }),
          ),
          -1,
        ),
      );
    }
    return () => cancelAnimation(y);
  }, [loop, unit, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {mirrored ? <G transform="scale(-1,1) translate(-200,0)">{children}</G> : children}
      </Svg>
    </Animated.View>
  );
}

/** Soft contact shadow on the ground line. */
export function GroundShadow({ rx = 44 }: { rx?: number }) {
  return <Ellipse cx={100} cy={185} rx={rx} ry={6} fill="#000" opacity={0.35} />;
}

/**
 * The shared cartoon eye: white oval, ink pupil looking forward, highlight dot.
 * With `blink`, a lid in `lidColor` (the body colour) sweeps down over it.
 */
export function Eye({
  cx,
  cy,
  rx = 9,
  ry = 11,
  look = 2,
  lidColor,
  blink,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  look?: number;
  lidColor: string;
  blink?: SharedValue<number>;
}) {
  const lidProps = useAnimatedProps(() => ({ height: (blink ? blink.get() : 0) * (ry * 2 + 3) }));
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={WHITE} />
      <Circle cx={cx + look} cy={cy + 1} r={5} fill={INK} />
      <Circle cx={cx + look + 1.8} cy={cy - 1.8} r={1.5} fill={WHITE} />
      {blink ? (
        <AnimatedRect
          x={cx - rx - 1.5}
          y={cy - ry - 1.5}
          width={rx * 2 + 3}
          height={0}
          fill={lidColor}
          animatedProps={lidProps}
        />
      ) : null}
    </G>
  );
}

/** Closed / happy eye: an ink arc. `up` = ∩ (happy), otherwise ^-shaped squeeze. */
export function ClosedEye({ cx, cy, w = 16, up = true }: { cx: number; cy: number; w?: number; up?: boolean }) {
  const d = up
    ? `M${cx - w / 2} ${cy + 3} Q${cx} ${cy - 7} ${cx + w / 2} ${cy + 3}`
    : `M${cx - w / 2} ${cy + 4} L${cx} ${cy - 4} L${cx + w / 2} ${cy + 4}`;
  return <Path d={d} stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

/** Open cheering mouth with a little tongue. */
export function OpenMouth({ cx, cy, w = 22 }: { cx: number; cy: number; w?: number }) {
  return (
    <G>
      <Path d={`M${cx - w / 2} ${cy} Q${cx} ${cy + w * 0.75} ${cx + w / 2} ${cy} Z`} fill={INK} strokeLinejoin="round" stroke={INK} strokeWidth={2} />
      <Ellipse cx={cx + 1} cy={cy + w * 0.3} rx={w * 0.22} ry={w * 0.12} fill={DANGER} />
    </G>
  );
}

/** A capsule limb rotated around its top pivot (x, y). */
export function Capsule({
  x,
  y,
  w,
  h,
  deg,
  fill,
  inset = 6,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  deg: number;
  fill: string;
  /** How far the capsule starts above the pivot. */
  inset?: number;
}) {
  return (
    <Rect
      x={x - w / 2}
      y={y - inset}
      width={w}
      height={h}
      rx={w / 2}
      fill={fill}
      {...outline}
      transform={`rotate(${deg} ${x} ${y})`}
    />
  );
}
