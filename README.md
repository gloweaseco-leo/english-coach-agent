# English Coach Agent

[简体中文](README.zh-CN.md) | English

Local English learning coach built as a secondary development project based on
[`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips).

## Attribution And License Notice

This project is based on the open source learning guide:

- Original project: [`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips)
- Original author/repository owner: `byoungd`
- Original online guide: <https://byoungd.github.io/English-level-up-tips/#/>
- Original content license: Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)

The original guide requires attribution and non-commercial use. This project is
intended as a non-commercial learning tool and does not bundle the original
guide content. It reads a local copy of `English-level-up-tips/docs` at runtime.

Do not use this derivative project, or the original guide content it depends on,
for commercial products, paid courses, SaaS, paid tutoring, resale, or other
commercial purposes unless you obtain separate permission from the original
rights holder.

## Run

```powershell
cd C:\Users\liu\english-coach-agent
npm start
```

Open:

```text
http://127.0.0.1:4173
```

## What It Does

- Reads `C:\Users\liu\English-level-up-tips\docs`
- Lists the guide chapters
- Generates a study plan from level, goal, days, and daily minutes
- Provides a local coaching chat with chapter references
- Reviews pasted writing or speaking scripts with heuristic feedback

This first version is fully local and does not call any external AI API.

## API

```text
GET  /api/health
GET  /api/chapters
GET  /api/chapter?path=threads/part-1/7-ai.md
POST /api/chat
POST /api/plan
POST /api/review
```

## Optional Content Path

Use another copy of the source guide:

```powershell
$env:ENGLISH_TIPS_ROOT="D:\path\to\English-level-up-tips\docs"
npm start
```
