import {
  Badge,
  Button,
  Codicon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hermes/plugin-sdk'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { commentFloors, isHandoff, visibleComments } from './comment-context'
import { useDiscussionPosition } from './discussion-position'
import { discussionScroller } from './discussion-scroll'
import { FloorDirectory } from './floor-directory'
import type { KanbanComment } from './types'
import { ago, type KanbanText } from './ui'

export interface CommentSelection {
  author: string
  order: 'newest' | 'oldest'
  selected: null | string
}

export function CommentThread({
  comments,
  k,
  onChange,
  renderBody,
  selection
}: {
  comments: KanbanComment[]
  k: KanbanText
  onChange: (next: CommentSelection) => void
  renderBody: (body: string) => ReactNode
  selection: CommentSelection
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [located, setLocated] = useState<{ id: string } | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const nav = useRef<HTMLElement>(null)
  const floors = commentFloors(comments)
  const authors = [...new Set(comments.map(comment => comment.author))].sort()
  const shown = visibleComments(comments, selection.author, selection.order)

  const { active, locate: markLocated } = useDiscussionPosition(
    list,
    nav,
    JSON.stringify(shown.map(comment => [comment.id, comment.body]))
  )

  const locate = (id: string) => {
    markLocated(id)
    setExpanded(previous => new Set([...previous, id]))
    setLocated({ id })
  }

  useEffect(() => {
    if (!located) {
      return
    }

    const element = Array.from(list.current?.querySelectorAll<HTMLElement>('[data-comment-id]') ?? []).find(
      item => item.dataset.commentId === located.id
    )

    if (!element) {
      return
    }

    const scroller = discussionScroller(element)

    if (scroller) {
      const bounds = scroller.getBoundingClientRect()
      const floor = element.getBoundingClientRect()
      const inset = Math.min(8, Math.max(0, bounds.height - floor.height))
      scroller.scrollTop += floor.top - bounds.top - inset
    }

    element.focus({ preventScroll: true })
  }, [located])

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[0.75rem]">
        <Select
          onValueChange={value => {
            const author = value === '__all__' ? '' : (JSON.parse(value) as string)

            const selected = comments.some(
              comment => String(comment.id) === selection.selected && (!author || comment.author === author)
            )
              ? selection.selected
              : null

            onChange({ ...selection, author, selected })
          }}
          value={selection.author ? JSON.stringify(selection.author) : '__all__'}
        >
          <SelectTrigger aria-label={k.authorFilter} className="w-auto max-w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{k.allAuthors}</SelectItem>
            {authors.map(author => (
              <SelectItem key={author} value={JSON.stringify(author)}>
                {author}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={order => onChange({ ...selection, order: order as CommentSelection['order'] })}
          value={selection.order}
        >
          <SelectTrigger aria-label={k.commentOrder} className="w-auto max-w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{k.newestFirst}</SelectItem>
            <SelectItem value="oldest">{k.oldestFirst}</SelectItem>
          </SelectContent>
        </Select>
        {selection.selected !== null && (
          <Button onClick={() => onChange({ ...selection, selected: null })} size="xs" variant="ghost">
            {k.clearCommentSelection}
          </Button>
        )}
        {selection.author && <span>{k.shownComments(shown.length, comments.length)}</span>}
      </div>
      <div className="kanban-discussion relative flex min-w-0 gap-3">
        <FloorDirectory active={active} comments={shown} floors={floors} k={k} nav={nav} onLocate={locate} />
        <ul className="flex min-w-0 flex-1 flex-col gap-5" ref={list}>
          {!shown.length && <li className="text-[0.75rem] text-(--ui-text-tertiary)">{k.noComments}</li>}
          {shown.map(comment => {
            const id = String(comment.id)
            const selected = id === selection.selected
            const long = comment.body.length > 360 || comment.body.split('\n').length > 6
            const open = !long || expanded.has(id)

            return (
              <li
                className={`kanban-floor min-w-0 border-l-2 border-t border-t-(--ui-stroke-tertiary) pt-3 pl-3 ${selected ? 'border-l-(--ui-accent)' : 'border-l-(--ui-stroke-tertiary)'}`}
                data-active={active === id || undefined}
                data-comment-id={id}
                data-located={located?.id === id || undefined}
                key={id}
                tabIndex={-1}
              >
                <Button
                  aria-label={`${k.selectComment} #${floors.get(id)} ${comment.author}`}
                  aria-pressed={selected}
                  className="flex w-full flex-wrap items-center justify-start gap-2 text-left text-[0.75rem]"
                  onClick={() => onChange({ ...selection, selected: selected ? null : id })}
                  size="inline"
                  variant="text"
                >
                  <span className="kanban-floor-number font-mono">#{floors.get(id)}</span>
                  <span className="font-medium text-(--ui-text-secondary)">{comment.author}</span>
                  <Badge size="xs" variant="muted">
                    {isHandoff(comment) ? k.handoff : k.discussion}
                  </Badge>
                  <span className="text-[0.625rem] text-(--ui-text-quaternary)">{ago(comment.created_at)}</span>
                </Button>
                <div
                  className={`mt-2 break-words ${open ? '' : 'max-h-[4.5rem] overflow-hidden'}`}
                  inert={!open || undefined}
                >
                  {renderBody(comment.body)}
                </div>
                {long && (
                  <Button
                    aria-expanded={open}
                    className="text-(--ui-accent) hover:text-(--ui-accent)"
                    onClick={() =>
                      setExpanded(previous => {
                        const next = new Set(previous)

                        if (next.has(id)) {
                          next.delete(id)
                        } else {
                          next.add(id)
                        }

                        return next
                      })
                    }
                    size="xs"
                    variant="textStrong"
                  >
                    <Codicon name={open ? 'chevron-up' : 'chevron-down'} />
                    {open ? k.collapseText : k.expandText}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
