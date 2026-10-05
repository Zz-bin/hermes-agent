# Kanban 详情页评论上下文：使用、回归与恢复

## 用户行为

- 长描述默认预览约三行原文，支持展开/收起；编辑读取完整字符串。
- 评论可按作者筛选、按时间正序/倒序浏览。排序不改变选择；筛选隐藏所选评论会清空选择。
- 首次进入、清空选择及关闭再打开，右栏默认最近一条正式交接，不把普通讨论或运行摘要算成交接。
- 选中评论后，右栏只读展示这条评论记录的负责人、阶段、状态、工作区及明确材料。缺失历史显示“未记录”，不取当前任务值、不用作者猜负责人。
- “当前任务属性”继续编辑当前卡；“卡片全部附件”继续保留下载和上传。两者不冒充历史材料。

## 数据与调用方式

新增 nullable `task_comments.context` JSON 列。只追加、不回填、不修改旧正文。

新正式交接可声明如下字段；版本、负责人、状态、工作区由服务器在同一写入事务内捕获，客户端不能提供这些快照字段：

```json
{
  "kind": "handoff",
  "phase": "review",
  "verification": "验证命令和真实结果；未经服务器独立核验",
  "approval_scope": "已批准实现，不含部署",
  "attachment_ids": [1],
  "material_paths": ["/absolute/worktree/openspec/changes/example/design.md"]
}
```

此示例是语法说明：附件 ID 必须实际属于当前卡，不能复制示例数字。`verification` 与 `approval_scope` 是调用方的原文声明，在右栏按需展开；不是服务器审查结论或执行许可。文件路径是明确声明的材料入口，显示为可复制文本；不扫描磁盘、不自动上传、不自动打开链接，不保证文件存在。省略 `attachment_ids` 表示未声明附件，不等于关联本卡全部附件。

- CLI：`hermes kanban comment <task-id> '<交接正文>' --context '<上述 JSON>'`。
- Agent tool：`kanban_comment(task_id=..., body=..., context=...)`，作者仍由原有工具身份机制决定。
- API：`POST /tasks/<task-id>/comments` 的 JSON 可选增加 `context`；插件 REST namespace 不变。
- 旧调用仍有效。明确的 `【请求批准｜阶段】`、`【规划完成｜阶段】`、`【实现完成｜阶段】`、`【请求审查｜阶段】`、`【审查通过｜阶段】`、`【退回修改｜阶段】`、`【需要输入｜阶段】` 可声明正式交接；旧记录只分类，不制造快照。`【用户决定｜...】` 不属于正式交接。
- 附件不存在、跨卡关联、非法字段或伪造快照，整个评论与事件写入拒绝并回滚。
- UI 只理解版本 1 的合法形状；未知/不完整的载荷按缺失历史处理。

这是可选上下文，不是强制写入策略或业务角色权限锁。

## 回归命令

在隔离开发工作树按仓库现有 `activate`/PM 方式准备测试环境；不要修复或替换运行实例的环境。

```bash
source ./activate --test-extras=web --
scripts/run_tests.sh \
  tests/hermes_cli/test_kanban_db.py \
  tests/hermes_cli/test_kanban_db_init.py \
  tests/hermes_cli/test_kanban_cli.py \
  tests/hermes_cli/test_kanban_comment_queries.py \
  tests/hermes_cli/test_kanban_boards.py \
  tests/hermes_cli/test_kanban_transfer.py \
  tests/hermes_cli/test_kanban_review_lifecycle.py \
  tests/tools/test_kanban*.py tests/plugins/test_kanban*.py \
  tests/gateway/test_kanban_notifier.py

cd apps/desktop
npx tsc --noEmit -p tsconfig.json
npx eslint src/plugins/kanban/{drawer.tsx,comment-thread.tsx,comment-context.ts,comment-context.test.ts,types.ts,i18n.ts} src/contrib/kanban-detail-context.test.tsx
npx prettier --check src/plugins/kanban/{drawer.tsx,comment-thread.tsx,comment-context.ts,comment-context.test.ts,types.ts,i18n.ts,kanban.css} src/contrib/kanban-detail-context.test.tsx
npx vitest run --project ui src/plugins/kanban src/contrib/kanban-i18n.test.tsx src/contrib/kanban-detail-context.test.tsx
npm run build
```

对于 SOCKS-only 环境变量导致 node-gyp 下载 Electron 头文件失败，可在**该构建命令**临时移除代理变量再试；不要修改用户全局代理配置。本机已按此方式成功构建。

### 浏览器隔离守卫

独立 fixture/server 在第一次连接或 `init_db()` 前，必须同时设置：

1. `HERMES_KANBAN_HOME` 为隔离目录。
2. `HERMES_KANBAN_DB` 为该目录内的绝对数据库路径。
3. 清除继承的 `HERMES_KANBAN_BOARD`。
4. 断言 `kanban_db_path().resolve()` 位于隔离目录内。

**仅设置 `HERMES_HOME` 不够**：Kanban 的默认根目录故意跨 profile 共用。数据库、材料目录和 current-board 指针都需要独立。浏览器测试不得调用调度端点或启动业务 worker；测试服务完成即关闭。

## 本次实际验证

- 后端相关回归：30 文件，326 passed，0 failed，1 Windows-specific skipped。
- 前端相关回归：12 文件，90 passed。
- TypeScript、相关 ESLint、OpenSpec strict validation 已通过。
- 桌面 build 返回 0，renderer、Electron main/preload 和 dist 检查通过。可选 HUD modifier 因缺 X11/XI 开发头文件没有生成；未为此安装系统包。
- 实际 Chrome：加载原生 `TaskDrawer`，通过真实隔离 SQLite 与现有 plugin API，不是视觉原型；1200×1000 与 640×1000。验证默认最新正式交接、显式选择/材料、排序保持选择、作者筛选隐藏后回默认、键盘 Enter、清空、普通讨论不猜历史、描述展开不改上下文、关闭重开、单一描述及无横向溢出。浏览器没有 pageerror 或 console error。
- 浏览器证据和可重现 fixture 脚本由当前主卡附件/恢复包保存。审查须对提交本身重新验证，不把本文作者报告当独立审查结论。

### 验证准备期间的误写及恢复

一次独立脚本最初仅设置 `HERMES_HOME`，误在共享默认看板创建了两张 blocked fixture 卡 `t_8a33115f`、`t_3068bd00`，三条 fixture 评论和两份 fixture 附件，并触发新增 nullable context 列。发现后停止服务，只移除这两个准确 ID 的测试记录和附件；在同一清理事务中比较全部其他 task 行一致，再单独读回核对无这些测试记录。业务卡未作为测试 fixtures；本次误写不能被描述成“从未触碰运行数据库”。

清理收据：`/home/capz/.hermes/backups/kanban-detail-isolation-incident/cleanup-receipt.json`。清理前一致性备份同目录 `before-cleanup.db`（0600，可能含真实看板数据，不作为公开附件）。新增兼容空列保留，清理后 context 非空记录为 0；没有部署开发代码、改变业务卡或破坏性降级数据库。后续 fixture 已明确 pin DB/home 并执行路径断言。

## 升级与回退边界

本 change 基于 `cbc569e23cb045b58b067f37cf5514feb44e0828`，分支 `feature/kanban-detail-context`。准确候选提交由卡的 `target_commit` 和恢复包 manifest 标识；不要从构建时的 dirty stamp 推断提交。

耦合面：原生 drawer、i18n/type/CSS、Comment ORM/schema/add-comment/migration、CLI parser/handler、已有 tool/schema 与 plugin API。pure helpers/评论组件独立，未改 dispatcher、通知、身份/权限或强制策略；没有新增产品依赖。

今后升级：

1. 经实际升级授权，保留运行版本及数据库一致性备份；在新隔离工作树基于明确上游 commit 应用候选 commit/patch。
2. 先 `git apply --check <patch>` 或执行 `git cherry-pick --no-commit <candidate>` 观察冲突；不运行自动重打补丁。冲突须人工逐层核实模型、调用链及 UI，不只解决文本。
3. 重跑上述回归及浏览器主路径，检查 legacy/no-context、未知 context 版本、附件归属/缺失、最新交接资格、完整描述编辑与连接/卡切换。
4. 再由 reviewer 审查准确新提交。原基线的通过不保证未来上游兼容。
5. 有独立部署授权才合并/安装/重启。若已部署后需回退，恢复旧 app/code build，**保留 nullable context 列、已有快照与旧正文**；旧版会忽略新列，不对真实数据库 DROP COLUMN 或反向覆盖数据。

当前运行 main 未合并、未重启；本文件不构成部署许可。尚未验证：Windows/macOS 运行、完整 screen-reader 审核、真实 Electron OS 保存对话框、生产安装/发布/升级组合。独立审查状态以 Kanban reviewer 记录为准。
