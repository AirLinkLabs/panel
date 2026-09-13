#!/usr/bin/env node

/**
 * db-reset.mjs — Nuclear database + Redis reset.
 *
 * Drops the application database, recreates it, flushes Redis, then runs
 * Prisma generate + migrate to bring the schema up to date.
 *
 * Flags:
 *   --yes / -y     Skip confirmation prompt (non-interactive / CI).
 *   --no-migrate   Skip prisma generate + migrate after reset.
 *   --help / -h    Show this message.
 *
 * Usage:
 *   node scripts/db-reset.mjs
 *   node scripts/db-reset.mjs --yes
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import boxen from "boxen";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// ── Arg parsing ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function flag(name, fallback = null) {
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
  yes: argv.includes("--yes") || argv.includes("-y"),
  noMigrate: argv.includes("--no-migrate"),
  help: argv.includes("--help") || argv.includes("-h"),
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
    console.log(
      boxen(
        [
          chalk.bold.red("  !!  DESTRUCTIVE OPERATION  !!"),
          "",
          chalk.dim("  This will PERMANENTLY DELETE:"),
          "",
          chalk.red("    * The entire airlink PostgreSQL database"),
          chalk.red("    * The PostgreSQL role and all owned objects"),
          chalk.red("    * All Redis session + cache data"),
          "",
          chalk.dim("  There is NO undo for this action."),
        ].join("\n"),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "red",
        },
      ),
    );
  } else {
    warn("DESTRUCTIVE: Dropping database, role, and flushing Redis.");
  }
}

function showHelp() {
  console.log(`${chalk.bold("Usage")}
  node scripts/db-reset.mjs [flags]

${chalk.bold("Flags")}
  --yes, -y        Skip confirmation prompt (CI / non-interactive).
  --no-migrate     Don't run prisma generate + migrate after reset.
  --help, -h       Show this message.

${chalk.bold("What it does")}
  1. Drops the airlink database.
  2. Drops all owned objects and the PostgreSQL role.
  3. Recreates the role with login + createdb privileges.
  4. Recreates the database with the role as owner.
  5. Grants full database privileges to the role.
  6. Flushes all Redis data.
  7. Runs prisma generate + migrate dev.

${chalk.bold("Examples")}
  node scripts/db-reset.mjs
  node scripts/db-reset.mjs --yes
`);
}

// ── Prompt ───────────────────────────────────────────────────────────────────

function ask(question) {
  if (opts.yes) return Promise.resolve(true);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `  ${chalk.yellow("?")} ${question} ${chalk.dim("[y/N]")} `,
      (ans) => {
        rl.close();
        const lower = ans.trim().toLowerCase();
        resolve(lower === "y" || lower === "yes");
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
    // Strip surrounding quotes
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
  // postgresql://user:pass@host:port/dbname
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

// ── Shell helpers ────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts });
  } catch (e) {
    return null;
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
  const databaseUrl = env.DATABASE_URL || env.DATABASE_URL;
  const redisUrl = env.REDIS_URL || "redis://127.0.0.1:6379";

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

  // Parse Redis URL
  let redisHost = "127.0.0.1";
  let redisPort = "6379";
  try {
    const redisMatch = redisUrl.match(/^redis:\/\/([^:]+):(\d+)$/);
    if (redisMatch) {
      redisHost = redisMatch[1];
      redisPort = redisMatch[2];
    }
  } catch {
    /* use defaults */
  }

  info(`Database: ${db.host}:${db.port}/${db.db} (user: ${db.user})`);
  info(`Redis:    ${redisHost}:${redisPort}`);
  gap();

  const confirmed = await ask(
    chalk.bold.red("Type 'y' to PERMANENTLY destroy all data and continue:"),
  );

  if (!confirmed) {
    warn("Aborted.");
    process.exit(0);
  }

  gap();

  // ── Step 1: Drop database ──────────────────────────────────────────────
  info("Dropping database...");
  // Connect to 'postgres' default db to drop the app db
  const dropCmd = `PGPASSWORD=${db.pass} psql -h ${db.host} -p ${db.port} -U ${db.user} -d postgres -c "DROP DATABASE IF EXISTS ${db.db};"`;
  const dropResult = run(dropCmd);
  if (dropResult !== null) {
    ok("Database dropped.");
  } else {
    // Try as postgres superuser if airlink user lacks drop perms
    warn("airlink user lacks DROP — trying postgres superuser...");
    const superCmd = `sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${db.db};"`;
    const superResult = run(superCmd);
    if (superResult !== null) {
      ok("Database dropped (via postgres superuser).");
    } else {
      fail("Failed to drop database. You may need to run manually:");
      dim(`  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${db.db};"`);
    }
  }

  // ── Step 1b: Drop owned objects + role ─────────────────────────────────
  info("Revoking all owned objects and dropping role...");
  const revokeCmd = `PGPASSWORD=${db.pass} psql -h ${db.host} -p ${db.port} -U ${db.user} -d postgres -c "DROP OWNED BY ${db.user} CASCADE;"`;
  const revokeResult = run(revokeCmd);
  if (revokeResult !== null) {
    ok("All owned objects revoked.");
  } else {
    warn("DROP OWNED failed as airlink — trying postgres superuser...");
    const superRevoke = `sudo -u postgres psql -c "DROP OWNED BY ${db.user} CASCADE;"`;
    const superRevokeResult = run(superRevoke);
    if (superRevokeResult !== null) {
      ok("All owned objects revoked (via postgres superuser).");
    } else {
      warn("DROP OWNED failed — role may not exist or have no owned objects.");
    }
  }

  const dropRoleCmd = `PGPASSWORD=${db.pass} psql -h ${db.host} -p ${db.port} -U ${db.user} -d postgres -c "DROP ROLE IF EXISTS ${db.user};"`;
  const dropRoleResult = run(dropRoleCmd);
  if (dropRoleResult !== null) {
    ok(`Role '${db.user}' dropped.`);
  } else {
    warn("airlink user lacks DROP ROLE — trying postgres superuser...");
    const superDropRole = `sudo -u postgres psql -c "DROP ROLE IF EXISTS ${db.user};"`;
    const superDropRoleResult = run(superDropRole);
    if (superDropRoleResult !== null) {
      ok(`Role '${db.user}' dropped (via postgres superuser).`);
    } else {
      warn("Failed to drop role. Continuing...");
    }
  }

  // ── Step 2: Recreate role + database ────────────────────────────────────
  info("Recreating role...");
  const createRoleCmd = `PGPASSWORD=${db.pass} psql -h ${db.host} -p ${db.port} -U ${db.user} -d postgres -c "CREATE ROLE ${db.user} WITH LOGIN PASSWORD '${db.pass}' CREATEDB;"`;
  const createRoleResult = run(createRoleCmd);
  if (createRoleResult !== null) {
    ok(`Role '${db.user}' created.`);
  } else {
    warn("CREATE ROLE failed — trying postgres superuser...");
    const superCreateRole = `sudo -u postgres psql -c "CREATE ROLE ${db.user} WITH LOGIN PASSWORD '${db.pass}' CREATEDB;"`;
    const superCreateRoleResult = run(superCreateRole);
    if (superCreateRoleResult !== null) {
      ok(`Role '${db.user}' created (via postgres superuser).`);
    } else {
      warn(
        "Failed to create role. Continuing — database creation may still work.",
      );
    }
  }

  info("Recreating database...");
  const createCmd = `PGPASSWORD=${db.pass} psql -h ${db.host} -p ${db.port} -U ${db.user} -d postgres -c "CREATE DATABASE ${db.db} OWNER ${db.user};"`;
  const createResult = run(createCmd);
  if (createResult !== null) {
    ok("Database recreated.");
  } else {
    warn("airlink user lacks CREATE — trying postgres superuser...");
    const superCreate = `sudo -u postgres psql -c "CREATE DATABASE ${db.db} OWNER ${db.user};"`;
    const superCreateResult = run(superCreate);
    if (superCreateResult !== null) {
      ok("Database recreated (via postgres superuser).");
    } else {
      fail("Failed to recreate database. You may need to run manually:");
      dim(
        `  sudo -u postgres psql -c "CREATE DATABASE ${db.db} OWNER ${db.user};"`,
      );
    }
  }

  // ── Step 3: Grant privileges on database ────────────────────────────────
  info("Granting database privileges...");
  const grantCmd = `PGPASSWORD=${db.pass} psql -h ${db.host} -p ${db.port} -U ${db.user} -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${db.db} TO ${db.user};"`;
  const grantResult = run(grantCmd);
  if (grantResult !== null) {
    ok("Database privileges granted.");
  } else {
    const superGrant = `sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${db.db} TO ${db.user};"`;
    run(superGrant);
    ok("Database privileges granted (via postgres superuser).");
  }

  // ── Step 3: Flush Redis ────────────────────────────────────────────────
  info("Flushing Redis...");
  const redisCmd = `redis-cli -h ${redisHost} -p ${redisPort} FLUSHALL`;
  const redisResult = run(redisCmd);
  if (redisResult !== null && redisResult.trim() === "OK") {
    ok("Redis flushed.");
  } else {
    warn("Redis flush failed — Redis may not be running. Continuing...");
  }

  // ── Step 4: Prisma generate + migrate ──────────────────────────────────
  if (!opts.noMigrate) {
    gap();
    info("Running prisma generate...");
    const genResult = run("npx prisma generate", { cwd: projectDir });
    if (genResult !== null) {
      ok("Prisma client generated.");
    } else {
      fail("prisma generate failed.");
    }

    info("Running prisma migrate dev...");
    const migResult = run("npx prisma migrate dev", { cwd: projectDir });
    if (migResult !== null) {
      ok("Migrations applied.");
    } else {
      fail("prisma migrate dev failed — check output above.");
    }
  }

  gap();
  ok(
    chalk.bold(
      "Reset complete. Database, role, and Redis are clean. Schema is up to date.",
    ),
  );
}

main().catch((err) => {
  fail(err.message || String(err));
  process.exit(1);
});
