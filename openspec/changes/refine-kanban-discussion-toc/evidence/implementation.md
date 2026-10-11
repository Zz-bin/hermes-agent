# 开发交付与验收证据

## 交接类型与授权

【交付审查｜实现与自验完成】builder → reviewer：独立审查本卡候选提交的原七项与第二版补充，批准或给出返工要求，不安装或部署。

用户在本卡第二版方案/视觉交接（评论112，附件18）之后回复“接受方案，实施开发”。原文已由kanban_show重读，批准记录见 ../approval.md。方案、视觉与实施获得许可；合并、安装、部署、重启、push/PR、规格同步归档、旧树/备份清理和风扇修复均未获许可。原卡审查结论不覆盖本次提交。

原仓库 /home/capz/.hermes/hermes-agent；开发树 /home/capz/worktrees/hermes-kanban-detail；分支 feature/kanban-development；base 0b662c0e6e05450568f6d9bd4f158e2aa80bfc60；OpenSpec change refine-kanban-discussion-toc。准确target commit登记在本卡开发交付评论及review metadata，本报告、源代码与验收材料随该提交保存。

原审查commit 45f4dc9002f170dc8526e12b4e1061ddf1ce7cae与base整体不同；两者 apps/desktop/src/plugins/kanban 的提交内容相同。本轮只以base为开发起点，不把其他上游变化归为本次修改。已安装端install-stamp记录6f515c4fc80e279f3078a90656eac21f53d5c57b、main、2026-10-06T01:07:58.765Z，非本轮代码；检测没有运行中的linux-unpacked/Electron桌面进程，未擅自启动或更新。

## 检查依据与改动边界

需求价值/现成方案：复用TaskDrawer、已有评论排序/上下文、原自动尺寸输入区及通用CopyButton；局部扩展导航和布局，不引入通用目录系统或核心工具。调查来源与成本依据见 investigation.md 与 ../design.md。

界面与恢复：启用真实组件浏览器检查及相关UI回归，覆盖进入详情、过滤/排序、导航、预览、历史选择、编辑草稿、资料切换、复制与人工恢复。源码截图不是仅设计稿：product.tsx导入实际TaskDrawer、ThemeProvider与产品CSS；API数据和剪贴板为显式隔离替身，未连接业务数据库。没有服务/持久数据迁移，不启用真实备份或恢复；既有资料来源固定、断线与部分写入恢复仍由相关行为测试保护。

## 验收映射

| 需求 | 实现 | 本轮验证 |
| --- | --- | --- |
| 1. 发表区仅主栏，侧栏完整独立 | drawer.tsx布局、kanban.css窄屏切换 | 宽屏编辑区/侧栏边界；390×800、640×400最后附件可见；切回保留草稿与阅读位置；低屏末楼不遮挡 |
| 2. 评论计数与卡内编号一致 | commentFloors完整集合映射；线程/目录/资料复用，原ID不变 | 同秒原ID排序、过滤排序不重编号、移除后的完整集合重算；浏览器五条#1至#5、K/N及原选择身份 |
| 3. 移除三横入口 | 每个短横独立触发，无总按钮 | 浏览器目录只含可见条目，无输入或总入口 |
| 4. 点击与阅读活动分离 | discussion-position.ts定位锁、用户滚动意图和可见占比/0.15连续性 | 末楼点击、非用户收起/改宽、wheel、PageUp、原生触屏、到滚动上限无位移不解锁；阅读与历史选择不同楼 |
| 5. 编号强调 | 主题强调色，活动楼额外粗体/下划线，历史边线独立 | 线程属性测试及实际明/暗主题截图 |
| 6. 目录中部夹持 | 可见讨论区几何夹持、长目录内部滚动 | 中心几何测量、40层短楼、Home/End键盘、首尾定位、低屏可操作范围、无水平溢出 |
| 7. 弹窗仅对应楼内容 | 单楼编号/作者/完整原文，预览与导航独立 | 悬停原文、无跨楼内容和控件、Esc保留短横焦点且不关详情 |
| 补充：自动尺寸单层编辑区 | 保留原自动尺寸，外围透明无框、输入背景区分 | 输入多行到内部滚动上限、删空缩回、改宽、草稿保留；相关发送恢复回归 |
| 补充：文件名省略/全部附件复制 | Attachment统一CopyButton；原完整路径，不改只读reader | 长名称省略、首ZIP、评论材料与卡附件均有图标，缺路径禁用原因、复制失败只读文本恢复；来源切换/断线/相关文件链接禁用回归 |
| 补充：清晰展开收起 | 主题强调、箭头、textStrong/focus及aria-expanded | 独立折叠选择不变，主题提供器暗色下颜色与箭头检查 |

## 实际执行

- evidence/check-product.sh（本目录）：TypeScript tsc -p . --noEmit、所改TS/TSX ESLint --max-warnings 0、Prettier检查、9个相关Vitest UI文件52项全部通过、OpenSpec strict validate、git diff --check，串联退出0。输出见 product-checks.log。未运行无必要的全量测试。
- node evidence/verify-product.mjs：本地真实Chrome，以真实组件加隔离模拟API执行50/50检查，退出0。逐项断言及几何值见 product-results.json；无业务写入，复制为测试替身，原生触屏输入通过Chrome协议驱动，不是人手手机验收。
- 浏览器发现并修复：用户滚动意图若仅保留一帧会错过真实滚动事件，改为短时意图窗口与拖动期间识别；低屏定位短楼的固定8px上边距会遮住底部，按可用余量缩小定位边距。之后重新跑完上述检查。
- 临时服务proc_9eba2b2f353e已停止，127.0.0.1:43313连接返回111（拒绝连接）；探针关闭全部Chrome窗口。保留树/历史资料未清理。

## 可打开材料

本报告绝对路径：/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/evidence/implementation.md

同目录截图：product-wide.png、product-dark.png、product-discussion-390.png、product-discussion-640.png、product-materials-390.png、product-materials-640.png、product-tall-low.png。它们标注“真实TaskDrawer · 模拟服务数据（非安装端）”；不是安装端截图或设计批准图。

重跑：在开发树根目录运行 node openspec/changes/refine-kanban-discussion-toc/evidence/serve.mjs，健康检查 http://127.0.0.1:43313/evidence/product.html，再运行 node openspec/changes/refine-kanban-discussion-toc/evidence/verify-product.mjs。结束需停止该临时服务。产品探针沿用当前机器保留树和Chrome绝对路径，换树/换机须调整；使用本地已安装依赖，不安装依赖或更新上游。

## 未验证与下一步

本轮没有已安装Electron、系统剪贴板粘贴/复制、实际生产API写入或真实附件下载验收；发送/上传异常与资料来源安全使用已有隔离UI测试，不能冒充生产验收。没有Mac/Windows、跨主机IPC或实际手机人工操作验证，也不声称解决旧风扇问题。未打发布包，未安装、重启、合并或归档。

reviewer须检查准确新target commit与本轮授权/规格/证据的一致性，必要时独立重跑相关验证。通过后交调度安排独立收尾及所需许可；退回则builder在同卡按证据返工，范围变化先更新规划并等待批准。
