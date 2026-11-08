import React from "react";
import { registerRoot, Composition } from "remotion";
import { MainComposition } from "./Composition";
import { FPS, TOTAL_DURATION_FRAMES } from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="OrdiSearchPitch"
      component={MainComposition}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
