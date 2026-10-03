# dsh-plugin-chat-tools

![test](https://github.com/asdukw/dsh-plugin-chat-tools/actions/workflows/test.yml/badge.svg)

[DeepSeek Harness](https://deepseek.com/harness/)（`dsh`）插件：经设备 UI 自动化桥在聊天页
里工作 —— 先一次性收集可见对话，之后只读增量新消息。

它是 [dsh-plugin-android-tools](https://github.com/asdukw/dsh-plugin-android-tools) 的
配套插件。两者走同一个桥、共用同一契约；本插件直接调用桥的 `read_screen` / `swipe`
动作，因此不依赖核心工具插件是否挂载。

[English](README.md)

## 前置条件

- 运行中的 `dsh`，带 `@deepseek-ai/dsh-tools` >= `0.1.0-rc.6`（peer dependency）。
- 一个可通过 HTTP 访问的桥宿主（契约与 `dsh-plugin-android-tools` 相同）。

## 工具

| 工具 | 说明 |
|---|---|
| `collect_chat(rounds?)` | 「读取+向上滑动」1–6 轮（默认 3），滑到最新消息并积累去重后的上下文 |
| `read_chat` | 原地读取当前页，只返回没见过的行 + 最近 10 行上下文 |
| `wait(seconds)` | 纯客户端等待（10–120 秒），给对方回复时间；不发送任何设备动作 |

## 安装

```bash
# 从 git 安装，锁定 release tag：
dsh plugin add github:asdukw/dsh-plugin-chat-tools#v0.2.0

# 或安装任意 GitHub Release 附带的 tarball：
dsh plugin add ./dsh-plugin-chat-tools-0.2.0.tgz

# npm 发布启用后也可以：
dsh plugin add dsh-plugin-chat-tools
```

包内声明了 `dsh.bundle` 层（`cordis.patch.yml`），安装时自动插入插件行；之后重启 `dsh`。

## 配置

| 变量 | 含义 |
|---|---|
| `ANDROID_BRIDGE_URL` | 桥的基础地址，如 `http://127.0.0.1:37812` |
| `ANDROID_BRIDGE_TOKEN` | 每个请求校验的共享 token，通常由宿主每次启动随机生成 |

任一缺失时工具调用以 `ANDROID_BRIDGE_URL/ANDROID_BRIDGE_TOKEN not set` 失败。

## 使用

进入聊天页后先调用一次 `collect_chat`（读取+向上滑动若干轮、按行去重），之后反复调
`read_chat` 原地跟踪新消息；`wait(seconds)` 在两次读取之间做客户端等待。跟踪期间不要退出/
重进会话 —— 已见行状态在插件进程内存里，一次任务跟踪一个聊天页。

## 说明

- `collect_chat` 去重前会把行归一化：去掉节点编号（`[12]`）与坐标（`@(x,y)`），
  因此重复全量读屏只会产出真正新增的行。
- 屏幕文本可能包含个人数据；本插件只把工具结果交给模型，不写日志。

## 开发

烟测无需安装依赖（用 loader stub 顶替 `@deepseek-ai/dsh-tools`）：

```bash
npm test
```

发布：推 `v*` tag。`release` workflow 会跑测试、打包，并创建附带 `.tgz` 的 GitHub
Release。npm 发布是同一 workflow 里的 gated job：先本地发首个版本（`npm login` 后
`npm publish --access public`），在 npmjs.com 添加 trusted publisher（package →
Settings → Trusted Publisher → GitHub Actions：user `asdukw`、repository
`dsh-plugin-chat-tools`、workflow filename `release.yml`、允许 `npm publish`），
然后启用：

```bash
gh variable set NPM_PUBLISH_READY --body true -R asdukw/dsh-plugin-chat-tools
```

## 许可

MIT
