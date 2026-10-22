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

// A free key from https://zerodrop.dev/keys is zd_<prefix>_<32 letters/digits>.
// Inboxes named <prefix>-... can be read only with that key.
const KEY_FORMAT = /^zd_([a-z0-9]{4})_[A-Za-z0-9]{32}$/;

// Account prefixes are 4 letters/digits with at least one of each. A name of
// that shape at the start belongs to whichever account owns the prefix.
function looksLikeAccountPrefix(segment) {
  return /^[a-z0-9]{4}$/.test(segment) && /[a-z]/.test(segment) && /[0-9]/.test(segment);
}

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
    .replace(/^-+/, "")
    .slice(0, 20)
    .replace(/-+$/, "");
  // The api-key input, or else a ZERODROP_API_KEY the job already has.
  const inputKey = getInput("api-key");
  const apiKey = inputKey || (process.env.ZERODROP_API_KEY || "").trim();
  // The key goes into an HTTP header (and into $GITHUB_ENV), so it may hold
  // only visible ASCII. Anything else is refused without echoing the key.
  if (/[^\x21-\x7e]/.test(apiKey)) {
    throw new Error(
      `${inputKey ? "api-key" : "ZERODROP_API_KEY"} contains a character that can't be sent in an HTTP header, ` +
        "such as a line break. Copy it again from https://zerodrop.dev/keys."
    );
  }
  if (apiKey) {
    // Keep the key out of later steps' logs, even when it doesn't come from a secret.
    console.log(`::add-mask::${apiKey}`);
  }
  const keyMatch = KEY_FORMAT.exec(apiKey);
  const keyPrefix = keyMatch ? keyMatch[1] : null;

  const adjective = ADJECTIVES[randInt(ADJECTIVES.length)];
  const suffix = randString(7);

  // With a key, the key's prefix goes first, so only that key can read the
  // inbox. Without one, a prefix that starts like an account prefix (app1,
  // app1-web) moves behind the adjective, so the inbox can't land under
  // someone's account.
  let name;
  let moved = false;
  if (keyPrefix) {
    name = prefix
      ? `${keyPrefix}-${prefix}-${adjective}-${suffix}`
      : `${keyPrefix}-${adjective}-${suffix}`;
  } else if (prefix && looksLikeAccountPrefix(prefix.split("-")[0])) {
    name = `${adjective}-${prefix}-${suffix}`;
    moved = true;
  } else {
    name = prefix
      ? `${prefix}-${adjective}-${suffix}`
      : `${adjective}-${suffix}`;
  }
  const inbox = `${name}@${FREE_DOMAIN}`;

  setOutput("inbox", inbox);
  setOutput("name", name);

  // Convenience env vars for test steps
  exportVariable("ZERODROP_INBOX", inbox);
  exportVariable("ZERODROP_INBOX_NAME", name);
  if (apiKey) {
    exportVariable("ZERODROP_API_KEY", apiKey);
  }

  if (apiKey && !keyPrefix) {
    console.log(
      "::warning::setup-zerodrop: the API key isn't in the zd_xxxx_... format from https://zerodrop.dev/keys, " +
        "so the inbox name gets no prefix and anyone who knows it can read the inbox."
    );
  }
  if (moved) {
    console.log(
      `::notice::setup-zerodrop: "${prefix.split("-")[0]}" looks like an account prefix (four letters and digits), ` +
        "so your prefix goes after the adjective. With an API key, the key's prefix comes first and yours follows it."
    );
  }

  console.log(`✓ ZeroDrop inbox ready: ${inbox}`);
  console.log("");
  console.log("  Available as:");
  console.log("    steps.<id>.outputs.inbox");
  console.log("    $ZERODROP_INBOX");
  console.log("");
  if (keyPrefix) {
    console.log(`  Private: only your API key (prefix ${keyPrefix}) can read this inbox.`);
    console.log("  $ZERODROP_API_KEY is set for the steps that follow.");
  } else {
    console.log("  Public: anyone who knows this inbox's name can read it. 30 min TTL, shared domain.");
    console.log("  Free API key for private inboxes: https://zerodrop.dev/keys");
    console.log("  Workspaces (custom domains, extended retention): https://zerodrop.dev/pricing");
  }
}

try {
  main();
} catch (err) {
  console.error(`::error::setup-zerodrop failed: ${err.message}`);
  process.exit(1);
}
