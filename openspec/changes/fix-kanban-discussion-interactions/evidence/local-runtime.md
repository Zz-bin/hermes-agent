# Ubuntu 本机版本核对

## 用户事实与授权

主卡 t_532e415b 用户 desktop 评论 created_at=1791693116 原文：
> 当前使用的是ubuntu本机。如果需要其他信息你自行获取

结合 created_at=1791692429 的第三版方案、视觉及实施批准，本轮自行进行只读本机检查，不重启或改变运行环境。

## 实际观察

- 正在运行的桌面主进程 PID 1378918，父进程1378825（hermes desktop）。可执行文件 /home/capz/.hermes/hermes-agent/apps/desktop/release/linux-unpacked/Hermes。
- 同进程安装目录 resources/install-stamp.json：commit 6f515c4fc80e279f3078a90656eac21f53d5c57b，branch main，dirty false，builtAt 2026-10-06T01:07:58.765Z，payload bootstrap，distribution desktop-app。
- 已安装 resources/app.asar 大小8349764 bytes，SHA256 e08955e65773b390980b354c73718353a30833297f1d4cef8e2b8dcf0056b448。
- 桌面直属后台PID1379337：hermes serve --port 0，本机127.0.0.1:43869；启动源码入口 sys.path.insert(0, '/home/capz/.hermes/hermes-agent')，HERMES_HOME=/home/capz/.hermes，HERMES_DESKTOP=1。启动时间Unix1791655656.39。
- 该源码仓库HEAD与开发保留树均6f515c4fc80e279f3078a90656eac21f53d5c57b；运行仓库git status --short为空。保留开发树仅新变更目录未跟踪，branch feature/kanban-detail-context。

来源：psutil进程父子关系、exe/cwd/cmdline的非凭据字段、指定非秘密环境字段、监听地址；实际安装stamp与asar；git rev-parse/status。未读取用户认证文件或连接数据库。

## 结论与边界

用户明确指出Ubuntu本机，观察到正在运行的同机桌面及其本地后台与保留开发基线一致，满足实施前目标版本核对。Mac保留树仅对照材料，其额外预览编辑来源/缺失文件修复见 approval-resume.md，不修改该树，不作为本机安装依据。当前连接历史可能还有其他后台，本证据不宣称远程/其他平台均已验收。实现以此Ubuntu已安装基线为目标，跨来源与过期响应需隔离验证，Mac/Windows真实设备行为仍明确未验证；不以源码版本核对冒充新产品验收。第七项性能根因/精确修复、合并、部署、重启仍排除。
