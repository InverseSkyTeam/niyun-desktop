# 逆云 (niyun-desktop)

一款基于 **Tauri + Vue 3 + TypeScript** 打造的桌面 AI 桌宠应用,把 AI 对话、桌宠养成与轻量剧情体验融合在一个轻量原生窗口里。

## 特性

- **多模型对话**：内置 DeepSeek、智谱、Kimi、OpenAI、Anthropic 等多厂商接入,统一流式对话体验,可随时切换
- **桌宠养成**：情绪、饥饿、睡眠、进食、天气与提醒等状态系统,伴随你的日常
- **工具审批**：AI 可发起工具调用,需经你确认后执行,安全可控
- **剧情模式**：内置 Galgame 视图,沉浸式体验对话剧情
- **本地优先**：基于 SQLite 的对话历史,数据留在本地
- **原生体验**：无边框窗口、系统托盘、自定义字体与主题

## 技术栈

Tauri 2 · Vue 3 · TypeScript · Vite · Tailwind CSS · AI SDK · SQLite

## 开发

```bash
bun install      # 安装依赖
bun run dev      # 启动开发模式
bun run build    # 类型检查并构建前端
bun run tauri build  # 打包为原生应用
```
