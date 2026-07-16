# setup-zerodrop

[![CI](https://github.com/zerodrop-dev/setup-zerodrop/actions/workflows/ci.yml/badge.svg)](https://github.com/zerodrop-dev/setup-zerodrop/actions/workflows/ci.yml)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-setup--zerodrop-green?logo=github)](https://github.com/marketplace/actions/setup-zerodrop)
[![license](https://img.shields.io/github/license/zerodrop-dev/setup-zerodrop.svg)](LICENSE)

Email verification for CI — generates an isolated inbox per run. OTPs and magic links auto-extracted at Cloudflare's edge. No Docker, no SMTP, no signup.

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1
  id: mail

- run: npx playwright test
  env:
    TEST_INBOX: ${{ steps.mail.outputs.inbox }}
```

That's it. Every workflow run gets a fresh, isolated inbox. Parallel jobs never collide.

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

### Environment variables

The action also exports env vars — no `steps.<id>.outputs` wiring needed:

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1

- run: npx playwright test
  # $ZERODROP_INBOX and $ZERODROP_INBOX_NAME are already set
```

### With a Workspace API key

```yaml
- uses: zerodrop-dev/setup-zerodrop@v1
  with:
    api-key: ${{ secrets.ZERODROP_API_KEY }}
# Exports ZERODROP_API_KEY for your test steps
```

Free sandbox mode needs no key. [Workspaces](https://zerodrop.dev/pricing) add custom domains and extended retention.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `prefix` | No | — | Prefix for the inbox name (e.g. your app name) |
| `api-key` | No | — | Workspace API key. Omit for free sandbox mode. |
| `base-url` | No | `https://zerodrop.dev` | Self-hosted instance URL |

## Outputs

| Output | Example |
|---|---|
| `inbox` | `swift-x7k29ab@zerodrop-sandbox.online` |
| `name` | `swift-x7k29ab` |

## Exported environment variables

| Variable | Value |
|---|---|
| `ZERODROP_INBOX` | Full inbox address |
| `ZERODROP_INBOX_NAME` | Inbox name without domain |
| `ZERODROP_API_KEY` | Only if `api-key` input was provided |

## Reading emails in your tests

Use any ZeroDrop SDK inside the test step:

```typescript
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop();
const inbox = process.env.TEST_INBOX!;

const email = await mail.waitForLatest(inbox, { timeout: 15000 });

email.otp        // "847291" — auto-extracted, no regex
email.magicLink  // "https://..." — auto-extracted
```

SDKs: [npm](https://www.npmjs.com/package/zerodrop-client) · [PyPI](https://pypi.org/project/zerodrop/) · [Go](https://pkg.go.dev/github.com/zerodrop-dev/zerodrop-go) · [RubyGems](https://rubygems.org/gems/zerodrop) · [Packagist](https://packagist.org/packages/zerodrop/zerodrop) · [JitPack](https://jitpack.io/#zerodrop-dev/zerodrop-java)

## Supply chain security

Pin to a commit SHA instead of a tag:

```yaml
- uses: zerodrop-dev/setup-zerodrop@<commit-sha>  # v1
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
