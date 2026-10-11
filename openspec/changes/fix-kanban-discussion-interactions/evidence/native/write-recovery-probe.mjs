import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const checks = []
const check = (name, value) => { assert(value, name); checks.push(name) }
try {
  await page.goto('http://127.0.0.1:43311/implementation.html', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Add a comment' }).waitFor()

  const read = () => page.evaluate(async () => (await fetch(`http://127.0.0.1:43312/api/plugins/kanban/tasks/${window.fixture.info.task_id}`, { headers: { authorization: 'Bearer isolated-fixture-only' } })).json())
  const note = `Committed comment with lost response ${Date.now()}`
  let commentPosts = 0
  await page.route(url => url.pathname.endsWith('/comments'), async route => {
    if (route.request().method() !== 'POST') return route.continue()
    commentPosts++
    const response = await route.fetch()
    assert(response.ok(), 'real server must commit successfully before intentionally losing its response')
    await route.abort('failed')
  })
  await page.getByRole('textbox', { name: 'Add a comment' }).fill(note)
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await page.getByRole('button', { name: 'Check original task', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('textarea')?.value === '')
  check('lost comment response is resolved against the real original database without a duplicate POST', commentPosts === 1 && (await read()).comments.filter(comment => comment.body === note).length === 1)
  await page.unrouteAll({ behavior: 'wait' })

  const imageNote = `Committed image with lost response ${Date.now()}`
  const baseline = new Set((await read()).attachments.map(attachment => String(attachment.id)))
  let uploadPosts = 0, savedImage, firstImage
  await page.route(url => url.pathname.endsWith('/attachments'), async route => {
    if (route.request().method() !== 'POST') return route.continue()
    uploadPosts++
    const response = await route.fetch()
    assert(response.ok(), 'real upload must commit before intentionally losing its response')
    if (uploadPosts === 1) {
      firstImage = (await response.json()).attachment
      return route.fulfill({ response })
    }
    savedImage = (await response.json()).attachment
    await route.abort('failed')
  })
  await page.getByRole('textbox', { name: 'Add a comment' }).fill(imageNote)
  const filename = `lost-response-${Date.now()}.png`
  const firstFilename = `first-${filename}`
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9kAAAAASUVORK5CYII=', 'base64')
  await page.locator('input[type=file][accept="image/*"]').setInputFiles([{ name: firstFilename, mimeType: 'image/png', buffer: png }, { name: filename, mimeType: 'image/png', buffer: png }])
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await page.getByRole('button', { name: 'Check original task', exact: true }).click()
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].some(button => button.textContent === 'Check original task'))
  check('byte-level recovery excludes the first saved image while resolving the second identical image with a lost response', uploadPosts === 2 && (await page.getByRole('textbox', { name: 'Add a comment' }).inputValue()) === imageNote)
  await page.unrouteAll({ behavior: 'wait' })
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('textarea')?.value === '')
  const detail = await read()
  const saved = detail.comments.filter(comment => comment.body.startsWith(imageNote))
  check('partial-success manual continuation references both original attachment IDs without re-uploading either image', saved.length === 1 && saved[0].body.includes(`kanban-attachment:${savedImage.id}`) && saved[0].body.includes(`kanban-attachment:${firstImage.id}`) && detail.attachments.filter(attachment => !baseline.has(String(attachment.id))).length === 2)
  await page.screenshot({ path: new URL('implementation-write-recovery.png', import.meta.url).pathname })
} finally {
  await writeFile(new URL('write-recovery-results.json', import.meta.url), JSON.stringify({ checks }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, checks }))
