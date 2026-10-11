# 第三版待确认方案与交互稿

类型：请求批准；阶段：方案修订；builder → 用户。本版按最新三图反馈替代第二版“详情右缘图标”的目录形状与位置，其余待批行为保留。第一、二版稿和历史交接原样保留；本文件不是用户批准记录。

## 本次变化

目录放讨论区左侧，不放右侧属性栏。缩起为一列短横线，当前阅读楼层突出；悬停展开对应编号、作者和两行内容摘要及可选楼层，120ms短动画，不循环。目录与楼层选中边线留独立间距；宽窄屏量测未冲突，故按你的优先规则选左侧。展开面板随可阅读高度缩短，不能盖住发表区；非评论页签或窄屏滚到属性区时隐藏，回讨论恢复。左右位置不再另行求决。

保留：左上处理人位于状态框前、附件名打开安全只读预览与独立保存、底部常驻发表区、逐楼独立折叠、清晰楼层边界、稳定编号、历史上下文及评论图片粘贴待批方案。

## 请分别决定

1. 方案：是否接受上述目录行为及保留的附件、发表、折叠、上下文、处理人和图片粘贴方案？
2. 视觉：是否接受第三版讨论左侧短横线、悬停摘要/动画、宽窄屏布局？
3. 更换正在工作的处理人：是“停止当前工作并重新分配”，还是“不停止，预约下一阶段的人”？演示仍是前者且先确认，未将位置指示当成停止许可。
4. 实现许可：方案和视觉确认后，是否允许在保留开发树实现上述范围？目前没有实现批准。确认分配行为后补齐实施清单，再按明确批准实施并交独立审查。
5. 风扇问题：仍需实际客户端主机/平台/安装版本、连接方式和后端版本，以准确环境做只读对照；精确修复另确认。第三版动画不是整应用风扇根因验证。

不包含：合并、部署、生产服务/当前客户端重启、上游更新、push/PR、规格同步归档、旧工作树/备份清理。默认不执行HTML附件脚本或自动启动系统程序。

## 材料入口

第三版可直接打开：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/interaction-v3.html

方案与范围：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/design.md
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/proposal.md

调查与未验证：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/evidence/investigation.md

本版真实Chrome演示检查与截图：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/v3-results.json
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/v3-reference-hover.png
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/v3-rail-wide.png
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/v3-toc-narrow.png

跨设备演示包（另作为卡片附件提供）：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/interaction-demo-v3.zip
卡片附件13 kanban-interaction-demo-v3.zip 已读回核对HTML字节与ZIP CRC；使用支持ZIP LZMA的解压工具，解压打开 interaction-v3.html。若默认解压器不支持此压缩方式，本机可直接打开上方HTML或使用下面标准Deflate完整包。所有任务、图片上传、发表、分配均明确模拟，无业务写入。第一版附件11和第二版附件12不是当前稿。完整本地方案/证据/截图包：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/visual/interaction-preview-v3.zip

## 演示路径与限制

1. 悬停讨论左侧短线，查看该楼摘要；点击保持目录，选楼或输入编号定位；Tab/Enter及Esc可操作。
2. 选择上下文、展开再收起、排序和过滤；过滤后定位隐藏楼层，取消或显示全部，编号不变且定位不替你选择上下文。
3. 增高编辑器、加入示例截图、缩窄到390px，滚至末尾；正文与附件可滚到发表区上方，目录不盖输入框。
4. 左上处理人和“处理中（模拟）”演示取消/确认；附件名与↓分别打开/保存；图片粘贴、移除和失败重试只在本页模拟。

第三版48项Chrome设计行为检查通过，0脚本错误；规格严格校验通过。检查结果只证明设计稿行为，不代表已安装产品验收。真实Mac/Windows、系统截图剪贴板、真实上传/固定来源预览/分配、PDF与下载取消失败、性能因果仍未验证。空讨论、巨大目录与极小高度仍须实现阶段按规格验证。本轮没有产品修改/提交、真实业务卡探测写入或服务重启。tasks.md仍因分配行为未定而缺失，规划并未全部完成。

repo=/home/capz/.hermes/hermes-agent；worktree=/home/capz/worktrees/hermes-kanban-detail；branch=feature/kanban-detail-context；base/HEAD=6f515c4fc80e279f3078a90656eac21f53d5c57b；target=无实现提交；change=fix-kanban-discussion-interactions。

## 用户批准与本轮恢复核查

本节补充并取代上文“尚未批准”“等待分配语义”的当前状态，保留上文作为第三版送批时的历史记录。

批准来源：主卡 t_532e415b，desktop 用户评论，created_at=1791692429。原文：

> 接受方案和视觉。工作中的换人行为保持和Hermes原版Kanban行为一致。确认后可进入实施

批准范围：第三版方案与视觉（原六项及新增评论图片粘贴）；在保留开发树实施；运行中更换处理人复用原版重新分配，不实现预约下一阶段。部署、合并、重启、push/PR、规格同步归档仍未授权；风扇根因与精确性能修复仍另行确认。

已核实原版链路：drawer.tsx:302-342 → api.ts:462-463（reclaim_first=true）→ plugin_api.py:1028-1039 → kanban_db.py:2608-2623。后端先回收再分配；reclaim_task:2572-2605 对无运行/claim任务无回收副作用，运行时按原流程终止原worker、恢复原阶段并重置失败计数。未启用预约字段。拟保留方案中的运行前确认、取消和同人无操作，原后端状态规则不变。此结论来自源码，不是对真实业务卡执行重新分配的结果。

恢复时 HEAD 与分支仍为上述基线；Mac保留树 HEAD=5ff7245eb571c4fee21f3bc7c67689863caabbad。两者 preview-file.tsx 存在文件缺失提示和编辑来源保护差异，Mac树并非用户实际安装证明。本轮未修改该树。

仍未满足的前置条件：proposal.md末段/design.md Approval Gate要求先确认用户实际客户端和后端版本。本卡没有提供客户端主机/平台/安装版本、连接方式和后端版本，不能用本机Linux或保留Mac源码代替。tasks.md已补齐，实际环境核对保持未完成；不再次索要方案/视觉批准，也不把已有批准撤销。需用户补充这些事实，或明确允许先在现有Linux基线开发、真实客户端兼容验证后补；后者是对既有前置条件的调整，须持久记录后继续。

### Ubuntu 本机信息恢复

用户评论 created_at=1791693116 原文：“当前使用的是ubuntu本机。如果需要其他信息你自行获取”。依此只读核对正在运行的桌面实际安装stamp、进程父子关系和后台源码，均对应6f515c4fc80e279f3078a90656eac21f53d5c57b；本机后台为桌面直属hermes serve，监听127.0.0.1:43869。证据见 evidence/local-runtime.md。上节缺少目标版本信息的阻塞现已解除，不撤销既有批准，不推迟验收；Mac树仅对照，其他平台真实行为仍未验证。允许开始已批准实施，禁止部署/重启等边界不变。
