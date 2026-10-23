# setup-zerodrop

[![CI](https://github.com/zerodrop-dev/setup-zerodrop/actions/workflows/ci.yml/badge.svg)](https://github.com/zerodrop-dev/setup-zerodrop/actions/workflows/ci.yml)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-setup--zerodrop-green?logo=github)](https://github.com/marketplace/actions/setup-zerodrop)
[![license](https://img.shields.io/github/license/zerodrop-dev/setup-zerodrop.svg)](LICENSE)

Email verification for CI — generates an isolated inbox per run. OTPs and magic links auto-extracted at Cloudflare's edge. No Docker, no SMTP, no signup to try.

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1
  id: mail

- run: npx playwright test
  env:
    TEST_INBOX: ${{ steps.mail.outputs.inbox }}
```

That's it. Every workflow run gets a fresh inbox. Parallel jobs never collide.

Without an API key, one sender can reach only 5 different inboxes a day. If your workflow runs more often than that, [add a free key](#with-a-free-api-key-private-inboxes).

## How it works

1. `setup-zerodrop` generates a unique inbox — locally, no network request
2. Your app sends real verification emails to it
3. ZeroDrop catches them at Cloudflare's edge — OTPs and magic links auto-extracted
4. Your tests read them via any [ZeroDrop SDK](https://zerodrop.dev): `email.otp`, `email.magicLink`

## Usage

### Basic

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: zerodrop-dev/setup-zerodrop@v1
    id: mail

  - uses: actions/setup-node@v4
    with:
      node-version: 20

  - run: npm ci
  - run: npx playwright install --with-deps chromium
  - run: npx playwright test
    env:
      TEST_INBOX: ${{ steps.mail.outputs.inbox }}
```

### With a prefix

Tag inboxes by app or job for easier debugging:

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1
  id: mail
  with:
    prefix: myapp
# → myapp-swift-x7k29ab@zerodrop-sandbox.online
```

A prefix whose part before the first hyphen is four letters and digits, at least one of each (`app1`, `app1-web`), has the shape of an account prefix, so without an API key it goes after the adjective instead: `swift-app1-web-x7k29ab`.

### Environment variables

The action also exports env vars — no `steps.<id>.outputs` wiring needed:

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1

- run: npx playwright test
  # $ZERODROP_INBOX and $ZERODROP_INBOX_NAME are already set
```

### With a free API key (private inboxes)

Without a key, anyone who knows an inbox's name can read it, and one sender can reach only 5 different inboxes a day: past that, the inbox gets a notice from `notice@zerodrop.dev` instead of the email. Sign in with GitHub at [zerodrop.dev/keys](https://zerodrop.dev/keys) for a free key, store it as a repository secret, and pass it in:

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1
  id: mail
  with:
    api-key: ${{ secrets.ZERODROP_API_KEY }}
# → k7x2-swift-x7k29ab@zerodrop-sandbox.online
# Exports ZERODROP_API_KEY for your test steps
```

The inbox name then starts with your key's prefix (`k7x2` here), only your key can read it, and mail to it isn't limited. With `prefix: myapp` as well, you get `k7x2-myapp-swift-x7k29ab`. ZeroDrop SDKs read `ZERODROP_API_KEY` on their own (TypeScript 0.3.0+; Python, Ruby, Go, PHP and Java 0.2.0+); with an older SDK, pass the key to the client yourself.

If the job already sets `ZERODROP_API_KEY` in its `env`, you can leave out `api-key`: the action uses that key.

Free sandbox mode works without a key, within that daily limit. [Workspaces](https://zerodrop.dev/pricing) add custom domains and extended retention.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `prefix` | No | — | Prefix for the inbox name (e.g. your app name) |
| `api-key` | No | `$ZERODROP_API_KEY` | Free API key from [zerodrop.dev/keys](https://zerodrop.dev/keys). Inbox names then start with the key's prefix and only the key can read them. Omit (with no `ZERODROP_API_KEY` in the job) for a public inbox. |
| `base-url` | No | `https://zerodrop.dev` | Not used: the action makes no network requests. Kept so workflows that set it keep working. |

## Outputs

| Output | Example |
|---|---|
| `inbox` | `swift-x7k29ab@zerodrop-sandbox.online` (`k7x2-swift-x7k29ab@…` with an API key) |
| `name` | `swift-x7k29ab` |

## Exported environment variables

| Variable | Value |
|---|---|
| `ZERODROP_INBOX` | Full inbox address |
| `ZERODROP_INBOX_NAME` | Inbox name without domain |
| `ZERODROP_API_KEY` | The key the action used, from `api-key` or the job's own `ZERODROP_API_KEY` (masked in logs) |

## Reading emails in your tests

Use any ZeroDrop SDK inside the test step:

```typescript
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop(); // picks up ZERODROP_API_KEY when it's set
const inbox = process.env.TEST_INBOX!;

const email = await mail.waitForLatest(inbox, { timeout: 15000 });

email.otp        // "847291" — auto-extracted, no regex
email.magicLink  // "https://..." — auto-extracted
```

If ZeroDrop held an email because its sender passed the daily limit, current SDKs stop waiting and raise an error that says so: TypeScript 0.4.0+, Python, Ruby and PHP 0.3.0+, Go and Java v0.3.0+. Older ones return the notice as if it were the email, or time out when a filter skips it.

SDKs: [npm](https://www.npmjs.com/package/zerodrop-client) · [PyPI](https://pypi.org/project/zerodrop/) · [Go](https://pkg.go.dev/github.com/zerodrop-dev/zerodrop-go) · [RubyGems](https://rubygems.org/gems/zerodrop) · [Packagist](https://packagist.org/packages/zerodrop/zerodrop) · [JitPack](https://jitpack.io/#zerodrop-dev/zerodrop-java)

## Supply chain security

Pin to a commit SHA instead of a tag:

```yaml
- uses: zerodrop-dev/setup-zerodrop@aa882ace46b204bfd84bbcc374df73d32cf67343 # v1.1.0
```

The action is a single dependency-free `dist/index.js` — auditable in one read. Inbox generation is fully local; the action makes **no network requests**.

## Migrating from create-inbox

This action was previously published as `zerodrop-dev/create-inbox`. That path was retired by GitHub during an account migration. Update your workflows:

```diff
- - uses: zerodrop-dev/create-inbox@v1
+ - uses: zerodrop-dev/setup-zerodrop@v1
```

Inputs and outputs are unchanged, plus new `api-key` and `base-url` inputs.

## License

MIT — [zerodrop.dev](https://zerodrop.dev)
