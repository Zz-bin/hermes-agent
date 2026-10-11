import assert from 'node:assert/strict'
import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const checks = [], errors = []
const check = (name, value) => { assert(value, name); checks.push(name) }
page.on('pageerror', e => errors.push(e.message))
const close = () => page.getByRole('dialog').last().getByRole('button', { name: 'Close', exact: true }).last().click()
try {
  await page.goto('http://127.0.0.1:43311/implementation.html', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Add a comment…' }).fill('Preserved isolated draft')
  await page.evaluate(() => window.fixture.select(null))
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.evaluate(() => window.fixture.select(window.fixture.info.task_id))
  await page.getByRole('textbox', { name: 'Add a comment…' }).waitFor()
  check('closing and reopening retains the original source-scoped draft', await page.getByRole('textbox', { name: 'Add a comment…' }).inputValue() === 'Preserved isolated draft')
  for (const [filename, text] of [['unknown.bin','This looks like a binary file'], ['oversized.txt','This file is large'], ['missing.txt','File not found'], ['denied.txt','File is not readable']]) {
    await page.getByRole('button', { name: `Open ${filename}`, exact: true }).click()
    await page.getByRole('dialog').last().getByText(text, { exact: false }).waitFor()
    check(`${filename} has a safe honest result and no edit or force-preview action`, await page.getByRole('dialog').last().getByRole('button', { name: /^(Edit|Preview anyway)$/ }).count() === 0)
    await close()
  }
  check('failure and unavailable previews never start saving', await page.evaluate(() => window.saves.length === 0))
  let release, responseReady
  const gate = new Promise(resolve => release = resolve), ready = new Promise(resolve => responseReady = resolve)
  const delayed = async route => {
    const response = await route.fetch()
    responseReady()
    await gate
    await route.fulfill({ response })
  }
  await page.route('**/api/fs/read-text?*notes.md*', delayed)
  await page.getByRole('button', { name: 'Open notes.md', exact: true }).click()
  await ready
  await close()
  await page.getByRole('button', { name: 'Open unknown.bin', exact: true }).click()
  await page.getByRole('dialog').last().getByText('This looks like a binary file').waitFor()
  release()
  await page.waitForResponse(response => response.url().includes('/api/fs/read-text?') && response.url().includes('notes.md'))
  check('late authenticated response cannot replace a different material preview', !(await page.getByRole('dialog').last().innerText()).includes('Original authenticated backend content.'))
  await page.unroute('**/api/fs/read-text?*notes.md*', delayed)
  await close()
  const assignee = page.getByRole('button', { name: 'Assignee', exact: true })
  const current = await page.evaluate(async () => {
    const detail = await fetch(`http://127.0.0.1:43312/api/plugins/kanban/tasks/${window.fixture.info.task_id}`, { headers: { 'X-Hermes-Session-Token': 'isolated-fixture-only' } }).then(r => r.json())
    return detail.task.assignee
  })
  assert(['builder', 'reviewer'].includes(current))
  const next = current === 'builder' ? 'reviewer' : 'builder'
  await assignee.click()
  check('current assignee is not a second assignment action', await page.getByRole('menuitem', { name: new RegExp(current) }).getAttribute('aria-disabled') === 'true')
  await page.getByRole('menuitem', { name: new RegExp(next) }).click()
  await assignee.getByText(next, { exact: true }).waitFor()
  check('real reassignment reads back the new assignee', await page.evaluate(async name => {
    const detail = await fetch(`http://127.0.0.1:43312/api/plugins/kanban/tasks/${window.fixture.info.task_id}`, { headers: { 'X-Hermes-Session-Token': 'isolated-fixture-only' } }).then(r => r.json())
    return detail.task.assignee === name
  }, next))
  check('ordinary assignment is not written as a formal historical handoff', await page.evaluate(() => window.requests.filter(r => r.path.endsWith('/comments')).length === 0))
  check('no renderer script errors on recovery paths', errors.length === 0)
} finally {
  await writeFile(new URL('recovery-results.json', import.meta.url), JSON.stringify({ scope: 'Actual native drawer and isolated authenticated HTTP APIs; delayed delivery is a Playwright transport fault, not production network behavior', checks, errors }, null, 2))
  await page.screenshot({ path: new URL('implementation-recovery.png', import.meta.url).pathname })
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, checks }))
