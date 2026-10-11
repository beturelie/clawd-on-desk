# 小螃蟹 Pixel Crab 主题

一套 32×32 的像素小螃蟹，共 61 个表情。开发时跟着 Claude Code 的状态切换；聊天时，Claude 在回复末尾标一个心情，桌宠就换成对应的表情。

## 1. 切换到这个主题

`npm start` 启动后，右键桌宠 →「设置…」→「主题」，选「小螃蟹 Pixel Crab」。

| 状态 | 表情 |
|---|---|
| 待机 | `idle`，偶尔随机哼歌、喝咖啡、看书、摸鱼 |
| 思考 | `thinking` |
| 工作 | `working`（躲在笔记本后面狂敲） |
| 子代理在跑 | `monitors`（盯着六块屏幕） |
| 出错 | `error` |
| 完成 | `happy` |
| 要你批准 | `notification` |
| 压缩上下文 | `rewrite` |
| 新建 worktree | `brick` |
| 睡觉 / 被吵醒 | `sleeping` / `surprised` |
| 点一下 / 双击 / 拖动 | 害羞 / 心动、笑死了、比心 / 晕了 |

## 2. 打开聊天情绪

```bash
npm run install:crab-moods
```

这会在 `~/.claude/CLAUDE.md` 末尾加一段说明（用标记包起来，只改这一段），让 Claude 每次回复的最后一行写上：

```
<!-- mood: shy -->
```

回复结束时，Claude Code 的 Stop hook 会读到这个标记，桌宠就用对应的表情代替“完成庆祝”，停留约 4 秒后回到待机。也可以写成看得见的 `[mood: shy]`。

不想要了：

```bash
npm run uninstall:crab-moods
```

## 说明

- 只对 Claude Code 生效，并且要用这个主题；其他主题没有 `emotions`，会直接忽略标记。
- 主题在 `themes/pixel-crab/theme.json`，`emotions` 把名字对应到 `assets/` 里的 SVG。
- 素材由 `beturelie/---Changs` 仓库的 `scripts/build-expressions.mjs` 生成。
