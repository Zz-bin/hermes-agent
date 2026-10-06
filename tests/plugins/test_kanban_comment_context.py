"""Real SQLite, API, CLI and tool paths for versioned comment handoffs."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_cli import kanban_db as kb
from hermes_cli import kanban_db_connect as kbc


@pytest.fixture
def board(tmp_path, monkeypatch):
    home = tmp_path / ".hermes"
    home.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(home))
    monkeypatch.setenv("HERMES_KANBAN_DB", str(home / "kanban.db"))
    monkeypatch.delenv("HERMES_KANBAN_BOARD", raising=False)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    kb.init_db()
    with kbc.connect_closing() as conn:
        tid = kb.create_task(conn, title="Context test", assignee="builder", workspace_kind="dir", workspace_path=str(tmp_path))
        aid = kb.store_attachment_bytes(conn, tid, "design.txt", b"test material", uploaded_by="builder")
    return tid, aid


def test_snapshot_survives_current_task_change(board):
    tid, aid = board
    with kbc.connect_closing() as conn:
        before = kb.get_task(conn, tid)
        cid = kb.add_comment(conn, tid, "builder", "formal", context={"kind": "handoff", "phase": "review", "attachment_ids": [aid, aid], "material_paths": ["/exact/design.md", "/exact/design.md"], "verification": "15 tests passed", "approval_scope": "Implementation only; no deployment"})
        assert kb.assign_task(conn, tid, "reviewer")
        comment = kb.list_comments(conn, tid)[-1]
        assert comment.context["assignee"] == before.assignee
        assert comment.context["status"] == before.status
        assert comment.context["workspace_path"] == before.workspace_path
        assert comment.context["attachment_ids"] == [aid]
        assert comment.context["material_paths"] == ["/exact/design.md"]
        assert comment.context["verification"] == "15 tests passed"
        assert comment.context["approval_scope"] == "Implementation only; no deployment"
        assert kb.list_comments_after(conn, tid, after_id=cid - 1)[0].context == comment.context


def test_declared_header_and_discussion(board):
    tid, _ = board
    with kbc.connect_closing() as conn:
        kb.add_comment(conn, tid, "builder", "【请求批准｜规划】builder → 用户：范围与材料见正文")
        kb.add_comment(conn, tid, "user", "【用户决定｜执行方式】继续")
        formal, discussion = kb.list_comments(conn, tid)
        assert formal.context["phase"] == "规划"
        assert discussion.context is None


@pytest.mark.parametrize("context", [[], {"kind": "discussion"}, {"kind": "handoff", "assignee": "forged"}, {"kind": "handoff", "attachment_ids": [True]}, {"kind": "handoff", "attachment_ids": [999999]}, {"kind": "handoff", "phase": 1}, {"kind": "handoff", "material_paths": [1]}, {"kind": "handoff", "material_paths": [" "]}, {"kind": "handoff", "verification": []}, {"kind": "handoff", "approval_scope": "x" * 10001}])
def test_invalid_context_rolls_back_comment_and_event(board, context):
    tid, _ = board
    with kbc.connect_closing() as conn:
        events = len(kb.list_events(conn, tid))
        with pytest.raises(ValueError):
            kb.add_comment(conn, tid, "builder", "invalid", context=context)
        assert kb.list_comments(conn, tid) == []
        assert len(kb.list_events(conn, tid)) == events


def test_cross_task_attachment_rejected(board):
    tid, aid = board
    with kbc.connect_closing() as conn:
        other = kb.create_task(conn, title="Other")
        with pytest.raises(ValueError, match="does not belong"):
            kb.add_comment(conn, other, "builder", "cross-task", context={"kind": "handoff", "attachment_ids": [aid]})
        assert kb.list_comments(conn, other) == []


def test_legacy_migration_preserves_missing_history(board):
    tid, _ = board
    with kbc.connect_closing() as conn:
        conn.execute("INSERT INTO task_comments(task_id,author,body,created_at) VALUES(?,?,?,?)", (tid, "builder", "【规划完成｜规划】old", 1))
        conn.execute("ALTER TABLE task_comments DROP COLUMN context")
        kbc._migrate_add_optional_columns(conn)
        kbc._migrate_add_optional_columns(conn)
        old = kb.list_comments(conn, tid)[0]
        assert old.body == "【规划完成｜规划】old"
        assert old.context is None
        row = conn.execute("SELECT id,task_id,author,body,created_at FROM task_comments").fetchone()
        assert kb.Comment.from_row(row).context is None


def test_cli_context_roundtrip(board):
    from hermes_cli.kanban import kanban_command
    tid, aid = board
    args = argparse.Namespace(kanban_action="comment", board=None, task_id=tid, text=["CLI material"], author="builder", max_len=None, context=json.dumps({"kind": "handoff", "attachment_ids": [aid]}))
    assert kanban_command(args) == 0
    with kbc.connect_closing() as conn:
        assert kb.list_comments(conn, tid)[0].context["attachment_ids"] == [aid]
    args.context = "invalid JSON"
    assert kanban_command(args) == 2


def test_tool_registry_context_roundtrip(board):
    import tools.kanban_tools  # real registration
    from tools.registry import registry
    tid, aid = board
    result = json.loads(registry.dispatch("kanban_comment", {"task_id": tid, "body": "tool material", "context": {"kind": "handoff", "attachment_ids": [aid]}}))
    assert result["ok"] is True
    with kbc.connect_closing() as conn:
        assert kb.list_comments(conn, tid)[0].context["attachment_ids"] == [aid]
    result = json.loads(registry.dispatch("kanban_comment", {"task_id": tid, "body": "【返工要求｜实现审查】reviewer → builder：仅修正识别，不含部署"}))
    assert result["ok"] is True
    with kbc.connect_closing() as conn:
        comment = kb.list_comments(conn, tid)[-1]
        assert comment.context is not None
        assert comment.context["phase"] == "实现审查"
        assert comment.context["assignee"] == "builder"
        assert comment.context["approval_scope"] is None


def test_api_context_roundtrip_and_rejection(board):
    tid, aid = board
    path = Path(__file__).resolve().parents[2] / "plugins/kanban/dashboard/plugin_api.py"
    spec = importlib.util.spec_from_file_location("kanban_context_api_test", path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    app = FastAPI()
    app.include_router(mod.router)
    with TestClient(app) as api:
        url = f"/tasks/{tid}/comments"
        assert api.post(url, json={"body": "API handoff", "context": {"kind": "handoff", "attachment_ids": [aid]}}).status_code == 200
        assert api.post(url, json={"body": "forged", "context": {"kind": "handoff", "assignee": "fake"}}).status_code == 400
        detail = api.get(f"/tasks/{tid}").json()
        assert detail["comments"][0]["context"]["attachment_ids"] == [aid]
        assert len(detail["comments"]) == 1
        headers = ["请求批准", "交付审查", "审查结论", "返工要求", "阻塞求决", "收尾交付", "实现完成", "审查通过", "退回修改", "需要输入", "规划完成", "请求审查"]
        for header in headers:
            body = f"【{header}｜实现审查】reviewer → 用户：隔离测试，不授权部署"
            with kbc.connect_closing() as conn:
                old_id = conn.execute("INSERT INTO task_comments(task_id,author,body,created_at) VALUES(?,?,?,?)", (tid, "reviewer", body, 1)).lastrowid
            for explicit in (False, True):
                payload: dict = {"body": body}
                if explicit:
                    payload["context"] = {"kind": "handoff", "phase": "明确阶段", "attachment_ids": [aid]}
                assert api.post(url, json=payload).status_code == 200
                comments = api.get(f"/tasks/{tid}").json()["comments"]
                assert next(c for c in comments if c["id"] == old_id)["context"] is None
                new = comments[-1]["context"]
                assert new is not None
                assert new["phase"] == ("明确阶段" if explicit else "实现审查")
                assert new["attachment_ids"] == ([aid] if explicit else [])
                assert new["assignee"] == "builder"
                assert new["approval_scope"] is None
        for body in ["普通讨论", "【用户决定｜实现审查】继续", "【心跳｜实现审查】工作中", "【失败摘要｜实现审查】退出", "正文提及【审查结论｜实现审查】不是声明"]:
            assert api.post(url, json={"body": body}).status_code == 200
            assert api.get(f"/tasks/{tid}").json()["comments"][-1]["context"] is None
