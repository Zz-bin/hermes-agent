import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { CommentThread } from './comment-thread'
import { en } from './i18n'
import type { KanbanComment } from './types'

const comments: KanbanComment[] = [
  { id: 11, author: 'builder', body: 'A long discussion\n'.repeat(40), created_at: 0 },
  { id: 35, author: 'reviewer', body: 'Another long discussion\n'.repeat(40), created_at: 1 }
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('keeps independent disclosures and selection while making clipped links inert', () => {
  const change = vi.fn()

  const { container } = render(
    <CommentThread
      comments={comments}
      k={en}
      onChange={change}
      renderBody={body => <a href="https://example.invalid">{body}</a>}
      selection={{ author: '', order: 'newest', selected: '11' }}
    />
  )

  const first = container.querySelector('[data-comment-id="11"]')!
  const second = container.querySelector('[data-comment-id="35"]')!
  const firstButton = first.querySelector('button[aria-expanded]')!
  const secondButton = second.querySelector('button[aria-expanded]')!
  fireEvent.click(firstButton)
  expect(firstButton.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(secondButton)
  fireEvent.click(firstButton)
  expect(firstButton.getAttribute('aria-expanded')).toBe('false')
  expect(first.querySelector('[inert]')).not.toBeNull()
  expect(secondButton.getAttribute('aria-expanded')).toBe('true')
  expect(first.querySelector('button[aria-pressed]')?.getAttribute('aria-pressed')).toBe('true')
  expect(change).not.toHaveBeenCalled()
})

it('keeps card-local floor numbers through sorting and filters and locates by original identity', () => {
  const change = vi.fn()
  const props = { comments, k: en, onChange: change, renderBody: (body: string) => <p>{body}</p> }

  const { container, rerender } = render(
    <CommentThread {...props} selection={{ author: '', order: 'newest', selected: null }} />
  )

  expect(container.querySelector('[data-comment-id="35"] button[aria-pressed]')?.textContent).toContain('#2')
  expect(container.querySelector('[data-comment-id="11"] button[aria-pressed]')?.textContent).toContain('#1')
  fireEvent.click(container.querySelector('[data-floor-id="11"]')!)
  expect(container.querySelector('[data-comment-id="11"]')?.hasAttribute('data-highlighted')).toBe(true)
  expect(change).not.toHaveBeenCalled()
  rerender(<CommentThread {...props} selection={{ author: 'reviewer', order: 'oldest', selected: null }} />)
  expect(container.querySelector('[data-floor-id="11"]')).toBeNull()
  expect(container.querySelector('[data-comment-id="35"] button[aria-pressed]')?.textContent).toContain('#2')
})

it('highlights the comment body on click and transfers the same highlight on focus without changing context', () => {
  const change = vi.fn()

  const { container } = render(
    <CommentThread
      comments={comments}
      k={en}
      onChange={change}
      renderBody={body => <p>{body}</p>}
      selection={{ author: '', order: 'oldest', selected: '35' }}
    />
  )

  const first = container.querySelector<HTMLElement>('[data-comment-id="11"]')!
  const second = container.querySelector<HTMLElement>('[data-comment-id="35"]')!
  fireEvent.click(first.querySelector('p')!)
  expect(first.hasAttribute('data-highlighted')).toBe(true)
  expect(second.hasAttribute('data-highlighted')).toBe(false)
  fireEvent.focus(second.querySelector('button[aria-expanded]')!)
  expect(first.hasAttribute('data-highlighted')).toBe(false)
  expect(second.hasAttribute('data-highlighted')).toBe(true)
  expect(change).not.toHaveBeenCalled()
})

it('bounds folded Markdown work and defers unseen discussions while preserving the full source on expansion', () => {
  let notify!: IntersectionObserverCallback
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect
    }
  )
  const body = 'A readable paragraph.\n\n'.repeat(200) + 'COMPLETE SOURCE END'
  const renderBody = vi.fn((text: string) => <p>{text}</p>)

  const { container, unmount } = render(
    <CommentThread
      comments={Array.from({ length: 4 }, (_, index) => ({
        id: index + 1,
        author: 'builder',
        body,
        created_at: index
      }))}
      k={en}
      onChange={vi.fn()}
      renderBody={renderBody}
      selection={{ author: '', order: 'oldest', selected: null }}
    />
  )

  const first = container.querySelector<HTMLElement>('[data-comment-id="1"]')!
  const unseen = container.querySelector<HTMLElement>('[data-comment-id="4"]')!
  expect(first.querySelector('p')?.textContent.length).toBeLessThan(body.length)
  expect(body.startsWith(first.querySelector('p')!.textContent!)).toBe(true)
  expect(unseen.querySelector('p')).toBeNull()
  expect(renderBody).not.toHaveBeenCalledWith(body)

  act(() =>
    notify(
      [{ target: unseen, isIntersecting: true }] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver
    )
  )
  expect(unseen.querySelector('p')).not.toBeNull()
  expect(unseen.textContent).not.toContain('COMPLETE SOURCE END')
  fireEvent.click(unseen.querySelector('button[aria-expanded]')!)
  expect(unseen.querySelector('p')?.textContent).toBe(body)
  fireEvent.click(unseen.querySelector('button[aria-expanded]')!)
  expect(unseen.textContent).not.toContain('COMPLETE SOURCE END')
  unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
