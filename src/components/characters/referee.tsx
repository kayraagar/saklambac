// Düdük, the referee phone: face on the screen, striped "hakem" band, whistle on a lanyard.
import { useAnimatedProps, type SharedValue } from "react-native-reanimated";
import { Circle, G, Path, Rect } from "react-native-svg";

import {
  AnimatedCircle,
  AnimatedRect,
  CharacterFrame,
  GroundShadow,
  HUNTER,
  INK,
  LIMB,
  outline,
  REFEREE,
  RUNNER,
  useBlink,
  useLoop,
  useMotion,
  WHITE,
  type CharacterProps,
} from "./parts";

export type RefereePose = "idle" | "ping" | "whistle" | "trophy";

const limb = { stroke: LIMB, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function PillEye({ x, blink, squint }: { x: number; blink: SharedValue<number>; squint?: boolean }) {
  const h = squint ? 9 : 16;
  const y = squint ? 90 : 84;
  const props = useAnimatedProps(() => {
    const b = blink.get();
    return { height: h - (h - 3) * b, y: y + ((h - 3) * b) / 2 };
  });
  return <AnimatedRect x={x} y={y} width={10} height={h} rx={5} fill={HUNTER.base} animatedProps={props} />;
}

function Ring({ loop, offset, active }: { loop: SharedValue<number>; offset: number; active: boolean }) {
  const props = useAnimatedProps(() => {
    const t = (loop.get() + offset) % 1;
    return { r: 6 + 24 * t, opacity: active ? 0.9 * (1 - t) : 0 };
  });
  return (
    <AnimatedCircle cx={100} cy={108} r={6} fill="none" stroke={RUNNER.base} strokeWidth={2.5} animatedProps={props} />
  );
}

function Whistle({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect x={x - 17} y={y - 4} width={13} height={7} rx={2} fill={WHITE} stroke={INK} strokeWidth={2} />
      <Circle cx={x} cy={y} r={7} fill={WHITE} stroke={INK} strokeWidth={2} />
      <Circle cx={x} cy={y} r={2.2} fill={INK} />
    </G>
  );
}

function Stopwatch() {
  return (
    <G>
      <Rect x={153} y={124} width={10} height={7} rx={2} fill={WHITE} {...outline} />
      <Circle cx={158} cy={144} r={13} fill={WHITE} {...outline} />
      <Path d="M158 144 L158 136 M158 144 L164 147" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={158} cy={144} r={2} fill={INK} />
    </G>
  );
}

function Trophy() {
  return (
    <G>
      <Path d="M146 54 Q136 54 139 63 Q141 69 149 68" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
      <Path d="M146 54 Q136 54 139 63 Q141 69 149 68" stroke={HUNTER.shade} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M170 54 Q180 54 177 63 Q175 69 167 68" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
      <Path d="M170 54 Q180 54 177 63 Q175 69 167 68" stroke={HUNTER.shade} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Rect x={154} y={70} width={8} height={10} fill={HUNTER.shade} {...outline} />
      <Rect x={146} y={78} width={24} height={7} rx={2.5} fill={HUNTER.base} {...outline} />
      <Path d="M144 50 L172 50 L170 62 Q166 74 158 74 Q150 74 146 62 Z" fill={HUNTER.base} {...outline} />
      <Path d="M151 55 L152 63" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
    </G>
  );
}

export function Referee({ pose = "idle", size = 160, animated = true, mirrored }: CharacterProps<RefereePose>) {
  const motion = useMotion(animated);
  const blink = useBlink(motion && (pose === "idle" || pose === "whistle"));
  const rings = useLoop(motion && pose === "ping", 1600);

  return (
    <CharacterFrame size={size} mirrored={mirrored} loop={motion && pose === "trophy" ? "jump" : null}>
      <GroundShadow rx={40} />

      {/* noodle legs */}
      <Path d="M88 168 L88 182 L96 182" {...limb} />
      <Path d="M112 168 L112 182 L120 182" {...limb} />

      {/* arms that sit behind the body edge */}
      {pose === "idle" ? (
        <G>
          <Path d="M66 112 Q48 124 50 146" {...limb} />
          <Path d="M134 112 Q152 120 152 136" {...limb} />
        </G>
      ) : pose === "ping" ? (
        <G>
          <Path d="M66 108 Q46 98 40 78" {...limb} />
          <Path d="M134 108 Q154 98 160 78" {...limb} />
        </G>
      ) : pose === "trophy" ? (
        <G>
          <Path d="M66 108 Q46 100 42 82" {...limb} />
          <Path d="M134 108 Q152 100 156 84" {...limb} />
        </G>
      ) : (
        <Path d="M66 112 Q48 124 50 146" {...limb} />
      )}

      {/* phone body */}
      <Rect x={62} y={40} width={76} height={136} rx={18} fill={REFEREE.body} stroke={REFEREE.border} strokeWidth={3} />
      <Rect x={137} y={72} width={4} height={18} rx={2} fill={REFEREE.border} />
      <Rect x={66} y={58} width={3} height={36} rx={1.5} fill={REFEREE.border} />
      <Rect x={70} y={52} width={60} height={104} rx={10} fill={REFEREE.screen} />

      {/* referee stripes */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Rect key={i} x={78 + i * 8} y={58} width={4} height={6} rx={1} fill={WHITE} opacity={0.85} />
      ))}

      {/* screen face */}
      {pose === "ping" ? (
        <G>
          <Circle cx={100} cy={108} r={10} fill="none" stroke={RUNNER.base} strokeWidth={2} opacity={0.5} />
          <Circle cx={100} cy={108} r={20} fill="none" stroke={RUNNER.base} strokeWidth={2} opacity={0.35} />
          <Circle cx={100} cy={108} r={28} fill="none" stroke={RUNNER.base} strokeWidth={2} opacity={0.22} />
          <Path d="M100 108 L100 80 A28 28 0 0 1 124 94 Z" fill={RUNNER.base} opacity={0.3} />
          <Ring loop={rings} offset={0} active={motion} />
          <Ring loop={rings} offset={1 / 3} active={motion} />
          <Ring loop={rings} offset={2 / 3} active={motion} />
          <Circle cx={113} cy={95} r={3.5} fill={RUNNER.base} />
          <Circle cx={88} cy={120} r={3} fill={RUNNER.base} opacity={0.8} />
          <Circle cx={100} cy={108} r={3} fill={RUNNER.base} />
        </G>
      ) : pose === "trophy" ? (
        <G>
          <Path d="M84 96 Q89 87 94 96" stroke={HUNTER.base} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M106 96 Q111 87 116 96" stroke={HUNTER.base} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M88 110 Q100 128 112 110 Z" fill={HUNTER.base} strokeLinejoin="round" />
        </G>
      ) : pose === "whistle" ? (
        <G>
          <PillEye x={84} blink={blink} squint />
          <PillEye x={106} blink={blink} squint />
          <Circle cx={80} cy={114} r={5} fill={HUNTER.base} opacity={0.45} />
          <Circle cx={122} cy={106} r={5} fill={HUNTER.base} opacity={0.45} />
        </G>
      ) : (
        <G>
          <PillEye x={84} blink={blink} />
          <PillEye x={106} blink={blink} />
          <Path d="M90 114 Q100 123 110 114" stroke={HUNTER.base} strokeWidth={4} strokeLinecap="round" fill="none" />
        </G>
      )}

      {/* lanyard + whistle (raised to the mouth in `whistle`) */}
      {pose === "whistle" ? (
        <G>
          <Path d="M72 46 Q70 104 100 120" stroke={LIMB} strokeWidth={2} fill="none" />
          <Whistle x={112} y={121} />
          <Path d="M134 114 Q132 136 116 126" {...limb} />
          <Path d="M148 94 L160 86 M150 108 L164 108 M148 122 L160 130" stroke={WHITE} strokeWidth={3.5} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d="M70 50 Q72 140 92 163 M130 50 Q128 140 108 163" stroke={LIMB} strokeWidth={2} fill="none" />
          <Whistle x={104} y={165} />
        </G>
      )}

      {pose === "idle" ? <Stopwatch /> : null}
      {pose === "trophy" ? <Trophy /> : null}
    </CharacterFrame>
  );
}
