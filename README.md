# dsh-plugin-chat-tools

![test](https://github.com/asdukw/dsh-plugin-chat-tools/actions/workflows/test.yml/badge.svg)

[DeepSeek Harness](https://deepseek.com/harness/) (`dsh`) plugin for working inside a
chat page through a device UI automation bridge: collect the visible conversation once,
then read only the delta as new messages arrive.

Companion to [dsh-plugin-android-tools](https://github.com/asdukw/dsh-plugin-android-tools).
Both plugins talk to the same bridge and share the same contract; this one calls the
bridge's `read_screen` / `swipe` actions directly, so the core tools plugin does not have
to be mounted.

[中文说明](README.zh.md)

## Requirements

- `dsh` running with `@deepseek-ai/dsh-tools` >= `0.1.0-rc.6` (peer dependency).
- A bridge host reachable over HTTP (same contract as
  [dsh-plugin-android-tools](https://github.com/asdukw/dsh-plugin-android-tools#bridge-contract);
  that README also has a runnable mock host and a host-author checklist).

## Tools

| Tool | Description |
|---|---|
| `collect_chat(rounds?)` | Read + swipe up for 1–6 rounds (default 3), sliding to the newest messages and accumulating a deduplicated context |
| `read_chat` | Read the page in place and return only lines not seen before, plus the last 10 context lines |
| `wait(seconds)` | Client-side sleep (10–120s) to give the other side time to reply; nothing is sent to the device |

## Install

```bash
# from git, pinned to a release tag:
dsh plugin add github:asdukw/dsh-plugin-chat-tools#v0.2.0

# or from the tarball attached to any GitHub Release:
dsh plugin add ./dsh-plugin-chat-tools-0.2.0.tgz

# once npm publishing is enabled:
dsh plugin add dsh-plugin-chat-tools
```

The package ships a `dsh.bundle` layer (`cordis.patch.yml`) that inserts the plugin row
on install. Restart `dsh` afterwards.

## Configure

| Variable | Meaning |
|---|---|
| `ANDROID_BRIDGE_URL` | Bridge base URL, e.g. `http://127.0.0.1:37812` |
| `ANDROID_BRIDGE_TOKEN` | Shared token checked on every request, usually random per host start |

If either is missing, tool calls fail with
`ANDROID_BRIDGE_URL/ANDROID_BRIDGE_TOKEN not set`.

## Usage

Right after entering a chat: call `collect_chat` once (read + swipe up a few rounds,
line-deduplicated), then call `read_chat` repeatedly to track new messages in place;
`wait(seconds)` pauses client-side between reads. Do not leave or re-enter the
conversation while tracking — the seen-line state lives in the plugin process memory and
tracks one chat page per task.

## Notes

- `collect_chat` normalizes lines by stripping node refs (`[12]`) and coordinates
  (`@(x,y)`) before deduplicating, so a repeated full-screen read only yields truly new
  lines.
- Screen text can be personal data; tool results are only returned to the model and are
  never logged by this plugin.

## Development

No dependencies needed for the smoke test (a loader stub replaces
`@deepseek-ai/dsh-tools`):

```bash
npm test
```

Release: push a `v*` tag. The `release` workflow runs the tests, packs the package and
creates a GitHub Release with the `.tgz` attached. npm publishing is prepared as a
gated job: publish the first version locally (`npm login`, then `npm publish --access
public`), add a trusted publisher on npmjs.com (package → Settings → Trusted Publisher
→ GitHub Actions: user `asdukw`, repository `dsh-plugin-chat-tools`, workflow filename
`release.yml`, allowed action `npm publish`), then enable the job:

```bash
gh variable set NPM_PUBLISH_READY --body true -R asdukw/dsh-plugin-chat-tools
```

## License

MIT
