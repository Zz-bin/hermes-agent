import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hermes/plugin-sdk'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { isHandoff, visibleComments } from './comment-context'
import { discussionScroller } from './discussion-scroll'
import { FloorDirectory } from './floor-directory'
import { TextDisclosure } from './text-disclosure'
import { textPreview } from './text-preview'
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
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const authors = [...new Set(comments.map(comment => comment.author))].sort()

  const shown = useMemo(
    () => visibleComments(comments, selection.author, selection.order),
    [comments, selection.author, selection.order]
  )

  const [visibleBodies, setVisibleBodies] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    let observer: IntersectionObserver

    const observe = () => {
      observer?.disconnect()
      observer = new IntersectionObserver(
        entries => {
          const entered = entries.filter(entry => entry.isIntersecting)

          if (!entered.length) {
            return
          }

          for (const entry of entered) {
            observer.unobserve(entry.target)
          }

          setVisibleBodies(previous => {
            const next = new Set(previous)

            for (const entry of entered) {
              next.add((entry.target as HTMLElement).dataset.commentId!)
            }

            return next.size === previous.size ? previous : next
          })
        },
        { root: list.current ? discussionScroller(list.current) : null, rootMargin: '300px 0px' }
      )

      for (const element of list.current?.querySelectorAll<HTMLElement>('[data-comment-id]') ?? []) {
        observer.observe(element)
      }
    }

    observe()
    window.addEventListener('resize', observe)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', observe)
    }
  }, [shown])

  const locate = (id: string) => {
    setExpanded(previous => new Set([...previous, id]))
    setHighlighted(id)
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
      scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8
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
      </div>
      <div className="kanban-discussion relative flex min-w-0 gap-3">
        <FloorDirectory
          comments={comments}
          k={k}
          list={list}
          onLocate={locate}
          onShowAll={() => onChange({ ...selection, author: '' })}
          selection={selection}
        />
        <ul className="flex min-w-0 flex-1 flex-col gap-5" ref={list}>
          {!shown.length && <li className="text-[0.75rem] text-(--ui-text-tertiary)">{k.noComments}</li>}
          {shown.map((comment, index) => {
            const id = String(comment.id)
            const selected = id === selection.selected
            const long = comment.body.length > 360 || comment.body.split('\n').length > 6
            const open = !long || expanded.has(id)

            // Keep initial reading immediate; defer the rest until it approaches the scroller.
            const render =
              index < 2 || expanded.has(id) || visibleBodies.has(id) || typeof IntersectionObserver === 'undefined'

            return (
              <li
                className="kanban-floor flex min-w-0 flex-col items-start gap-2 border-l-2 border-t border-t-(--ui-stroke-tertiary) pt-3 pl-3"
                data-comment-id={id}
                data-highlighted={highlighted === id || undefined}
                key={id}
                onClick={() => setHighlighted(id)}
                onFocus={() => setHighlighted(id)}
                tabIndex={-1}
              >
                <Button
                  aria-label={`${k.selectComment} #${id} ${comment.author}`}
                  aria-pressed={selected}
                  className="flex w-full flex-wrap items-center justify-start gap-2 text-left text-[0.75rem]"
                  onClick={() => onChange({ ...selection, selected: selected ? null : id })}
                  size="inline"
                  variant="text"
                >
                  <span className="font-mono font-semibold text-(--ui-text-secondary)">#{id}</span>
                  <span className="font-medium text-(--ui-text-secondary)">{comment.author}</span>
                  <Badge size="xs" variant="muted">
                    {isHandoff(comment) ? k.handoff : k.discussion}
                  </Badge>
                  <span className="text-[0.625rem] text-(--ui-text-quaternary)">{ago(comment.created_at)}</span>
                </Button>
                <div
                  className={`w-full break-words [&_.aui-md>:first-child]:mt-0 [&_.aui-md>:last-child]:mb-0 ${open ? '' : 'max-h-[4.5rem] overflow-hidden'}`}
                  inert={!open || undefined}
                >
                  {render ? (
                    renderBody(open ? comment.body : textPreview(comment.body))
                  ) : (
                    <div aria-hidden="true" className="h-[4.5rem]" />
                  )}
                </div>
                {long && (
                  <TextDisclosure
                    expanded={open}
                    k={k}
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
                  />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
