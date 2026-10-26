// Doğan, the hunter: lime bean with a cap and a visor pointing where he looks.
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from "react-native-svg";

import {
  Capsule,
  CharacterFrame,
  ClosedEye,
  Eye,
  GroundShadow,
  HUNTER,
  INK,
  OpenMouth,
  outline,
  PROP_DARK,
  PROP_LIGHT,
  SHOE,
  useBlink,
  useMotion,
  useSvgId,
  WHITE,
  type CharacterProps,
} from "./parts";

export type HunterPose = "idle" | "wait" | "look" | "point" | "cheer";

const SHOULDER_BACK = { x: 64, y: 112 };
const SHOULDER_FRONT = { x: 136, y: 112 };

/** Arm angles (deg, clockwise) and whether the back arm sits in front of the body. */
const ARMS: Record<HunterPose, { back: number; front: number; backInFront: boolean }> = {
  idle: { back: 22, front: -10, backInFront: false },
  wait: { back: -116, front: 125, backInFront: true }, // hands over the eyes
  look: { back: 22, front: 135, backInFront: false }, // front hand holds the binoculars
  point: { back: 22, front: -80, backInFront: false },
  cheer: { back: 138, front: -160, backInFront: false },
};

export function Hunter({ pose = "idle", size = 160, animated = true, mirrored }: CharacterProps<HunterPose>) {
  const motion = useMotion(animated);
  const blink = useBlink(motion && (pose === "idle" || pose === "point" || pose === "cheer"));
  const clip = useSvgId("dogan");
  const arms = ARMS[pose];

  const backArm = (
    <Capsule x={SHOULDER_BACK.x} y={SHOULDER_BACK.y} w={16} h={46} deg={arms.back} fill={HUNTER.shade} />
  );
  const frontArm = (
    <Capsule x={SHOULDER_FRONT.x} y={SHOULDER_FRONT.y} w={16} h={46} deg={arms.front} fill={HUNTER.base} />
  );

  return (
    <CharacterFrame size={size} mirrored={mirrored} loop={motion && pose === "cheer" ? "jump" : null}>
      <Defs>
        <ClipPath id={clip}>
          <Rect x={60} y={70} width={80} height={100} rx={40} />
        </ClipPath>
      </Defs>
      <GroundShadow rx={46} />

      {arms.backInFront ? null : backArm}

      {/* legs + shoes */}
      <Rect x={78} y={158} width={18} height={26} rx={9} fill={HUNTER.shade} {...outline} />
      <Rect x={104} y={158} width={18} height={26} rx={9} fill={HUNTER.base} {...outline} />
      <Ellipse cx={91} cy={180} rx={14} ry={7} fill={SHOE} {...outline} />
      <Ellipse cx={117} cy={180} rx={14} ry={7} fill={SHOE} {...outline} />

      {/* body with a back-side shade for volume */}
      <Rect x={60} y={70} width={80} height={100} rx={40} fill={HUNTER.base} />
      <G clipPath={`url(#${clip})`}>
        <Circle cx={42} cy={148} r={38} fill={HUNTER.shade} />
        <Rect x={60} y={78} width={80} height={7} fill={HUNTER.shade} opacity={0.55} />
      </G>
      <Rect x={60} y={70} width={80} height={100} rx={40} fill="none" {...outline} />

      {/* cap: dome + visor + button */}
      <Rect x={118} y={70} width={38} height={10} rx={5} fill={HUNTER.shade} {...outline} />
      <Path d="M58 78 A42 42 0 0 1 142 78 Z" fill={HUNTER.shade} {...outline} />
      <Path d="M100 39 L100 76" stroke={INK} strokeWidth={2} opacity={0.35} />
      <Circle cx={100} cy={36} r={4.5} fill={HUNTER.shade} {...outline} />

      {/* face */}
      {pose === "wait" ? (
        <G>
          <ClosedEye cx={92} cy={99} up={false} />
          <ClosedEye cx={116} cy={99} up={false} />
        </G>
      ) : (
        <G>
          <Eye cx={92} cy={99} lidColor={HUNTER.base} blink={blink} />
          <Eye cx={116} cy={99} lidColor={HUNTER.base} blink={blink} />
          <Rect x={83} y={83} width={18} height={5} rx={2.5} fill={INK} transform="rotate(12 92 85.5)" />
          <Rect x={107} y={83} width={18} height={5} rx={2.5} fill={INK} transform="rotate(-12 116 85.5)" />
        </G>
      )}
      {pose === "cheer" ? <OpenMouth cx={106} cy={120} w={22} /> : null}

      {arms.backInFront ? backArm : null}
      {frontArm}

      {pose === "look" ? (
        <G>
          <Rect x={92} y={93} width={26} height={10} rx={4} fill={PROP_DARK} {...outline} />
          <Circle cx={92} cy={99} r={11} fill={PROP_DARK} {...outline} />
          <Circle cx={118} cy={99} r={11} fill={PROP_DARK} {...outline} />
          <Circle cx={93} cy={99} r={6} fill={PROP_LIGHT} />
          <Circle cx={119} cy={99} r={6} fill={PROP_LIGHT} />
          <Circle cx={95} cy={96.5} r={1.8} fill={WHITE} />
          <Circle cx={121} cy={96.5} r={1.8} fill={WHITE} />
        </G>
      ) : null}
    </CharacterFrame>
  );
}
