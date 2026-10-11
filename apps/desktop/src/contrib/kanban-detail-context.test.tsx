import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'

import type { fetchTask } from '../plugins/kanban/api'
import { TaskDrawer } from '../plugins/kanban/drawer'
import { en } from '../plugins/kanban/i18n'
import type * as KanbanI18n from '../plugins/kanban/i18n'

const mocks = vi.hoisted(() => ({
  fetchTask: vi.fn(),
  patchTask: vi.fn(async () => ({ ok: true })),
  download: vi.fn(async (_path: string, _name: string) => {})
}))

vi.mock('../plugins/kanban/api', async () => ({
  ...(await vi.importActual('../plugins/kanban/api')),
  fetchTask: mocks.fetchTask,
  fetchLog: async () => ({ exists: false, content: '' }),
  fetchProfiles: async () => [],
  fetchOrchestration: async () => ({ default_assignee: '' }),
  patchTask: mocks.patchTask,
  routedToScope: () => true,
  useKanbanScope: () => 'test-scope'
}))
vi.mock('../plugins/kanban/i18n', async () => {
  const actual = await vi.importActual<typeof KanbanI18n>('../plugins/kanban/i18n')

  return { ...actual, useKanban: () => actual.en }
})

const longBody = 'Description retains original content.\n'.repeat(30) + 'END-OF-DESCRIPTION'

function detail(id: string): Awaited<ReturnType<typeof fetchTask>> {
  return {
    task: { id, title: `Task ${id}`, status: 'blocked', assignee: 'current-owner', body: longBody, created_at: 1 },
    comments: [
      {
        id: 1,
        author: 'builder',
        body: 'FIRST HANDOFF',
        created_at: 10,
        context: {
          version: 1,
          kind: 'handoff',
          assignee: 'old-owner',
          phase: 'planning',
          status: 'running',
          workspace_kind: 'dir',
          workspace_path: '/old/worktree',
          attachment_ids: [1],
          material_paths: ['/worktree/design.md'],
          verification: 'VERBATIM VERIFICATION',
          approval_scope: 'Implementation only'
        }
      },
      {
        id: 2,
        author: 'reviewer',
        body: 'SECOND HANDOFF',
        created_at: 20,
        context: {
          version: 1,
          kind: 'handoff',
          assignee: 'review-owner',
          phase: 'review',
          status: 'review',
          workspace_kind: 'dir',
          workspace_path: '/review/worktree',
          attachment_ids: [2]
        }
      },
      { id: 3, author: 'user', body: 'ORDINARY DISCUSSION', created_at: 30 }
    ],
    attachments: [
      { id: 1, filename: 'first.svg', stored_path: '/test/first.svg' },
      { id: 2, filename: 'second.svg', stored_path: '/test/second.svg' }
    ],
    events: [],
    runs: [],
    links: { parents: [], children: [] },
    downloadAttachment: mocks.download,
    reader: {
      key: 'test-source',
      owner: { connectionId: 'test-source', profile: undefined },
      readText: vi.fn(),
      readDataUrl: vi.fn(async () => 'data:image/svg+xml;base64,PHN2Zy8+')
    },
    actions: {
      sourceKey: 'test-source',
      profiles: async () => ({ profiles: [] }),
      read: async () => detail(id),
      readAttachment: vi.fn(),
      comment: vi.fn(),
      upload: vi.fn(),
      requeue: vi.fn(),
      reassign: vi.fn()
    }
  }
}

function mount(id = 'A') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const props = { columns: ['blocked'], onClose: vi.fn(), onOpen: vi.fn() }

  const tree = (id: string) => (
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TaskDrawer {...props} id={id} />
      </QueryClientProvider>
    </I18nProvider>
  )

  const result = render(tree(id))

  return { ...result, change: (id: string) => result.rerender(tree(id)) }
}

beforeEach(() => {
  mocks.fetchTask.mockImplementation(async (id: string) => detail(id))
  mocks.patchTask.mockClear()
  mocks.download.mockClear()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(300)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function context() {
  return globalThis.document.querySelector('[data-comment-context]') as HTMLElement
}

describe('native TaskDrawer comment inspection', () => {
  it('groups task properties and follows the latest or selected comment', async () => {
    mount()
    await screen.findByText('Task A')
    await waitFor(() => expect(context().dataset.commentContext).toBe('3'))
    expect(within(context()).getAllByText(en.notRecorded).length).toBeGreaterThan(0)
    const sections = globalThis.document.querySelectorAll('.kanban-detail-sidebar > details')
    expect(sections).toHaveLength(2)
    const [properties, comment] = Array.from(sections) as HTMLDetailsElement[]
    expect(properties.open).toBe(true)
    expect(comment.open).toBe(true)
    expect(within(properties).getByText(en.currentProperties)).toBeTruthy()
    expect(within(properties).getByText('first.svg')).toBeTruthy()
    expect(within(properties).getByText('second.svg')).toBeTruthy()
    expect(within(comment).getByText(en.commentOverview)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Select comment #1 builder' }))
    expect(context().dataset.commentContext).toBe('1')
    expect(within(context()).getByText('old-owner')).toBeTruthy()
    expect(within(context()).queryByText(en.phase)).toBeNull()
    expect(within(context()).queryByText(en.statusAtHandoff)).toBeNull()
    expect(within(context()).queryByText(en.workspace)).toBeNull()
    expect(within(context()).getByText('design.md')).toBeTruthy()
    expect(within(context()).queryByText(en.reportedVerification)).toBeNull()
    expect(within(context()).queryByText(en.declaredScope)).toBeNull()
    expect(within(context()).queryByText('VERBATIM VERIFICATION')).toBeNull()
    expect(within(context()).queryByText('Implementation only')).toBeNull()
    expect(screen.getAllByRole('button', { name: en.editDescription })).toHaveLength(1)
    expect(within(context()).getByText('first.svg')).toBeTruthy()
    expect(within(context()).queryByText('second.svg')).toBeNull()
    fireEvent.click(within(context()).getByRole('button', { name: 'Download first.svg' }))
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith('/test/first.svg', 'first.svg'))
    fireEvent.click(screen.getByRole('button', { name: en.clearCommentSelection }))
    expect(context().dataset.commentContext).toBe('3')
  })
  it('updates the sidebar from body clicks and floor navigation without toggling on controls', async () => {
    mount()
    await screen.findByText('Task A')
    fireEvent.click(globalThis.document.querySelector('[data-comment-id="1"] > div')!)
    expect(context().dataset.commentContext).toBe('1')
    expect(within(context()).getByText('old-owner')).toBeTruthy()
    expect(within(context()).getByText('first.svg')).toBeTruthy()
    fireEvent.click(globalThis.document.querySelector('[data-floor-id="2"]')!)
    expect(context().dataset.commentContext).toBe('2')
    expect(within(context()).getByText('review-owner')).toBeTruthy()
    expect(within(context()).getByText('second.svg')).toBeTruthy()
    expect(within(context()).queryByText('first.svg')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Select comment #2 reviewer' }))
    expect(context().dataset.commentContext).toBe('3')
    fireEvent.click(globalThis.document.querySelector('[data-floor-id="1"]')!)
    fireEvent.click(globalThis.document.querySelector('[data-floor-id="1"]')!)
    expect(context().dataset.commentContext).toBe('1')
  })
  it('discussion exposes missing history, never the current owner', async () => {
    mount()
    await screen.findByText('Task A')
    fireEvent.click(screen.getByRole('button', { name: 'Select comment #3 user' }))
    expect(within(context()).queryByText('current-owner')).toBeNull()
    expect(within(context()).getAllByText('Not recorded').length).toBeGreaterThan(0)
  })
  it('resets context across A→B→A and close/reopen', async () => {
    const view = mount()
    await screen.findByText('Task A')
    fireEvent.click(screen.getByRole('button', { name: 'Select comment #1 builder' }))
    view.change('B')
    await screen.findByText('Task B')
    expect(context().dataset.commentContext).toBe('3')
    view.change('A')
    await screen.findByText('Task A')
    expect(context().dataset.commentContext).toBe('3')
  })
  it('edits the complete description while collapsed and never rewrites it on cancel', async () => {
    mount()
    await screen.findByText('Task A')
    fireEvent.click(screen.getByRole('button', { name: en.editDescription }))
    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value).toBe(longBody)
    fireEvent.click(screen.getByRole('button', { name: en.cancelEdit }))
    expect(mocks.patchTask).not.toHaveBeenCalled()
  })
})
