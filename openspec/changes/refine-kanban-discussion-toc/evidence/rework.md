# 第一轮返工交付

【交付审查｜返工与自验完成】builder → reviewer：请复审修复键盘实际主栏滚动未释放定位锁的新提交。此报告补充implementation.md和卡片评论114，不撤销历史规划或改写父卡结论。

## 范围与批准依据

原用户批准为主卡t_e7be9126在第二版交接后“接受方案，实施开发”，原文和磁盘approval.md已重读。本轮按reviewer评论115修复已批准导航行为，不增加视觉或功能范围。方案、视觉和实现许可仍沿用第二版批准；没有合并、安装、部署、重启、push/PR、规格同步归档、旧树/备份清理或风扇修复许可。

原仓库/home/capz/.hermes/hermes-agent；保留树/home/capz/worktrees/hermes-kanban-detail；分支feature/kanban-development；OpenSpec change refine-kanban-discussion-toc。原变更base为0b662c0e6e05450568f6d9bd4f158e2aa80bfc60；本轮返工base为96f5f0db14f3d98e0ad8bde71ab304250b56373d。准确新target由主卡返工交付评论与review metadata登记。

## 原因与修复

原discussion-position.ts的keydown处理把全部button/a排除，虽Chrome已经原生滚动主栏，但没有记录主动滚动意图，因此scroll不解除定位锁。局部复用原250ms意图窗口与实际scrollTop变化门槛，不改变阅读评分算法、编号、历史选择或其他界面。

改动：允许按钮/链接的滚动按键进入原意图判定；忽略已preventDefault的按键；编辑输入（textarea/input/select/contenteditable）、目录和预览仍不进入主栏意图。仅真实主栏位移解除锁，按键自身不清锁。原几何变化、滚动上限、wheel/touch和拖动路径保持。

适用检查：局部缺陷依据既有调查和已批准设计，无新依赖或外部方案采购；补键盘实际操作/恢复检查。无持久数据和运行环境变更，不启用真实备份、迁移或部署；代码可按返工base回退，不涉及数据恢复。

## 真实执行证据

- verify-keyboard.mjs：先在未修复候选96f5f0db14运行，17项中11项通过，六条标题/展开按钮/链接焦点PageUp/PageDown路径全部失败，退出1。原始值保存在keyboard-base-results.json。标题PageUp为scrollTop4191→3730，active仍96，context174。
- 修复后同脚本17/17通过，退出0；标题PageUp同样4191→3730，active转106并符合readingFloor连续性规则，context仍174。标题、展开收起按钮和链接的上下翻页均恢复阅读。链接为显式插入真实楼层DOM的可聚焦测试夹具，不是实际附件或外部链接导航验收。
- 边界检查：滚动上限无位移、非滚动Tab、无位移后改宽、目录Home/PageUp、展开收起、长编辑器内部PageUp、长预览/目录内部操作、Esc和控件preventDefault均不抢掉定位锁。没有页面异常。
- 新增一条Vitest行为合同测试，直接运行真实useDiscussionPosition，覆盖按钮/链接意图+位移以及编辑输入、select/contenteditable、目录/预览和已取消按键边界。几何为测试夹具，不能替代Chrome原生滚动证据。
- check-product.sh：9个相关UI文件53项通过；tsc、ESLint零警告、Prettier、strict OpenSpec和git diff --check退出0。原始输出rework-checks.log。不跑全量测试。
- 原verify-product.mjs重跑50/50通过，覆盖原布局、编号、来源、宽窄低屏、wheel/PageUp/touch、复制反馈和草稿路径，结果rework-product-results.json。旧product-results.json与旧截图保留，未用此次重跑覆盖历史交付。
- 临时Vite proc_eaac1f281ecb已停止；socket.connect_ex(127.0.0.1:43313)=111，拒绝连接。两浏览器脚本均在finally关闭Chrome，无业务数据库读写或客户端启动/重启。

## 材料与重跑

全部材料根目录：/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/evidence/

本报告rework.md；新键盘探针verify-keyboard.mjs；修复前keyboard-base-results.json；修复后keyboard-results.json；既有综合浏览器重跑rework-product-results.json；UI/规范输出rework-checks.log。旧implementation.md、product-dark.png和product-discussion-640.png仍提供原七项及第二版验收映射和界面。

在保留树根运行node openspec/changes/refine-kanban-discussion-toc/evidence/serve.mjs，另行健康检查http://127.0.0.1:43313/evidence/product.html，再运行node openspec/changes/refine-kanban-discussion-toc/evidence/verify-keyboard.mjs；可按implementation.md重跑原综合检查。结束停止临时Vite。脚本仍使用已有本机Chrome与依赖绝对路径，换机需调整；不安装依赖。

## 限制与下一步

这是真实React组件+Chrome原生按键和滚动、隔离API数据，不是已安装Electron验收。系统剪贴板/截图粘贴、实际API发送与附件下载、跨主机IPC、Mac/Windows和真人手机未重新验收。没有检查或修改已安装版本；此前安装stamp记录不作为本轮当前状态声明。本轮无发布包、安装、部署、合并或归档。

reviewer复审准确新提交及P2行为；通过后由调度建立独立收尾并核实授权，退回则同卡继续返工。实施清单完成不是审查或发布批准。
