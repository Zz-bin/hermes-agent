import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// eslint-disable-next-line no-restricted-imports
import { registerPluginLocales } from '@/i18n/plugin-i18n'

import { fetchProfiles, type TaskActions } from './api'
import { AssigneeMenu } from './assignee-menu'
import { en, KANBAN_LOCALES } from './i18n'

const profile = (name: string) => ({ name, is_default: false, description: '', description_auto: false })

vi.mock('./api', () => ({
  fetchProfiles: vi.fn(),
  profilesKey: (scope: string) => ['profiles', scope],
  useKanbanScope: () => 'original-owner'
}))
let dispose: () => void
beforeEach(() => {
  dispose = registerPluginLocales('kanban', KANBAN_LOCALES)
  vi.mocked(fetchProfiles)
    .mockReset()
    .mockResolvedValue({ profiles: [profile('builder'), profile('reviewer')] })
})
afterEach(() => {
  cleanup()
  dispose()
})

function view(running: boolean) {
  const actions: TaskActions = {
    sourceKey: 'test-owner',
    profiles: fetchProfiles,
    reassign: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue({ task: { assignee: 'reviewer' } }),
    comment: vi.fn(),
    upload: vi.fn(),
    requeue: vi.fn(),
    readAttachment: vi.fn()
  }

  const saved = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AssigneeMenu actions={actions} current="builder" onSaved={saved} running={running} />
    </QueryClientProvider>
  )

  const open = () =>
    fireEvent.pointerDown(screen.getByRole('button', { name: en.assignee }), { button: 0, ctrlKey: false })

  return { actions, saved, open }
}

it('makes same-person selection inert and requires explicit confirmation before reassigning a running task', async () => {
  const { actions, saved, open } = view(true)
  open()
  const current = await screen.findByRole('menuitem', { name: /builder/ })
  expect(current.getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(current)
  expect(actions.reassign).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('menuitem', { name: /reviewer/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
  expect(actions.reassign).not.toHaveBeenCalled()
  open()
  fireEvent.click(await screen.findByRole('menuitem', { name: /reviewer/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
  expect(actions.reassign).toHaveBeenCalledExactlyOnceWith('reviewer')
  expect(actions.read).toHaveBeenCalledTimes(1)
})

it('lets failed and empty rosters refresh and keeps the current person on an assignment permission failure', async () => {
  vi.mocked(fetchProfiles)
    .mockReset()
    .mockRejectedValueOnce(new Error('roster unavailable'))
    .mockResolvedValueOnce({ profiles: [] })
    .mockResolvedValue({ profiles: [profile('reviewer')] })
  const { actions, saved, open } = view(false)
  vi.mocked(actions.reassign).mockRejectedValue(new Error('403: assignment denied'))
  open()
  fireEvent.click(await screen.findByRole('menuitem', { name: en.retryRoster }))
  await waitFor(() => expect(fetchProfiles).toHaveBeenCalledTimes(2))
  open()
  await screen.findByRole('menuitem', { name: en.rosterEmpty })
  fireEvent.click(screen.getByRole('menuitem', { name: en.retryRoster }))
  await waitFor(() => expect(fetchProfiles).toHaveBeenCalledTimes(3))
  open()
  fireEvent.click(await screen.findByRole('menuitem', { name: /reviewer/ }))
  await screen.findByText('403: assignment denied')
  vi.mocked(actions.reassign).mockRejectedValueOnce(new Error('409: assignment conflict'))
  open()
  fireEvent.click(await screen.findByRole('menuitem', { name: /reviewer/ }))
  await screen.findByText('409: assignment conflict')
  expect(screen.getByRole('button', { name: en.assignee }).textContent).toContain('builder')
  expect(actions.read).not.toHaveBeenCalled()
  expect(saved).not.toHaveBeenCalled()
})
