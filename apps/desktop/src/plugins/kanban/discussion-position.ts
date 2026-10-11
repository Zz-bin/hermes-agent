import { type RefObject, useEffect, useRef, useState } from 'react'

import { discussionScroller } from './discussion-scroll'
import type { KanbanComment } from './types'

interface FloorBounds {
  id: string
  top: number
  bottom: number
}

export function readingFloor(floors: FloorBounds[], top: number, bottom: number, current: string | null) {
  const candidates = floors
    .flatMap(floor => {
      const visible = Math.min(bottom, floor.bottom) - Math.max(top, floor.top)

      if (visible <= 0 || bottom <= top) {
        return []
      }

      return [
        {
          ...floor,
          score: visible / Math.min(floor.bottom - floor.top, bottom - top),
          distance: Math.abs((Math.max(top, floor.top) + Math.min(bottom, floor.bottom)) / 2 - (top + bottom) / 2)
        }
      ]
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance)

  const previous = candidates.find(floor => floor.id === current)
  const best = candidates[0]

  return previous && best.score < previous.score + 0.15 ? previous.id : (best?.id ?? null)
}

export function directoryPosition(region: { top: number; bottom: number }, bounds: { top: number; bottom: number }) {
  const middle = (bounds.top + bounds.bottom) / 2
  const bottom = Math.min(bounds.bottom, region.bottom)
  const top = Math.min(region.bottom, Math.max(region.top, middle))
  const height = Math.max(0, Math.min(240, bottom - top - 8))

  return { height, top: top - region.top }
}

/** Navigation intent stays local: geometry updates cannot replace a clicked floor. */
export function useDiscussionPosition(
  list: RefObject<HTMLUListElement | null>,
  nav: RefObject<HTMLElement | null>,
  comments: KanbanComment[]
) {
  const [active, setActive] = useState<string | null>(null)
  const activeRef = useRef<string | null>(null)
  const lock = useRef<string | null>(null)

  const locate = (id: string) => {
    lock.current = id
    activeRef.current = id
    setActive(id)
  }

  // eslint-disable-next-line no-restricted-syntax -- installs DOM listeners owning imperative navigation refs, not mirrored atom values
  useEffect(() => {
    const element = list.current
    const rail = nav.current
    const initialScroller = element ? discussionScroller(element) : null

    if (!element || !rail || !initialScroller) {
      return
    }

    let scroller = initialScroller
    const nodes = Array.from(element.querySelectorAll<HTMLElement>('[data-comment-id]'))
    let frame = 0
    let intentUntil = 0
    let dragging = false
    let scrollTop = scroller.scrollTop

    const update = () => {
      frame = 0
      const bounds = scroller.getBoundingClientRect()
      const region = element.getBoundingClientRect()
      const position = directoryPosition(region, bounds)

      const floors = nodes.map(item => {
        const rect = item.getBoundingClientRect()

        return { id: item.dataset.commentId!, top: rect.top, bottom: rect.bottom }
      })

      rail.style.visibility = position.height >= 24 ? 'visible' : 'hidden'
      rail.style.top = `${position.top}px`
      rail.style.height = `${position.height}px`

      if (lock.current && !floors.some(floor => floor.id === lock.current)) {
        lock.current = null
      }

      const next =
        lock.current ??
        readingFloor(
          floors,
          Math.max(region.top, bounds.top),
          Math.min(region.bottom, bounds.bottom),
          activeRef.current
        )

      if (next !== activeRef.current) {
        activeRef.current = next
        setActive(next)
      }
    }

    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update)
      }
    }

    const scroll = (event: Event) => {
      if (event.target !== scroller) {
        return
      }

      if (scroller.scrollTop !== scrollTop) {
        if (dragging || performance.now() < intentUntil) {
          lock.current = null
        }

        intentUntil = 0
        scrollTop = scroller.scrollTop
      }

      schedule()
    }

    const userIntent = (event: Event) => {
      const target = event.target as HTMLElement

      if (
        target.closest('[data-kanban-directory], [data-kanban-preview]') ||
        (event.type === 'keydown' &&
          target.closest('textarea, input, select, [contenteditable]:not([contenteditable="false"])'))
      ) {
        return
      }

      intentUntil = performance.now() + 250
      scrollTop = scroller.scrollTop
    }

    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement

      // Space activates buttons: disclosure reflow is not a reading scroll, even at the scroll limit.
      if (
        (event.key === ' ' && target.closest('button, [role="button"]')) ||
        (event.key === 'Enter' && target.closest('button, a, [role="button"]'))
      ) {
        intentUntil = 0

        return
      }

      // Buttons and links can still page the main column with unconsumed scrolling keys.
      if (
        !event.defaultPrevented &&
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
      ) {
        userIntent(event)
      }
    }

    const pointer = (event: PointerEvent) => {
      if (event.target === scroller) {
        dragging = true
        userIntent(event)
      }
    }

    const endDrag = () => {
      dragging = false
      intentUntil = 0
    }

    const resize = () => {
      scroller = discussionScroller(element) ?? scroller
      intentUntil = 0
      schedule()
    }

    window.addEventListener('scroll', scroll, { passive: true, capture: true })
    scroller.addEventListener('wheel', userIntent, { passive: true })
    scroller.addEventListener('touchmove', userIntent, { passive: true })
    scroller.addEventListener('keydown', key)
    scroller.addEventListener('pointerdown', pointer)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('resize', resize)
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    observer.observe(scroller)
    schedule()

    return () => {
      cancelAnimationFrame(frame)

      observer.disconnect()
      window.removeEventListener('scroll', scroll, true)
      scroller.removeEventListener('wheel', userIntent)
      scroller.removeEventListener('touchmove', userIntent)
      scroller.removeEventListener('keydown', key)
      scroller.removeEventListener('pointerdown', pointer)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('resize', resize)
    }
  }, [list, nav, comments])

  return { active, locate }
}
