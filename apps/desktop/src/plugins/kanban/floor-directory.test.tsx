import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useDiscussionPosition } from './discussion-position'
import { FloorDirectory } from './floor-directory'
import { en } from './i18n'

let frames: Map<number, FrameRequestCallback>
let resize: ResizeObserverCallback
let frameId: number
const disconnect = vi.fn()

beforeEach(() => {
  frames = new Map()
  frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)

    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect
    }
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const floor = this.dataset.commentId

    return {
      top: floor === '2' ? 100 : 0,
      bottom: floor === '1' ? 80 : 300,
      height: 300,
      left: 0,
      right: 300,
      width: 300,
      x: 0,
      y: 0,
      toJSON() {}
    }
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  disconnect.mockClear()
})

function flushFrame() {
  act(() => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(callback => callback(0))
  })
}

function View() {
  const list = useRef<HTMLUListElement>(null)
  const nav = useRef<HTMLElement>(null)

  const comments = [
    { id: 1, author: 'builder', body: 'One', created_at: 0 },
    { id: 2, author: 'builder', body: 'Two', created_at: 1 }
  ]

  const { active } = useDiscussionPosition(list, nav, comments)

  return (
    <>
      <div data-testid="other" />
      <div data-kanban-scroller data-testid="outer" style={{ overflowY: 'hidden' }}>
        <div data-kanban-scroller data-testid="inner" style={{ overflowY: 'auto' }}>
          <FloorDirectory
            active={active}
            comments={comments}
            floors={
              new Map([
                ['1', 1],
                ['2', 2]
              ])
            }
            k={en}
            nav={nav}
            onLocate={vi.fn()}
          />
          <ul ref={list}>
            <li data-comment-id="1" />
            <li data-comment-id="2" />
          </ul>
        </div>
      </div>
    </>
  )
}

it('coalesces relevant scroll and resize measurements while ignoring unrelated scrolling', () => {
  render(<View />)
  flushFrame()
  const inner = screen.getByTestId('inner')
  const list = inner.querySelector('ul')!
  const layout = vi.fn(list.getBoundingClientRect.bind(list))
  Object.defineProperty(list, 'getBoundingClientRect', { value: layout, configurable: true })
  const nodes = vi.spyOn(list, 'querySelectorAll')
  const style = vi.spyOn(window, 'getComputedStyle')
  fireEvent.scroll(screen.getByTestId('other'))
  expect(layout).not.toHaveBeenCalled()
  fireEvent.scroll(inner)
  fireEvent.scroll(inner)
  fireEvent.scroll(inner)
  expect(layout).not.toHaveBeenCalled()
  flushFrame()
  expect(layout).toHaveBeenCalledTimes(1)
  expect(nodes).not.toHaveBeenCalled()
  expect(style).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '#2 builder' }).getAttribute('aria-current')).toBe('location')
  const firstFloor = list.querySelector<HTMLElement>('[data-comment-id="1"]')!
  Object.defineProperty(firstFloor, 'getBoundingClientRect', {
    value: () => ({ top: -80, bottom: -1 }),
    configurable: true
  })
  layout.mockClear()
  fireEvent.resize(window)
  act(() => {
    resize([], {} as ResizeObserver)
    resize([], {} as ResizeObserver)
  })
  expect(layout).not.toHaveBeenCalled()
  flushFrame()
  expect(layout).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '#2 builder' }).getAttribute('aria-current')).toBe('location')
})

it('reselects the scroll container after responsive layout changes and cancels queued work on unmount', () => {
  const { unmount } = render(<View />)
  flushFrame()
  const inner = screen.getByTestId('inner')
  const outer = screen.getByTestId('outer')
  inner.style.overflowY = 'hidden'
  outer.style.overflowY = 'auto'
  fireEvent.resize(window)
  flushFrame()
  const bounds = vi.fn(outer.getBoundingClientRect.bind(outer))
  Object.defineProperty(outer, 'getBoundingClientRect', { value: bounds, configurable: true })
  fireEvent.scroll(outer)
  flushFrame()
  expect(bounds).toHaveBeenCalledTimes(1)
  fireEvent.scroll(outer)
  unmount()
  expect(disconnect).toHaveBeenCalledOnce()
  flushFrame()
  expect(bounds).toHaveBeenCalledTimes(1)
})
