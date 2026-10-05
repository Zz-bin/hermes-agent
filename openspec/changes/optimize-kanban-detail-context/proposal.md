# Proposal

## Why

现有 Kanban 详情页把长描述、无来源的运行摘要和全部评论平铺，审批材料难以定位；评论没有历史上下文，直接用当前属性联动会误导用户。用户已接受 v4，并明确授权当前会话直接开发，正式交接作为默认最新已完成评论，历史缺失不猜测。

## What Changes

- 长描述原文约三行预览、全文展开和完整编辑，保留原详情布局与四页签。
- 评论作者筛选、排序、可访问选择与清空，右栏展示选中交接的只读上下文；默认最近正式交接，排序保持选择，隐藏选择时恢复默认。
- 为新正式交接记录版本化的上下文快照与明确材料关联，经数据库、CLI、工具和 API 持久化；普通讨论不纳入默认交接。
- 旧评论不回填推断字段；摘要标明运行来源，当前卡片属性独立展示。
- 增加隔离数据库/UI 测试、升级兼容说明和可恢复补丁。

## Capabilities

### New Capabilities
- `kanban-comment-context`: 正式交接的持久上下文、材料关联与旧记录兼容。
- `kanban-detail-inspection`: 描述分层、评论选择与右栏上下文浏览。

### Modified Capabilities
无；本项目刚初始化 OpenSpec，无现有规格。

## Impact

涉及 hermes_cli Kanban 数据与 CLI、tools/kanban_tools.py、plugins/kanban/dashboard/plugin_api.py、apps/desktop/src/plugins/kanban 与相关测试。复用原生组件、主题与现有附件存储。桌面插件 SDK 提供独立 pane/route，但现有详情无可覆盖内部选择与描述的公开插槽，故采用独立分支的小范围原生修改，不另造看板或 DOM 注入。运行 main、生产数据库、部署与重启不在授权范围。
