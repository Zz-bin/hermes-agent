import { act, fireEvent, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { commentFloors, visibleComments } from './comment-context'
import { directoryPosition, readingFloor, useDiscussionPosition } from './discussion-position'

it('keeps card-local numbering tied to original identity through sorting and filtering', () => {
  const comments = [
    { id: 104, created_at: 2, author: 'b', body: '#104 original text' },
    { id: 98, created_at: 1, author: 'a', body: 'middle' },
    { id: 96, created_at: 1, author: 'b', body: 'first' }
  ]

  const floors = commentFloors(comments)
  expect([...floors]).toEqual([
    ['96', 1],
    ['98', 2],
    ['104', 3]
  ])
  expect(visibleComments(comments, 'b', 'newest').map(comment => floors.get(String(comment.id)))).toEqual([3, 1])
  expect(comments[0].body).toBe('#104 original text')
  expect([...commentFloors(comments.filter(comment => comment.id !== 98)).keys()]).toEqual(['96', '104'])
})

it('tracks occupied reading area and keeps the whole compact directory centered and visible', () => {
  const floors = [
    { id: 'long', top: -100, bottom: 900 },
    { id: 'short', top: 900, bottom: 950 }
  ]

  expect(readingFloor(floors, 0, 400, 'short')).toBe('long')
  expect(
    readingFloor(
      [
        { id: 'a', top: 0, bottom: 100 },
        { id: 'b', top: 100, bottom: 200 }
      ],
      0,
      200,
      'a'
    )
  ).toBe('a')
  expect(readingFloor([], 0, 200, 'a')).toBeNull()
  expect(
    readingFloor(
      [
        { id: 'short', top: 0, bottom: 50 },
        { id: 'reading', top: 50, bottom: 500 }
      ],
      0,
      400,
      'short'
    )
  ).toBe('reading')
  const region = { top: -300, bottom: 1000 }
  const position = directoryPosition(region, { top: 0, bottom: 400 }, 25)
  expect(region.top + position.top + position.height / 2).toBe(200)
  const low = directoryPosition({ top: 300, bottom: 1000 }, { top: 0, bottom: 400 }, 25)
  expect(300 + low.top + low.height).toBeLessThan(400)
  expect(low.top).toBeGreaterThanOrEqual(0)
  const ended = directoryPosition({ top: -100, bottom: -1 }, { top: 0, bottom: 400 }, 25)
  expect(ended.height).toBe(0)

  for (const count of [1, 10, 25, 100, 1000]) {
    for (const viewport of [120, 400, 900]) {
      const layout = directoryPosition(region, { top: 0, bottom: viewport }, count)
      expect(layout.height).toBeLessThanOrEqual(count * 12)
      expect(region.top + layout.top).toBeGreaterThanOrEqual(8)
      expect(region.top + layout.top + layout.height).toBeLessThanOrEqual(viewport - 8)
    }
  }
})

it('releases located floors only for unconsumed keyboard intent followed by main-column displacement', () => {
  const scroller = document.createElement('div')
  scroller.dataset.kanbanScroller = ''
  const list = document.createElement('ul')
  const nav = document.createElement('nav')
  scroller.append(list, nav)
  document.body.append(scroller)
  const bounds = (top: number, bottom: number) => ({ top, bottom }) as DOMRect
  vi.spyOn(scroller, 'getBoundingClientRect').mockImplementation(() => bounds(0, 200))
  vi.spyOn(list, 'getBoundingClientRect').mockImplementation(() =>
    bounds(-scroller.scrollTop, 400 - scroller.scrollTop)
  )
  const first = document.createElement('li')
  const second = document.createElement('li')
  first.dataset.commentId = 'first'
  second.dataset.commentId = 'second'
  list.append(first, second)
  vi.spyOn(first, 'getBoundingClientRect').mockImplementation(() =>
    bounds(-scroller.scrollTop, 200 - scroller.scrollTop)
  )
  vi.spyOn(second, 'getBoundingClientRect').mockImplementation(() =>
    bounds(200 - scroller.scrollTop, 400 - scroller.scrollTop)
  )
  let frame: FrameRequestCallback | undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback

    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})

  const flush = () =>
    act(() => {
      const callback = frame
      frame = undefined
      callback?.(0)
    })

  const listRef = { current: list }
  const navRef = { current: nav }
  const hook = renderHook(() => useDiscussionPosition(listRef, navRef, []))

  try {
    flush()

    const reset = () => {
      scroller.scrollTop = 0
      fireEvent.scroll(scroller)
      act(() => hook.result.current.locate('first'))
      flush()
    }

    for (const tag of ['button', 'a']) {
      const control = document.createElement(tag)
      first.append(control)
      reset()
      fireEvent.keyDown(control, { key: 'PageDown' })
      fireEvent.scroll(scroller)
      flush()
      expect(hook.result.current.active).toBe('first')
      scroller.scrollTop = 200
      fireEvent.scroll(scroller)
      flush()
      expect(hook.result.current.active).toBe('second')
    }

    for (const kind of ['button', 'role-button', 'link']) {
      const control = document.createElement(kind === 'link' ? 'a' : kind === 'button' ? 'button' : 'div')

      if (kind === 'role-button') {
        control.setAttribute('role', 'button')
      }

      const label = document.createElement('span')
      control.append(label)
      first.append(control)

      for (const key of kind === 'link' ? ['Enter'] : [' ', 'Enter']) {
        reset()
        // A previous no-op paging key must not taint the activation's geometry change.
        fireEvent.keyDown(control, { key: 'PageDown' })
        fireEvent.keyDown(label, { key })
        scroller.scrollTop = 200
        fireEvent.scroll(scroller)
        flush()
        expect(hook.result.current.active).toBe('first')
      }

      if (kind === 'link') {
        reset()
        fireEvent.keyDown(label, { key: ' ' })
        scroller.scrollTop = 200
        fireEvent.scroll(scroller)
        flush()
        expect(hook.result.current.active).toBe('second')
      }
    }

    reset()
    const directory = document.createElement('nav')
    directory.dataset.kanbanDirectory = ''
    first.append(directory)
    fireEvent.wheel(directory)
    fireEvent.scroll(scroller)
    flush()
    expect(hook.result.current.active).toBe('first')
    scroller.scrollTop = 200
    fireEvent.scroll(scroller)
    flush()
    expect(hook.result.current.active).toBe('second')

    for (const kind of ['textarea', 'input', 'select', 'editable', 'directory', 'preview', 'consumed']) {
      const control = document.createElement(['textarea', 'input', 'select'].includes(kind) ? kind : 'div')

      if (kind === 'editable') {
        control.setAttribute('contenteditable', 'true')
      }

      if (kind === 'directory') {
        control.dataset.kanbanDirectory = ''
      }

      if (kind === 'preview') {
        control.dataset.kanbanPreview = ''
      }

      if (kind === 'consumed') {
        control.addEventListener('keydown', event => event.preventDefault())
      }

      first.append(control)
      reset()
      fireEvent.keyDown(control, { key: 'PageDown' })
      scroller.scrollTop = 200
      fireEvent.scroll(scroller)
      flush()
      expect(hook.result.current.active).toBe('first')
    }
  } finally {
    hook.unmount()
    scroller.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})
