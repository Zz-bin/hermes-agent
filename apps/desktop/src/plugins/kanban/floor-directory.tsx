import { Button, ConfirmDialog, Input, Popover, PopoverContent, PopoverTrigger } from '@hermes/plugin-sdk'
import { type RefObject, useEffect, useRef, useState } from 'react'

import { visibleComments } from './comment-context'
import type { CommentSelection } from './comment-thread'
import { discussionScroller } from './discussion-scroll'
import type { KanbanComment } from './types'
import type { KanbanText } from './ui'

interface FloorDirectoryProps {
  comments: KanbanComment[]
  k: KanbanText
  list: RefObject<HTMLUListElement | null>
  selection: CommentSelection
  onShowAll: () => void
  onLocate: (id: string) => void
}

export function FloorDirectory({ comments, k, list, selection, onShowAll, onLocate }: FloorDirectoryProps) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [hidden, setHidden] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [message, setMessage] = useState('')
  const [height, setHeight] = useState(180)
  const [visible, setVisible] = useState(true)
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nav = useRef<HTMLElement>(null)
  const ordered = visibleComments(comments, '', selection.order)
  const preview = ordered.find(comment => String(comment.id) === (hovered ?? current))

  useEffect(() => {
    // Pinning an already-hovered portal does not fire its mount autofocus event again.
    if (pinned && open) {
      input.current?.focus()
    }
  }, [pinned, open])

  useEffect(() => {
    const element = list.current
    const scroller = element ? discussionScroller(element) : null

    if (!element || !scroller) {
      return
    }

    const update = () => {
      const bounds = (discussionScroller(element) ?? scroller).getBoundingClientRect()
      const region = element.getBoundingClientRect()
      const top = nav.current?.getBoundingClientRect().top ?? bounds.top
      setVisible(region.bottom > bounds.top && region.top < bounds.bottom)
      setHeight(Math.max(48, bounds.bottom - Math.max(bounds.top, top) - 8))
      const floors = Array.from(element.querySelectorAll<HTMLElement>('[data-comment-id]'))
      const floor = floors.find(item => item.getBoundingClientRect().bottom > bounds.top + 8)
      setCurrent(floor?.dataset.commentId ?? null)
    }

    update()
    window.addEventListener('scroll', update, { passive: true, capture: true })
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    observer.observe(element)

    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [comments, list, selection.author, selection.order])

  const locate = (id: string) => {
    const target = comments.find(comment => String(comment.id) === id)

    if (!target) {
      setMessage(k.floorMissing)

      return
    }

    if (selection.author && target.author !== selection.author) {
      setHidden(id)

      return
    }

    onLocate(id)
    setOpen(false)
    setPinned(false)
    setMessage(`${k.locatedFloor} #${id}`)
  }

  const enter = () => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current)
    }

    setOpen(true)
  }

  const leave = () => {
    if (!pinned) {
      closeTimer.current = setTimeout(() => setOpen(false), 120)
    }
  }

  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current)
      }
    },
    []
  )

  if (!comments.length) {
    return null
  }

  return (
    <nav
      aria-label={k.floorDirectory}
      className="kanban-floor-directory"
      ref={nav}
      style={{ visibility: visible ? undefined : 'hidden' }}
    >
      <Popover
        onOpenChange={value => {
          setOpen(value)

          if (!value) {
            setPinned(false)
          }
        }}
        open={open && visible}
      >
        <PopoverTrigger asChild>
          <Button
            aria-label={k.floorDirectory}
            onClick={() => {
              setPinned(!pinned)
              setOpen(!pinned)
            }}
            onPointerEnter={enter}
            ref={trigger}
            size="icon-xs"
            variant="ghost"
          >
            <span aria-hidden="true">≡</span>
          </Button>
        </PopoverTrigger>
        <div className="kanban-floor-lines" onPointerLeave={leave} style={{ maxHeight: Math.min(height, 240) }}>
          {ordered.map(comment => {
            const id = String(comment.id)

            return (
              <button
                aria-current={current === id ? 'location' : undefined}
                aria-label={`#${id} ${comment.author}`}
                className="kanban-floor-line"
                key={id}
                onClick={() => locate(id)}
                onFocus={() => {
                  setHovered(id)
                  setOpen(true)
                }}
                onPointerEnter={() => {
                  setHovered(id)
                  enter()
                }}
                type="button"
              >
                <span />
              </button>
            )
          })}
        </div>
        <PopoverContent
          align="start"
          className="kanban-floor-menu flex flex-col gap-2"
          collisionPadding={12}
          onCloseAutoFocus={event => event.preventDefault()}
          onEscapeKeyDown={event => {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            setPinned(false)
            trigger.current?.focus()
          }}
          onOpenAutoFocus={event => {
            event.preventDefault()

            if (pinned) {
              input.current?.focus()
            }
          }}
          onPointerEnter={enter}
          onPointerLeave={() => {
            if (!pinned && !nav.current?.contains(document.activeElement)) {
              leave()
            }
          }}
          side="right"
          style={{ maxHeight: height, width: 'min(19rem,70vw)' }}
        >
          {preview && (
            <div className="text-[0.75rem]">
              <span>
                #{preview.id} · {preview.author}
              </span>
              <p className="line-clamp-2 text-(--ui-text-tertiary)">{preview.body}</p>
            </div>
          )}
          <form
            className="flex gap-1"
            onSubmit={event => {
              event.preventDefault()
              locate(number.trim().replace(/^#/, ''))
            }}
          >
            <Input
              aria-label={k.jumpFloor}
              onChange={event => setNumber(event.target.value)}
              placeholder={k.jumpFloor}
              ref={input}
              value={number}
            />
            <Button size="xs" type="submit" variant="outline">
              {k.open}
            </Button>
          </form>
          <div className="min-h-0 overflow-y-auto">
            {ordered.map(comment => (
              <Button
                className="flex w-full justify-start"
                key={comment.id}
                onClick={() => locate(String(comment.id))}
                size="xs"
                variant="ghost"
              >
                #{comment.id} · {comment.author}
                {selection.author && selection.author !== comment.author ? ` · ${k.authorFilter}` : ''}
              </Button>
            ))}
          </div>
          {message && <p role="status">{message}</p>}
        </PopoverContent>
      </Popover>
      <span className="sr-only" role="status">
        {message}
      </span>
      <ConfirmDialog
        description={k.showHiddenFloor}
        onClose={() => setHidden(null)}
        onConfirm={() => {
          onShowAll()
          onLocate(hidden!)
          setMessage(`${k.locatedFloor} #${hidden}`)
          setHidden(null)
          setOpen(false)
          setPinned(false)
        }}
        open={hidden !== null}
        title={k.floorDirectory}
      />
    </nav>
  )
}
