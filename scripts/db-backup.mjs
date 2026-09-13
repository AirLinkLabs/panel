#!/usr/bin/env node

/**
 * db-backup.mjs — Backup PostgreSQL database with optional AES encryption.
 *
 * Creates a pg_dump of the airlink database, optionally encrypts it with
 * a user-supplied password via openssl, and stores it in a root-protected
 * backup directory that requires root/sudo to delete.
 *
 * Flags:
 *   --encrypt / -e    Prompt for an encryption password (AES-256-CBC via openssl).
 *   --yes / -y        Skip confirmation prompt (non-interactive / CI).
 *   --help / -h       Show this message.
 *
 * Usage:
 *   node scripts/db-backup.mjs              # plain backup
 *   node scripts/db-backup.mjs --encrypt    # encrypted backup
 *   node scripts/db-backup.mjs -e -y        # encrypted, no prompts
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, chmodSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import chalk from "chalk";
import boxen from "boxen";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// ── Arg parsing ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function flagVal(name, fallback = null) {
  for (let i = 0; i < argv.length; i++) {
    if (
      argv[i] === name &&
      argv[i + 1] !== undefined &&
      !argv[i + 1].startsWith("-")
    ) {
      return argv[i + 1];
    }
    if (argv[i].startsWith(`${name}=`)) {
      return argv[i].slice(name.length + 1);
    }
  }
  return fallback;
}

const opts = {
  encrypt: argv.includes("--encrypt") || argv.includes("-e"),
  yes: argv.includes("--yes") || argv.includes("-y"),
  help: argv.includes("--help") || argv.includes("-h"),
  password:
    flagVal("--password") ||
    flagVal("-p") ||
    process.env.BACKUP_PASSWORD ||
    null,
};

// ── Logging ──────────────────────────────────────────────────────────────────

const TTY = process.stdout.isTTY;

const ok = (msg) => console.log(`  ${chalk.green("+")} ${msg}`);
const warn = (msg) =>
  console.log(`  ${chalk.yellow("!")} ${chalk.yellow(msg)}`);
const fail = (msg) => console.log(`  ${chalk.red("x")} ${chalk.red(msg)}`);
const info = (msg) => console.log(`  ${chalk.cyan("->")} ${msg}`);
const dim = (msg) => console.log(`  ${chalk.dim(msg)}`);
const gap = () => console.log();

function banner() {
  if (TTY) {
    const mode = opts.encrypt
      ? chalk.bold.magenta("  ENCRYPTED BACKUP  ")
      : chalk.bold.cyan("  PLAIN BACKUP  ");
    console.log(
      boxen(
        [
          mode,
          "",
          chalk.dim("  Creates a pg_dump of the airlink database."),
          opts.encrypt
            ? chalk.dim("  Archive will be AES-256-CBC encrypted.")
            : chalk.dim("  Archive will be stored in plaintext."),
          "",
          chalk.dim("  Backups are stored in a root-protected directory."),
        ].join("\n"),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: opts.encrypt ? "magenta" : "blue",
        },
      ),
    );
  } else {
    info(opts.encrypt ? "Creating encrypted backup..." : "Creating backup...");
  }
}

function showHelp() {
  console.log(`${chalk.bold("Usage")}
  node scripts/db-backup.mjs [flags]

${chalk.bold("Flags")}
  --encrypt, -e     Encrypt backup with a password (AES-256-CBC).
  --yes, -y         Skip confirmation prompt (CI / non-interactive).
  --help, -h        Show this message.

${chalk.bold("What it does")}
  1. Runs pg_dump on the airlink database.
  2. Optionally encrypts the dump with openssl AES-256-CBC.
  3. Stores the backup in a root-protected directory.
  4. Sets file permissions so only root can delete it.

${chalk.bold("Examples")}
  node scripts/db-backup.mjs
  node scripts/db-backup.mjs --encrypt
  node scripts/db-backup.mjs -e -y
`);
}

// ── Prompt ───────────────────────────────────────────────────────────────────

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(`  ${chalk.yellow("?")} ${question} `, (ans) => {
      rl.close();
      res(ans);
    });
  });
}

function confirm(question) {
  if (opts.yes) return Promise.resolve(true);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(
      `  ${chalk.yellow("?")} ${question} ${chalk.dim("[y/N]")} `,
      (ans) => {
        rl.close();
        const lower = ans.trim().toLowerCase();
        res(lower === "y" || lower === "yes");
      },
    );
  });
}

// ── .env parsing ─────────────────────────────────────────────────────────────

function readEnv() {
  const envPath = resolve(projectDir, ".env");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function parseDatabaseUrl(url) {
  const match = url.match(
    /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/,
  );
  if (!match) return null;
  return {
    user: match[1],
    pass: match[2],
    host: match[3],
    port: match[4],
    db: match[5],
  };
}

// ── Shell ────────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts });
  } catch {
    return null;
  }
}

// ── Backup directory (root-protected) ────────────────────────────────────────

const BACKUP_DIR = resolve(projectDir, ".backups");

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    info("Created backup directory.");
  }
}

function lockFileForDeleteProtection(filePath) {
  // chmod 000 so only root can change permissions or delete
  try {
    chmodSync(filePath, 0o000);
    ok("File locked — only root can delete or modify it.");
  } catch {
    warn("Could not set chmod 000. File is still readable by owner.");
  }
}

function lockDirForDeleteProtection(dirPath) {
  // chattr +i makes the directory immutable (Linux only, requires root)
  const result = run(`sudo chattr +i "${dirPath}" 2>/dev/null`);
  if (result !== null) {
    ok("Backup directory set immutable (chattr +i) — root required to remove.");
  } else {
    warn("chattr +i failed (needs root). Falling back to chmod 000.");
    try {
      chmodSync(dirPath, 0o000);
    } catch {
      /* ignore */
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  banner();

  const env = readEnv();
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    fail("DATABASE_URL not found in .env — cannot proceed.");
    process.exit(1);
  }

  const db = parseDatabaseUrl(databaseUrl);
  if (!db) {
    fail(
      "Could not parse DATABASE_URL — expected postgresql://user:pass@host:port/dbname",
    );
    process.exit(1);
  }

  info(`Database: ${db.host}:${db.port}/${db.db} (user: ${db.user})`);
  gap();

  // ── Collect encryption password ───────────────────────────────────────
  let password = null;
  if (opts.encrypt) {
    password = await ask(chalk.bold.magenta("Enter encryption password:"));
    if (!password || password.trim().length < 4) {
      fail("Password must be at least 4 characters.");
      process.exit(1);
    }
    const confirmPw = await ask(chalk.bold.magenta("Confirm password:"));
    if (password !== confirmPw) {
      fail("Passwords do not match.");
      process.exit(1);
    }
    info("Encryption enabled (AES-256-CBC).");
  }

  const confirmed = await confirm(chalk.bold("Create backup now?"));
  if (!confirmed) {
    warn("Aborted.");
    process.exit(0);
  }

  gap();

  // ── Step 1: Ensure backup directory ───────────────────────────────────
  ensureBackupDir();

  // ── Step 2: pg_dump ───────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dumpName = `airlink-${timestamp}`;
  const dumpPath = join(BACKUP_DIR, `${dumpName}.sql`);

  info("Running pg_dump...");
  const dumpCmd = `PGPASSWORD=${db.pass} pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.db} --no-owner --no-privileges -Fp -f "${dumpPath}"`;
  const dumpResult = run(dumpCmd);

  if (dumpResult === null && !existsSync(dumpPath)) {
    fail("pg_dump failed. Check database connection and credentials.");
    process.exit(1);
  }

  if (!existsSync(dumpPath)) {
    fail("pg_dump did not produce output file.");
    process.exit(1);
  }

  const dumpSize = run(`stat -c%s "${dumpPath}"`) || "unknown";
  ok(
    `Dump created: ${dumpName}.sql (${Number(dumpSize).toLocaleString()} bytes)`,
  );

  // ── Step 3: Encrypt (optional) ────────────────────────────────────────
  let finalPath = dumpPath;
  if (opts.encrypt && password) {
    const encPath = `${dumpPath}.enc`;
    info("Encrypting backup with AES-256-CBC...");
    const encCmd = `openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -in "${dumpPath}" -out "${encPath}" -pass stdin`;
    const encResult = run(encCmd, { input: password + "\n" });

    if (encResult === null && !existsSync(encPath)) {
      fail("Encryption failed. The unencrypted dump is still available.");
      finalPath = dumpPath;
    } else {
      // Remove plaintext dump after successful encryption
      run(`rm -f "${dumpPath}"`);
      finalPath = encPath;
      const encSize = run(`stat -c%s "${encPath}"`) || "unknown";
      ok(
        `Encrypted: ${dumpName}.sql.enc (${Number(encSize).toLocaleString()} bytes)`,
      );
    }
  }

  // ── Step 4: Protect from deletion ─────────────────────────────────────
  gap();
  info("Setting deletion protection...");
  lockFileForDeleteProtection(finalPath);

  // Lock directory too (requires root on first run, cached after)
  lockDirForDeleteProtection(BACKUP_DIR);

  // ── Done ──────────────────────────────────────────────────────────────
  gap();
  ok(chalk.bold("Backup complete."));
  dim(`Location: ${finalPath}`);
  if (opts.encrypt) {
    dim(
      `To restore: openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in "${finalPath}" | psql -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.db}`,
    );
  } else {
    dim(
      `To restore: psql -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.db} < "${finalPath}"`,
    );
  }
}

main().catch((err) => {
  fail(err.message || String(err));
  process.exit(1);
});
