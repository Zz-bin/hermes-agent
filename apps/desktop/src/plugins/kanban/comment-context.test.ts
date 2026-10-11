import { describe, expect, it } from 'vitest'

import {
  commentAttachments,
  handoffContext,
  isHandoff,
  resolveCommentContext,
  visibleComments
} from './comment-context'
import type { KanbanComment, KanbanHandoffContext } from './types'

const snapshot: KanbanHandoffContext = {
  version: 1,
  kind: 'handoff',
  assignee: 'builder',
  phase: 'review',
  status: 'running',
  workspace_kind: 'dir',
  workspace_path: '/worktree',
  attachment_ids: [1]
}

const comments: KanbanComment[] = [
  { id: 1, author: 'builder', created_at: 10, body: 'old formal', context: snapshot },
  { id: 2, author: 'reviewer', created_at: 20, body: '【审查通过｜审查】legacy' },
  { id: 3, author: 'user', created_at: 30, body: 'discussion after review' }
]

describe('comment context', () => {
  it('merges declared materials with sent images without duplicates or unrelated attachments', () => {
    const attachments = [
      { id: 1, filename: 'first.png', content_type: 'image/png' },
      { id: 2, filename: 'second.png', content_type: 'image/png' },
      { id: 4, filename: 'report.pdf', content_type: 'application/pdf' },
      { id: 5, filename: 'other.png', content_type: 'image/png' }
    ]

    const comment = {
      ...comments[0],
      body: '![first](kanban-attachment:1) ![second](kanban-attachment:2) ![repeat](kanban-attachment:2) ![missing](kanban-attachment:3) ![not-image](kanban-attachment:4)'
    }

    expect(commentAttachments(comment, attachments)).toEqual(attachments.slice(0, 2))
    expect(commentAttachments({ ...comment, context: undefined }, attachments)).toEqual(attachments.slice(0, 2))
    expect(commentAttachments({ ...comment, context: { ...snapshot, attachment_ids: [4] } }, attachments)).toEqual(
      attachments.slice(0, 3)
    )
    expect(
      commentAttachments(
        { ...comment, body: '', context: { version: 1, kind: 'materials', attachment_ids: [2] } },
        attachments
      )
    ).toEqual([attachments[1]])
  })
  it('recognizes contract handoffs and aliases without inventing legacy snapshots or approval', () => {
    const headers = [
      '请求批准',
      '交付审查',
      '审查结论',
      '返工要求',
      '阻塞求决',
      '收尾交付',
      '实现完成',
      '审查通过',
      '退回修改',
      '需要输入',
      '规划完成',
      '请求审查'
    ]

    for (const header of headers) {
      const legacy = { id: 9, author: 'reviewer', created_at: 20, body: `【${header}｜实现审查】仅交接，不授权部署` }
      const captured = { ...legacy, id: 10, context: snapshot }
      expect(isHandoff(legacy)).toBe(true)
      expect(handoffContext(legacy)).toBeNull()
      expect(resolveCommentContext([...comments, legacy], '9', '')?.id).toBe(9)
      expect(resolveCommentContext([...comments, captured, legacy], '10', '')?.id).toBe(10)
      expect(handoffContext(captured)?.approval_scope).toBeUndefined()
    }

    for (const body of [
      '普通讨论',
      '【用户决定｜审查】继续',
      '【心跳｜审查】工作中',
      '【失败摘要｜审查】退出',
      '提及【审查结论｜审查】不是声明'
    ]) {
      expect(isHandoff({ ...comments[2], body })).toBe(false)
    }
  })
  it('defaults to the latest comment, including discussion', () => {
    expect(resolveCommentContext(comments, null, '')?.id).toBe(3)
    expect(isHandoff(comments[2])).toBe(false)
  })
  it('explicit discussion has no invented history', () => {
    const chosen = resolveCommentContext(comments, '3', '')!
    expect(chosen.id).toBe(3)
    expect(handoffContext(chosen)).toBeNull()
  })
  it('clearing selection restores default and hiding it does too', () => {
    expect(resolveCommentContext(comments, '1', '')?.id).toBe(1)
    expect(resolveCommentContext(comments, null, '')?.id).toBe(3)
    expect(resolveCommentContext(comments, '1', 'reviewer')?.id).toBe(3)
  })
  it('sorting never mutates data or changes context selection', () => {
    expect(visibleComments(comments, '', 'newest').map(c => c.id)).toEqual([3, 2, 1])
    expect(visibleComments(comments, '', 'oldest').map(c => c.id)).toEqual([1, 2, 3])
    expect(comments.map(c => c.id)).toEqual([1, 2, 3])
    expect(resolveCommentContext(comments, '1', '')?.context).toEqual(snapshot)
  })
  it('uses numeric ids to break same-second ties', () => {
    const tied = [comments[0], { ...comments[0], id: 10 }]
    expect(visibleComments(tied, '', 'newest')[0].id).toBe(10)
  })
  it('handles empty cards and cards with only discussion', () => {
    expect(resolveCommentContext([], null, '')).toBeNull()
    expect(resolveCommentContext([comments[2]], null, '')).toBe(comments[2])
  })
  it('legacy headers identify handoffs without backfilling their snapshots', () => {
    expect(isHandoff(comments[1])).toBe(true)
    expect(handoffContext(comments[1])).toBeNull()
  })
  it('unknown and malformed payloads degrade without crashing', () => {
    for (const context of [
      { ...snapshot, version: 2 },
      { version: 1, kind: 'handoff' },
      { ...snapshot, attachment_ids: [true] },
      { ...snapshot, material_paths: 1 }
    ]) {
      expect(handoffContext({ ...comments[0], context: context as KanbanHandoffContext })).toBeNull()
    }
  })
})
