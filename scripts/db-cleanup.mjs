#!/usr/bin/env node
/**
 * db-cleanup.mjs — Drop the database and role permanently. No recreate.
 *
 * Drops the airlink PostgreSQL database, role, all owned objects, and flushes
 * Redis. Does NOT recreate anything. Run setup.mjs to start fresh afterward.
 *
 * Flags:
 *   --yes / -y     Skip confirmation prompt.
 *   --help / -h    Show help.
 *
 * Usage:
 *   node scripts/db-cleanup.mjs
 *   node scripts/db-cleanup.mjs --yes
 */

import { execSync }                from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname }        from "node:path";
import { fileURLToPath }           from "node:url";

import { Logger, box, confirm }         from "./ui.mjs";
import { runAsSuper, dropRoleCleanly, detectMethod } from "./pg-super.mjs";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// ── Arg parsing ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

const opts = {
  yes  : argv.includes("--yes")  || argv.includes("-y"),
  help : argv.includes("--help") || argv.includes("-h"),
};

// ── Help ──────────────────────────────────────────────────────────────────────

function showHelp() {
  Logger.banner([
    "db-cleanup.mjs  —  Permanent database cleanup",
    "",
    "  node scripts/db-cleanup.mjs [flags]",
    "",
    "  --yes, -y      Skip confirmation prompt",
    "  --help, -h     Show this message",
    "",
    "  What it does:",
    "    1. Revokes all privileges from the role",
    "    2. Drops the airlink PostgreSQL role",
    "    3. Drops the airlink database",
    "    4. Flushes all Redis data",
    "    Does NOT recreate anything.",
  ]);
  process.exit(0);
}

// ── .env helpers ──────────────────────────────────────────────────────────────

function readEnv() {
  const envPath = resolve(projectDir, ".env");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function parseDatabaseUrl(url) {
  const m = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!m) return null;
  return { user: m[1], pass: m[2], host: m[3], port: m[4], db: m[5] };
}

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }); }
  catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (opts.help) showHelp();

  // Warning banner
  const width = 56;
  const warning = box(width, "!! PERMANENT CLEANUP !!", [
    "",
    "  This will PERMANENTLY DELETE and NOT recreate:",
    "",
    "    * The entire airlink PostgreSQL database",
    "    * The PostgreSQL role and all owned objects",
    "    * All Redis session and cache data",
    "",
    "  Re-run 'pnpm run setup' to start from scratch.",
    "",
  ]);
  console.log();
  warning.forEach((l) => console.log(`  ${l}`));
  Logger.gap();

  // Load .env
  const env = readEnv();
  if (!env.DATABASE_URL) {
    Logger.fail("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = parseDatabaseUrl(env.DATABASE_URL);
  if (!db) {
    Logger.fail("Could not parse DATABASE_URL");
    process.exit(1);
  }

  const redisUrl   = env.REDIS_URL || "redis://127.0.0.1:6379";
  const redisMatch = redisUrl.match(/^redis:\/\/([^:]+):(\d+)$/);
  const redisHost  = redisMatch?.[1] ?? "127.0.0.1";
  const redisPort  = redisMatch?.[2] ?? "6379";

  Logger.info(`Database  ${db.host}:${db.port}/${db.db}  (role: ${db.user})`);
  Logger.info(`Redis     ${redisHost}:${redisPort}`);
  Logger.gap();

  // Confirm
  if (!opts.yes) {
    const go = await confirm(
      "PERMANENTLY destroy all data and NOT recreate?",
      false,
    );
    if (!go) { Logger.warn("Aborted"); process.exit(0); }
  }

  Logger.gap();

  // Detect sudo access
  Logger.section("Superuser access");
  try {
    const m = await detectMethod();
    Logger.ok(m === "nopasswd" ? "NOPASSWD sudo configured" : "Sudo with password");
  } catch (e) {
    Logger.fail(e.message);
    process.exit(1);
  }

  // Step 1: drop database
  Logger.section("Database");
  Logger.info("Dropping database...");
  const dropDb = await runAsSuper(`DROP DATABASE IF EXISTS ${db.db}`);
  if (dropDb.ok) Logger.ok("Database dropped");
  else           Logger.warn("Failed to drop database — continuing");

  // Step 2: drop role
  Logger.info("Dropping role and revoking all privileges...");
  const dropRole = await dropRoleCleanly(db.user);
  if (dropRole.ok) Logger.ok(`Role '${db.user}' dropped`);
  else             Logger.warn("Failed to drop role — continuing");

  // Step 3: flush Redis
  Logger.section("Redis");
  Logger.info("Flushing Redis...");
  const redisResult = run(`redis-cli -h ${redisHost} -p ${redisPort} FLUSHALL`);
  if (redisResult?.trim() === "OK") Logger.ok("Redis flushed");
  else                               Logger.warn("Redis flush failed — may not be running");

  // Done
  Logger.gap();
  Logger.ok("Cleanup complete. Nothing remains.");
  Logger.dim("Run 'pnpm run setup' to recreate from scratch.");
}

main().catch((err) => {
  Logger.fail(err.message || String(err));
  process.exit(1);
});
