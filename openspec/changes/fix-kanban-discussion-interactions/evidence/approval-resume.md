# 批准后的恢复核查

## 用户决定

来源为 kanban_show(task_id="t_532e415b") 读回的 desktop 评论，created_at=1791692429：

> 接受方案和视觉。工作中的换人行为保持和Hermes原版Kanban行为一致。确认后可进入实施

这不是builder自批。第三版方案/视觉与开发实施已有批准；不再将分配语义作为待决项。运行中停止和重新分配复用原版；不引入预约下一阶段。合并、部署、生产服务/当前聊天客户端重启、push/PR、同步归档未授权。第七项性能修复未纳入。

## 本轮原始事实

- 保留工作树：/home/capz/worktrees/hermes-kanban-detail。
- git rev-parse HEAD：6f515c4fc80e279f3078a90656eac21f53d5c57b。
- git branch --show-current：feature/kanban-detail-context。
- 初始及本轮末尾 git status --short 均只见 ?? openspec/changes/fix-kanban-discussion-interactions/；git diff --exit-code 成功。本轮没有产品源码变更或产品提交。
- Mac保留树只读 git rev-parse HEAD：5ff7245eb571c4fee21f3bc7c67689863caabbad。未改该树；保留树并非实际安装端。
- 两个上述commit间 preview-file.tsx 的git diff显示Mac树额外包含 DesktopFileMissingError/markPreviewTabMissing 和 fileEditScopeKey/requireEditorOwner 来源保护。不得以旧Linux文件覆盖这些已存在修复。

## 原版换人行为的源码依据

- apps/desktop/src/plugins/kanban/drawer.tsx:302-342：已有处理人菜单，直接调用onReassign。
- apps/desktop/src/plugins/kanban/api.ts:462-463：POST reassign，payload { profile, reclaim_first: true }。
- plugins/kanban/dashboard/plugin_api.py:1022-1039：传入kanban_db.reassign_task；冲突报错而非伪成功。
- hermes_cli/kanban_db.py:2608-2623：reclaim_first时先reclaim_task，再assign_task；仍在运行且未回收时拒绝。
- hermes_cli/kanban_db.py:2572-2605：没有运行/claim时返回False而不回收；有claim时调用_terminate_reclaimed_worker，恢复来源阶段、清claim/worker信息、记录回收并清失败计数。

结论：原版是停止并重新分配，不是预约下一阶段。保留批准方案中的确认/取消/同人无操作以及原后端规则。以上为源码核实，没有对真实卡片执行停止或分配，不声称真实设备行为验收。

## 规划恢复与工具结果

按实际OpenSpec根读取既有proposal/specs/design与批准导航。hermes-kanban-workflow未通过skill_view发现，使用只读默认技能路径读取 /home/capz/.hermes/skills/autonomous-ai-agents/hermes-kanban-workflow/SKILL.md；未修改任何技能。

openspec instructions apply 最初state=blocked、missingArtifacts=[tasks]。根据 tasks instructions 的模板补齐清单，将已完成批准恢复/原版行为核查列为1.1；其余保持未完成。再次命令输出：

- openspec validate fix-kanban-discussion-interactions --strict：Change 'fix-kanban-discussion-interactions' is valid。
- openspec instructions apply --change fix-kanban-discussion-interactions --json：state=ready，total=9，complete=1，remaining=8。

ready仅证明规划材料齐备，不代表已完成环境前置核查。未运行产品测试；本轮只读核查及文档验证不需要全量测试。没有启动临时服务/浏览器或改动运行环境。

## 真正未解决的前置条件

原proposal末段与design Approval Gate要求实际客户端/后端主机与准确安装版本在实施前核实。当前用户评论没有提供这些信息，也没有明确允许推迟该条件。现有源码只能确定保留树，无法确定当前会话的客户端平台/安装版本、连接方式与对应后端运行版本。

因此task 1.2尚未完成，产品实现暂停；已批准方案/视觉/实施许可不撤销。需用户提供实际环境事实，或明确允许先在当前Linux基线开发、真实客户端兼容验收后补。后一决定改变前置条件但不改变验收平台、不授权访问另一台机器或部署，须先记录在同卡。不能把技术材料ready、保留Mac树或本机进程等同用户实际环境。
