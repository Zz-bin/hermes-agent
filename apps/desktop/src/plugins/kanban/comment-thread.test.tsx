import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { type CommentSelection, CommentThread } from './comment-thread'
import { en } from './i18n'
import type { KanbanComment } from './types'

const comments: KanbanComment[] = [
  { id: 11, author: 'builder', body: 'A long discussion\n'.repeat(40), created_at: 0 },
  { id: 35, author: 'reviewer', body: 'Another long discussion\n'.repeat(40), created_at: 1 }
]

afterEach(cleanup)

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

it('only navigates visible card-local floors without changing history selection', async () => {
  const changes = vi.fn()

  function View() {
    const [selection, setSelection] = useState<CommentSelection>({
      author: 'reviewer',
      order: 'oldest',
      selected: '35'
    })

    return (
      <CommentThread
        comments={comments}
        k={en}
        onChange={next => {
          changes(next)
          setSelection(next)
        }}
        renderBody={body => <p>{body}</p>}
        selection={selection}
      />
    )
  }

  const { container } = render(<View />)
  const directory = screen.getByRole('button', { name: '#2 reviewer' })
  expect(screen.queryByRole('button', { name: '#1 builder' })).toBeNull()
  expect(screen.getByText(en.shownComments(1, 2))).toBeTruthy()
  fireEvent.click(directory)
  expect(changes).not.toHaveBeenCalled()
  expect(container.querySelector('[data-comment-id="11"]')).toBeNull()
  await waitFor(() => expect(directory.getAttribute('aria-current')).toBe('location'))
  expect(container.querySelector('[data-comment-id="35"] button[aria-expanded]')?.getAttribute('aria-expanded')).toBe(
    'true'
  )
  expect(container.querySelector('[data-comment-id="35"] button[aria-pressed]')?.getAttribute('aria-pressed')).toBe(
    'true'
  )
  const otherDisclosure = container.querySelector<HTMLButtonElement>('[data-comment-id="35"] button[aria-expanded]')!
  otherDisclosure.focus()
  fireEvent.click(otherDisclosure)
  expect(otherDisclosure.ownerDocument.activeElement).toBe(otherDisclosure)
})
