import { type RefObject, useEffect, useState } from 'react'

import { discussionScroller } from './discussion-scroll'
import type { KanbanComment } from './types'

interface FloorBounds {
  id: string
  top: number
  bottom: number
}

export function visibleFloors(floors: FloorBounds[], top: number, bottom: number): string[] {
  return bottom > top
    ? floors.filter(floor => Math.min(bottom, floor.bottom) > Math.max(top, floor.top)).map(floor => floor.id)
    : []
}

export function directoryPosition(
  region: { top: number; bottom: number },
  bounds: { top: number; bottom: number },
  count: number
) {
  const topEdge = Math.max(region.top, bounds.top + 8)
  const bottomEdge = Math.min(region.bottom, bounds.bottom - 8)
  const height = Math.max(0, Math.min(count * 12, 240, bottomEdge - topEdge))
  const top = Math.max(topEdge, Math.min((bounds.top + bounds.bottom - height) / 2, bottomEdge - height))

  return { height, top: top - region.top }
}

/** Measure the reading viewport once per frame, independently of comment selection. */
export function useDiscussionPosition(
  list: RefObject<HTMLUListElement | null>,
  nav: RefObject<HTMLElement | null>,
  comments: KanbanComment[]
) {
  const [visible, setVisible] = useState<string[]>([])

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

    const update = () => {
      frame = 0
      const bounds = scroller.getBoundingClientRect()
      const region = element.getBoundingClientRect()
      const position = directoryPosition(region, bounds, nodes.length)

      const floors = nodes.map(item => {
        const rect = item.getBoundingClientRect()

        return { id: item.dataset.commentId!, top: rect.top, bottom: rect.bottom }
      })

      rail.style.visibility = position.height > 0 ? 'visible' : 'hidden'
      rail.style.top = `${position.top}px`
      rail.style.height = `${position.height}px`

      const next = visibleFloors(floors, Math.max(region.top, bounds.top), Math.min(region.bottom, bounds.bottom))
      setVisible(previous =>
        previous.length === next.length && previous.every((id, index) => id === next[index]) ? previous : next
      )
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

      schedule()
    }

    const resize = () => {
      const next = discussionScroller(element) ?? scroller

      if (next !== scroller) {
        observer.unobserve(scroller)
        scroller = next
        observer.observe(scroller)
      }

      schedule()
    }

    window.addEventListener('scroll', scroll, { passive: true, capture: true })
    window.addEventListener('resize', resize)
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    observer.observe(scroller)
    schedule()

    return () => {
      cancelAnimationFrame(frame)

      observer.disconnect()
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', resize)
    }
  }, [list, nav, comments])

  return visible
}
