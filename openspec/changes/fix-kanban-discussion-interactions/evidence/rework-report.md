# 交付审查：首轮返工

builder → reviewer。请复审固定来源 Markdown 附件关联文件导航的修复及完整候选；通过或退回修改，不执行发布。此报告补充并纠正 implementation-report.md 对关联文件导航只读/固定来源的完成声明，旧交付与原证据保留。

## 依据、范围与版本

- 用户批准：主卡 t_532e415b 用户评论 created_at=1791692429（第三版方案、视觉和实施），created_at=1791693116（Ubuntu 本机，其他信息自行获取）。原文及范围在 ../approval.md。
- 返工要求：reviewer 评论 created_at=1791704873，首轮候选 4e3c151f439fda72bf45f91e26ed5fc8ebffc208。指出 Markdown 文件链接绕过固定 reader，进入当前连接的普通可编辑全局预览；允许固定原读取器导航或明确禁用不支持的导航。
- 原仓库：/home/capz/.hermes/hermes-agent；工作树：/home/capz/worktrees/hermes-kanban-detail；分支：feature/kanban-detail-context；变更：fix-kanban-discussion-interactions。
- 整体 base：6f515c4fc80e279f3078a90656eac21f53d5c57b；本轮 rework base：4e3c151f439fda72bf45f91e26ed5fc8ebffc208。准确新 target 写入本卡正式交接和 review metadata，避免提交内自引用。
- 不含合并、部署、当前桌面/生产服务重启、push/PR、规格同步归档、旧工作树/备份清理和风扇精确修复。

## 修复与取舍

复用现有 MarkdownPreview 的上下文，传递固定 reader 对应的 disableFileLinks 策略。相对、绝对、file 和 #preview 文件链接在材料阅读器中呈现灰色禁用文字（role=link、aria-disabled=true），没有 href、事件处理和 Tab 焦点；悬停使用现有多语言“预览不可用”提示。既不调用 normalizeOrLocalPreviewTarget / 全局 openPreview，也不猜本机路径，不给当前来源读写机会。材料中非 http/https 的外部协议也不进入普通外部链接入口。

保留附件首层固定读取器、只读正文、独立保存和关闭；同篇 #heading 仍就地滚动，http/https 仍走原网页入口。普通聊天和没有固定 reader 的文件预览默认不禁用，原链接解析逻辑不变。未增加跨文件阅读系统、数据库字段、依赖或新语言文案。选择禁用而非新造跨文件阅读器符合本次审查明确给出的修复选项，仍在原安全行为范围内；不是宣称支持原来源关联文件阅读。

产品修改仅 apps/desktop/src/app/chat/right-rail/preview-file.tsx；真实边界回归在 apps/desktop/src/plugins/kanban/attachment.test.tsx。全局 preview-pane 无需额外修改：固定 reader 路径在 Markdown 链接渲染边界已无进入该 pane 的入口，普通 pane 原行为保留。

## 验证与验收映射

1. 先红后绿：rework-red.log 记录新增 Attachment → LocalFilePreview → MarkdownPreview 行为测试在原候选失败（文件链接没有 aria-disabled）。修复后同测试通过，覆盖四类文件链接、来源/身份 A→B→A 和 unavailable owner、点击/中键/Enter，无新增全局 preview tab、关联读取、编辑或保存；同页目录可滚动。组件 reader 是测试替身，不冒充真实服务器断线。
2. 重跑首轮八个测试文件并增加普通 Markdown 文件预览测试：rework-final-checks.log，9 文件 82 项通过。包含原普通文件相对导航、网页链接、目录与脚本 URL 拒绝；附件保存/取消、评论图片、处理人、讨论/上下文等原回归。新增测试仅一项行为契约。
3. TypeScript：npx tsc -p . --noEmit，退出 0；相关两个修改 TSX 文件 npx eslint，退出 0，无剩余警告。未运行全量 Python/全量 UI 测试；本轮未修改 Python、后端接口或依赖，也未重做桌面打包。
4. 真实 Chrome 调用当前 TaskDrawer/Attachment/LocalFilePreview/MarkdownPreview：native/rework-probe.mjs 与 native/rework-results.json，25 项通过、0 页面脚本错误。使用独立 HTTP 响应拦截，不调用业务 API/数据库；本轮明确禁用导航，因此采用审查要求中的“禁用后验证不会调用全局 openPreview”路径，不把 HTTP fixture 称作双真实后台验收。初始读取只到模拟原来源 A；A→B→A、再将原来源文件路由配置为拒绝连接后，四类链接点击/中键/Enter 均保持禁用且没有后续文件请求、全局文件预览、编辑按钮或保存。网页链接产生 URL target，同页标题不改变路由。此前真实认证来源链路的证据仍见 implementation-report.md/native/source-results.json，本轮没有重新执行该真实 API 组。
5. 实际修复组件截图：native/rework-disabled-links.png，四个关联文件链接灰色禁用，heading/web 可操作，与已批准布局一致；不是视觉稿截图。文字提示复用现有翻译，不引入无翻译副本。
6. OpenSpec 严格校验和 git diff --check 通过。任务 6.1 补足首轮 2.1/2.2 遗漏；原 9/9 勾选不再当成该漏洞不存在的证据。

## 资源清理与剩余限制

本轮只启动隔离 Vite 43311（process proc_3c4eda02c905），验证后终止；Chrome 在 finally 关闭。端口连接核验返回 111（拒绝连接）。仅清理本轮生成的 Vite cache，不动用户运行服务、配置、凭据或其他工作树。业务卡未加入测试评论/附件，本卡正式交接除外。

本轮不支持在只读附件正文里继续打开关联文件，明确禁用是当前边界。模拟原来源断线仅验证无导航尝试，不证明已安装端重新认证或系统网络行为。首轮未验证项继续保留：已安装 Electron 的 PDF 视觉、磁盘另存和系统截图剪贴板、真实跨主机/IPC 凭据转发、真实 worker 停止、Mac/Windows、风扇因果。用户当前安装保持原版，没有发布；复审通过也不产生合并/部署权限。审查通过后按既定流程创建独立收尾卡，有新改动则继续同卡返工再审。
