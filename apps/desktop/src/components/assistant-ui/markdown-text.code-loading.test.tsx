import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const { loadCode } = vi.hoisted(() => ({ loadCode: vi.fn() }))

vi.mock('@streamdown/code', () => {
  loadCode()

  return { code: undefined }
})

import { MessageTextContent } from './markdown-text'

afterEach(cleanup)

it('loads code resources only when static prose gains a code block', async () => {
  const { container, rerender } = render(<MessageTextContent text="普通描述和 **讨论**，以及 `inline code`。" />)

  await waitFor(() => expect(container.querySelector('[data-streamdown=strong]')?.textContent).toBe('讨论'))
  expect(loadCode).not.toHaveBeenCalled()

  rerender(<MessageTextContent text={'代码示例：\n\n```js\nconst answer = 42\n```'} />)

  await waitFor(() => expect(loadCode).toHaveBeenCalledTimes(1))
  expect(container.textContent).toContain('const answer = 42')
})
