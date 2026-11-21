import { codeFont } from "./drawText";
import type { CodeSpec, Token } from "./code";
import { charCount } from "./code";
import { PACE, frames60 } from "../config";
import { CUE_FRAMES } from "../sfx/cues";

const BG = "#0b1017";
const CHROME = "#161b22";
const BORDER = "#233240";
const LINE_HEIGHT = 36;
const CODE_TOP = 118;
const GUTTER = 74;

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawChrome = (ctx: CanvasRenderingContext2D, spec: CodeSpec): void => {
  ctx.fillStyle = CHROME;
  ctx.fillRect(0, 0, 1024, 64);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((color, index) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(30 + index * 26, 32, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#8b949e";
  ctx.font = codeFont(22);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.file, 128, 33);
  ctx.fillStyle = "rgba(88,166,255,0.14)";
  roundRect(ctx, 118, 12, ctx.measureText(spec.file).width + 24, 40, 8);
  ctx.fill();
  ctx.fillStyle = "#58a6ff";
  ctx.fillText(spec.file, 130, 33);
};

const drawSquiggle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  frame: number,
): void => {
  ctx.strokeStyle = "#ff3b3b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= width; i += 4) {
    const wave = Math.sin(i * 0.55 + frame * 0.25 * PACE) * 2;
    if (i === 0) {
      ctx.moveTo(x + i, y + wave);
    } else {
      ctx.lineTo(x + i, y + wave);
    }
  }
  ctx.stroke();
};

const revealLimit = (spec: CodeSpec, frame: number): number => {
  if (!spec.typingWindow) {
    return Number.POSITIVE_INFINITY;
  }
  const [start, end] = spec.typingWindow;
  if (frame <= start) {
    return 0;
  }
  if (frame >= end) {
    return Number.POSITIVE_INFINITY;
  }
  const progress = (frame - start) / Math.max(1, end - start);
  return Math.floor(charCount(spec) * progress);
};

const drawIde = (
  ctx: CanvasRenderingContext2D,
  spec: CodeSpec,
  frame: number,
): void => {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, 1024, 640);

  drawChrome(ctx, spec);

  const limit = revealLimit(spec, frame);
  let typed = 0;
  const carets: Array<{ x: number; y: number }> = [];

  ctx.font = codeFont(22);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  spec.lines.forEach((tokens, lineIndex) => {
    const y = CODE_TOP + lineIndex * LINE_HEIGHT;

    if (spec.errorLine === lineIndex) {
      const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
      gradient.addColorStop(0, "rgba(255,59,59,0.18)");
      gradient.addColorStop(1, "rgba(255,59,59,0.02)");
      ctx.fillStyle = gradient;
      ctx.fillRect(GUTTER - 12, y - LINE_HEIGHT / 2, 1024 - GUTTER + 12, LINE_HEIGHT);
      ctx.fillStyle = "#ff3b3b";
      ctx.fillRect(GUTTER - 12, y - LINE_HEIGHT / 2, 4, LINE_HEIGHT);
    }

    ctx.fillStyle = spec.errorLine === lineIndex ? "#ff9a9a" : "#4b5a68";
    ctx.textAlign = "right";
    ctx.fillText(String(lineIndex + 1).padStart(2, " "), GUTTER - 28, y);
    ctx.textAlign = "left";

    let x = GUTTER;
    let lineText = "";

    for (const token of tokens as Token[]) {
      const remaining = limit - typed;
      if (remaining <= 0) {
        break;
      }
      const visible = token.text.slice(0, remaining);
      ctx.fillStyle = token.color ?? "#c9d1d9";
      ctx.fillText(visible, x, y);
      x += ctx.measureText(visible).width;
      typed += visible.length;
      lineText += visible;
      if (visible.length < token.text.length) {
        carets.push({ x, y });
        break;
      }
    }

    if (
      carets.length === 0 &&
      limit !== Number.POSITIVE_INFINITY &&
      lineIndex === spec.lines.length - 1
    ) {
      carets.push({ x, y });
    }

    if (spec.highlight && spec.highlight.line === lineIndex && lineText.length > 0) {
      const before = lineText.slice(0, spec.highlight.from);
      const target = lineText.slice(spec.highlight.from, spec.highlight.to);
      if (target.length > 0) {
        const startX = GUTTER + ctx.measureText(before).width;
        const width = ctx.measureText(target).width;
        ctx.fillStyle = "rgba(255,59,59,0.16)";
        ctx.fillRect(startX - 2, y - 15, width + 4, 30);
        drawSquiggle(ctx, startX, y + 15, width, frame);
      }
    }

    if (spec.errorLine === lineIndex && spec.errorMessage) {
      const width = ctx.measureText(lineText).width;
      drawSquiggle(ctx, GUTTER, y + 15, Math.max(40, width), frame);
    }
  });

  if (carets.length > 0) {
    const caret = carets[0];
    const blink = frame % 34 < 17;
    if (blink) {
      ctx.fillStyle = "#58a6ff";
      ctx.fillRect(caret.x + 2, caret.y - 12, 2.5, 24);
    }
  }

  if (spec.errorMessage) {
    const panelY = 640 - 78;
    ctx.fillStyle = "rgba(255,59,59,0.12)";
    roundRect(ctx, 20, panelY, 984, 60, 8);
    ctx.fill();
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(20, panelY, 4, 60);
    ctx.fillStyle = "#ff8f8f";
    ctx.font = codeFont(19);
    ctx.fillText(`✕  ${spec.errorMessage}`, 40, panelY + 31);
  }
};

const drawSearch = (
  ctx: CanvasRenderingContext2D,
  spec: CodeSpec,
  frame: number,
): void => {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, 1024, 640);
  drawChrome(ctx, spec);

  ctx.fillStyle = "#1f6feb";
  roundRect(ctx, 28, 92, 968, 58, 29);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = codeFont(21);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("⌕", 52, 121);

  const query = spec.query ?? "";
  const typed = Math.min(
    query.length,
    Math.floor(Math.max(0, frame - CUE_FRAMES.search) * 0.42),
  );
  ctx.fillStyle = "#ffffff";
  ctx.fillText(query.slice(0, typed), 88, 122);
  if (frame % 34 < 17) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(90 + ctx.measureText(query.slice(0, typed)).width, 108, 2, 28);
  }

  ctx.fillStyle = "#8b949e";
  ctx.font = codeFont(17);
  ctx.fillText("About 2,480,000 results (0.42 seconds)", 30, 178);

  spec.lines.forEach((tokens, index) => {
    const y = 220 + index * 84;
    ctx.fillStyle = index === 0 ? "rgba(88,166,255,0.09)" : "rgba(255,255,255,0.025)";
    roundRect(ctx, 24, y - 26, 976, 68, 8);
    ctx.fill();
    let x = 44;
    for (const token of tokens) {
      ctx.fillStyle = token.color ?? "#c9d1d9";
      ctx.font =
        token.color === "#8b949e" ? codeFont(16) : codeFont(19);
      ctx.fillText(token.text, x, y);
      x += ctx.measureText(token.text).width;
    }
    ctx.fillStyle = "#3fb950";
    ctx.font = codeFont(15);
    ctx.fillText("✓ solved", 860, y + 24);
  });
};

const drawPaste = (
  ctx: CanvasRenderingContext2D,
  spec: CodeSpec,
  frame: number,
): void => {
  drawIde(ctx, spec, frame);
  ctx.fillStyle = "rgba(210,153,34,0.16)";
  ctx.fillRect(0, 64, 1024, 38);
  ctx.fillStyle = "#d29922";
  ctx.font = codeFont(18);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const dots = ".".repeat(1 + (Math.floor(frame / frames60(18)) % 3));
  ctx.fillText(`⚠  pasted from a tab you closed${dots}`, 26, 84);
};

export const drawCodeScreen = (
  canvas: HTMLCanvasElement,
  spec: CodeSpec,
  frame: number,
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (spec.mode === "search") {
    drawSearch(ctx, spec, frame);
  } else if (spec.mode === "paste") {
    drawPaste(ctx, spec, frame);
  } else {
    drawIde(ctx, spec, frame);
  }
  ctx.restore();

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, 1020, 636, 14);
  ctx.stroke();
};
