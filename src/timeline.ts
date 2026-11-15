/**
 * Single source of truth for scene timing and captions.
 * Times are in seconds. To retime the video, edit start and end here.
 */
export type Scene = {
  id: string;
  start: number;
  end: number;
  caption: string;
};

export const SCENES: Scene[] = [
  {
    id: "void",
    start: 0,
    end: 2.4,
    caption: "ChatGPT doesn't think. It predicts.",
  },
  {
    id: "assemble",
    start: 2.4,
    end: 6.4,
    caption: "One piece at a time.",
  },
  {
    id: "tokens",
    start: 6.4,
    end: 11.2,
    caption: "Tokens.",
  },
  {
    id: "question",
    start: 11.2,
    end: 15.2,
    caption: "",
  },
  {
    id: "predict",
    start: 15.2,
    end: 20.4,
    caption: "Which token is next?",
  },
  {
    id: "loop",
    start: 20.4,
    end: 26.8,
    caption: "Again. And again.",
  },
  {
    id: "training",
    start: 26.8,
    end: 34,
    caption: "Trained on huge amounts of text.",
  },
  {
    id: "attention",
    start: 34,
    end: 42.8,
    caption: "Transformer: it weighs every word.",
  },
  {
    id: "feedback",
    start: 42.8,
    end: 48.4,
    caption: "Tuned by human ratings.",
  },
  {
    id: "answer",
    start: 48.4,
    end: 53.6,
    caption: "Sounds right, not true.",
  },
  {
    id: "wrong",
    start: 53.6,
    end: 57.6,
    caption: "Confident. Still wrong.",
  },
  {
    id: "helper",
    start: 57.6,
    end: 62,
    caption: "A fast assistant, not a source of truth.",
  },
  {
    id: "final",
    start: 62,
    end: 64,
    caption: "That's how ChatGPT actually works.",
  },
];

export const getScene = (id: string): Scene => {
  const scene = SCENES.find((item) => item.id === id);
  if (!scene) {
    throw new Error(`Unknown scene id: ${id}`);
  }
  return scene;
};

export const sceneStart = (id: string) => getScene(id).start;
export const sceneEnd = (id: string) => getScene(id).end;

export const localTime = (t: number, id: string) => t - sceneStart(id);

export const clampScene = (t: number, id: string) => {
  const scene = getScene(id);
  return Math.min(scene.end, Math.max(scene.start, t));
};

export const sceneAt = (t: number): Scene => {
  let current = SCENES[0];
  for (const scene of SCENES) {
    if (t >= scene.start) {
      current = scene;
    }
  }
  return current;
};
