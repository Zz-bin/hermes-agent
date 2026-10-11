import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

// Test harness supplies the host's locale registration, as plugin loading does.
// eslint-disable-next-line no-restricted-imports
import { registerPluginLocales } from '@/i18n/plugin-i18n'

import type * as KanbanApi from './api'
import { $boardSlug, createTask, fetchBoards } from './api'
import { KanbanBoardPage } from './board'
import { en, KANBAN_LOCALES } from './i18n'
import type { BoardsResponse } from './types'
import { $newTaskLane } from './ui'

vi.mock('./api', async importOriginal => ({
  ...(await importOriginal<typeof KanbanApi>()),
  createTask: vi.fn(async () => ({ task: { id: 'new-task', status: 'triage' } })),
  fetchBoards: vi.fn(),
  fetchBoard: vi.fn(async () => ({ assignees: [], columns: [], tenants: [] })),
  fetchOrchestration: vi.fn(async () => ({ default_assignee: '' })),
  fetchProfiles: vi.fn(async () => ({ profiles: [] }))
}))

let client: QueryClient
let disposeLocales: () => void

afterEach(() => {
  cleanup()
  client.clear()
  disposeLocales()
  $boardSlug.set('')
  $newTaskLane.set(null)
  vi.clearAllMocks()
})

it('preserves a new task draft while delayed board defaults arrive and inherits its workspace', async () => {
  let finishBoards!: (value: BoardsResponse) => void

  const boards = new Promise<BoardsResponse>(resolve => {
    finishBoards = resolve
  })

  vi.mocked(fetchBoards).mockReturnValue(boards)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  disposeLocales = registerPluginLocales('kanban', KANBAN_LOCALES)
  $newTaskLane.set('triage')
  render(
    <QueryClientProvider client={client}>
      <KanbanBoardPage />
    </QueryClientProvider>
  )
  const title = await screen.findByPlaceholderText(en.titlePlaceholderTriage)
  const body = screen.getByPlaceholderText(en.descPlaceholder)
  fireEvent.change(title, { target: { value: 'Keep my draft' } })
  fireEvent.change(body, { target: { value: 'Keep these details' } })
  await act(async () => {
    finishBoards({
      boards: [{ slug: 'default', default_workspace_kind: 'dir', default_workdir: '/project' }],
      current: 'default'
    })
    await boards
  })
  expect(await screen.findByPlaceholderText('/project')).toBeTruthy()
  expect((title as HTMLInputElement).value).toBe('Keep my draft')
  expect((body as HTMLTextAreaElement).value).toBe('Keep these details')
  fireEvent.click(screen.getByRole('button', { name: en.createTask }))
  await waitFor(() =>
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Keep my draft',
        body: 'Keep these details',
        workspace_kind: 'dir'
      })
    )
  )
})
