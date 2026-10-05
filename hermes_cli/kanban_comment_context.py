"""Versioned, server-captured comment handoffs; no historical backfilling."""
from __future__ import annotations

import re

FORMAL_HEADER = re.compile(
    r"^【(请求批准|交付审查|审查结论|返工要求|阻塞求决|收尾交付|实现完成|审查通过|退回修改|需要输入|规划完成|请求审查)[｜|]([^】]+)】"
)


def capture_context(conn, task, body: str, context=None):
    """Accept declaration fields only; snapshot fields are never caller supplied."""
    header = FORMAL_HEADER.match(body.lstrip())
    if context is None:
        if not header:
            return None
        context = {"kind": "handoff", "phase": header.group(2).strip()}
    if not isinstance(context, dict):
        raise ValueError("comment context must be an object")
    if set(context) - {"kind", "phase", "attachment_ids", "material_paths", "verification", "approval_scope"}:
        raise ValueError("unknown comment context fields; snapshots are server-captured")
    if context.get("kind") != "handoff":
        raise ValueError("comment context.kind must be handoff")
    phase = context.get("phase")
    if phase is not None and (not isinstance(phase, str) or len(phase) > 120):
        raise ValueError("context.phase must be a string of at most 120 characters")
    declared = {key: context.get(key) for key in ("verification", "approval_scope")}
    if any(value is not None and (not isinstance(value, str) or len(value) > 10000) for value in declared.values()):
        raise ValueError("verification and approval_scope must be strings of at most 10000 characters")
    paths = context.get("material_paths", [])
    if not isinstance(paths, list) or len(paths) > 100 or any(not isinstance(p, str) or not p.strip() or len(p) > 2048 for p in paths):
        raise ValueError("context.material_paths must contain at most 100 non-empty path strings")
    paths = list(dict.fromkeys(paths))
    ids = context.get("attachment_ids", [])
    if not isinstance(ids, list) or len(ids) > 100 or any(type(i) is not int or i < 1 for i in ids):
        raise ValueError("context.attachment_ids must contain at most 100 positive integer ids")
    ids = list(dict.fromkeys(ids))
    for aid in ids:
        if not conn.execute("SELECT 1 FROM task_attachments WHERE id=? AND task_id=?", (aid, task.id)).fetchone():
            raise ValueError(f"attachment {aid} does not belong to task {task.id}")
    return {
        "version": 1, "kind": "handoff", "phase": phase,
        "assignee": task.assignee, "status": task.status,
        "workspace_kind": task.workspace_kind, "workspace_path": task.workspace_path,
        "attachment_ids": ids, "material_paths": paths, **declared,
    }
