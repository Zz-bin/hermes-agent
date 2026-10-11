import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Test harness supplies the same locale registration as plugin loading.
// eslint-disable-next-line no-restricted-imports
import { registerPluginLocales } from '@/i18n/plugin-i18n'

import type { TaskActions } from './api'
import { CommentComposer } from './comment-composer'
import { en, KANBAN_LOCALES } from './i18n'
import type { KanbanTaskDetail } from './types'

let dispose: () => void
beforeEach(() => {
  dispose = registerPluginLocales('kanban', KANBAN_LOCALES)
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => `blob:${Math.random()}`), revokeObjectURL: vi.fn() })
})
afterEach(() => {
  cleanup()
  dispose()
  vi.unstubAllGlobals()
})

const detail = (): KanbanTaskDetail => ({
  task: { id: 't_one', title: 'Original task', status: 'running' },
  comments: [],
  attachments: [],
  links: { parents: [], children: [] },
  events: [],
  runs: []
})

it('keeps uncertain comments until original-task readback and retries only requeue after a saved note', async () => {
  const original = detail()

  const actions: TaskActions = {
    sourceKey: 'test-owner',
    profiles: vi.fn(),
    read: vi.fn(async () => original),
    upload: vi.fn(),
    readAttachment: vi.fn(),
    reassign: vi.fn(),
    comment: vi.fn(async body => {
      original.comments.push({ id: 91, author: 'desktop', body, created_at: 0 })
      throw new Error('response lost')
    }),
    requeue: vi.fn().mockRejectedValueOnce(new Error('conflict')).mockResolvedValue(undefined)
  }

  render(<CommentComposer actions={actions} draftKey="uncertain-comment" imagesSupported onSaved={vi.fn()} running />)
  const field = screen.getByRole('textbox')
  fireEvent.change(field, { target: { value: 'Preserve this draft' } })
  fireEvent.click(screen.getByRole('button', { name: en.send }))
  await screen.findByText(en.checkBeforeRetry)
  expect((field as HTMLTextAreaElement).value).toBe('Preserve this draft')
  expect(screen.getByRole('button', { name: en.send }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: en.checkOriginalTask }))
  await screen.findByText(en.commentSaved)
  expect(actions.comment).toHaveBeenCalledTimes(1)
  expect((field as HTMLTextAreaElement).value).toBe('')
  vi.mocked(actions.comment).mockResolvedValue(undefined)
  fireEvent.change(field, { target: { value: 'Restart with this note' } })
  fireEvent.click(screen.getByRole('button', { name: en.requeueWithNote }))
  await screen.findByText(en.requeueFailed)
  fireEvent.click(screen.getByRole('button', { name: en.retryRequeue }))
  await waitFor(() => expect(actions.requeue).toHaveBeenCalledTimes(2))
  expect(actions.comment).toHaveBeenCalledTimes(2)
})

it('retains successful image IDs across a partial upload and does not upload removed drafts', async () => {
  const original = detail()
  let fail = true

  const actions: TaskActions = {
    sourceKey: 'test-owner',
    profiles: vi.fn(),
    read: vi.fn(async () => original),
    comment: vi.fn().mockResolvedValue(undefined),
    readAttachment: vi.fn(),
    requeue: vi.fn(),
    reassign: vi.fn(),
    upload: vi.fn(async upload => {
      if (upload.filename === 'second.png' && fail) {
        fail = false
        throw new Error('offline')
      }

      const attachment = {
        id: original.attachments!.length + 1,
        filename: upload.filename,
        size: 3,
        content_type: 'image/png'
      }

      original.attachments!.push(attachment)

      return { attachment }
    })
  }

  render(
    <CommentComposer actions={actions} draftKey="partial-images" imagesSupported onSaved={vi.fn()} running={false} />
  )

  const files = ['first.png', 'second.png', 'removed.png'].map(name => {
    const file = new File(['abc'], name, { type: 'image/png' })
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([97, 98, 99]).buffer })

    return file
  })

  fireEvent.drop(screen.getByRole('textbox'), { dataTransfer: { files } })
  fireEvent.click(screen.getByRole('button', { name: `${en.removeImage} removed.png` }))
  fireEvent.click(screen.getByRole('button', { name: en.comment }))
  await screen.findByText(en.checkBeforeRetry)
  expect(actions.upload).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: en.checkOriginalTask }))
  await screen.findByRole('button', { name: en.retrySend })
  fireEvent.click(screen.getByRole('button', { name: en.retrySend }))
  fireEvent.click(screen.getByRole('button', { name: en.comment }))
  await waitFor(() => expect(actions.comment).toHaveBeenCalledTimes(1))
  expect(actions.upload).toHaveBeenCalledTimes(3)
  expect(vi.mocked(actions.upload).mock.calls.map(([upload]) => upload.filename)).toEqual([
    'first.png',
    'second.png',
    'second.png'
  ])
  expect(actions.comment).toHaveBeenCalledWith('', [1, 2])
  await act(async () => {})
})

it('preserves a pending original draft across remount and recovers only the unfinished requeue', async () => {
  const original = detail()
  let reject!: (reason: Error) => void

  const lost = new Promise<void>((_, fail) => {
    reject = fail
  })

  const actions: TaskActions = {
    sourceKey: 'test-owner',
    profiles: vi.fn(),
    read: vi.fn(async () => original),
    readAttachment: vi.fn(),
    upload: vi.fn(),
    reassign: vi.fn(),
    comment: vi.fn(body => {
      original.comments.push({ id: 41, author: 'desktop', body, created_at: 0 })

      return lost
    }),
    requeue: vi.fn().mockResolvedValue(undefined)
  }

  const props = { actions, draftKey: 'late-remount', imagesSupported: true, running: true, onSaved: vi.fn() }
  const first = render(<CommentComposer {...props} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Original pending note' } })
  fireEvent.click(screen.getByRole('button', { name: en.requeueWithNote }))
  await waitFor(() => expect(actions.comment).toHaveBeenCalledTimes(1))
  first.unmount()
  render(<CommentComposer {...props} />)
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Original pending note')
  expect(screen.getByRole('button', { name: en.send }).hasAttribute('disabled')).toBe(true)
  await act(async () => reject(new Error('response lost after close')))
  fireEvent.click(await screen.findByRole('button', { name: en.checkOriginalTask }))
  fireEvent.click(await screen.findByRole('button', { name: en.retryRequeue }))
  await waitFor(() => expect(actions.requeue).toHaveBeenCalledTimes(1))
  expect(actions.comment).toHaveBeenCalledTimes(1)
})

it('identifies renamed committed images by original bytes rather than a same-sized unrelated upload', async () => {
  const original = detail()
  const file = new File(['abc'], 'same.png', { type: 'image/png' })
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([97, 98, 99]).buffer })

  const actions: TaskActions = {
    sourceKey: 'test-owner',
    profiles: vi.fn(),
    read: vi.fn(async () => original),
    readAttachment: vi.fn(async path => `data:image/png;base64,${path === '/original' ? 'YWJj' : 'WFla'}`),
    reassign: vi.fn(),
    requeue: vi.fn(),
    comment: vi.fn().mockResolvedValue(undefined),
    upload: vi.fn(async () => {
      original.attachments!.push(
        { id: 7, filename: 'same (1).png', size: 3, stored_path: '/original' },
        { id: 8, filename: 'same.png', size: 3, stored_path: '/other' }
      )
      throw new Error('upload response lost')
    })
  }

  render(
    <CommentComposer actions={actions} draftKey="renamed-image" imagesSupported onSaved={vi.fn()} running={false} />
  )

  fireEvent.drop(screen.getByRole('textbox'), { dataTransfer: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: en.comment }))
  fireEvent.click(await screen.findByRole('button', { name: en.checkOriginalTask }))
  await screen.findByText(en.imageSaved)
  fireEvent.click(screen.getByRole('button', { name: en.comment }))
  await waitFor(() => expect(actions.comment).toHaveBeenCalledWith('', [7]))
  expect(actions.upload).toHaveBeenCalledTimes(1)
  expect(actions.readAttachment).toHaveBeenCalledTimes(2)
})
