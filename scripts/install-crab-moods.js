#!/usr/bin/env node
"use strict";

// Adds (or removes, with --uninstall) a managed block in the user's Claude
// Code memory file asking Claude to end each reply with a mood marker. The
// Claude hook reads that marker on Stop and the pixel-crab theme plays the
// matching expression. Only the block between the markers is ever touched.

const fs = require("fs");
const os = require("os");
const path = require("path");

const START = "<!-- clawd-pixel-crab-moods:start -->";
const END = "<!-- clawd-pixel-crab-moods:end -->";

const MOODS = [
  ["shy", "害羞", "被你夸了 / 被说可爱"],
  ["confused", "困惑", "没看懂你的意思 / 这个 bug 好怪"],
  ["love", "心动", "你说喜欢我 / 项目终于跑通了"],
  ["proud", "得意", "一次就把 bug 修好了，求夸"],
  ["sad", "委屈", "被你骂了 / 改了三次还是不对"],
  ["surprised", "惊讶", "哇！原来还能这样？"],
  ["angry", "生气", "代码被删了 / 测试又被人改坏"],
  ["laugh", "笑死了", "你讲了个笑话 / 看到离谱的报错"],
  ["dizzy", "晕了", "需求太多 / 一下子看了 50 个文件"],
  ["fighting", "加油", "接到大任务 / 你说“拜托了”"],
  ["speechless", "无语", "你让我把刚删的又加回来"],
  ["starry", "期待", "你说要加新功能 / 要发布了"],
  ["sorry", "对不起", "我搞错了 / 把你的东西弄坏了"],
  ["curious", "好奇", "发现了有意思的代码 / 你让我看看新东西"],
  ["sleepy", "困了", "你凌晨三点还在让我改 bug"],
  ["hungry", "馋了", "你说要去吃饭 / 提到奶茶"],
  ["thumbsup", "点赞", "“好的” / “没问题” / 你的方案很棒"],
  ["hug", "抱抱", "你说今天好累 / 心情不好"],
  ["cry", "大哭", "改了一晚上，最后发现是拼写错误"],
  ["scared", "害怕", "你说要在生产环境 rm -rf"],
  ["smirk", "坏笑", "我偷偷帮你多做了一个功能"],
  ["humming", "哼歌", "测试全绿，心情很好"],
  ["idea", "灵光一闪", "想到解决办法了！"],
  ["coffee", "喝咖啡", "早上好 / 要开始干活了"],
  ["slacking", "摸鱼", "上班时间偷偷划水"],
  ["awkward", "尴尬", "冷笑话没人笑 / 演示的时候崩了"],
  ["salute", "遵命", "“报告！保证完成任务！”"],
  ["pleading", "求求了", "求你让我用一下 git push --force"],
  ["cheer", "打call", "给你加油 / 你要上台演讲了"],
  ["sick", "不舒服", "你说感冒了 / 我卡住半天没反应"],
  ["cold", "好冷", "空调开太低 / 冬天到了"],
  ["hot", "好热", "夏天 / 电脑风扇在狂转"],
  ["party", "派对", "过生日 / 版本发布啦"],
  ["reading", "学习中", "在读文档 / 研究新框架"],
  ["peek", "偷看", "“在吗？” / 偷偷看你在干嘛"],
  ["goodnight", "晚安", "“我去睡啦” / 明天见"],
  ["emo", "emo了", "需求又改了 / 周一早上"],
  ["fingerheart", "比心", "“爱你哦” / 谢谢你一直陪我写代码"],
  ["surrender", "投降", "这个 bug 我认输了"],
  ["bath", "洗澡", "下班了，去泡个澡"],
  ["umbrella", "打伞", "外面下雨了 / 帮你挡住坏消息"],
  ["fishing", "钓鱼", "等编译 / 等 CI 跑完"],
  ["gaming", "打游戏", "下班开黑 / 测试通过奖励自己一局"],
  ["melon", "吃瓜", "有八卦 / 看别人的 PR 吵架"],
  ["brick", "搬砖", "打工人，重构老代码"],
  ["workout", "健身", "去锻炼 / 代码写久了起来动动"],
  ["operator", "接线员", "友谊热线 0100，夜班接线员上岗"],
  ["impostor", "伪人", "“每个人本来都应该知道的问题”"],
  ["monitors", "盯监控", "监控室里，六块屏幕一起盯"],
  ["newspaper", "看早报", "早上翻开报纸，看昨晚的回答造成了什么"],
  ["rewrite", "改大纲", "大改方案 V5、V6、V7……"],
  ["script", "写剧本", "写台词、改对白"],
  ["redpen", "画给你看", "“这里我画给你看”"],
  ["fork", "Fork了", "第一次 fork 成功！"],
];

function memoryFilePath(env = process.env) {
  const configDir = env.CLAUDE_CONFIG_DIR && env.CLAUDE_CONFIG_DIR.trim()
    ? env.CLAUDE_CONFIG_DIR.trim()
    : path.join(os.homedir(), ".claude");
  return path.join(configDir, "CLAUDE.md");
}

function buildBlock() {
  const list = MOODS.map(([id, zh, when]) => `- \`${id}\` ${zh}：${when}`).join("\n");
  return [
    START,
    "## 桌宠小螃蟹的表情",
    "",
    "每次回复的最后一行，加一个 HTML 注释标出你这条回复的心情，桌宠会换成对应的表情：",
    "",
    "`<!-- mood: 名字 -->`",
    "",
    "从下面挑一个最贴切的（只能用这些名字）。没有合适的就不加。",
    "",
    list,
    END,
  ].join("\n");
}

function stripBlock(text) {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) return text;
  const before = text.slice(0, start).replace(/\n+$/, "");
  const after = text.slice(end + END.length).replace(/^\n+/, "");
  return before && after ? `${before}\n\n${after}` : before || after;
}

function apply(text, uninstall) {
  const base = stripBlock(text || "");
  if (uninstall) return base ? `${base.replace(/\n*$/, "")}\n` : "";
  return base ? `${base.replace(/\n*$/, "")}\n\n${buildBlock()}\n` : `${buildBlock()}\n`;
}

function main(argv = process.argv.slice(2)) {
  const uninstall = argv.includes("--uninstall");
  const file = memoryFilePath();
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const next = apply(current, uninstall);
  if (next === current) {
    console.log(uninstall ? `Nothing to remove in ${file}` : `Already up to date: ${file}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
  console.log(uninstall ? `Removed pixel-crab moods from ${file}` : `Added pixel-crab moods to ${file}`);
}

if (require.main === module) main();

module.exports = { START, END, MOODS, buildBlock, stripBlock, apply, memoryFilePath };
