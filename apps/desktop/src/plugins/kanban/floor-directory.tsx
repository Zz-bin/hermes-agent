import { Popover, PopoverContent, PopoverTrigger } from '@hermes/plugin-sdk'
import { type RefObject, useEffect, useRef, useState } from 'react'

import { textPreview } from './text-preview'
import type { KanbanComment } from './types'
import type { KanbanText } from './ui'

interface FloorDirectoryProps {
  active: string | null
  comments: KanbanComment[]
  floors: Map<string, number>
  k: KanbanText
  nav: RefObject<HTMLElement | null>
  onLocate: (id: string) => void
}

function FloorPreview({
  comment,
  floor,
  active,
  open,
  onOpenChange,
  onLocate,
  onKey
}: {
  comment: KanbanComment
  floor: number
  active: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onLocate: () => void
  onKey: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enter = () => {
    if (timer.current) {
      clearTimeout(timer.current)
    }

    onOpenChange(true)
  }

  const leave = () => {
    if (timer.current) {
      clearTimeout(timer.current)
    }

    timer.current = setTimeout(() => onOpenChange(false), 120)
  }

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    },
    []
  )

  const dismiss = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault()
    event.stopPropagation()

    if (timer.current) {
      clearTimeout(timer.current)
    }

    onOpenChange(false)
  }

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-current={active ? 'location' : undefined}
          aria-label={`#${floor} ${comment.author}`}
          className="kanban-floor-line"
          data-floor-id={String(comment.id)}
          onBlur={leave}
          onClick={event => {
            event.preventDefault()
            onOpenChange(false)
            onLocate()
          }}
          onFocus={enter}
          onKeyDown={event => {
            if (event.key === 'Escape' && open) {
              dismiss(event)
            } else {
              onKey(event)
            }
          }}
          onPointerEnter={enter}
          onPointerLeave={leave}
          ref={trigger}
          type="button"
        >
          <span />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="kanban-floor-menu"
        collisionPadding={12}
        data-kanban-preview
        onCloseAutoFocus={event => event.preventDefault()}
        onEscapeKeyDown={dismiss}
        onOpenAutoFocus={event => event.preventDefault()}
        onPointerEnter={enter}
        onPointerLeave={leave}
        side="right"
        style={{
          width: 'min(24rem,70vw)',
          maxHeight: 'min(24rem,var(--radix-popover-content-available-height))',
          overflowY: 'auto'
        }}
      >
        <span className="text-[0.75rem] text-(--ui-accent)">
          #{floor} · {comment.author}
        </span>
        <p className="mt-2 whitespace-pre-wrap break-words text-[0.75rem]">{textPreview(comment.body)}</p>
      </PopoverContent>
    </Popover>
  )
}

export function FloorDirectory({ active, comments, floors, k, nav, onLocate }: FloorDirectoryProps) {
  const lines = useRef<HTMLDivElement>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const viewport = lines.current

    const button = Array.from(viewport?.querySelectorAll<HTMLElement>('[data-floor-id]') ?? []).find(
      item => item.dataset.floorId === active
    )

    if (viewport && button) {
      if (button.offsetTop < viewport.scrollTop) {
        viewport.scrollTop = button.offsetTop
      } else if (button.offsetTop + button.offsetHeight > viewport.scrollTop + viewport.clientHeight) {
        viewport.scrollTop = button.offsetTop + button.offsetHeight - viewport.clientHeight
      }
    }
  }, [active])

  if (!comments.length) {
    return null
  }

  return (
    <nav aria-label={k.floorDirectory} className="kanban-floor-directory" data-kanban-directory ref={nav}>
      <div className="kanban-floor-lines" ref={lines}>
        {comments.map((comment, index) => {
          const id = String(comment.id)

          return (
            <FloorPreview
              active={active === id}
              comment={comment}
              floor={floors.get(id)!}
              key={id}
              onKey={event => {
                const offsets: Record<string, number> = {
                  ArrowDown: index + 1,
                  ArrowUp: index - 1,
                  Home: 0,
                  End: comments.length - 1
                }

                if (event.key in offsets) {
                  event.preventDefault()
                  const buttons = lines.current?.querySelectorAll<HTMLButtonElement>('[data-floor-id]')
                  const button = buttons?.[Math.max(0, Math.min(comments.length - 1, offsets[event.key]))]
                  button?.focus({ preventScroll: true })

                  if (button && lines.current) {
                    lines.current.scrollTop = button.offsetTop - lines.current.clientHeight / 2
                  }
                }
              }}
              onLocate={() => {
                onLocate(id)
                setMessage(`${k.locatedFloor} #${floors.get(id)}`)
              }}
              onOpenChange={value => setOpenId(previous => (value ? id : previous === id ? null : previous))}
              open={openId === id}
            />
          )
        })}
      </div>
      <span className="sr-only" role="status">
        {message}
      </span>
    </nav>
  )
}
