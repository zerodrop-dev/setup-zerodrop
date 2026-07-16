// setup-zerodrop — generates an isolated ZeroDrop inbox for this CI run.
// Zero dependencies. Inbox generation is local — no network request.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");

const FREE_DOMAIN = "zerodrop-sandbox.online";
const ADJECTIVES = [
  "swift", "dark", "cold", "null", "void",
  "zero", "dead", "raw", "base", "core",
];
const ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";

function getInput(name) {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return (process.env[key] || "").trim();
}

function setOutput(name, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) {
    fs.appendFileSync(outFile, `${name}=${value}${os.EOL}`);
  } else {
    // Fallback for older runners
    console.log(`::set-output name=${name}::${value}`);
  }
}

function exportVariable(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `${name}=${value}${os.EOL}`);
  }
}

function randInt(max) {
  return crypto.randomInt(0, max);
}

function randString(n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += ALPHANUM[randInt(ALPHANUM.length)];
  }
  return s;
}

function main() {
  const prefix = getInput("prefix")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 20);
  const apiKey = getInput("api-key");

  const adjective = ADJECTIVES[randInt(ADJECTIVES.length)];
  const suffix = randString(7);

  const name = prefix
    ? `${prefix}-${adjective}-${suffix}`
    : `${adjective}-${suffix}`;
  const inbox = `${name}@${FREE_DOMAIN}`;

  setOutput("inbox", inbox);
  setOutput("name", name);

  // Convenience env vars for test steps
  exportVariable("ZERODROP_INBOX", inbox);
  exportVariable("ZERODROP_INBOX_NAME", name);
  if (apiKey) {
    exportVariable("ZERODROP_API_KEY", apiKey);
  }

  console.log(`✓ ZeroDrop inbox ready: ${inbox}`);
  console.log("");
  console.log("  Available as:");
  console.log("    steps.<id>.outputs.inbox");
  console.log("    $ZERODROP_INBOX");
  console.log("");
  console.log(`  Watch live: https://zerodrop.dev/inbox/${name}`);
  if (!apiKey) {
    console.log("");
    console.log("  Free sandbox mode — 30 min TTL, shared domain.");
    console.log("  Workspaces (custom domains, extended retention): https://zerodrop.dev/pricing");
  }
}

try {
  main();
} catch (err) {
  console.error(`::error::setup-zerodrop failed: ${err.message}`);
  process.exit(1);
}
