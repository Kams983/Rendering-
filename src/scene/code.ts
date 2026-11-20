import { rf } from "../config";

export type Token = { text: string; color?: string };

export type CodeSpec = {
  file: string;
  lines: Token[][];
  errorLine?: number;
  errorMessage?: string;
  /** Character range to underline in red (typo detective). */
  highlight?: { line: number; from: number; to: number };
  mode?: "ide" | "search" | "paste";
  query?: string;
  /** Absolute 60 fps window during which characters are typed out. */
  typingWindow?: [number, number];
};

export const SYNTAX = {
  plain: "#c9d1d9",
  keyword: "#ff7b72",
  string: "#a5d6ff",
  fn: "#d2a8ff",
  comment: "#8b949e",
  number: "#79c0ff",
  error: "#ff3b3b",
  green: "#3fb950",
  property: "#7ee787",
} as const;

const line = (...tokens: Array<Token | string>): Token[] =>
  tokens.map((token) =>
    typeof token === "string" ? { text: token, color: SYNTAX.plain } : token,
  );

export const CODE = {
  hook: {
    file: "checkout.ts",
    typingWindow: [0, rf(62)],
    errorLine: 6,
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'total')",
    lines: [
      line({ text: "const ", color: SYNTAX.keyword }, { text: "cart", color: SYNTAX.plain }, { text: " = ", color: SYNTAX.plain }, { text: "await ", color: SYNTAX.keyword }, { text: "getCart", color: SYNTAX.fn }, { text: "(userId);" }),
      line({ text: "" }),
      line({ text: "if ", color: SYNTAX.keyword }, { text: "(!cart) {" }),
      line({ text: "  " }, { text: "throw new ", color: SYNTAX.keyword }, { text: "Error", color: SYNTAX.fn }, { text: "(", color: SYNTAX.plain }, { text: "\"No cart\"", color: SYNTAX.string }, { text: ");" }),
      line({ text: "}" }),
      line({ text: "" }),
      line({ text: "const ", color: SYNTAX.keyword }, { text: "total", color: SYNTAX.plain }, { text: " = cart.items." }, { text: "reduce", color: SYNTAX.fn }, { text: "(sumPrice, " }, { text: "0", color: SYNTAX.number }, { text: ");" }),
      line({ text: "" }),
      line({ text: "// 3 hours later..." , color: SYNTAX.comment }),
      line({ text: "return ", color: SYNTAX.keyword }, { text: "total", color: SYNTAX.plain }, { text: ";", color: SYNTAX.plain }),
    ],
  } satisfies CodeSpec,
  errors: {
    file: "api.ts",
    typingWindow: [rf(245), rf(330)],
    errorLine: 4,
    errorMessage: "ReferenceError: user is not defined",
    lines: [
      line({ text: "export async function ", color: SYNTAX.keyword }, { text: "loadUser", color: SYNTAX.fn }, { text: "(id: " }, { text: "string", color: SYNTAX.property }, { text: ") {" }),
      line({ text: "  const ", color: SYNTAX.keyword }, { text: "res", color: SYNTAX.plain }, { text: " = " }, { text: "await ", color: SYNTAX.keyword }, { text: "fetch", color: SYNTAX.fn }, { text: "(" }, { text: "`/api/user/${id}`", color: SYNTAX.string }, { text: ");" }),
      line({ text: "" }),
      line({ text: "  " }, { text: "console", color: SYNTAX.fn }, { text: ".log(user.name);" }),
      line({ text: "}" }),
      line({ text: "" }),
      line({ text: "// jumped to line 2, changed 5 things", color: SYNTAX.comment }),
      line({ text: "// the answer was in the stack trace", color: SYNTAX.comment }),
    ],
  } satisfies CodeSpec,
  copy: {
    file: "solution.ts",
    mode: "paste",
    errorLine: 5,
    errorMessage: "It worked on their machine.",
    lines: [
      line({ text: "// pasted from the internet", color: SYNTAX.comment }),
      line({ text: "useEffect", color: SYNTAX.fn }, { text: "(() => {" }),
      line({ text: "  setState(prev => ({ ...prev, ready: " }, { text: "true", color: SYNTAX.keyword }, { text: " }));" }),
      line({ text: "}, []);" }),
      line({ text: "" }),
      line({ text: "// no idea why, but it runs", color: SYNTAX.comment }),
      line({ text: "// until it doesn't", color: SYNTAX.comment }),
      line({ text: "" }),
      line({ text: "export default ", color: SYNTAX.keyword }, { text: "Thing", color: SYNTAX.fn }, { text: ";" }),
    ],
  } satisfies CodeSpec,
  typo: {
    file: "hello.ts",
    errorLine: 3,
    errorMessage: "Cannot find name 'message'.",
    highlight: { line: 3, from: 12, to: 19 },
    lines: [
      line({ text: "const ", color: SYNTAX.keyword }, { text: "messgae", color: SYNTAX.error }, { text: " = " }, { text: "\"hello\"", color: SYNTAX.string }, { text: ";" }),
      line({ text: "" }),
      line({ text: "console", color: SYNTAX.fn }, { text: ".log(" }, { text: "message", color: SYNTAX.property }, { text: ");" }),
      line({ text: "" }),
      line({ text: "// one letter. one hour.", color: SYNTAX.comment }),
      line({ text: "// check the basics first.", color: SYNTAX.comment }),
    ],
  } satisfies CodeSpec,
  help: {
    file: "search.ts",
    mode: "search",
    query: "cannot read properties of undefined",
    lines: [
      line({ text: "1  ", color: "#4b5a68" }, { text: "stackoverflow.com  ", color: SYNTAX.comment }, { text: "Cannot read properties of undefined", color: SYNTAX.property }),
      line({ text: "2  ", color: "#4b5a68" }, { text: "developer.mozilla.org  ", color: SYNTAX.comment }, { text: "Optional chaining (?.)", color: SYNTAX.property }),
      line({ text: "3  ", color: "#4b5a68" }, { text: "react.dev  ", color: SYNTAX.comment }, { text: "You Might Not Need an Effect", color: SYNTAX.property }),
      line({ text: "4  ", color: "#4b5a68" }, { text: "github.com  ", color: SYNTAX.comment }, { text: "Issue #4812 - same error", color: SYNTAX.property }),
    ],
  } satisfies CodeSpec,
} as const;

/** Total characters across a spec, used for the typing reveal. */
export const charCount = (spec: CodeSpec): number =>
  spec.lines.reduce(
    (sum, tokens) => sum + tokens.reduce((lineSum, token) => lineSum + token.text.length, 0),
    0,
  );
