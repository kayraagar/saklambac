// Çevik, the runner: cyan egg in a fox-ear hoodie, headband ribbons, white sneakers.
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from "react-native-svg";

import {
  Capsule,
  CharacterFrame,
  ClosedEye,
  Eye,
  GroundShadow,
  INK,
  OpenMouth,
  outline,
  REFEREE,
  RUNNER,
  useBlink,
  useMotion,
  useSvgId,
  WHITE,
  type CharacterProps,
} from "./parts";

export type RunnerPose = "idle" | "run" | "hide" | "caught" | "cheer";

const BODY = "M100 62 C140 62 150 120 140 150 C132 172 68 172 60 150 C50 120 60 62 100 62 Z";

type PoseSpec = {
  lean: number;
  armBack: number;
  armFront: number;
  legBack: number;
  legFront: number;
  ribbons: number;
  legsDrop: number;
};
const POSES: Record<RunnerPose, PoseSpec> = {
  idle: { lean: 8, armBack: 12, armFront: -12, legBack: 4, legFront: -4, ribbons: -24, legsDrop: 0 },
  run: { lean: 12, armBack: -50, armFront: 48, legBack: 40, legFront: -35, ribbons: -6, legsDrop: 4 },
  hide: { lean: 0, armBack: 10, armFront: -10, legBack: 0, legFront: 0, ribbons: -24, legsDrop: 0 },
  caught: { lean: 0, armBack: 146, armFront: -158, legBack: 4, legFront: -4, ribbons: -30, legsDrop: 0 },
  cheer: { lean: 6, armBack: 128, armFront: -145, legBack: 8, legFront: -8, ribbons: -30, legsDrop: 0 },
};

function Leg({ x, deg, fill }: { x: number; deg: number; fill: string }) {
  const hip = 154;
  return (
    <G transform={`rotate(${deg} ${x} ${hip})`}>
      <Rect x={x - 8} y={hip - 4} width={16} height={30} rx={8} fill={fill} {...outline} />
      <Ellipse cx={x + 4} cy={hip + 24} rx={12} ry={6.5} fill={WHITE} {...outline} />
      <Rect x={x - 3} y={hip + 20} width={10} height={3} rx={1.5} fill={RUNNER.shade} />
    </G>
  );
}

function Ribbon({ d }: { d: string }) {
  return (
    <G>
      <Path d={d} stroke={INK} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={RUNNER.shade} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  );
}

export function Runner({ pose = "idle", size = 160, animated = true, mirrored }: CharacterProps<RunnerPose>) {
  const motion = useMotion(animated);
  const blink = useBlink(motion && (pose === "idle" || pose === "run" || pose === "hide"), 3400);
  const clip = useSvgId("cevik");
  const p = POSES[pose];
  const look = pose === "hide" ? 3.5 : 2;

  return (
    <CharacterFrame
      size={size}
      mirrored={mirrored}
      loop={motion ? (pose === "run" ? "bob" : pose === "cheer" ? "jump" : null) : null}
    >
      <Defs>
        <ClipPath id={clip}>
          <Path d={BODY} />
        </ClipPath>
      </Defs>
      {pose === "hide" ? null : <GroundShadow rx={pose === "run" ? 38 : 44} />}

      {/* legs stay planted; the upper body leans around the hips */}
      <G transform={`translate(0 ${p.legsDrop})`}>
        <Leg x={88} deg={p.legBack} fill={RUNNER.shade} />
      </G>

      <G transform={`rotate(${p.lean} 100 158)`}>
        {/* headband ribbons trail behind */}
        <G transform={`rotate(${p.ribbons} 66 82)`}>
          <Ribbon d="M66 80 L50 73 L36 79" />
          <Ribbon d="M66 84 L52 91 L38 87" />
        </G>

        {/* fox-hood ears */}
        <Path d="M78 70 L84 48 L96 64 Z" fill={RUNNER.base} {...outline} />
        <Path d="M104 64 L116 46 L122 70 Z" fill={RUNNER.base} {...outline} />
        <Path d="M84 64 L86 55 L91 63 Z" fill={RUNNER.shade} />
        <Path d="M109 63 L115 53 L117 65 Z" fill={RUNNER.shade} />

        <Capsule x={68} y={122} w={14} h={36} deg={p.armBack} fill={RUNNER.shade} />

        {/* body + back-side shade + headband, clipped to the egg */}
        <Path d={BODY} fill={RUNNER.base} />
        <G clipPath={`url(#${clip})`}>
          <Circle cx={40} cy={152} r={38} fill={RUNNER.shade} />
          <Rect x={50} y={76} width={100} height={9} fill={RUNNER.shade} />
        </G>
        <Path d={BODY} fill="none" {...outline} />

        {/* face */}
        {pose === "caught" ? (
          <G>
            <ClosedEye cx={90} cy={106} up={false} />
            <ClosedEye cx={114} cy={106} up={false} />
            <Ellipse cx={103} cy={125} rx={4.5} ry={5.5} fill={INK} />
            <Path
              d="M138 70 Q145 82 138 87 Q131 82 138 70 Z"
              fill={WHITE}
              stroke={INK}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </G>
        ) : (
          <G>
            <Eye cx={90} cy={104} look={look} lidColor={RUNNER.base} blink={blink} />
            <Eye cx={114} cy={104} look={look} lidColor={RUNNER.base} blink={blink} />
            <Path d="M82 90 Q90 85 98 90" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <Path d="M106 90 Q114 85 122 90" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          </G>
        )}
        {pose === "cheer" ? <OpenMouth cx={104} cy={124} w={20} /> : null}

        <Capsule x={132} y={122} w={14} h={36} deg={p.armFront} fill={RUNNER.base} />
      </G>

      <G transform={`translate(0 ${p.legsDrop})`}>
        <Leg x={112} deg={p.legFront} fill={RUNNER.base} />
      </G>

      {pose === "hide" ? (
        <G>
          {/* peeking over a wall: fingertips on the ledge */}
          <Rect x={12} y={118} width={176} height={70} rx={12} fill={REFEREE.body} stroke={REFEREE.border} strokeWidth={3} />
          <Path
            d="M14 142 L186 142 M14 165 L186 165 M60 118 L60 142 M120 118 L120 142 M90 142 L90 165 M150 142 L150 165 M40 165 L40 186 M110 165 L110 186 M170 165 L170 186"
            stroke={REFEREE.border}
            strokeWidth={3}
          />
          <Rect x={70} y={110} width={16} height={12} rx={6} fill={RUNNER.shade} {...outline} />
          <Rect x={114} y={110} width={16} height={12} rx={6} fill={RUNNER.base} {...outline} />
        </G>
      ) : null}
    </CharacterFrame>
  );
}
