import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import timing from "./timing.json";
import guion from "../scripts/guion.json";

// ── Scenes ────────────────────────────────────────────────────────────────────
import { Gancho }                from "./scenes/Gancho";
import { Contexto }              from "./scenes/Contexto";
import { DecisionTitle }         from "./scenes/DecisionTitle";
import { MemoryScene }           from "./scenes/MemoryScene";
import { RamScene }              from "./scenes/RamScene";
import { CodeScene }             from "./scenes/CodeScene";
import { ImpactScene1 }          from "./scenes/ImpactScene1";
import { ThreatResponseScene }   from "./scenes/ThreatResponseScene";
import { CertScene }             from "./scenes/CertScene";
import { CompareScene }          from "./scenes/CompareScene";
import { ImpactCounterScene }    from "./scenes/ImpactCounterScene";
import { ArchLayersScene }       from "./scenes/ArchLayersScene";
import { JointVentureScene }     from "./scenes/JointVentureScene";
import { S60TimelineScene }      from "./scenes/S60TimelineScene";
import { S60VersionsScene }      from "./scenes/S60VersionsScene";
import { QtDiagramScene }        from "./scenes/QtDiagramScene";
import { QtComparisonScene }     from "./scenes/QtComparisonScene";
import { QtInvestmentScene }     from "./scenes/QtInvestmentScene";
import { ExecOrgScene }          from "./scenes/ExecOrgScene";
import { NokiaSuccessScene }     from "./scenes/NokiaSuccessScene";
import { ModelCompareScene }     from "./scenes/ModelCompareScene";
import { TransitionScene }       from "./scenes/TransitionScene";
import { OptionsScene }          from "./scenes/OptionsScene";
import { MarketCollapseScene }   from "./scenes/MarketCollapseScene";
import { LegacyScene }           from "./scenes/LegacyScene";
import { FinalScene }            from "./scenes/FinalScene";
import { OrgChartScene }         from "./scenes/OrgChartScene";
import { AppRaceScene }          from "./scenes/AppRaceScene";
import { DecisionTimelineScene } from "./scenes/DecisionTimelineScene";

const FPS = 30;
const FADE_FRAMES = 15;

// IDs that use DecisionTitle
const DECISION_IDS = new Set(["03", "08", "13", "18", "23", "28"]);

type ParrafoProps = { texto: string; durationInFrames: number };

const Parrafo: React.FC<ParrafoProps> = ({ texto, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 120px", opacity }}>
      <p style={{
        fontFamily: "Inter, sans-serif", color: "#e2e8f0",
        fontSize: 30, fontWeight: "normal",
        textAlign: "center", lineHeight: 1.7, margin: 0,
      }}>
        {texto}
      </p>
    </AbsoluteFill>
  );
};

export const NokiaVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
    {guion.map((item) => {
      const key = `parrafo-${item.id}` as keyof typeof timing;
      const entry = timing[key];
      if (!entry) return null;

      const fromFrame = Math.round(entry.start * FPS);
      const durationInFrames = Math.ceil(entry.duration * FPS);

      // Helper: wrap scene with audio
      const wrap = (Scene: React.FC) => (
        <Sequence key={key} from={fromFrame} durationInFrames={durationInFrames}>
          <Audio src={staticFile(`audio/${key}.mp3`)} />
          <Scene />
        </Sequence>
      );

      // ── ESCENA 1: Cinematic opening ──────────────────────────────────────
      if (item.id === "01") return (
        <Sequence key={key} from={fromFrame} durationInFrames={durationInFrames}>
          <Audio src={staticFile(`audio/${key}.mp3`)} />
          <Gancho />
        </Sequence>
      );

      // ── ESCENA 2: Context ────────────────────────────────────────────────
      if (item.id === "02") return wrap(Contexto);

      // ── ESCENA 3: Decision titles ────────────────────────────────────────
      if (DECISION_IDS.has(item.id)) return (
        <Sequence key={key} from={fromFrame} durationInFrames={durationInFrames}>
          <Audio src={staticFile(`audio/${key}.mp3`)} />
          <DecisionTitle texto={item.texto} />
        </Sequence>
      );

      // ── ESCENA 4: Memory model ───────────────────────────────────────────
      if (item.id === "04") return wrap(MemoryScene);

      // ── ESCENA 5: RAM comparison ─────────────────────────────────────────
      if (item.id === "05") return wrap(RamScene);

      // ── ESCENA 6: L-functions code ───────────────────────────────────────
      if (item.id === "06") return wrap(CodeScene);

      // ── ESCENA 7: Engineer productivity ─────────────────────────────────
      if (item.id === "07") return wrap(ImpactScene1);

      // ── ESCENA 16: Threat vs response ───────────────────────────────────
      if (item.id === "10") return wrap(ThreatResponseScene);

      // ── ESCENA 8: Cert flow ──────────────────────────────────────────────
      if (item.id === "09") return wrap(CertScene);

      // ── ESCENA 9: Cost comparison ────────────────────────────────────────
      if (item.id === "11") return wrap(CompareScene);

      // ── ESCENA 17: 75% counter ──────────────────────────────────────────
      if (item.id === "12") return wrap(ImpactCounterScene);

      // ── ESCENA 10: Architecture layers ──────────────────────────────────
      if (item.id === "14") return wrap(ArchLayersScene);

      // ── ESCENA 18: Joint venture diagram ────────────────────────────────
      if (item.id === "15") return wrap(JointVentureScene);

      // ── ESCENA 11: S60 fragmentation timeline ───────────────────────────
      if (item.id === "16") return wrap(S60TimelineScene);

      // ── ESCENA 19: S60 4 versions side by side ──────────────────────────
      if (item.id === "17") return wrap(S60VersionsScene);

      // ── ESCENA 20: Qt diagram ────────────────────────────────────────────
      if (item.id === "19") return wrap(QtDiagramScene);

      // ── ESCENA 21: Qt vs S60 comparison ─────────────────────────────────
      if (item.id === "20") return wrap(QtComparisonScene);

      // ── ESCENA 12: App ecosystem race chart ─────────────────────────────
      if (item.id === "21") return wrap(AppRaceScene);

      // ── ESCENA 22: Qt investment lost ───────────────────────────────────
      if (item.id === "22") return wrap(QtInvestmentScene);

      // ── ESCENA 23: Executive org chart ──────────────────────────────────
      if (item.id === "24") return wrap(ExecOrgScene);

      // ── ESCENA 24: Nokia success timeline ───────────────────────────────
      if (item.id === "25") return wrap(NokiaSuccessScene);

      // ── ESCENA 13: Org chart / blocked signals ───────────────────────────
      if (item.id === "26") return wrap(OrgChartScene);

      // ── ESCENA 25: Model volume comparison ──────────────────────────────
      if (item.id === "27") return wrap(ModelCompareScene);

      // ── ESCENA 26: WP transition diagram ────────────────────────────────
      if (item.id === "29") return wrap(TransitionScene);

      // ── ESCENA 27: Options discarded ────────────────────────────────────
      if (item.id === "30") return wrap(OptionsScene);

      // ── ESCENA 14: Critical timeline 2011–2013 ───────────────────────────
      if (item.id === "31") return wrap(DecisionTimelineScene);

      // ── ESCENA 28: Market collapse metrics ──────────────────────────────
      if (item.id === "32") return wrap(MarketCollapseScene);

      // ── ESCENA 29: Legacy diagram ────────────────────────────────────────
      if (item.id === "33") return wrap(LegacyScene);

      // ── ESCENA 15/30: Final question ────────────────────────────────────
      if (item.id === "34") return wrap(FinalScene);

      // ── Default: subtitle text ───────────────────────────────────────────
      return (
        <Sequence key={key} from={fromFrame} durationInFrames={durationInFrames}>
          <Audio src={staticFile(`audio/${key}.mp3`)} />
          <Parrafo texto={item.texto} durationInFrames={durationInFrames} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
