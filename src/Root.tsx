import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { NokiaVideo } from "./NokiaVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={160}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="NokiaVideo"
        component={NokiaVideo}
        durationInFrames={23102}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
