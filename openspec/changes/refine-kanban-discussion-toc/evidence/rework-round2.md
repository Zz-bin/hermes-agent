# 第二轮返工交付

【交付审查｜第二轮返工与自验完成】builder → reviewer：请复审新提交，确认评论117的空格激活误解除定位锁已修复；本报告补充第一轮rework.md，不替代用户第二版批准或父卡结论。

## 范围与批准

已重新读取主卡t_e7be9126正文、完整评论、用户第二版后“接受方案，实施开发”原文及approval.md。当前仅修复已批准导航/展开收起行为，不增加功能或视觉范围。方案、视觉及实现以第二版批准为依据；不含合并、安装、部署、客户端/生产服务重启、push/PR、规格同步归档、旧树/备份清理或风扇修复。

原仓库：/home/capz/.hermes/hermes-agent；保留工作树：/home/capz/worktrees/hermes-kanban-detail；实际分支：feature/kanban-development；变更：refine-kanban-discussion-toc。原变更base：0b662c0e6e05450568f6d9bd4f158e2aa80bfc60；本轮返工base：5d874c33cebbc327c669c68939daf2a1d9db13cd。准确新target在本卡新交接评论与review metadata登记，不把原候选说成已批准。

## 原因与最小修复

discussion-position.ts先前把Space与PageUp等一并标为滚动意图。在原生button上Space实际激活收起；末楼变短使主栏滚动上限下降，scrollTop自动变化，被250ms意图窗口误认成主动阅读。Enter未标意图所以对照不失败。

复用原意图/位移机制，按焦点控件和按键语义区分：button及role=button的Space是激活，不登记阅读意图，并清掉此前无位移翻页留下的短期意图；button/a/role=button的Enter同样清掉遗留意图。其余未被取消的滚动键仍可登记意图，只有随后的实际主栏位移解除锁。没有重新排除全部按钮/链接：标题/展开按钮/链接的PageUp/PageDown保持；原生链接/楼层焦点的Space仍正常阅读翻页。

扩展既有hook行为测试（未增加新测试数量）覆盖嵌套span事件目标、原生按钮、role按钮、链接以及无位移翻页紧接激活的几何变化。原输入、目录、预览、取消按键边界保留。历史上下文选择未改动。

启用检查及依据：这是已确定局部缺陷，既有调查/现成方案选择仍适用，直接修复现有机制，无新依赖或采购；重点补键盘操作及恢复路径。无持久数据、后端或运行配置修改，无迁移、备份或部署；源码可按本轮base回退，数据无需恢复，不撤销任何已发送评论。

## 可观察验收与真实执行

所有JSON结果均程序化核对results长度与passed/total，不按口头汇总。

- 新verify-activation.mjs在未修复5d874c33ce上11项中9项通过，退出1。末楼Space收起scrollTop5995→5761、active96→98，context174；紧接Space展开也不能恢复已丢失的锁。Enter相同位移保持96。原始证据activation-base-results.json。
- 修复后同探针11/11通过，退出0。末楼Space收起仍5995→5761但active保持96，历史context保持174；再展开也保持96。覆盖末楼滚动上限、普通中部楼层的Space/Enter展开收起八条路径；楼层与显式链接夹具的Space原生阅读滚动两条路径；无页面异常。
- verify-keyboard.mjs重跑17/17通过，退出0；六条标题/展开按钮/链接PageUp/PageDown及无位移、窗口改宽、目录/预览内部操作、编辑器内部操作、Esc、被取消按键检查保持通过。结果round2-keyboard-results.json。
- check-product.sh退出0：相关9个UI文件53项、tsc、ESLint零警告、Prettier、strict OpenSpec和git diff --check通过。原始输出round2-checks.log。不跑全量测试。
- 原verify-product.mjs重跑50/50通过，退出0。只为保留历史证据新增PRODUCT_OUTPUT_DIR可选输出目录，本轮原结果与截图保存到round2-product/，不覆盖旧截图/JSON。浏览器覆盖原宽窄/低屏、编号、资料来源、复制恢复、草稿、wheel/键盘/touch与目录行为。直接查看本轮暗色和640×400截图，布局与输入区/目录样式无可见回退；截图不代替行为验证。
- 临时Vite进程proc_e7b2e2411c84已停止；socket.connect_ex(127.0.0.1:43313)=111拒绝连接。浏览器脚本均在finally关闭Chrome，没有业务数据库写入或客户端启动/重启。

## 材料入口与重跑

材料绝对根目录：/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/evidence/

- 本报告rework-round2.md：批准边界、原因、验收映射与限制。
- verify-activation.mjs、activation-base-results.json、activation-results.json：新浏览器复现及修复对照。
- round2-keyboard-results.json：原17项键盘回归。
- round2-checks.log：UI/类型/规范检查。
- round2-product/product-results.json、product-dark.png、product-discussion-640.png：原50项重跑及本轮实际组件截图。
- 旧implementation.md与rework.md：原七项及第二版补充、第一轮返工历史，保留不改写。

重跑（保留树根）：node openspec/changes/refine-kanban-discussion-toc/evidence/serve.mjs；独立健康检查http://127.0.0.1:43313/evidence/product.html后，运行node openspec/changes/refine-kanban-discussion-toc/evidence/verify-activation.mjs、KEYBOARD_RESULTS=round2-keyboard-results.json node openspec/changes/refine-kanban-discussion-toc/evidence/verify-keyboard.mjs、PRODUCT_OUTPUT_DIR=round2-product/ node openspec/changes/refine-kanban-discussion-toc/evidence/verify-product.mjs，以及bash openspec/changes/refine-kanban-discussion-toc/evidence/check-product.sh。测试后关闭临时服务。脚本使用现有本机Chrome与依赖绝对路径，换机需调整，未安装依赖。

## 限制与下一步

真实React组件和Chrome原生按键/滚动，API及复制为隔离替身，不是已安装Electron验收。链接是显式DOM焦点夹具，不是实际附件导航测试。系统剪贴板/截图粘贴、真实API发送/下载、跨主机IPC、Mac/Windows、真人手机未重新验收；本轮未检查或修改安装版本，不以旧安装stamp推断当前状态。无发布包、部署、合并或归档。

reviewer复审准确新target，通过后交调度安排独立收尾并核实所需授权，需修改则同卡返工。实施清单完成不代表审查或发布许可。
