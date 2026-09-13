/**
 * ui.mjs — Shared TUI primitives for Airlink scripts.
 *
 * Black-and-white terminal aesthetic: no color, just bold/dim/reverse for
 * hierarchy. Every interactive element (input, password, confirm, menu) is
 * drawn as a proper box. Logging uses a consistent glyph prefix system.
 *
 * Exports:
 *   Logger         — ok / warn / fail / info / dim / gap / section / banner
 *   box()          — draw a titled ASCII box to a string
 *   prompt()       — single-line text input inside a box
 *   secret()       — masked password input inside a box
 *   confirm()      — yes/no dialog inside a box
 *   menu()         — arrow-key menu inside a box
 *   spinner()      — run a promise with an inline spinner
 *   sudo()         — prompt for a sudo/admin password with context label
 */

import { createInterface } from "node:readline";
import { createRequire } from "node:module";

// ── ANSI primitives ───────────────────────────────────────────────────────────

const ESC   = "\x1b";
const RESET = `${ESC}[0m`;
const BOLD  = `${ESC}[1m`;
const DIM   = `${ESC}[2m`;
const REV   = `${ESC}[7m`;          // reverse-video (selection highlight)
const HIDE  = `${ESC}[?25l`;
const SHOW  = `${ESC}[?25h`;

const up    = (n = 1) => `${ESC}[${n}A`;
const col   = (n)     => `${ESC}[${n}G`;
const clrln = ()      => `${ESC}[2K`;

const TTY = process.stdout.isTTY;

function write(...parts) {
  if (TTY) process.stdout.write(parts.join(""));
}

// ── Box drawing ──────────────────────────────────────────────────────────────

/**
 * Build a titled box as an array of lines.
 *
 * @param {number}  width   — total box width including borders
 * @param {string}  title   — optional title centred in the top border
 * @param {string[]} body   — lines of content; padded to (width-2)
 * @returns {string[]}
 */
export function box(width, title, body) {
  const inner = width - 2;
  const pad   = (s, w) => s.slice(0, w).padEnd(w);

  // Top border
  let top;
  if (title) {
    const t     = ` ${title} `;
    const dashes = inner - t.length;
    const left  = Math.floor(dashes / 2);
    const right = dashes - left;
    top = `+${"-".repeat(left)}${BOLD}${t}${RESET}${"-".repeat(right)}+`;
  } else {
    top = `+${"-".repeat(inner)}+`;
  }

  const mid = body.map((line) => `| ${pad(line, inner - 2)} |`);
  const bot = `+${"-".repeat(inner)}+`;

  return [top, ...mid, bot];
}

// ── Logger ───────────────────────────────────────────────────────────────────

export const Logger = {
  ok   : (msg) => console.log(`  ${BOLD}+${RESET} ${msg}`),
  warn : (msg) => console.log(`  ${BOLD}!${RESET} ${DIM}${msg}${RESET}`),
  fail : (msg) => console.log(`  ${BOLD}x${RESET} ${msg}`),
  info : (msg) => console.log(`  ${DIM}>${RESET} ${msg}`),
  dim  : (msg) => console.log(`  ${DIM}${msg}${RESET}`),
  gap  : ()    => console.log(),
  section(title) {
    console.log();
    console.log(`  ${BOLD}${title}${RESET}`);
    console.log(`  ${"─".repeat(title.length)}`);
  },
  banner(lines) {
    if (!TTY) { lines.forEach((l) => console.log(l)); return; }
    const width = Math.max(...lines.map((l) => stripAnsi(l).length)) + 4;
    const b = box(width, "", lines.map((l) => ` ${l}`));
    b.forEach((l) => console.log(`  ${l}`));
    console.log();
  },
};

// Strip ANSI escapes for length calculation
function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

// ── Terminal size ─────────────────────────────────────────────────────────────

function termSize() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows    || 24;
  return { cols: Math.max(cols, 60), rows: Math.max(rows, 16) };
}

// ── Inline spinner ────────────────────────────────────────────────────────────

const SPIN = ["|", "/", "-", "\\"];

/**
 * Run `fn` (a Promise or async fn) while showing a spinner.
 * Resolves with the return value of fn.
 */
export async function spinner(label, fn) {
  if (!TTY) {
    Logger.info(label);
    return fn();
  }

  const prefix = `  ${DIM}>${RESET} ${label} `;
  process.stdout.write(prefix);
  write(HIDE);

  let i = 0;
  const iv = setInterval(() => {
    write(`${clrln()}${col(1)}${prefix}${DIM}${SPIN[i++ % 4]}${RESET}`);
  }, 80);

  try {
    const result = await fn();
    clearInterval(iv);
    write(`${clrln()}${col(1)}`);
    Logger.ok(label);
    return result;
  } catch (err) {
    clearInterval(iv);
    write(`${clrln()}${col(1)}`);
    Logger.fail(label);
    throw err;
  } finally {
    write(SHOW);
  }
}

// ── Raw key reader ────────────────────────────────────────────────────────────

function readRawKey() {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (chunk) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);

      if (chunk === "\x1b[A") return resolve("UP");
      if (chunk === "\x1b[B") return resolve("DOWN");
      if (chunk === "\x1b[C") return resolve("RIGHT");
      if (chunk === "\x1b[D") return resolve("LEFT");
      if (chunk === "\x03")   return resolve("CTRL_C");
      if (chunk === "\x7f" || chunk === "\b") return resolve("BACKSPACE");
      if (chunk === "\r" || chunk === "\n")   return resolve("ENTER");
      if (chunk === "\x1b") return resolve("ESC");
      if (chunk === " ")    return resolve("SPACE");
      resolve(chunk);
    };

    process.stdin.on("data", onData);
  });
}

// ── Readline-based single-line prompt ─────────────────────────────────────────

function readLine(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => { rl.close(); resolve(ans); });
  });
}

// ── Box-framed text input ─────────────────────────────────────────────────────

/**
 * Show a box-framed text input.
 *
 * @param {object} opts
 * @param {string} opts.label       — prompt label shown inside the box
 * @param {string} [opts.default]   — pre-filled value
 * @param {string} [opts.hint]      — hint text shown below the field
 * @param {string} [opts.error]     — error message shown in the box
 * @returns {Promise<string>}
 */
export async function prompt({ label, default: def = "", hint = "", error = "" }) {
  if (!TTY) {
    const ans = await readLine(`  ${label}${def ? ` [${def}]` : ""}: `);
    return ans.trim() || def;
  }

  const { cols } = termSize();
  const boxW = Math.min(cols - 8, 64);
  const fieldW = boxW - 6;

  let value = def;

  const draw = () => {
    const bodyLines = [
      `${BOLD}${label}${RESET}`,
      ...(error ? [`${BOLD}! ${error}${RESET}`] : []),
      "",
      `+${"-".repeat(fieldW)}+`,
      `| ${value.slice(-fieldW + 2).padEnd(fieldW - 2)} |`,
      `+${"-".repeat(fieldW)}+`,
      ...(hint ? [`${DIM}${hint}${RESET}`] : []),
    ];
    return box(boxW, "Input", bodyLines);
  };

  // Initial render
  console.log();
  let lines = draw();
  lines.forEach((l) => console.log(`    ${l}`));
  const lineCount = lines.length + 1;

  write(HIDE);

  const redraw = () => {
    write(`${up(lineCount - 1)}${clrln()}\n`);
    const updated = draw();
    updated.forEach((l, i) => {
      write(`${clrln()}    ${l}`);
      if (i < updated.length - 1) write("\n");
    });
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = await readRawKey();
    if (key === "CTRL_C") { write(SHOW); process.exit(0); }
    if (key === "ENTER")  { break; }
    if (key === "ESC")    { value = def; }
    else if (key === "BACKSPACE") { value = value.slice(0, -1); }
    else if (key.length === 1 && key >= " ") { value += key; }
    redraw();
  }

  write(SHOW);
  console.log();
  return value || def;
}

// ── Box-framed password input ─────────────────────────────────────────────────

/**
 * Show a box-framed masked password input.
 *
 * @param {object} opts
 * @param {string} opts.label   — prompt label
 * @param {string} [opts.hint]  — hint text
 * @param {string} [opts.error] — error message
 * @returns {Promise<string>}
 */
export async function secret({ label, hint = "", error = "" }) {
  if (!TTY) {
    // Fallback: readline with no echo (via stty)
    const rl = createInterface({ input: process.stdin, output: null });
    process.stdout.write(`  ${label}: `);
    return new Promise((resolve) => {
      rl.question("", (ans) => {
        rl.close();
        process.stdout.write("\n");
        resolve(ans);
      });
    });
  }

  const { cols } = termSize();
  const boxW = Math.min(cols - 8, 64);
  const fieldW = boxW - 6;

  let value = "";

  const mask  = (v) => "•".repeat(v.length);

  const draw = () => {
    const bodyLines = [
      `${BOLD}${label}${RESET}`,
      ...(error ? [`${BOLD}! ${error}${RESET}`] : []),
      "",
      `+${"-".repeat(fieldW)}+`,
      `| ${mask(value).slice(-fieldW + 2).padEnd(fieldW - 2)} |`,
      `+${"-".repeat(fieldW)}+`,
      ...(hint ? [`${DIM}${hint}${RESET}`] : []),
    ];
    return box(boxW, "Password", bodyLines);
  };

  console.log();
  let lines = draw();
  lines.forEach((l) => console.log(`    ${l}`));
  const lineCount = lines.length + 1;

  write(HIDE);

  const redraw = () => {
    write(`${up(lineCount - 1)}${clrln()}\n`);
    const updated = draw();
    updated.forEach((l, i) => {
      write(`${clrln()}    ${l}`);
      if (i < updated.length - 1) write("\n");
    });
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = await readRawKey();
    if (key === "CTRL_C") { write(SHOW); process.exit(0); }
    if (key === "ENTER")  { break; }
    if (key === "ESC")    { value = ""; }
    else if (key === "BACKSPACE") { value = value.slice(0, -1); }
    else if (key.length === 1 && key >= " ") { value += key; }
    redraw();
  }

  write(SHOW);
  console.log();
  return value;
}

// ── Yes/No confirm dialog ─────────────────────────────────────────────────────

/**
 * Show a yes/no confirm dialog.
 *
 * @param {string} question
 * @param {boolean} [defaultYes=false]
 * @returns {Promise<boolean>}
 */
export async function confirm(question, defaultYes = false) {
  if (!TTY) {
    const ans = await readLine(`  ${question} [${defaultYes ? "Y/n" : "y/N"}]: `);
    const lower = ans.trim().toLowerCase();
    if (!lower) return defaultYes;
    return lower === "y" || lower === "yes";
  }

  const { cols } = termSize();
  const boxW = Math.min(cols - 8, 60);

  let selected = defaultYes ? 0 : 1; // 0 = yes, 1 = no

  const draw = () => {
    const yesLabel = selected === 0 ? `${REV} Yes ${RESET}` : " Yes ";
    const noLabel  = selected === 1 ? `${REV}  No ${RESET}` : "  No ";
    return box(boxW, "Confirm", [
      "",
      `  ${question}`,
      "",
      `     ${yesLabel}        ${noLabel}`,
      "",
      `  ${DIM}← / → to choose   Enter to confirm${RESET}`,
    ]);
  };

  console.log();
  let lines = draw();
  lines.forEach((l) => console.log(`    ${l}`));
  const lineCount = lines.length + 1;

  write(HIDE);

  const redraw = () => {
    write(`${up(lineCount - 1)}${clrln()}\n`);
    const updated = draw();
    updated.forEach((l, i) => {
      write(`${clrln()}    ${l}`);
      if (i < updated.length - 1) write("\n");
    });
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = await readRawKey();
    if (key === "CTRL_C") { write(SHOW); process.exit(0); }
    if (key === "LEFT"  || key === "h") { selected = 0; redraw(); }
    if (key === "RIGHT" || key === "l") { selected = 1; redraw(); }
    if (key === "y" || key === "Y")     { write(SHOW); console.log(); return true;  }
    if (key === "n" || key === "N")     { write(SHOW); console.log(); return false; }
    if (key === "ESC")                  { write(SHOW); console.log(); return false; }
    if (key === "ENTER") { write(SHOW); console.log(); return selected === 0; }
  }
}

// ── Arrow-key menu ────────────────────────────────────────────────────────────

/**
 * Show an arrow-key selection menu.
 *
 * @param {string}   title   — box title
 * @param {string[]} items   — menu options
 * @returns {Promise<number>} — index of selected item, or -1 on ESC/q
 */
export async function menu(title, items) {
  if (!TTY) {
    items.forEach((item, i) => console.log(`  [${i}] ${item}`));
    const ans = await readLine("  Select [0]: ");
    const n = parseInt(ans.trim(), 10);
    return Number.isFinite(n) && n >= 0 && n < items.length ? n : 0;
  }

  const { cols } = termSize();
  const maxLen = Math.max(...items.map((i) => stripAnsi(i).length));
  const boxW   = Math.min(cols - 8, Math.max(maxLen + 10, 50));

  let selected = 0;

  const draw = () => {
    const bodyLines = [
      `${DIM}↑/↓ move   Enter select   q quit${RESET}`,
      `+${"-".repeat(boxW - 4)}+`,
      ...items.map((item, i) => {
        const label = `  ${item}`;
        return i === selected
          ? `${REV}${label.padEnd(boxW - 4)}${RESET}`
          : label.padEnd(boxW - 4);
      }),
    ];
    return box(boxW, title, bodyLines);
  };

  console.log();
  let lines = draw();
  lines.forEach((l) => console.log(`  ${l}`));
  const lineCount = lines.length + 1;

  write(HIDE);

  const redraw = () => {
    write(`${up(lineCount - 1)}${clrln()}\n`);
    const updated = draw();
    updated.forEach((l, i) => {
      write(`${clrln()}  ${l}`);
      if (i < updated.length - 1) write("\n");
    });
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = await readRawKey();
    if (key === "CTRL_C")           { write(SHOW); process.exit(0); }
    if (key === "q" || key === "Q" || key === "ESC") {
      write(SHOW); console.log(); return -1;
    }
    if (key === "UP"   || key === "k") { if (selected > 0) { selected--; redraw(); } }
    if (key === "DOWN" || key === "j") { if (selected < items.length - 1) { selected++; redraw(); } }
    if (key === "ENTER") { write(SHOW); console.log(); return selected; }
    const n = parseInt(key, 10);
    if (!isNaN(n) && n >= 0 && n < items.length) { selected = n; redraw(); }
  }
}

// ── Admin / sudo password prompt ──────────────────────────────────────────────

/**
 * Prompt for an admin (sudo) password with context.
 * Displays a clearly-labelled box explaining why elevation is needed.
 *
 * @param {string} reason  — short explanation of why sudo is needed
 * @returns {Promise<string>}
 */
export async function sudo(reason) {
  const { cols } = termSize();
  const boxW = Math.min(cols - 8, 64);

  // Draw an explanatory preamble inside a named box
  const infoLines = box(boxW, "Admin Access Required", [
    "",
    `  ${reason}`,
    "",
    `  ${DIM}Your password is not stored and is used only${RESET}`,
    `  ${DIM}for this operation via sudo.${RESET}`,
    "",
  ]);

  console.log();
  infoLines.forEach((l) => console.log(`    ${l}`));

  return secret({ label: "Sudo password", hint: "Press Enter to confirm" });
}
