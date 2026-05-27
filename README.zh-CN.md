# English Coach Agent

简体中文 | [English](README.md)

English Coach Agent 是一个本地英语学习教练，是基于
[`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips)
进行二次开发的**非商业学习工具**。

**v0.3 RAG Coach**：在 v0.2 学习闭环基础上，新增可选 LLM Provider 与轻量章节检索，聊天回答基于本地指南片段、学习档案与今日任务，并带章节引用。

## 署名与许可声明

本项目基于以下开源学习指南进行二次开发：

- 原项目：[`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips)
- 原作者/仓库所有者：`byoungd`
- 原在线指南：<https://byoungd.github.io/English-level-up-tips/#/>
- 原内容许可协议：Creative Commons Attribution-NonCommercial 4.0 International，简称 CC BY-NC 4.0

原指南要求署名并限制为非商业使用。本项目仅作为非商业学习工具使用，不打包原指南正文内容，而是在运行时读取本地的 `English-level-up-tips/docs` 副本。

**请勿**在未取得原权利人单独授权的情况下，将本项目或其依赖的原指南内容用于商业产品、付费课程、SaaS、付费辅导、转售或其他商业用途。商业用途必须取得原权利人许可，或替换为自有授权内容。

## 快速部署

前置要求：Git、Node.js 18+

### Local 模式（默认，无需 API Key）

```powershell
npm start
```

### OpenAI-compatible 模式

兼容 OpenAI / DeepSeek / Qwen 等 OpenAI 兼容接口。**API Key 只放在环境变量，不进入前端。**

```powershell
$env:COACH_MODE="openai"
$env:OPENAI_COMPATIBLE_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_COMPATIBLE_API_KEY="your-key-here"
$env:OPENAI_COMPATIBLE_MODEL="gpt-4o-mini"
npm start
```

### Ollama 模式（可选）

```powershell
$env:COACH_MODE="ollama"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="qwen2.5:7b"
npm start
```

### 环境变量说明

| 变量 | 默认 | 说明 |
|------|------|------|
| `COACH_MODE` | `local` | `local` / `openai` / `ollama` |
| `LLM_TIMEOUT_MS` | `20000` | LLM 请求超时（毫秒） |
| `RAG_TOP_K` | `5` | 检索返回片段数 |
| `ENGLISH_TIPS_ROOT` | `../English-level-up-tips/docs` | 指南 docs 路径 |

LLM 配置缺失或请求失败时，自动 **fallback 到 Local Rule**，不影响本地学习闭环。

### Workspace 布局

```text
english-coach-workspace/
  english-coach-agent/
  English-level-up-tips/docs/
```

打开：`http://127.0.0.1:4173`

## v0.3 功能

- **Provider 抽象**：Local Rule（默认）/ OpenAI-compatible / Ollama
- **轻量 RAG**：按 Markdown 标题切 chunk + 关键词加权检索（**不是 embedding 向量库**）
- **Grounded Chat**：结合 profile、todayTask、检索片段生成带 `[1][2]` 引用的回答
- **GET /api/search**：章节片段检索（调试/前端搜索框）
- v0.2 全部保留：计划、任务、复盘、练习反馈、`.data/learning-state.json`

## 缺少指南内容时

页面顶部显示 clone 引导；聊天仍可给通用建议，但会提示「本地指南未加载」。

## 学习数据与重置

状态文件：`.data/learning-state.json`

重置：停服后删除 `.data/` 目录。

## API

```text
GET  /api/health
GET  /api/search?q=listening
GET  /api/state
GET  /api/chapters
GET  /api/chapter?path=...
POST /api/profile
POST /api/chat
POST /api/plan
POST /api/task
POST /api/review
```

`POST /api/chat` 增强返回：`provider`、`mode`、`fallbackUsed`、`references`（含 heading/score），仍保留 `reply`。

## 测试

```bash
npm test
```

## 说明

v0.3 的目标不是「更像 ChatGPT」，而是让回答**更可信、更贴合当前计划、更能引用本地指南**。默认仍为纯本地模式；接入 LLM 为可选项，且须继续遵守 CC BY-NC 非商业约束。
