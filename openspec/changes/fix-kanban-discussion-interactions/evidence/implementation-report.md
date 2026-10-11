# 交付审查：已批准实施

builder → reviewer。请审查主卡 t_532e415b 的准确候选提交，决定通过或退回修改；这不是部署或真实已安装桌面验收。准确 target commit 写入卡片正式交接与 review metadata，文件内不制造自引用提交号。

## 范围与用户决定

- 用户评论 created_at=1791692429 明确接受第三版方案、视觉并允许实施；created_at=1791693116 确认 Ubuntu 本机并允许自行只读获取版本信息。原文及来源在 ../approval.md。
- 已核对安装与开发基线均为 6f515c4fc80e279f3078a90656eac21f53d5c57b；证据 local-runtime.md。原仓库 /home/capz/.hermes/hermes-agent；开发工作树 /home/capz/worktrees/hermes-kanban-detail；分支 feature/kanban-detail-context；变更 fix-kanban-discussion-interactions。
- 实施附件只读打开与独立保存、常驻发表区、逐楼折叠与边界、讨论左侧目录、左上处理人、评论图片暂存与恢复。换人沿用原接口 reclaim_first=true，不增加预约字段；历史上下文选择逻辑不变。
- 不包括第七项风扇根因/精确性能修复、合并、部署、重启、push/PR、规格同步归档、旧工作树或备份清理。没有修改用户运行端、运行数据库、配置、凭据或 Mac 保留树。

## 实现与相关风险处理

附件、图片和多步操作捕获原连接、身份、看板和任务；原连接不可用时拒绝迁移，不退回客户端文件系统。名单缓存、草稿和材料组件按来源分隔；关闭或切换后抑制迟到响应。

同来源任务刷新复用仅含来源身份的读取函数，不缓存文件内容，避免轮询重置已打开阅读器；preview-refresh-red.log 记录实施中发现的失败，修复后实际浏览器检查通过。材料关闭明确恢复原入口焦点。目录定位只在显式定位时触发，展开其他楼不抢焦点；locate-focus-red.log 与相关线程测试记录回归。

上传或评论结果不确定时先核对原任务，再允许人工继续。已确认图片保留附件 ID；丢响应的候选按原来源读取字节比较，而非凭可能变化的文件名。评论已保存后重新排队未完成只重试排队。待发送状态随草稿保存，关闭重开不重复提交。独立保存复用已有共享保存反馈，成功/取消/失败由真实共享 helper 处理，不另造无法区分取消的“已保存”提示。

本次没有后端接口、持久数据格式或迁移变更。实验写入只发生在隔离目录及数据库；业务卡只有正式交接，不插入测试评论。代码撤回可恢复基线，但未来部署后用户真实发表的评论/图片属于正常业务数据，不能靠代码回退撤销；部署及数据恢复方案须在获得发布授权后单独核实。

## 验收映射

证据目录绝对路径：/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/evidence。

1. 附件名称打开而非保存、只读 Markdown、HTML 清理与无权限 sandbox、PDF 字节抵达 blob iframe、关闭焦点及刷新保持：native/implementation-results.json。未知二进制、超限、缺失与权限错误：native/recovery-results.json。无路径及独立保存按钮：attachment.test.tsx；真实共享保存 helper 的成功、取消、失败与来源约束：drawer.test.tsx、media-file-download.test.ts。PDF 是有效的单页空白最小文件，不据此声称文字/复杂 PDF 完整视觉验收。
2. local→remote→local、身份 A→B→A 的原来源读取、名单、写操作：native/source-results.json 与 desktop-fs.test.ts。两独立后台均使用实际认证文件路由及隔离数据库；处于同一主机、共用物理文件系统，local/remote 是适配器逻辑标签，不是两台真实远程设备。保存对话框是 IPC 边界模拟，不能当作真实另存验收。
3. 常驻单实例发表区、长短富文本、独立折叠、收起链接不可操作、目标展开聚焦但不选上下文、宽/窄/低窗口可滚到底：native/implementation-results.json、comment-thread.test.tsx、drawer.test.tsx。既有上下文选择/清空/排序过滤测试一并运行。
4. 空讨论、240 层原编号、键盘打开输入与 Escape 恢复焦点、不存在目标、减少动态效果：native/edge-results.json。隐藏目标取消/显示全部和定位后不反复抢焦点：comment-thread.test.tsx。相关实现截图 native/implementation-wide.png、native/implementation-last.png。
5. 左上处理人、真实改派与成功读回且不伪造交接：native/recovery-results.json。运行中确认/取消、同人无操作、名单失败/空名单重试、403 权限与 409 冲突保持显示状态：assignee-menu.test.tsx。未启动真实 worker，不能声称实际进程停止验收。
6. 真实图片上传→普通评论→认证读取解码：native/implementation-results.json。实际服务器提交后故意丢响应：native/write-recovery-results.json，验证评论无重复 POST、两张相同字节图片的部分成功恢复不重传、继续引用两个原 ID。草稿保留、发送中重开、图片暂存/去重/纯图与排队单独恢复：comment-composer.test.tsx、text-utils.test.ts。这是观察后人工恢复策略，不是服务端幂等或任意并发下 exactly-once 保证。

## 验证结果与材料

- 22 个相关 TypeScript 文件定向 ESLint、TypeScript noEmit：通过。8 个相关 UI 测试文件，73 项通过；final-checks.log 保存结果。未运行无必要的全量测试。
- 五组实际 Chrome + 当前实现组件 + 隔离真实 API 检查通过；native/acceptance-summary.json 聚合原始结果并验证计数。这里是实现检查，不是此前 visual/v3-results.json 的设计稿检查。
- 桌面前端 Vite 构建进程退出 0；final-build.log 为原始输出。构建不等于打包安装或启动新桌面。
- OpenSpec strict 校验及 git diff --check 通过。实现清单 ../tasks.md 与来源 ../approval.md 保留。
- native/implementation.tsx 是调用实际 TaskDrawer 的验证入口；native/*-probe.mjs 是可重跑脚本。integration-server.py 要求全新 TMPDIR 下根目录，设置隔离 HOME/HERMES_HOME/HERMES_KANBAN_HOME/绝对 HERMES_KANBAN_DB 并清继承看板；seed-edge.py 只接受有隔离标记的该目录。使用 43311/43312/43313，不能指向用户运行端 43869 或生产数据库。

## 未验证与后续

真实已安装 Electron 上的 PDF 视觉阅读、另存对话框和磁盘落盘、Ubuntu 系统截图剪贴板、真实跨主机连接与 IPC 凭据转发、真实 worker 停止、Mac/Windows、风扇因果均未验证。隔离浏览器的文件输入/粘贴载荷及下载返回值不能替代这些验证。用户已运行安装保持原基线，没有部署或重启。

reviewer 独立检查准确提交与上述证据，通过后由调度助手建立独立收尾任务；未获相应授权前不合并、归档或部署。若退回修改，在同一主卡按明确问题返工并再次送审。验证用临时服务在送审前关闭；清理记录见 cleanup.json，不清用户资源。
