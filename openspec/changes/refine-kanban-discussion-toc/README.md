# 方案与设计稿入口

当前阶段：规划，等待用户确认。尚未授权实现或部署。

当前材料版本：第二版 v2，按用户第二轮反馈修改编辑区、材料行及展开/收起控制；不代表用户已经接受首版/第二版方案。首版卡片附件14仅作历史，新的第二版附件及本地index.html为本轮审批对象。

优先打开 visual/index.html（双击用浏览器打开即可，不需安装或启动服务器）。所有评论、资料、发送异常均为模拟；不会上传/写入业务服务。切换场景到5层、40层、超长单楼或无讨论；悬停短横看对应内容、点击定位、主动滚动、按作者筛选/排序、点击楼层头看历史资料。缩窄窗口到700px以下，会出现讨论/资料切换。图片入口可预览本地图片，发送只显示模拟提示。

本机准确路径：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/visual/index.html

审批分别回答：
1. 方案：是否接受原七项行为及编号/阅读位置规则，加上自动尺寸单层编辑区、材料文件名/完整路径复制与清晰展开收起？
2. 视觉：是否接受第二版主栏编辑器（外层透明、编辑区背景稍不同、不可手动拖动）、文件名省略与纯图标复制（ZIP也有）、强调展开收起，以及原强调序号、左侧中部目录、纯内容弹窗与窄屏讨论/资料切换？
3. 实现：确认后是否允许在保留工作树实现原七项及上述补充，并提交独立审查？
4. 部署：本次不申请，也不默认包括合并、安装、重启或规格归档。

完整方案 design.md；动机/范围 proposal.md；需求原文 requirements.md；验收场景 specs/kanban-detail-inspection/spec.md；调查与未验证项 evidence/investigation.md；40项真实浏览器模拟检查 visual/results.json；检查脚本 visual/verify.mjs；宽窄屏截图 visual/*.png。

第二版补充检查：visual/verify-v2.mjs及visual/v2-results.json。复制成功采用隔离剪贴板替身；失败恢复实际执行模拟拒绝，不等于系统剪贴板或安装端验证。设计稿中“复制路径”会在主动点击后写入模拟路径，打开/下载/发送仍仅模拟；没有真实业务请求。

第二版独立设计稿包：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/visual/kanban-discussion-demo-v2.zip

第二版完整审批材料包：
/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/visual/approval-package-v2.zip

两包均解压后打开index.html（完整包中的visual/index.html）。第二版截图v2-wide.png、v2-discussion-390.png、v2-discussion-640.png、v2-materials-390.png、v2-materials-640.png仅作模拟视觉证据。完整包不包含任何业务数据库或用户配置。

tasks.md按任务正文暂不生成，只有明确实现许可后才生成；工具status显示3/4是刻意保留审批边界，不表示实现完成。

visual/baseline.html/baseline.tsx 是当前未修改真实组件的只读模拟页，仅供在现有仓库内用node visual/serve.mjs临时服务复查，依赖仓库已装的Vite等。它不是打包产品/安装端，解压包不含node_modules，不应直接打开baseline.html当成产品。index.html可独立运行；file模式不展示源码页面链接。验证期间临时服务在交接前停止，不提供不会长期在线的localhost地址。

安装端的实时完整页尚未取得：检查时没有运行中的桌面进程，未擅自启动。截图、模拟稿和源码组件检查不替代用户实际客户端验收。真实API写入、附件来源安全、系统剪贴板/PDF、其他操作系统与风扇问题未在本轮重新验收。
