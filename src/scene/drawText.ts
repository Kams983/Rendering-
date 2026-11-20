/** Canvas font stacks. The woff2 files are declared in src/fonts.css. */
export const codeFont = (size: number): string =>
  `${size}px "JetBrains Mono", ui-monospace, "Courier New", monospace`;

export const displayFont = (size: number): string =>
  `900 ${size}px "Inter Black", Inter, system-ui, sans-serif`;
