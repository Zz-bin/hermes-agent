import type { KanbanComment, KanbanCommentContext } from './types'

const formalHeader =
  /^【(请求批准|交付审查|审查结论|返工要求|阻塞求决|收尾交付|实现完成|审查通过|退回修改|需要输入|规划完成|请求审查)[｜|]([^】]+)】/

export function handoffContext(comment: KanbanComment): KanbanCommentContext | null {
  const context = comment.context

  if (
    context?.version !== 1 ||
    context.kind !== 'handoff' ||
    !Array.isArray(context.attachment_ids) ||
    !context.attachment_ids.every(id => Number.isSafeInteger(id) && id > 0)
  ) {
    return null
  }

  if (
    context.material_paths !== undefined &&
    (!Array.isArray(context.material_paths) || !context.material_paths.every(path => typeof path === 'string'))
  ) {
    return null
  }

  if (
    [
      context.phase,
      context.assignee,
      context.workspace_path,
      context.verification ?? null,
      context.approval_scope ?? null
    ].some(value => value !== null && typeof value !== 'string') ||
    typeof context.status !== 'string' ||
    typeof context.workspace_kind !== 'string'
  ) {
    return null
  }

  return context
}

export function isHandoff(comment: KanbanComment): boolean {
  // Unknown future versions are not interpreted as version 1 snapshots.
  return !!handoffContext(comment) || formalHeader.test(comment.body.trimStart())
}

export function visibleComments(
  comments: KanbanComment[],
  author: string,
  order: 'newest' | 'oldest'
): KanbanComment[] {
  return comments
    .filter(comment => !author || comment.author === author)
    .sort((a, b) => {
      const delta =
        a.created_at - b.created_at || String(a.id).localeCompare(String(b.id), undefined, { numeric: true })

      return order === 'newest' ? -delta : delta
    })
}

export function resolveCommentContext(
  comments: KanbanComment[],
  selected: null | string,
  author: string
): KanbanComment | null {
  const explicit =
    selected === null
      ? null
      : comments.find(comment => String(comment.id) === selected && (!author || comment.author === author))

  return explicit ?? visibleComments(comments, '', 'newest').find(isHandoff) ?? null
}
