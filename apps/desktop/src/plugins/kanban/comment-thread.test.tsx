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

it('requires confirmation to reveal a filtered original floor and never selects it as context', async () => {
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
  const directory = screen.getByRole('button', { name: en.floorDirectory })
  fireEvent.click(directory)
  fireEvent.change(screen.getByRole('textbox', { name: en.jumpFloor }), { target: { value: '999' } })
  fireEvent.submit(screen.getByRole('textbox', { name: en.jumpFloor }).closest('form')!)
  expect(screen.getAllByText(en.floorMissing).length).toBeGreaterThan(0)
  fireEvent.change(screen.getByRole('textbox', { name: en.jumpFloor }), { target: { value: '11' } })
  fireEvent.submit(screen.getByRole('textbox', { name: en.jumpFloor }).closest('form')!)
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
  expect(changes).not.toHaveBeenCalled()
  expect(container.querySelector('[data-comment-id="11"]')).toBeNull()
  fireEvent.click(directory)
  fireEvent.submit(screen.getByRole('textbox', { name: en.jumpFloor }).closest('form')!)
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(container.querySelector('[data-comment-id="11"]')).not.toBeNull())
  expect(changes).toHaveBeenLastCalledWith({ author: '', order: 'oldest', selected: '35' })
  expect(container.querySelector('[data-comment-id="11"] button[aria-expanded]')?.getAttribute('aria-expanded')).toBe(
    'true'
  )
  expect(container.querySelector('[data-comment-id="11"] button[aria-pressed]')?.getAttribute('aria-pressed')).toBe(
    'false'
  )
  const otherDisclosure = container.querySelector<HTMLButtonElement>('[data-comment-id="35"] button[aria-expanded]')!
  otherDisclosure.focus()
  fireEvent.click(otherDisclosure)
  expect(otherDisclosure.ownerDocument.activeElement).toBe(otherDisclosure)
})
