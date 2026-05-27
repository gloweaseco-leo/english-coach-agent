# English Coach Agent

简体中文 | [English](README.md)

English Coach Agent 是一个本地英语学习教练，是基于
[`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips)
进行二次开发的非商业学习工具。

## 署名与许可声明

本项目基于以下开源学习指南进行二次开发：

- 原项目：[`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips)
- 原作者/仓库所有者：`byoungd`
- 原在线指南：<https://byoungd.github.io/English-level-up-tips/#/>
- 原内容许可协议：Creative Commons Attribution-NonCommercial 4.0 International，简称 CC BY-NC 4.0

原指南要求署名并限制为非商业使用。本项目仅作为非商业学习工具使用，不打包原指南正文内容，而是在运行时读取本地的 `English-level-up-tips/docs` 副本。

请不要在未取得原权利人单独授权的情况下，将本项目或其依赖的原指南内容用于商业产品、付费课程、SaaS、付费辅导、转售或其他商业用途。

## 运行方式

```powershell
cd C:\Users\liu\english-coach-agent
npm start
```

打开：

```text
http://127.0.0.1:4173
```

## 功能

- 读取 `C:\Users\liu\English-level-up-tips\docs`
- 展示原指南章节目录
- 根据英语水平、学习目标、计划天数和每日学习时间生成学习计划
- 提供本地教练聊天，并返回相关章节引用
- 对作文、口语稿或学习复盘文本给出启发式反馈

当前版本完全本地运行，不调用任何外部 AI API。

## API

```text
GET  /api/health
GET  /api/chapters
GET  /api/chapter?path=threads/part-1/7-ai.md
POST /api/chat
POST /api/plan
POST /api/review
```

## 自定义内容路径

如果你的 `English-level-up-tips` 仓库在其他位置，可以通过环境变量指定：

```powershell
$env:ENGLISH_TIPS_ROOT="D:\path\to\English-level-up-tips\docs"
npm start
```

## 说明

这个项目的第一版定位是最小可用产品：先把原指南转化为可以交互使用的本地学习工具。后续可以继续接入大模型 API，扩展为真正的 RAG 问答、作文批改、口语陪练和学习监督 Agent。
