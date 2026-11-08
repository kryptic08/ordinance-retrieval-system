import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { Audio } from "@remotion/media";
import { SCENES, VIDEO_FPS, THEME, TELEPROMPTER_TICKS } from "./constants";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneSignificanceObjectives } from "./scenes/SceneSignificanceObjectives";
import { SceneLiteratureFramework } from "./scenes/SceneLiteratureFramework";
import { SceneMethodology } from "./scenes/SceneMethodology";
import { SceneEvaluation } from "./scenes/SceneEvaluation";
import { SceneWalkthrough } from "./scenes/SceneWalkthrough";
import { SceneConclusion } from "./scenes/SceneConclusion";

const SceneTransition: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const enterProgress = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exitProgress = interpolate(
    frame,
    [Math.max(1, durationInFrames - 10), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.max(0, Math.min(1, enterProgress * exitProgress));
  const translateY = (1 - enterProgress) * 10 + (1 - exitProgress) * -8;

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const OrdiSearchPitchComposition: React.FC = () => {
  const wtTicks = TELEPROMPTER_TICKS.WALKTHROUGH;
  const methTicks = TELEPROMPTER_TICKS.METHODOLOGY;
  const evalTicks = TELEPROMPTER_TICKS.EVALUATION;

  const wtSearchClickSec = SCENES.WALKTHROUGH.start + Math.max(1, (wtTicks[2]?.startSec ?? 18) - 0.5);
  const wtSynthesisSec = SCENES.WALKTHROUGH.start + (wtTicks[2]?.startSec ?? 18);
  const wtCitationClickSec = SCENES.WALKTHROUGH.start + Math.max(2, (wtTicks[3]?.startSec ?? 30) - 0.45);
  const wtDrawerChimeSec = SCENES.WALKTHROUGH.start + (wtTicks[3]?.startSec ?? 30);

  const methStage2Sec = SCENES.METHODOLOGY.start + (methTicks[3]?.startSec ?? 30);
  const methStage4Sec = SCENES.METHODOLOGY.start + (methTicks[5]?.startSec ?? 52);
  const evalAblationSec = SCENES.EVALUATION.start + (evalTicks[3]?.startSec ?? 28);

  const sceneTransitions = [
    SCENES.PROBLEM.start,
    SCENES.SIGNIFICANCE_OBJECTIVES.start,
    SCENES.LITERATURE_FRAMEWORK.start,
    SCENES.METHODOLOGY.start,
    SCENES.EVALUATION.start,
    SCENES.WALKTHROUGH.start,
    SCENES.CONCLUSION.start,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
      {/* Subtle Ambient Corporate/Civic Background Music Bed */}
      <Audio src={staticFile("audio/bgm_ambient.wav")} volume={0.065} />

      {/* Selective Soft Scene Transition Whooshes */}
      {sceneTransitions.map((sec) => (
        <Sequence
          key={`whoosh-${sec}`}
          from={Math.max(0, Math.round((sec - 0.15) * VIDEO_FPS))}
          durationInFrames={Math.round(0.5 * VIDEO_FPS)}
          name={`SFX · Scene Transition (${sec}s)`}
        >
          <Audio src={staticFile("audio/sfx_whoosh.wav")} volume={0.14} />
        </Sequence>
      ))}

      {/* Methodology Technical Stage SFX */}
      <Sequence
        from={Math.round(methStage2Sec * VIDEO_FPS)}
        durationInFrames={Math.round(0.8 * VIDEO_FPS)}
        name="SFX · 384-d Vector Embedding Shimmer"
      >
        <Audio src={staticFile("audio/sfx_shimmer.wav")} volume={0.18} />
      </Sequence>

      <Sequence
        from={Math.round(methStage4Sec * VIDEO_FPS)}
        durationInFrames={Math.round(0.4 * VIDEO_FPS)}
        name="SFX · 3-Tier Architecture Pop"
      >
        <Audio src={staticFile("audio/sfx_pop.wav")} volume={0.20} />
      </Sequence>

      {/* Evaluation Ablation Mode SFX */}
      <Sequence
        from={Math.round(evalAblationSec * VIDEO_FPS)}
        durationInFrames={Math.round(0.4 * VIDEO_FPS)}
        name="SFX · 4-Mode Ablation Pop"
      >
        <Audio src={staticFile("audio/sfx_pop.wav")} volume={0.18} />
      </Sequence>

      {/* Walkthrough Interactive UI Sound Effects */}
      <Sequence
        from={Math.round(wtSearchClickSec * VIDEO_FPS)}
        durationInFrames={Math.round(0.3 * VIDEO_FPS)}
        name="SFX · Search Button Click"
      >
        <Audio src={staticFile("audio/sfx_click.wav")} volume={0.22} />
      </Sequence>

      <Sequence
        from={Math.round(wtSynthesisSec * VIDEO_FPS)}
        durationInFrames={Math.round(0.8 * VIDEO_FPS)}
        name="SFX · Grounded Synthesis Chime"
      >
        <Audio src={staticFile("audio/sfx_chime.wav")} volume={0.16} />
      </Sequence>

      <Sequence
        from={Math.round(wtCitationClickSec * VIDEO_FPS)}
        durationInFrames={Math.round(0.3 * VIDEO_FPS)}
        name="SFX · Citation [1] Click"
      >
        <Audio src={staticFile("audio/sfx_click.wav")} volume={0.22} />
      </Sequence>

      <Sequence
        from={Math.round(wtDrawerChimeSec * VIDEO_FPS)}
        durationInFrames={Math.round(0.8 * VIDEO_FPS)}
        name="SFX · Inspector Reveal Chime"
      >
        <Audio src={staticFile("audio/sfx_chime.wav")} volume={0.16} />
      </Sequence>

      {/* Scene 1: Introduction & Research Team */}
      <Sequence
        from={SCENES.INTRO.start * VIDEO_FPS}
        durationInFrames={SCENES.INTRO.duration * VIDEO_FPS}
        name="1. Intro & Research Team"
      >
        <Audio src={staticFile("voiceover/vo_intro.wav")} />
        <SceneTransition durationInFrames={SCENES.INTRO.duration * VIDEO_FPS}>
          <SceneIntro />
        </SceneTransition>
      </Sequence>

      {/* Scene 2: Chapter 1 - Problem Context & Lexical Gap */}
      <Sequence
        from={SCENES.PROBLEM.start * VIDEO_FPS}
        durationInFrames={SCENES.PROBLEM.duration * VIDEO_FPS}
        name="2. Chapter 1 · Problem Context & Lexical Gap"
      >
        <Audio src={staticFile("voiceover/vo_problem.wav")} />
        <SceneTransition durationInFrames={SCENES.PROBLEM.duration * VIDEO_FPS}>
          <SceneProblem />
        </SceneTransition>
      </Sequence>

      {/* Scene 3: Chapter 1 - Significance (5 Beneficiary Groups) & Objectives */}
      <Sequence
        from={SCENES.SIGNIFICANCE_OBJECTIVES.start * VIDEO_FPS}
        durationInFrames={SCENES.SIGNIFICANCE_OBJECTIVES.duration * VIDEO_FPS}
        name="3. Chapter 1 · Significance & Objectives"
      >
        <Audio src={staticFile("voiceover/vo_significance.wav")} />
        <SceneTransition durationInFrames={SCENES.SIGNIFICANCE_OBJECTIVES.duration * VIDEO_FPS}>
          <SceneSignificanceObjectives />
        </SceneTransition>
      </Sequence>

      {/* Scene 4: Chapter 2 - Literature Review & Conceptual Paradigm (Figure 1 IPO) */}
      <Sequence
        from={SCENES.LITERATURE_FRAMEWORK.start * VIDEO_FPS}
        durationInFrames={SCENES.LITERATURE_FRAMEWORK.duration * VIDEO_FPS}
        name="4. Chapter 2 · Literature & Conceptual Paradigm"
      >
        <Audio src={staticFile("voiceover/vo_literature.wav")} />
        <SceneTransition durationInFrames={SCENES.LITERATURE_FRAMEWORK.duration * VIDEO_FPS}>
          <SceneLiteratureFramework />
        </SceneTransition>
      </Sequence>

      {/* Scene 5: Chapter 3 - Methodology, RAD Lifecycle & Architecture */}
      <Sequence
        from={SCENES.METHODOLOGY.start * VIDEO_FPS}
        durationInFrames={SCENES.METHODOLOGY.duration * VIDEO_FPS}
        name="5. Chapter 3 · RAD Methodology & Architecture"
      >
        <Audio src={staticFile("voiceover/vo_methodology.wav")} />
        <SceneTransition durationInFrames={SCENES.METHODOLOGY.duration * VIDEO_FPS}>
          <SceneMethodology />
        </SceneTransition>
      </Sequence>

      {/* Scene 6: Chapter 3 - Dual Evaluation (Relevance Matrix & ISO 25010) */}
      <Sequence
        from={SCENES.EVALUATION.start * VIDEO_FPS}
        durationInFrames={SCENES.EVALUATION.duration * VIDEO_FPS}
        name="6. Chapter 3 · Dual Evaluation & ISO 25010"
      >
        <Audio src={staticFile("voiceover/vo_evaluation.wav")} />
        <SceneTransition durationInFrames={SCENES.EVALUATION.duration * VIDEO_FPS}>
          <SceneEvaluation />
        </SceneTransition>
      </Sequence>

      {/* Scene 7: Full Live System Walkthrough (The Grand Demonstration Climax!) */}
      <Sequence
        from={SCENES.WALKTHROUGH.start * VIDEO_FPS}
        durationInFrames={SCENES.WALKTHROUGH.duration * VIDEO_FPS}
        name="7. Live System Walkthrough (Public + Admin)"
      >
        <Audio src={staticFile("voiceover/vo_walkthrough.wav")} />
        <SceneTransition durationInFrames={SCENES.WALKTHROUGH.duration * VIDEO_FPS}>
          <SceneWalkthrough />
        </SceneTransition>
      </Sequence>

      {/* Scene 8: Conclusion & Final Team Attribution */}
      <Sequence
        from={SCENES.CONCLUSION.start * VIDEO_FPS}
        durationInFrames={SCENES.CONCLUSION.duration * VIDEO_FPS}
        name="8. Conclusion & Team Attribution"
      >
        <Audio src={staticFile("voiceover/vo_conclusion.wav")} />
        <SceneTransition durationInFrames={SCENES.CONCLUSION.duration * VIDEO_FPS}>
          <SceneConclusion />
        </SceneTransition>
      </Sequence>
    </AbsoluteFill>
  );
};

export const MainComposition = OrdiSearchPitchComposition;
