#!/usr/bin/env node

/**
 * executer.mjs — unified script dispatcher for all package.json commands.
 *
 * Replaces raw shell commands in package.json with a single entry point that
 * provides consistent logging, error handling, and argument forwarding.
 *
 * Usage:
 *   node scripts/executer.mjs <command> [args...]
 *
 * Commands:
 *   start              Start the panel server
 *   dev                Start in development mode (prisma + vite watch + nodemon)
 *   build              Full build (tsc + prisma generate + vite)
 *   build:assets       Vite build only
 *   typecheck          TypeScript type checking
 *   lint               ESLint with --fix
 *   format             Prettier formatting
 *   test               Run vitest
 *   test:watch         Run vitest in watch mode
 *   test:coverage      Run vitest with coverage
 *   test:e2e           Run Playwright e2e tests
 *   test:e2e:ui        Run Playwright e2e with UI
 *   test:docker        Run tests in Docker
 *   test:all           Run vitest + Playwright
 *   db:generate        Prisma generate
 *   db:push            Prisma db push
 *   db:migrate         Prisma migrate dev
 *   db:migrate:deploy  Prisma migrate deploy + generate
 *   db:seed            Run seed script
 *   db:studio          Prisma studio
 *   db:status          Prisma migrate status
 *   db:backup          Backup database (optional AES encryption)
 *   secret             Generate new SESSION_SECRET
 *
 * Flags:
 *   --help / -h        Show this message
 */

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import boxen from "boxen";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// ── Logging ──────────────────────────────────────────────────────────────────

const TTY = process.stdout.isTTY;

const ok = (msg) => console.log(`  ${chalk.green("+")} ${msg}`);
const fail = (msg) => console.log(`  ${chalk.red("x")} ${chalk.red(msg)}`);
const info = (msg) => console.log(`  ${chalk.cyan("->")} ${msg}`);
const dim = (msg) => console.log(`  ${chalk.dim(msg)}`);
const gap = () => console.log();

// ── Command registry ─────────────────────────────────────────────────────────

/**
 * Each command maps to a shell command string or function.
 * Shell commands are executed with spawnSync (stdio: inherit).
 */
const commands = {
  // ── Server ───────────────────────────────────────────────────────────
  start: {
    desc: "Start the panel server",
    run: () => exec("node --env-file=.env dist/app.js"),
  },
  dev: {
    desc: "Start in development mode (prisma + vite + nodemon)",
    run: () =>
      exec(
        "prisma generate && prisma migrate dev && (trap 'kill 0' EXIT; vite build --watch & nodemon)",
      ),
  },

  // ── Build ────────────────────────────────────────────────────────────
  build: {
    desc: "Full build (tsc + prisma generate + vite)",
    run: () => exec("tsc && tsc -p tsconfig.prisma.json && vite build"),
  },
  "build:assets": {
    desc: "Vite build only (assets + css)",
    run: () => exec("vite build"),
  },

  // ── Quality ──────────────────────────────────────────────────────────
  typecheck: {
    desc: "TypeScript type checking (no emit)",
    run: () => exec("tsc --noEmit && tsc -p tsconfig.prisma.json --noEmit"),
  },
  lint: {
    desc: "ESLint with auto-fix",
    run: () => exec("eslint src --fix"),
  },
  format: {
    desc: "Prettier formatting on src/",
    run: () => exec("prettier --write src/"),
  },

  // ── Testing ──────────────────────────────────────────────────────────
  test: {
    desc: "Run vitest (single pass)",
    run: () => exec("vitest run"),
  },
  "test:watch": {
    desc: "Run vitest in watch mode",
    run: () => exec("vitest"),
  },
  "test:coverage": {
    desc: "Run vitest with coverage report",
    run: () => exec("vitest run --coverage"),
  },
  "test:e2e": {
    desc: "Run Playwright e2e tests",
    run: () => exec("npx playwright test"),
  },
  "test:e2e:ui": {
    desc: "Run Playwright e2e with browser UI",
    run: () => exec("npx playwright test --ui"),
  },
  "test:docker": {
    desc: "Run tests inside Docker containers",
    run: () =>
      exec(
        "docker compose -f tests/docker/docker-compose.test.yml up --build --abort-on-container-exit",
      ),
  },
  "test:all": {
    desc: "Run vitest + Playwright e2e",
    run: () => exec("vitest run && npx playwright test"),
  },

  // ── Database ─────────────────────────────────────────────────────────
  "db:generate": {
    desc: "Prisma generate (regenerate client)",
    run: () => exec("prisma generate"),
  },
  "db:push": {
    desc: "Prisma db push (sync schema to database)",
    run: () => exec("prisma db push"),
  },
  "db:migrate": {
    desc: "Prisma migrate dev (create + apply migration)",
    run: () => exec("prisma migrate dev"),
  },
  "db:migrate:deploy": {
    desc: "Prisma migrate deploy + generate",
    run: () => exec("prisma migrate deploy && prisma generate"),
  },
  "db:seed": {
    desc: "Run database seed script",
    run: () => exec("node dist/cli/seed.js"),
  },
  "db:studio": {
    desc: "Open Prisma Studio (database GUI)",
    run: () => exec("prisma studio"),
  },
  "db:status": {
    desc: "Show Prisma migration status",
    run: () => exec("prisma migrate status"),
  },
  "db:backup": {
    desc: "Backup database (optional AES encryption)",
    run: () => exec("node scripts/db-backup.mjs"),
  },

  // ── Misc ─────────────────────────────────────────────────────────────
  secret: {
    desc: "Generate new SESSION_SECRET",
    run: () => exec("node dist/cli/secret.js"),
  },
};

// ── Execution ────────────────────────────────────────────────────────────────

function exec(cmd) {
  const t0 = Date.now();
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: projectDir,
    timeout: 600_000,
  });
  const elapsed = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
  if (result.status !== 0) {
    fail(`Command failed (${elapsed}, exit ${result.status ?? "unknown"})`);
    process.exit(result.status ?? 1);
  }
  return elapsed;
}

function showHelp() {
  const maxLen = Math.max(...Object.keys(commands).map((k) => k.length));

  // Group commands by section
  const sections = [
    {
      label: "Server",
      cmds: ["start", "dev"],
    },
    {
      label: "Build",
      cmds: ["build", "build:assets"],
    },
    {
      label: "Quality",
      cmds: ["typecheck", "lint", "format"],
    },
    {
      label: "Testing",
      cmds: [
        "test",
        "test:watch",
        "test:coverage",
        "test:e2e",
        "test:e2e:ui",
        "test:docker",
        "test:all",
      ],
    },
    {
      label: "Database",
      cmds: [
        "db:generate",
        "db:push",
        "db:migrate",
        "db:migrate:deploy",
        "db:seed",
        "db:studio",
        "db:status",
        "db:backup",
      ],
    },
    {
      label: "Misc",
      cmds: ["secret"],
    },
  ];

  if (TTY) {
    console.log(
      boxen(
        [
          chalk.bold.cyan("  Airlink Panel") + chalk.dim("  v2.5.x"),
          "",
          chalk.dim(
            "  Unified script dispatcher for all package.json commands.",
          ),
        ].join("\n"),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "cyan",
        },
      ),
    );
  }

  console.log(
    `  ${chalk.bold("Usage")}\n  node scripts/executer.mjs ${chalk.cyan("<command>")} ${chalk.dim("[flags]")}\n`,
  );

  for (const section of sections) {
    console.log(`  ${chalk.bold.underline(section.label)}`);
    for (const name of section.cmds) {
      const cmd = commands[name];
      if (!cmd) continue;
      console.log(
        `    ${chalk.cyan(name.padEnd(maxLen + 2))} ${chalk.dim(cmd.desc)}`,
      );
    }
    console.log();
  }

  console.log(`  ${chalk.dim("Routed scripts (own .mjs files):")}`);
  console.log(
    `    ${chalk.cyan("setup".padEnd(maxLen + 2))} ${chalk.dim("node scripts/setup.mjs — interactive panel setup")}`,
  );
  console.log(
    `    ${chalk.cyan("db:reset".padEnd(maxLen + 2))} ${chalk.dim("node scripts/db-reset.mjs — nuclear database reset")}`,
  );
  console.log();
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [command, ...rest] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

// Route special scripts to their own .mjs files
if (command === "setup") {
  const args = rest.map((a) => `"${a}"`).join(" ");
  exec(`node scripts/setup.mjs ${args}`);
  process.exit(0);
}

if (command === "db:reset") {
  const args = rest.map((a) => `"${a}"`).join(" ");
  exec(`node scripts/db-reset.mjs ${args}`);
  process.exit(0);
}

if (command === "db:backup") {
  const args = rest.map((a) => `"${a}"`).join(" ");
  exec(`node scripts/db-backup.mjs ${args}`);
  process.exit(0);
}

const cmd = commands[command];
if (!cmd) {
  fail(`Unknown command: ${command}`);
  console.log(
    `  Run ${chalk.cyan("node scripts/executer.mjs --help")} for available commands.`,
  );
  process.exit(1);
}

if (TTY) {
  gap();
  console.log(
    `  ${chalk.bold.cyan("airlink")} ${chalk.dim("->")} ${chalk.bold(command)}`,
  );
  gap();
}

const elapsed = cmd.run();

if (TTY && elapsed) {
  gap();
  ok(chalk.dim(`Done in ${elapsed}`));
}
