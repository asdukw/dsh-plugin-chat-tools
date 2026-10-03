// dsh plugin: chat-page context collection and incremental tracking on top of the
// bridge's read_screen / swipe actions (POST /action). Seen-line state lives in
// this plugin's process memory only (one task lifetime).
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-chat-tools'
export const inject = ['tools']

// 群聊增量跟踪：进入聊天页后，read_screen 的文本行按「去掉 ref 与坐标」归一化去重，
// 只把新增行喂给模型，并附最近上下文。这样同一页持续聊天时上下文是连续的、增量小的。
const seenLines = new Set()
const lineOrder = []

function normalizeLine(line) {
  return line
    .replace(/^\[\d+\]\s*/, '')
    .replace(/\s*@\(\d+,\d+\)\s*$/, '')
    .trim()
}

function chatLines(payload) {
  return payload
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.includes('"'))
    .map(normalizeLine)
    .filter((line) => line.length > 0)
}

async function call(action, args = {}) {
  const baseUrl = process.env.ANDROID_BRIDGE_URL
  const token = process.env.ANDROID_BRIDGE_TOKEN
  if (!baseUrl || !token) throw new Error('ANDROID_BRIDGE_URL/ANDROID_BRIDGE_TOKEN not set')
  const response = await fetch(`${baseUrl}/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-android-bridge-token': token },
    body: JSON.stringify({ action, ...args }),
  })
  const body = await response.json()
  if (body.ok !== true) throw new Error(body.summary ?? `device action failed: ${action}`)
  return body.payload ?? body.summary ?? 'ok'
}

export function apply(ctx) {
  // 开场上下文收集：连续「读取→向上滑」滑到最新并积累上下文（去重）。
  ctx.tools.register(
    defineTool({
      name: 'collect_chat',
      description:
        '进入聊天页后先调用：连续执行「读取→向上滑动」若干轮，滑到最新消息并收集上下文（按文本去重）。'
        + '收集完成后用 read_chat 持续跟踪新消息；聊天过程中不要退出会话、不要重进。',
      parameters: {
        // 可选参数不写 required（dsh 的 schema 只允许 required: true）
        rounds: { type: 'integer', description: '读取+滑动轮数（1–6，默认 3）' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const rounds = Math.min(6, Math.max(1, args.rounds ?? 3))
        for (let index = 0; index < rounds; index++) {
          const payload = await call('read_screen')
          for (const line of chatLines(payload)) {
            if (!seenLines.has(line)) {
              seenLines.add(line)
              lineOrder.push(line)
            }
          }
          if (index < rounds - 1) {
            await call('swipe', { direction: 'up' })
            await new Promise((resolve) => setTimeout(resolve, 700))
          }
        }
        return `已收集上下文 ${lineOrder.length} 行（去重后）。最近 20 行：\n${lineOrder.slice(-20).join('\n')}`
      },
    }),
  )

  // 增量读聊天：进入聊天页后持续跟踪，不退出页面、不重复全量读。
  ctx.tools.register(
    defineTool({
      name: 'read_chat',
      description:
        '读取当前聊天页的增量内容：返回「自上次以来新增的消息/昵称行」和「最近上下文（最后若干行）」。'
        + '进入群聊后用这个工具持续跟踪对话（可以反复调用，页面原地刷新），不要反复用 read_screen 全量读，'
        + '也不要为了刷新而退出/重进会话。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute() {
        const payload = await call('read_screen')
        const fresh = []
        for (const line of chatLines(payload)) {
          if (!seenLines.has(line)) {
            seenLines.add(line)
            lineOrder.push(line)
            fresh.push(line)
          }
        }
        const recap = lineOrder.slice(-10)
        return `新增：\n${fresh.length ? fresh.join('\n') : '（没有新内容）'}\n\n`
          + `最近上下文（最后 10 行）：\n${recap.join('\n')}`
      },
    }),
  )

  // 纯客户端等待：给聊天对方回复的时间。不发往设备桥。
  ctx.tools.register(
    defineTool({
      name: 'wait',
      description:
        '等待若干秒（10–120）再继续，用于群聊里给别人回复的时间。等待后要再 read_screen 看有没有新消息/回应。不要把它当作拖延手段。',
      parameters: {
        seconds: { type: 'integer', required: true, description: '等待秒数（10–120）' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const seconds = Math.min(120, Math.max(10, args.seconds))
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
        return `waited ${seconds}s`
      },
    }),
  )
}
