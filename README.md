# dsh-plugin-chat-tools

![test](https://github.com/asdukw/dsh-plugin-chat-tools/actions/workflows/test.yml/badge.svg)

[DeepSeek Harness](https://deepseek.com/harness/) (`dsh`) plugin for working inside a
chat page on an Android device: collect the visible conversation once, then read only
the delta as new messages arrive. It is a companion to
[dsh-plugin-android-tools](https://github.com/asdukw/dsh-plugin-android-tools) and
talks to the same local HTTP bridge.

[中文说明](README.zh.md)

## Tools

| Tool | Description |
|---|---|
| `collect_chat(rounds?)` | Read + swipe up for 1–6 rounds (default 3), sliding to the newest messages and accumulating a deduplicated context |
| `read_chat` | Read the page in place and return only lines not seen before, plus the last 10 context lines |
| `wait(seconds)` | Client-side sleep (10–120s) to give the other side time to reply; nothing is sent to the device |

The dedupe state lives in the plugin process memory, so it tracks one chat page
per dsh task. Use `collect_chat` right after entering a chat, then `read_chat`
repeatedly without leaving/rentering the conversation.

## Install

```bash
dsh plugin add github:asdukw/dsh-plugin-chat-tools
# after the first npm release:
dsh plugin add dsh-plugin-chat-tools
```

The package ships a `dsh.bundle` layer (`cordis.patch.yml`) that inserts the plugin
row on install. Restart `dsh` afterwards.

## Configuration

Same bridge environment variables as `dsh-plugin-android-tools`, injected by the
host Android app:

| Variable | Meaning |
|---|---|
| `MEMEX_BRIDGE_URL` | Bridge base URL, e.g. `http://127.0.0.1:37812` |
| `MEMEX_BRIDGE_TOKEN` | Per-process random token |

The plugin calls the bridge's `read_screen` and `swipe` actions directly, so it
works independently of the core tools plugin being mounted. The bridge contract is
documented in
[dsh-plugin-android-tools/README.md](https://github.com/asdukw/dsh-plugin-android-tools#bridge-contract).

## Notes

- `collect_chat` normalizes lines by stripping node refs (`[12]`) and coordinates
  (`@(x,y)`) before deduplicating, so a repeated full-screen read only yields truly
  new lines.
- Screen text can be personal data; tool results are only returned to the model and
  are never logged by this plugin.

## Development

No dependencies needed for the smoke test (a loader stub replaces
`@deepseek-ai/dsh-tools`):

```bash
npm test
```

Release: the first version must be published locally, because npm cannot
configure a trusted publisher for a package that does not exist yet:

1. `npm login` (interactive 2FA), then `npm publish --access public` from this repo.
2. On npmjs.com open the package → Settings → Trusted Publisher → GitHub Actions:
   organization/user `asdukw`, repository `dsh-plugin-chat-tools`, workflow
   filename `publish.yml`, allowed action `npm publish`.
3. Bump `version`, commit, tag `v<version>`, push the tag. The `publish` workflow
   then authenticates via GitHub OIDC, attaches provenance automatically and needs
   no secrets.

## License

MIT
