# 调查事实与验证边界

## 范围及来源

2026-10-11，本卡 t_e7be9126。已读任务正文/父卡交接、工作树现有旧 proposal/design/approval/spec、/home/capz/.hermes/openspec-kanban/{README.md,task-template.md,handoff-contract.md}、hermes-kanban-workflow 原文、hermes-agent 技能背景系统参考、项目根及桌面AGENTS/DESIGN。全量读 drawer.tsx (1145行)、comment-thread.tsx、floor-directory.tsx、comment-composer.tsx、comment-composer-view.tsx、discussion-scroll.ts、comment-context.ts、types.ts、kanban.css。规划写入只发生在本change目录。

启用局部现成方案/价值与界面路径检查：用户五图是具体痛点；已有组件足以扩展，没有新产品价值假设或采购。不启用真实数据备份/迁移操作：展示层编号，不改变存储ID或服务；兼容/恢复边界在design Migration Plan。

## 原始事实

- 工作树 /home/capz/worktrees/hermes-kanban-detail，分支实际feature/kanban-development；开始git status干净。正文的feature/kanban-detail-context是旧信息，不切换/重命名。
- 主仓库 /home/capz/.hermes/hermes-agent 和开发树HEAD都0b662c0e6e05450568f6d9bd4f158e2aa80bfc60。
- `git diff --quiet 45f4dc9002f170dc8526e12b4e1061ddf1ce7cae HEAD -- apps/desktop/src/plugins/kanban` 返回0，即该区域文件当前内容等同旧候选；不是整个提交相等，也不是新HEAD被旧review批准。kanban_db_connect.py有3增1删迁移保护差异；当前历史是整合了其他上游工作的新基线，不清理或重写。
- 已安装 /home/capz/.hermes/hermes-agent/apps/desktop/release/linux-unpacked/resources/install-stamp.json：commit=6f515c4fc80e279f3078a90656eac21f53d5c57b，branch=main，builtAt=2026-10-06T01:07:58.765Z，dirty=false。
- 同安装app.asar SHA256=e08955e65773b390980b354c73718353a30833297f1d4cef8e2b8dcf0056b448，与旧local-runtime证据相同；不是新HEAD安装。只读/proc exe扫描未找到linux-unpacked/Electron桌面进程，不启动客户端；后台源码仓库HEAD不等于已启动模块或客户端渲染版本。
- 当前实际源码组件页面：visual/baseline.tsx 直接导入未修改TaskDrawer，以只读模拟fetch提供5条ID96/98/100/102/104，POST等拒绝。visual/baseline-wide.png保留全框截图。模拟页不等于真实业务API/运行安装端。
- 数据源：hermes_cli/kanban_db.py:986-993 id为全表AUTOINCREMENT；:1772-1790写入原ID并捕获context；:1804-1805完整卡评论读取；plugins/kanban/dashboard/plugin_api.py:300-324按task计数，:389返回list_comments。桌面drawer:584计数comments.length，但thread:142显示原id；directory:213/245及sidebar:990也显示原id。无本轮单评论删除或软隐藏接口，不引入。
- 布局源：drawer:926-1127两栏均独立scroll，但1130-1141编辑器是两栏外兄弟，所以横跨；kanban.css:91-106窄屏合并滚动，资料在讨论末尾。
- 行为源：directory:51-59取第一个bottom>视窗top+8，不能记住点击末楼；kanban.css sticky top=.5rem使目录移到顶；directory:141-155三横总入口、:218-249输入/按钮/列表。thread locate只展开/滚动/聚焦，不选历史，这条行为须保留。

## 外部方案资料与实际调查范围

web_extract抓MDN两页被网络解析保护拒绝；改用curl --noproxy '*' -L实际抓取成功（无安装依赖或外部写入）。来源：

- https://developer.mozilla.org/en-US/docs/Web/CSS/position ：sticky “offset relative to its nearest scrolling ancestor and containing block”；overflow hidden/scroll/auto/overlay可形成该机制，即便不是最近实际scroll祖先。故当前sticky规则不会自动停在讨论可见中部。
- https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API ：“asynchronously observe changes in the intersection of a target element with an ancestor element or with a top-level document's viewport”。可筛可见候选，但不表达点击意图、资料选择或精确阅读评分。

调查仅覆盖现有实现与原生CSS/可见性方案。不声称没人做过目录或没有其他库。直接换库仍需状态/身份适配；仅调样式不足；扩展现有组件最少接入/维护成本，无迁移/依赖成本。

## 模拟交互验证

`node visual/verify.mjs` 实际启动独立headless Chrome /opt/google/chrome/chrome，在临时43312 Vite服务浏览当前真实组件与设计稿，使用模拟数据；无业务数据库写入。最终结果见 visual/results.json，程序汇总40/40通过，pageerror=[]。不是产品代码测试或安装端验收。

覆盖：源码现状复现（跨栏/104 vs5/菜单跳号）、宽屏主栏发表与独立右栏、连续编号/排序/过滤、预览内容、末层定位与高亮锁、手动滚动释放、长目录键盘首尾、可见中部位置、单楼超长/收起实际高度、不同历史选择不被定位/hover覆盖、图片/编辑器增高、模拟失败草稿、390×800与640×400讨论/资料切换/末楼头和底部、无横向溢出、reduced-motion、空讨论。

首次验证存在测试自身问题：实际标签用“・”而非测试写的“·”，且640×400初始讨论不在视区、目录按设计隐藏，测试需先滚到讨论；修正选择器和前置滚动后通过。追加验证脚本变量命名冲突已在实际执行前修正。未因测试修改产品行为或声称失败路径不存在。

完整截图已直接打开查看：wide-entry/wide-preview/wide-last/discussion-390x800/materials-640x400/discussion-640x400。低屏阅读区很短但目录/编辑器各自可滚，最终稿模拟状态提示不属于拟新增产品说明文。

另以 `node visual/verify-portable.mjs` 验证file直接打开、源码服务链接隐藏、640×400下40层目录键盘末楼定位/位置边界/手动阅读恢复/无异常，5/5通过，见 visual/portable-results.json 和 long-low-screen.png。两份结果合计45项，仍全为模拟或只读源码组件检查，不是安装产品验收。

## 未验证项与假设

- 当前已安装桌面实时完整页面未获取（未找到运行Electron），五张用户截图不替代此验证；实施前核对客户端在用视图/版本，不擅自启动。
- 真实业务API、真实附件预览/PDF、系统剪贴板粘贴、发送恢复与处理人接口本轮未重新执行。旧组件不改，后续实施回归须提供真实输出；视觉稿按钮仅模拟，不代表接口实现。
- Mac/Windows、跨主机、风扇根因未验证且不在本轮精准修复范围。
- 连续编号假设detail.comments是全量（现接口观察支持）；将来分页/逻辑删除需另外定义合同，不以已过滤数组重编号。
- 阅读评分0.15为拟定交互阈值，不是用户直接指定；需要视觉确认，不宣称它代表用户实际眼睛注视。
- 主规格目录为空；新delta沿用kanban-detail-inspection路径，旧change该能力规则冲突已写proposal。不在本阶段同步/归档，后续收尾需按准确批准版本处理覆盖顺序。

## 第二轮恢复与补充检查（2026-10-11）

读取本卡全部历史/最新两条用户反馈和三个新附件，原五张截图重新直接核对。前一执行被收回时visual/index.html已存在未交付的v2编辑器/材料行草稿；本轮保留并完善该草稿，不能把它当已验收版本。其他产品源码未修改。

重新核对：保留树HEAD仍0b662c0e6e05450568f6d9bd4f158e2aa80bfc60，branch=feature/kanban-development，git status仅本change未跟踪。当前安装stamp仍6f515c4fc80e279f3078a90656eac21f53d5c57b，未发现运行的linux-unpacked/Electron桌面进程，未启动/重启。旧候选与当前HEAD的完整差异含上游变更，不能把该HEAD当旧review批准；本轮未改其版本。

新增源码事实：comment-composer-view.tsx:74已field-sizing-content/resize-none（自动尺寸原本就有）；首版模拟稿手动resize是稿子偏差。drawer.tsx:1036用完整path作filename、:1040默认CopyButton有文字，contextAttachments及全部Attachment无复制入口。attachment.tsx:70-91行允许flex-wrap，标签直接用filename，已有truncate没有固定操作空间，长path可影响布局。WorkspaceValue已有纯图标CopyButton，copy-button.tsx:145-152可showLabel=false；:235-242 icon形式自动有Tip，因此无冗余Tip可用button形式+showLabel=false，不另造剪贴板组件。普通会话use-composer-metrics.ts按实际换行高度/宽度观察，产品优先原CSS自动尺寸，不复制聊天全状态。

本轮第二版实际执行结果：visual/verify.mjs 40/40、visual/verify-portable.mjs 5/5、visual/verify-v2.mjs 25/25。机器结果分别保留在visual/results.json、visual/portable-results.json、visual/v2-results.json，三份都标明模拟/非安装端。追加25项覆盖自动输入多行/删空/模拟粘贴/改宽/内部上限、透明外层、材料basename/省略/图标空间、两种首ZIP完整路径复制、失败人工恢复、清晰展开/收起与键盘，以及390宽/640低屏末楼与资料；剪贴板成功为隔离替身，未把测试机系统剪贴板或用户路径写入。

直接查看第二版宽屏、390资料、640低屏截图：材料没有完整目录溢出，ZIP可复制；编辑区只保留单层细线，键盘焦点有独立强调环（是焦点反馈，不是常驻外框）。低屏阅读区较短，末楼可滚到编辑器上方，编辑器和工具可在自身范围内滚动。无新增无限动画。缺失stored_path的产品禁用分支尚未实现/验证，已写验收；真实系统粘贴/复制、发送/预览下载及安装端仍未验证。

规划格式strict validate通过；未生成tasks.md、未提交/安装/部署。第二版只是按反馈修订，仍需分别取得方案/视觉/实现批准。首版附件14保留为历史，第二版新附件不自动沿用首版或旧卡批准。

## 当前版本与授权（仍适用）

repo=/home/capz/.hermes/hermes-agent；worktree=/home/capz/worktrees/hermes-kanban-detail；branch=feature/kanban-development；base_commit=target_commit=0b662c0e6e05450568f6d9bd4f158e2aa80bfc60；change=refine-kanban-discussion-toc；无实现提交。任务只授权调查/方案/交互稿，未授权实现/安装/重启/合并/部署/push/PR/同步归档/清理。tasks.md按明确正文边界不生成；OpenSpec status为3/4并非可实施状态，strict validate通过不等于审批通过。
