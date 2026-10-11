import type { DesktopFileReader } from '@hermes/plugin-sdk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// eslint-disable-next-line no-restricted-imports
import { registerPluginLocales } from '@/i18n/plugin-i18n'

import { Attachment } from './attachment'
import { en, KANBAN_LOCALES } from './i18n'

const reader: DesktopFileReader = {
  key: 'original-owner',
  owner: { connectionId: 'local', profile: 'builder' },
  readText: vi.fn(),
  readDataUrl: vi.fn()
}

let dispose: () => void
beforeEach(() => {
  dispose = registerPluginLocales('kanban', KANBAN_LOCALES)
})
afterEach(() => {
  cleanup()
  dispose()
  vi.clearAllMocks()
})

function view(path: string | null, download: (path: string, name: string) => Promise<void>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Attachment
        attachment={{ id: 'material', filename: 'notes.md', stored_path: path }}
        onDownload={download}
        reader={reader}
      />
    </QueryClientProvider>
  )
}

it('shows missing material metadata and disables both operations without filesystem fallback', () => {
  const download = vi.fn()
  view(null, download)
  expect(screen.getByText(en.materialUnavailable)).toBeTruthy()
  const open = screen.getByRole('button', { name: `${en.open} notes.md` }) as HTMLButtonElement
  const save = screen.getByRole('button', { name: 'Download notes.md' }) as HTMLButtonElement
  expect(open.disabled && save.disabled).toBe(true)
  fireEvent.click(open)
  fireEvent.click(save)
  expect(download).not.toHaveBeenCalled()
  expect(reader.readText).not.toHaveBeenCalled()
  expect(reader.readDataUrl).not.toHaveBeenCalled()
})
it('keeps independent saves on the original material without opening its reader', async () => {
  const download = vi.fn().mockResolvedValue(undefined)
  view('/fixtures/notes.md', download)
  const save = screen.getByRole('button', { name: 'Download notes.md' }) as HTMLButtonElement
  fireEvent.click(save)
  await waitFor(() => expect(save.disabled).toBe(false))
  fireEvent.click(save)
  await waitFor(() => expect(download).toHaveBeenCalledTimes(2))
  expect(download).toHaveBeenNthCalledWith(1, '/fixtures/notes.md', 'notes.md')
  expect(download).toHaveBeenNthCalledWith(2, '/fixtures/notes.md', 'notes.md')
  expect(reader.readText).not.toHaveBeenCalled()
  expect(reader.readDataUrl).not.toHaveBeenCalled()
})
