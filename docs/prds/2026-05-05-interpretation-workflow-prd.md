---
title: Interpretation Workflow Improvements
labels:
  - needs-triage
status: draft
created: 2026-05-05
---

## Problem Statement

用户已经具备基础的排盘、AI 命盘解读、年度运势、Cloudflare 密码门禁和 Cloudflare 端模型配置能力。但当前解读体验仍有三处不顺：

1. 最近解读历史把命盘解读与年度运势混在同一个列表里。用户想回看某一类内容时，需要在混合记录中辨认，尤其多次生成后不够直观。
2. “重新输入”入口位于命盘解读页面底部。用户完成一次排盘后，若要更换出生信息，需要滚动到较深位置才看得到，操作意图不明显。
3. 命盘方块目前只负责选中高亮，AI 命盘解读只输出全盘综合报告。用户希望生成全盘解读时，同时生成十二宫各宫位的详细解读，但不要塞入主报告正文；点击命盘对应宫位时，用一个可拖动、固定悬浮、可持续打开的弹窗查看该宫位解读。

这些问题共同造成的结果是：用户能拿到解读，但回看、切换输入、按宫位深入阅读的路径不够清楚。

## Solution

本 PRD 设计一组解读工作流改进：

1. 最近解读历史改为按类型分开存放与展示：命盘解读历史、年度运势历史各自保留最近 5 条。两个列表可在各自页面展示，也可共用同一个历史组件但通过类型过滤。
2. “重新输入”从底部弱入口升级为命盘页面的显著操作。建议放在命盘视图上方工具区，与“当前命盘信息”和主要操作并列；桌面端显示为按钮，移动端可显示为紧凑按钮。
3. 命盘解读生成时，AI 返回结构化结果：主报告与十二宫解读分开存储。主报告继续显示在“AI 命盘解读”正文中；十二宫解读存入宫位解读状态。用户点击宫位卡片时，打开一个浮动宫位解读窗。该窗默认 fixed 悬浮，用户不关闭则保持打开，且支持拖动改变位置。

用户视角的核心体验：

- 生成一次命盘解读后，主报告仍然干净。
- 点击任意宫位，能看到该宫位专属解读。
- 宫位弹窗可放在屏幕边上对照命盘阅读。
- 历史记录不再混杂，命盘解读与年度运势各查各的。
- 重新输入无需滚到底部寻找。

ASCII mockup:

```text
+------------------------------------------------------------+
| 紫微知道                         [重新输入] [设置]          |
+------------------------------------------------------------+
| 当前命盘: 1990-01-01 男 水二局                              |
|                                                            |
| +----------------------- 命盘 4x4 ------------------------+ |
| | [命宫] [兄弟] [夫妻] [子女]                              | |
| | [财帛]        中央信息        [疾厄]                    | |
| | [迁移]                      [交友]                      | |
| | [官禄] [田宅] [福德] [父母]                              | |
| +--------------------------------------------------------+ |
|                                                            |
| +-------------------- AI 命盘解读 -----------------------+ |
| | [开始解读]                                               | |
| | 主报告正文，不混入十二宫逐宫长文                         | |
| +--------------------------------------------------------+ |
|                                                            |
| +-------------------- 命盘解读历史 -----------------------+ |
| | 1. 1990-01-01 命盘解读                                  | |
| | 2. 1988-05-12 命盘解读                                  | |
| +--------------------------------------------------------+ |
+------------------------------------------------------------+

                 +----------------------------------+
                 | 命宫解读                    [x] |
                 | 可拖动固定悬浮                    |
                 | 主星、四化、三方四正、建议...      |
                 +----------------------------------+
```

## User Stories

1. As a Zi Wei Dou Shu user, I want chart interpretation history and yearly fortune history separated, so that I can find the type of reading I need quickly.
2. As a Zi Wei Dou Shu user, I want the chart interpretation history to keep the latest 5 chart readings, so that the list remains focused and easy to scan.
3. As a Zi Wei Dou Shu user, I want the yearly fortune history to keep the latest 5 yearly readings, so that past yearly analyses are easy to revisit.
4. As a Zi Wei Dou Shu user, I want the newest history item to appear first, so that the most relevant result is immediately visible.
5. As a Zi Wei Dou Shu user, I want each chart history item to show the birth date and basic chart label, so that I can distinguish readings for different people.
6. As a Zi Wei Dou Shu user, I want each yearly history item to show the target year, so that I can distinguish annual readings without opening each one.
7. As a Zi Wei Dou Shu user, I want clicking a chart history item to restore the chart reading, so that I can review prior output without regenerating it.
8. As a Zi Wei Dou Shu user, I want clicking a yearly history item to restore that yearly fortune content, so that I can compare past annual analyses.
9. As a Zi Wei Dou Shu user, I want chart history and yearly history to be stored independently, so that generating one type does not push out the other type.
10. As a Zi Wei Dou Shu user, I want empty or failed AI responses excluded from history, so that the history list only contains useful readings.
11. As a Zi Wei Dou Shu user, I want “重新输入” to be visible near the chart, so that changing birth information is obvious.
12. As a Zi Wei Dou Shu user, I want “重新输入” to clear the current chart and cached readings intentionally, so that I can start a new chart cleanly.
13. As a mobile user, I want “重新输入” to be reachable without scrolling to the bottom, so that I can change inputs quickly on a phone.
14. As a desktop user, I want “重新输入” grouped with chart-level controls, so that it feels like an operation on the current chart rather than a footer link.
15. As a Zi Wei Dou Shu user, I want the main AI chart interpretation to remain a clean full-chart report, so that the report is readable and not overloaded.
16. As a Zi Wei Dou Shu user, I want detailed palace interpretations generated alongside the main chart interpretation, so that I can inspect individual palaces without issuing separate AI requests.
17. As a Zi Wei Dou Shu user, I want palace details hidden from the main report by default, so that the main report stays concise.
18. As a Zi Wei Dou Shu user, I want clicking a palace card to open that palace’s detailed reading, so that the interaction matches the visual chart.
19. As a Zi Wei Dou Shu user, I want the palace detail window to remain open until I close it, so that I can compare it with the chart at my own pace.
20. As a Zi Wei Dou Shu user, I want the palace detail window to be draggable, so that it does not cover the palace or text I am reading.
21. As a Zi Wei Dou Shu user, I want the palace detail window to be fixed relative to the viewport, so that it remains visible while I scroll.
22. As a Zi Wei Dou Shu user, I want clicking another palace while the window is open to update the window content, so that I can move through palaces efficiently.
23. As a Zi Wei Dou Shu user, I want the active palace to be highlighted when its detail window is open, so that I know which palace I am reading.
24. As a Zi Wei Dou Shu user, I want a clear loading or unavailable state for palace details, so that I understand whether palace content has been generated.
25. As a Zi Wei Dou Shu user, I want palace details to survive while viewing the current chart, so that I do not lose them when switching between palaces.
26. As a Zi Wei Dou Shu user, I want palace details cleared when I choose “重新输入”, so that a new chart does not show old palace readings.
27. As a Zi Wei Dou Shu user, I want palace detail content to include stars, four transformations, palace meaning, risks, and suggestions, so that each palace reading is actionable.
28. As a Zi Wei Dou Shu user, I want the palace popup to have a close button, so that I can dismiss it when I need a clean chart view.
29. As a keyboard user, I want the palace popup close control to be keyboard accessible, so that I can operate it without a mouse.
30. As a user on a small screen, I want the palace popup to fit within the viewport, so that it does not render off-screen.
31. As a product owner, I want palace details generated in the same AI request as the main chart interpretation, so that total request count and latency remain controlled.
32. As a product owner, I want AI output parsed into main report and per-palace detail fields, so that the UI can present each part in the right place.
33. As a product owner, I want history state to use a clear schema, so that future additions such as compatibility analysis history can be added safely.
34. As a developer, I want the history limit logic isolated in a small module, so that it can be tested without rendering React components.
35. As a developer, I want palace interpretation parsing isolated in a small module, so that AI output format changes are localized.
36. As a developer, I want draggable popup positioning handled by a reusable hook or focused component, so that dragging logic is not mixed with chart rendering.
37. As a developer, I want chart selection state shared between chart cards and popup, so that palace clicks have one source of truth.
38. As a developer, I want tests around history separation, so that chart and yearly history do not regress back into one mixed list.
39. As a developer, I want tests around AI output parsing, so that malformed palace detail output fails gracefully.
40. As a developer, I want tests around popup behavior, so that opening, updating, dragging, and closing remain predictable.

## Implementation Decisions

- Split interpretation history by kind rather than storing one mixed list. The state model will expose separate chart interpretation history and yearly fortune history, each capped at 5 entries.
- Keep history presentation generic enough to reuse one UI component with a required history kind, but keep the backing lists separate.
- Preserve existing chart interpretation and yearly fortune caches for current-result display. History is a separate concern and should not replace current-result state.
- Move “重新输入” into a chart-level action area near the chart header or current chart metadata. The existing bottom button should be removed or demoted to avoid duplicate primary actions.
- The chart-level action area should remain visually quiet but visible: icon plus label, not a large marketing-style callout.
- Add a shared selected-palace state that chart cards can update and the palace detail popup can read.
- Generate palace details during the main chart interpretation request. The prompt should request a structured response with:
  - a main full-chart report
  - a dictionary/list of twelve palace detail sections keyed by palace name
- The rendered main report should only show the main full-chart report.
- The palace detail popup should read from parsed palace details and render the selected palace’s section.
- If palace details are not yet available, clicking a palace should show a compact “尚未生成宫位解读” state rather than failing silently.
- The palace detail popup should be fixed-position, draggable by its header, closable, and bounded to the viewport on initial placement.
- Dragging should update only popup position, not chart layout.
- Clicking another palace while the popup is open should keep the popup open and replace its content.
- The popup should not block the chart unless the user places it over the chart; it is not a modal dialog.
- The popup should support desktop pointer dragging first. Mobile support should degrade to fixed bottom-sheet-like placement if dragging is awkward.
- Palace detail generation should be cache-friendly: keep system prompt stable, place dynamic chart data in user content, and use a predictable output schema.
- Deep modules to build or modify:
  - Interpretation history state module: owns separated lists, caps each list at 5, rejects empty entries.
  - Interpretation history UI module: renders one kind of history at a time and emits selected entries.
  - Chart action/header module: exposes “重新输入” near current chart context.
  - Palace interpretation parser module: converts AI output into main report and palace detail map.
  - Palace detail state module: stores selected palace, popup open state, palace detail map, and popup position.
  - Draggable floating panel module: encapsulates fixed positioning, drag events, close behavior, and viewport bounds.
  - Chart display integration: routes palace clicks to shared selected-palace state and active styling.
  - AI interpretation integration: requests structured palace details, stores parsed results, and renders only the main report.

## Testing Decisions

- Good tests should assert user-visible behavior and stable data contracts, not React implementation details.
- The interpretation history state module should have unit tests proving:
  - chart history and yearly fortune history are separate
  - each list keeps only 5 entries
  - newest entries appear first
  - empty entries are ignored
- The palace interpretation parser should have unit tests proving:
  - valid structured AI output yields a main report and twelve palace entries
  - missing palace entries produce an empty or unavailable state instead of crashing
  - malformed output falls back to showing the main report if available
- The draggable floating panel should have component-level tests or focused interaction tests proving:
  - opening shows the requested palace title and content
  - clicking close hides the panel
  - dragging changes panel position
  - clicking another palace updates content without closing the panel
- The chart display integration should have tests proving:
  - clicking a palace selects it
  - the selected palace is highlighted
  - selecting a palace opens or updates the palace detail popup
- The “重新输入” action should have tests proving:
  - the action is visible near chart-level controls
  - activating it clears the current chart and interpretation-specific caches
- Prior art in this codebase:
  - Existing Node tests cover interpretation history limit behavior.
  - Existing AI interpretation tests cover prompt shape and cache-restoration behavior.
  - Existing Worker tests cover Cloudflare-side behavior and model proxy behavior.

## Out of Scope

- This PRD does not redesign the full visual style of the app.
- This PRD does not add separate palace-by-palace AI requests.
- This PRD does not add persistence across browser sessions for interpretation histories unless existing store persistence already covers it.
- This PRD does not add sharing/exporting of palace detail popups.
- This PRD does not redesign the yearly fortune prompt beyond history separation.
- This PRD does not change Cloudflare authentication, provider configuration, or model routing.
- This PRD does not change the underlying Zi Wei Dou Shu calculation algorithm.
- This PRD does not implement compatibility analysis history.

## Further Notes

- The requested palace popup is intentionally non-modal. It should feel like an inspector panel over the chart, not like an interruption.
- The main AI output schema is the largest risk. The implementation should keep parsing tolerant and avoid breaking the primary report if palace detail parsing fails.
- The UI should avoid showing palace detail content before it belongs to the currently generated chart. Clearing chart input should clear palace details.
- The design keeps the main report concise while still making the chart itself more interactive.
- The PRD could not be published directly to GitHub Issues from this environment because the GitHub CLI is not installed. This document is formatted for direct issue creation and includes the intended `needs-triage` label.
