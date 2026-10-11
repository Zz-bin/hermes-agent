# 调查证据与原始需求

## 范围与来源

主卡 t_532e415b 的正文为五项原始要求；desktop 评论追加第六项处理人及第七项“准确地说一打开 Kanban 风扇就转”。它们是用户报告，不等于已定位根因。仅获准调查、规划和设计稿；没有实现或部署批准。

启用检查：需求/现成方案（已有产品内的操作障碍，优先复用）；完整界面/异常恢复（本次实质交互变化）；数据/服务恢复仅检查重新分配和附件来源的安全性，不规划实际迁移/部署。普通修复不需要新产品需求实验。

保留工作树 /home/capz/worktrees/hermes-kanban-detail；分支 feature/kanban-detail-context；base/HEAD 6f515c4fc80e279f3078a90656eac21f53d5c57b。原仓库 /home/capz/.hermes/hermes-agent HEAD 同值。Mac 保留工作树 /home/capz/worktrees/hermes-kanban-macos-client HEAD 5ff7245eb571c4fee21f3bc7c67689863caabbad，干净，仅只读对照。Kanban 源码及 local-preview.ts 在这两个提交间无差异；preview-file.tsx 有新增文件不存在提示、编辑来源检查等差异，不能覆盖 Mac 版本的已有修复。保留树不是已安装客户端证明。本机存在 Linux Hermes release 进程与 serve；未访问用户 Mac，未确认当前会话的真实客户端主机/版本、连接方式及后端版本。

## 逐项现状、根因与拟修改

1. 附件打开：drawer.tsx:514-546 明确把文件名当下载动作；api.ts:391-395 在读取详情时捕获下载来源。native/probe.mjs 对当前原生 TaskDrawer 模拟附件点击后 saveCalled=true。拟在两处附件列表（全部附件与交接材料）复用同一打开/保存组件。不是系统无能力：local-preview.ts:226-265 已分类文本、图片、HTML、PDF；app/chat/right-rail/preview-file.tsx 提供现有文件阅读、二进制/大小处理。不能直接用当前活动连接去读旧详情的远程路径：desktop-fs.ts:45-88 当前依赖活动连接，需补固定来源读取并跨连接验证。没有确认操作系统默认程序打开的完整可复用安全链路，因此建议先安全只读预览，不自动执行未知附件。

2. 发表区：drawer.tsx:1136-1146 的 FeedTabs 位于主栏滚动内容中；CommentComposer 放在评论之后（同文件 FeedTabs），textarea 原已有 max-h-40。原生模拟长讨论测量发表框 y=4912.875，远超900高窗口。拟移动发表区至滚动区外的布局行，不用覆盖内容的 absolute/fixed 浮层。窄屏现有 kanban.css:49-64 改成一个整体滚动区，发表区也必须移到其外。保持编辑器最大高度，内容区域自动让位；底部附件/末楼均能滚到发表区上方。

3. 折叠：comment-thread.tsx:82-83 将 selected 强制等同展开，108 行选中时直接不渲染折叠；107 行对包含块级 Markdown 的父层使用 line-clamp-3。原生测量展开前后高度均520（before display flow-root / clamp3，after block / none）。状态确实更新，不是点击无响应；可见裁剪没有生效。拟复用 DescriptionSection 的 max-height+overflow-hidden 裁剪思路，选择与展开分离，单条按钮始终可用。不截断保存的正文或历史上下文。

4. 边界：现有 li 仅左边线和 gap-3，头部楼层 id 小而灰。拟单条头部把 #id 提升为明显索引、作者/类型/时间分层；以单条顶部细线和间距分隔，不新增卡中卡或大说明区。选中保留主题强调色，定位态与选中态区分。

5. 跳转：当前只有筛选/排序/清空，没有指定楼层入口。原有 data-comment-id 和后端 comment.id 能复用。拟用原有 ID，不给显示顺序重新编号；排序不改上下文选择；筛选隐藏已选评论仍按旧行为清空。隐藏跳转目标必须让用户选择显示全部或取消，不静默改筛选；折叠目标显式展开、滚动到主内容可见位置并聚焦，但不改变上下文选中。

6. 分配处理人：AssigneeMenu 已存在 drawer.tsx:302-342，但放在1207起的“当前任务属性”默认折叠区。历史右栏显示的处理人是只读快照，容易误认不可改。原生探测按 builder 按钮文字未找到，不足以证明接口坏；源码已确认入口存在。拟把“当前处理人”升到可见位置，保留历史处理人。api.ts:462-463 的重新分配默认 reclaim_first=true；后端 plugin_api.py:1022-1039 确实支持先回收运行。必须明确确认停止正在处理的任务。尚待用户确认：要求是改当前负责人供下一次合法调度，还是不停止当前人、单独预约下一阶段？后者需要新状态/规则，不可偷换成现有接口。

7. 风扇/耗电：用户已纠正触发为打开 Kanban，而非任意前台操作。代码已确认 kanban.css:7-45 的自定义角度驱动 conic-gradient 无限动画；board.tsx 使用 kanban-arc，RunClock 5秒刷新；board/plugin 常规轮询60秒，drawer详情30秒、运行日志3秒，api事件帧会使看板/计数/任务缓存失效。以上都是候选工作负载，不是认定的根因。本机 ps 累计 %CPU 一次见503%，不能当即时读数。5秒 /proc 只读采样两进程分别3.4%与0.8%（一核百分比）；未核实当时页面路由，不能推断 Mac 风扇行为。

隔离30卡、5秒/阶段、Linux headless Chrome、沿用当前 CSS：animation TaskDuration 0.276057s / RecalcStyleDuration 0.254990s；关闭动画后 0.005073s / 0.000183s，ScriptDuration均0。详见 performance-ab.json 与 visual/verify.mjs。单次非随机顺序，未涵盖 GPU/温度、电源或整应用；仅支持把边框动画列为优先验证候选。建议第七项先批准准确环境下的看板关/开、0/1/30运行卡、静止/活动、详情开/关对照与CPU/样式/绘制/请求计数采样；若动画影响被重复确认，再改成静态运行强调，保留状态和心跳；若不成立，转查重复订阅、事件风暴、轮询和其他绘制，不假装已修复。

## 完整页面与当前行为证据

native/main.tsx 实际导入基线 TaskDrawer、原有 Markdown、I18n、CSS；仅用模拟任务/8条长文注入只读 transport，写请求明确拒绝。native/results.json、current-wide.png/current-selected.png/current-narrow.png 是此前同卡隔离调查留下的可恢复材料，不是安装端截图。源码基线重新核对仍相同；没有将其认作最新真实业务卡。

本次基于完整源码核对描述、右栏、交接材料、全部附件、四个 FeedTabs 与发表区；首屏截图不代表发表区缺失，量测证明其远在滚动末尾。交互稿独立 HTML 不替代原生产品验证，所有内容标明模拟。交互稿宽/窄主题及末尾截图在 visual/；自动检查20项均通过，完整结果 visual/results.json。PDF稿只标示现有阅读器位置；并未创建真实PDF或声明真实PDF已成功预览。

## 现成方案与外部核查

直接使用现有保存入口/藏起来的处理人菜单不能覆盖用户需求；只改设置不能修复 DOM 裁剪和滚动位置；扩展当前预览与控件比另造通用附件系统成本低，也无新增依赖或核心工具。外部任务管理平台需要数据迁移/新权限/新工作流，不能以低成本修复现有详情，因此不采用。没有调查全市场，不宣称无人做过。

原始资料读取于本次调查：
- https://developer.mozilla.org/en-US/docs/Web/CSS/line-clamp ：前缀裁剪依赖 display:-webkit-box/-webkit-inline-box 与 vertical box-orient；本机 urllib成功HTTP200并取得说明。这帮助解释布局敏感性；嵌套Markdown实际高度以原生测量为准。
- https://www.electronjs.org/docs/latest/tutorial/performance ：强调先量测、Chrome Developer Tools/Tracing分析，不凭猜测优化。urllib HTTP200取得原文。
web_extract两站均误判私有地址，改用urllib读取；没有伪造工具结果。只调查相关原始机制，不需要采购/外部写操作。

## 未验证与恢复

未验证真实Mac/Windows、已安装客户端版本、实际生产打开/保存取消失败、固定来源的预览新链路、真正PDF/大文件、权限拒绝、真实重新分配、整应用风扇根因。实现阶段必须补真实API到UI与下载/预览路径，不可用这份稿当验收。

没有产品代码变更、迁移、生产写入或服务重启。本次新增文件仅在独立change路径，原审批/原change/另一个工作树不动。没有遗留验证服务器（当前端口43311无监听）；headless Chrome由探测脚本关闭。Vite缓存是前次同卡临时编译产物，不纳入审批包，不清理旧工作树/分支/备份。设计稿脚本下载的是明确的模拟资料，PDF/ZIP保存为.模拟.txt，不冒充真实文件。

## 第二版：最新用户反馈与能力核查

来源：本卡desktop最新用户评论（2026-10-11 11:39，时间来自看板记录），原文为“把当前处理人放到现在已有的状态切换下拉combox前（详情页左上方），不放到右侧栏”“跳转采用float toc，在右侧渲染，鼠标悬浮时要有动画”“评论当前不支持直接粘贴图片”。这确认布局方向，并增加图片粘贴问题；没有明确同意停止正在处理的人，也没有整稿、实现或部署批准。

已核查原始事实：
- drawer.tsx:353-430 CommentComposer只维护字符串body，Textarea无onPaste，只有文字非空才可发送；submit/requeue在请求完成前清空草稿。这支持缺少图片粘贴的报告，并指出失败保留草稿需要真实请求确认。
- 聊天composer/index.tsx:579-619使用extractClipboardImageBlobs；text-utils.ts:87-153已有items/files去重与图片提取。group-chat-view.tsx:712-722也有局部粘贴处理。直接复用提取能力，但不搬聊天会话上传/消息生命周期到看板。
- drawer.tsx:549-605已有文件选择上传；970-979 uploadMut调用api.ts:467-468上传，plugins/kanban/dashboard/plugin_api.py:459-490确实存文件并返回attachment（含ID），限制25MB。上传现在不与评论关联。
- api.ts:459-460只提交author/body；plugin_api.py:785-798支持可选context，但hermes_cli/kanban_comment_context.py:20-22只允许kind=handoff。普通图片评论不能用该快照，否则会改变历史上下文含义。待批最小方案为正文内同卡附件ID引用、仅看板渲染器识别；不新增数据库字段、不修改普通评论资格判定。
- TaskMarkdown在drawer.tsx:187-195明确media=false，避免把非会话路径解析到活动连接；新增图片查看必须在任务内来源固定后读取，不开启全局MEDIA解析。
- 有针对性搜索desktop源码的FloatingToc/FloatingTOC/TableOfContents未发现现成同名目录组件；这不是全仓库/全市场不存在证明。现成Popover/Button可复用，做此详情专用的薄目录即可，不需要通用导航框架或新依赖。

现成方案对比：仅使用右栏上传按钮能存图但不能在评论草稿粘贴/移除/关联楼层；设置调整无法接入缺失事件。扩展既有图片提取+附件上传+任务内预览足够覆盖缺口，成本低于移植整个聊天编辑器或新建图片服务。没有采购、外部写入或新产品价值实验需要。

外部原始资料：本轮web_extract依旧提示私有地址，改urllib访问MDN ClipboardEvent.clipboardData和官方Kanban文档，均HTTP200。MDN说明paste事件经DataTransfer访问剪贴板内容；官方文档核对看板评论/附件既有能力，不据文档未提粘贴就推断全产品不支持。资料地址：https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData 、https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban 。真正缺口依据上述当前源码，不用网页推测代替。

第二版交互稿visual/interaction-v2.html，保留visual/interaction.html与第一版截图/检查结果。验证脚本visual/verify-v2.mjs使用真实Chrome控件点击、悬停、键盘与布局量测，但数据、发表、上传均为明确模拟；图片通过合成ClipboardEvent+FileReader进入，并非OS剪贴板实测。包括有限动画/减少动态效果、过滤目标恢复、取消/确认分配、失败保留图片、成功模拟楼层图像、移除、390px窄屏加高编辑器与目标头部可见。结果在visual/v2-results.json，最新版以该结果为准。初次验证暴露了错误稿路径，以及目录关闭后输入不可操作的状态同步问题，修订后重新运行；不引用失败轮或上一稿通过数作为最终验证。

新未验证项：真实系统截图粘贴，实际上传/评论引用解析/认证预览链路，上传部分成功与超时后的原来源核对，空讨论目录与低高度窗口，巨大目录与大图，实际触屏，Mac/Windows平台。这些已写入待批场景或后续验收，不能将设计稿演示说成已实现。性能调查证据本轮不重跑、不改写，仍未核实用户准确客户端/后端版本或风扇因果。

本轮git HEAD仍6f515c4fc80e279f3078a90656eac21f53d5c57b；git diff --exit-code通过，只有本change目录未跟踪。没有产品提交、数据库测试或真实卡片评论探测写入；卡片只有本任务正式交接/附件操作。测试以file://打开设计稿，无临时服务，正常结尾browser.close。旧Mac工作树不修改。任务清单仍缺失，等待分配语义决定，不因本次布局指示越过规划审批。

最终第二版结果：36项通过、0运行错误，OpenSpec严格校验通过。打包附卡阶段短暂启动仅绑定loopback的文件服务器，下载健康检查200，但kanban_attach_url安全检查拒绝本地URL；未放宽检查或公开材料。尝试从terminal直接调用同一附件handler也被worker身份保护拒绝，未改变身份/绕过该保护。改以正常kanban_attach传入设计稿ZIP字节成功，附件12 kanban-interaction-demo-v2.zip，8881字节；读回附件后ZIP CRC通过，解压HTML逐字节等于本地第二版稿，ZIP SHA256=9838944bcac47b29767fc6528be5d22da6b253cc37e3fd8643255580cf9491b5。完整材料包保留本地visual/interaction-preview-v2.zip，不声称已作为完整包附卡。文件服务器通过process_manage停止并用端口检查确认；只读进程核对未见本轮Playwright Chrome残留，其他项目Chrome未动。

## 第三版：参考图与讨论侧边目录

原始来源：本卡desktop用户12:01评论，“浮动目录参考 … 改为放到讨论区的左侧或者右侧（如果左侧有讨论的楼层展示视觉效果冲突就放右侧，否则放左侧）”。读取原图 /home/capz/图片/2026-10-11_11-57.png、2026-10-11_11-58.png、2026-10-11_11-59.png。前两图呈现讨论侧边的短横线轨道、当前项长亮线和悬停原文摘要，第三图标出本任务稿讨论左缘的意向位置；截图本身不能证明动画时长。此次指示授权修订目录规划，不是分配语义、整稿或实现批准。

第三版 visual/interaction-v3.html 保留第二版所有待批操作，仅替换目录。缩起为短横线，讨论左侧独立窄间距，与内容左侧选中线分开；hover显示对应编号/作者/两行原文摘要和可滚动列表。滚动更新当前阅读标记，不改上下文选择；非评论页签及窄屏滚到属性区时隐藏，回讨论恢复。目录高亮不是用户决定或历史阶段。

用现有模拟稿复用悬停/键盘、稳定ID、隐藏目标确认、Popover式展开，不新建产品组件/第三方库。产品仍应复用现有Button/Popover，而不是复制整页HTML。方案/设计/详情规格已依照本次明确用户修订同步；附件和分配规格未变。更新技能通过skill_view不可发现hermes-kanban-workflow，后从已知默认技能目录只读找到并完整读取；未改技能或配置。

检查 visual/verify-v3.mjs 使用本机真实headless Chrome、file://、隔离模拟数据，无服务器、无业务数据库。新增目录与楼层横向分离、当前标记随滚动、非讨论隐藏、390px菜单边界、600px低窗口不压编辑器等实际尺寸检查。早轮发现面板在编辑器增高后覆盖发表区，修正为根据讨论可见边界限制展开高度/位置；早轮键盘试图聚焦已隐藏目录及低窗口尚未滚入讨论的测试不符合真实主路径，调整为先进入讨论再操作。最终结果以 v3-results.json 为准，不沿用早轮失败/第二版结果。完整检查计数及哈希在 evidence/v3-manifest.json。

人工检查 v3-reference-hover.png 确认短横线和摘要在讨论左侧，原框架/右栏/页签/页头未换。宽屏轨道右缘与楼层左缘有17px净距，390px有15px净距（以最终结果坐标计算）；此次稿未出现左侧视觉冲突，按用户规则默认左侧，不重复询问左右。展开时暂覆讨论局部文本，关闭后恢复；不盖发表区。新稿不把三图当产品现场截图，不声称已安装客户端改动。

保留全部此前调查和平台限制。未验证实际触屏、系统剪贴板、Mac/Windows、真实上传/分配/跨来源预览、PDF、空讨论/巨大目录和极小高度；实际风扇因果、客户端/后端安装版本仍未知。未执行产品测试或改源码；只本change未跟踪，git diff --exit-code通过，HEAD仍6f515c4fc80e279f3078a90656eac21f53d5c57b。tasks.md仍等待分配行为决定，未推进实现。没有服务重启、push、合并、同步归档、备份清理；Chrome正常关闭。

最终第三版48项通过，0脚本错误，OpenSpec严格校验通过。第一次附件调用因base64长度错误被拒绝，未生成附件；以正常kanban_attach重传ZIP LZMA包成功为附件13，9211字节，读回CRC/HTML/ZIP逐字节一致。SHA256=936032ba4a3a4eff3f76acef7c933adce02067e5c30c0bec78df2c704a374315。该方法要求支持ZIP LZMA的解压器，未实测Mac默认解压器，不声称通用默认解压兼容；本机直接HTML与标准Deflate完整材料包为替代入口。此轮没有绕过附件工具身份保护、没有服务器或公开上传。
