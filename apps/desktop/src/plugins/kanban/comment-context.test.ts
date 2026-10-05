import { describe, expect, it } from 'vitest'

import { handoffContext, isHandoff, resolveCommentContext, visibleComments } from './comment-context'
import type { KanbanComment, KanbanCommentContext } from './types'

const snapshot: KanbanCommentContext = {
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
  it('defaults to the latest formal handoff, never a later discussion', () => {
    expect(resolveCommentContext(comments, null, '')?.id).toBe(2)
    expect(isHandoff(comments[2])).toBe(false)
  })
  it('explicit discussion has no invented history', () => {
    const chosen = resolveCommentContext(comments, '3', '')!
    expect(chosen.id).toBe(3)
    expect(handoffContext(chosen)).toBeNull()
  })
  it('clearing selection restores default and hiding it does too', () => {
    expect(resolveCommentContext(comments, '1', '')?.id).toBe(1)
    expect(resolveCommentContext(comments, null, '')?.id).toBe(2)
    expect(resolveCommentContext(comments, '1', 'reviewer')?.id).toBe(2)
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
  it('empty and non-handoff cards have no default', () => {
    expect(resolveCommentContext([], null, '')).toBeNull()
    expect(resolveCommentContext([comments[2]], null, '')).toBeNull()
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
      expect(handoffContext({ ...comments[0], context: context as KanbanCommentContext })).toBeNull()
    }
  })
})
