import React, { PropsWithChildren, useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

const FACES = [
  { family: "Inter Black", file: "fonts/inter-black.woff2", weight: "900" },
  { family: "JetBrains Mono", file: "fonts/jetbrains-mono.woff2", weight: "400" },
] as const;

let fontPromise: Promise<void> | null = null;

export const ensureFonts = (): Promise<void> => {
  if (!fontPromise) {
    fontPromise = Promise.all(
      FACES.map(async (face) => {
        const loaded = new FontFace(face.family, `url(${staticFile(face.file)})`, {
          weight: face.weight,
          style: "normal",
        });
        try {
          const result = await loaded.load();
          document.fonts.add(result);
        } catch {
          throw new Error(
            `Missing local font: public/${face.file}. The HUD and subtitles need it.`,
          );
        }
      }),
    ).then(() => undefined);
  }
  return fontPromise;
};

/**
 * Fonts must be registered before the first canvas texture is drawn, otherwise
 * the first frame falls back to a system face. This gate holds the render.
 */
export const FontGate: React.FC<PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading local fonts"));

  useEffect(() => {
    let alive = true;
    ensureFonts()
      .then(() => {
        if (alive) {
          setReady(true);
        }
        continueRender(handle);
      })
      .catch((error: Error) => cancelRender(error));
    return () => {
      alive = false;
    };
  }, [handle]);

  return ready ? <>{children}</> : null;
};
