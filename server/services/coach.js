const { searchContent } = require("./content");

function chooseFocus(message) {
  const text = String(message || "");
  const rules = [
    ["听力", /听|listening|podcast|音频|电影|美剧/i],
    ["口语", /说|口语|speaking|发音|对话|表达/i],
    ["词汇", /词|单词|vocabulary|背|记忆/i],
    ["阅读", /读|阅读|reading|文章|原版/i],
    ["写作", /写|作文|writing|邮件|润色/i],
    ["AI 学习", /ai|chatgpt|gemini|claude|prompt|提示词/i]
  ];
  const hit = rules.find(([, pattern]) => pattern.test(text));
  return hit ? hit[0] : "认知";
}

function answerQuestion(message, profile = {}) {
  const focus = chooseFocus(message);
  const refs = searchContent(`${message} ${focus}`, 4);
  const level = profile.level || "未设置";
  const goal = profile.goal || "提升综合英语能力";

  const taskMap = {
    "听力": ["选 3-5 分钟材料，先盲听记录关键词", "对照文本复听，标出连读、弱读和没听出的词", "跟读 2 遍，最后用中文复述主旨"],
    "口语": ["围绕一个生活话题写 6 句英文", "读出来并录音，检查停顿和卡壳点", "把卡壳句改短，再复述 2 遍"],
    "词汇": ["从今天阅读材料中摘 12 个词", "每个词只记一个常用搭配和一个例句", "晚上用这些词写 5 句自己的句子"],
    "阅读": ["读一篇短文，先抓标题和段落主题", "圈出生词但不要立刻查，先猜含义", "读完写 3 句英文摘要"],
    "写作": ["写 120-180 词短文", "删掉空泛句，补充例子和动作", "检查时态、冠词、连接词"],
    "AI 学习": ["让 AI 生成一组可跟读对话", "让 AI 扮演考官追问 5 轮", "把回答中的错误整理成错题卡"],
    "认知": ["先明确一个 7 天目标", "每天只做一个可完成训练动作", "记录投入时间和最卡的点"]
  };

  return {
    reply: [
      `按你当前目标“${goal}”和水平“${level}”，我建议先抓“${focus}”。`,
      "今天不要铺太开，做一个闭环：输入 -> 复述/输出 -> 纠错 -> 复盘。",
      "具体任务：",
      ...taskMap[focus].map((item, index) => `${index + 1}. ${item}`),
      "完成后把你的输出贴回来，我可以继续按这个框架给你反馈。"
    ].join("\n"),
    focus,
    references: refs.map(ref => ({
      path: ref.path,
      title: ref.title,
      label: ref.label,
      summary: ref.summary
    }))
  };
}

module.exports = { chooseFocus, answerQuestion };
