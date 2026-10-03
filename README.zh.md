# dsh-plugin-chat-tools

![test](https://github.com/asdukw/dsh-plugin-chat-tools/actions/workflows/test.yml/badge.svg)

[DeepSeek Harness](https://deepseek.com/harness/)（`dsh`）插件：在 Android 聊天页里工作 ——
先一次性收集可见对话上下文，之后只读增量新消息。它是
[dsh-plugin-android-tools](https://github.com/asdukw/dsh-plugin-android-tools) 的配套插件，
走同一个本地 HTTP 桥。

[English](README.md)

## 工具

| 工具 | 说明 |
|---|---|
| `collect_chat(rounds?)` | 「读取+向上滑动」1–6 轮（默认 3），滑到最新消息并积累去重后的上下文 |
| `read_chat` | 原地读取当前页，只返回没见过的行 + 最近 10 行上下文 |
| `wait(seconds)` | 纯客户端等待（10–120 秒），给对方回复时间；不发送任何设备动作 |

去重状态存在插件进程内存里，一次 dsh 任务跟踪一个聊天页。进入聊天后用 `collect_chat`，
之后反复调 `read_chat`，不要退出/重进会话。

## 安装

```bash
dsh plugin add github:asdukw/dsh-plugin-chat-tools
# 锁定 release tag：
dsh plugin add github:asdukw/dsh-plugin-chat-tools#v0.1.0
```

每个 GitHub Release 都附有 `npm pack` 打出的 tarball，也可以直接安装：

```bash
dsh plugin add ./dsh-plugin-chat-tools-0.1.0.tgz
```

包内声明了 `dsh.bundle` 层（`cordis.patch.yml`），安装时自动插入插件行；之后重启 `dsh`。

## 配置

与 `dsh-plugin-android-tools` 相同的桥环境变量，由宿主 Android App 注入：

| 变量 | 含义 |
|---|---|
| `MEMEX_BRIDGE_URL` | 桥的基础地址，如 `http://127.0.0.1:37812` |
| `MEMEX_BRIDGE_TOKEN` | 每次进程启动随机生成的 token |

插件直接调用桥的 `read_screen` 与 `swipe` 动作，因此不依赖核心工具插件是否挂载。
桥契约见
[dsh-plugin-android-tools/README.zh.md](https://github.com/asdukw/dsh-plugin-android-tools/blob/main/README.zh.md)。

## 说明

- `collect_chat` 去重前会把行归一化：去掉节点编号（`[12]`）与坐标（`@(x,y)`），
  因此重复全量读屏只会产出真正新增的行。
- 屏幕文本可能包含个人数据；本插件只把工具结果交给模型，不写日志。

## 开发

烟测无需安装依赖（用 loader stub 顶替 `@deepseek-ai/dsh-tools`）：

```bash
npm test
```

发布：推 `v*` tag 即可。`release` workflow 会跑测试、`npm pack` 打包，并创建附带
`.tgz` 的 GitHub Release（可用 `dsh plugin add ./dsh-plugin-chat-tools-<version>.tgz`
安装，或直接 `dsh plugin add github:asdukw/dsh-plugin-chat-tools#v<version>`）。

npm 发布已备好但默认关闭：先本地发首个版本（`npm login` 后
`npm publish --access public`），在 npmjs.com 为包添加 trusted publisher
（package → Settings → Trusted Publisher → GitHub Actions：user `asdukw`、
repository `dsh-plugin-chat-tools`、workflow filename `release.yml`、允许
`npm publish`），然后启用 workflow 的 npm job：

```bash
gh variable set NPM_PUBLISH_READY --body true -R asdukw/dsh-plugin-chat-tools
```

## 许可

MIT
