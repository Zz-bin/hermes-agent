import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@/themes/context', () => ({
  useTheme: () => ({ resolvedMode: 'dark' as const, setMode: () => undefined })
}))

const requestThreadPageScroll = vi.hoisted(() => vi.fn())
vi.mock('@/store/thread-scroll', async importOriginal => ({
  ...(await importOriginal<object>()),
  requestThreadPageScroll
}))

import { $workspaceIsPage } from '@/app/routes'

import { useKeybinds } from './use-keybinds'

const wrapper = ({ children }: { children: ReactNode }) => createElement(MemoryRouter, null, children)
afterEach(() => {
  $workspaceIsPage.set(false)
  vi.clearAllMocks()
})

it('leaves paging to an open dialog or independent page and resumes chat paging after closing them', () => {
  const hook = renderHook(
    () =>
      useKeybinds({
        archiveSelectedSession: () => undefined,
        openNewSessionTab: () => undefined,
        requestGateway: <T,>() => Promise.resolve(undefined as T),
        startFreshSession: () => undefined,
        toggleCommandCenter: () => undefined,
        toggleSelectedPin: () => undefined
      }),
    { wrapper }
  )

  const dialog = window.document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  const floor = window.document.createElement('button')
  dialog.append(floor)

  const pageKey = (target: HTMLElement, key: string) => {
    const event = new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true })
    target.dispatchEvent(event)

    return event
  }

  try {
    for (const key of ['PageUp', 'PageDown']) {
      window.document.body.append(dialog)
      expect(pageKey(floor, key).defaultPrevented).toBe(false)
      expect(requestThreadPageScroll).not.toHaveBeenCalled()
      dialog.remove()
      $workspaceIsPage.set(true)
      expect(pageKey(window.document.body, key).defaultPrevented).toBe(false)
      expect(requestThreadPageScroll).not.toHaveBeenCalled()
      $workspaceIsPage.set(false)
      expect(pageKey(window.document.body, key).defaultPrevented).toBe(true)
      expect(requestThreadPageScroll).toHaveBeenCalledTimes(1)
      requestThreadPageScroll.mockClear()
    }
  } finally {
    dialog.remove()
    hook.unmount()
  }
})
