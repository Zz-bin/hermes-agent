import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
const fixtureRoot = resolve(process.argv[2])
assert(fixtureRoot.startsWith(resolve(process.env.TMPDIR) + sep))
const ids = JSON.parse(await readFile(fixtureRoot + '/edge-fixtures.json', 'utf8'))
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const checks = []
const check = (name, value) => { assert(value, name); checks.push(name) }
try {
  await page.goto('http://127.0.0.1:43311/implementation.html', { waitUntil: 'networkidle' })
  assert.equal(await page.evaluate(() => window.fixture.info.root), fixtureRoot)
  await page.evaluate(id => window.fixture.select(id), ids.empty)
  await page.getByText('Isolated empty directory', { exact: true }).waitFor()
  await page.getByText('No discussion yet', { exact: true }).waitFor()
  check('empty actual discussion shows an honest empty state without ghost directory targets', await page.getByRole('button', { name: 'Discussion floors', exact: true }).count() === 0)
  await page.evaluate(id => window.fixture.select(id), ids.large)
  await page.getByText('Isolated large directory', { exact: true }).waitFor()
  await page.locator('[data-comment-id]').first().waitFor()
  check('all 240 real floors retain their original identifiers', await page.locator('[data-comment-id]').count() === 240)
  const target = await page.locator('[data-comment-id]').last().getAttribute('data-comment-id')
  const trigger = page.getByRole('button', { name: 'Discussion floors', exact: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await trigger.focus()
  await trigger.press('Enter')
  const input = page.getByRole('textbox', { name: 'Jump to #' })
  await input.waitFor()
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Jump to #', null, { timeout: 2000 })
  check('keyboard opening focuses the direct original-ID input even with a large directory', await input.evaluate(element => element === document.activeElement))
  check('reduced-motion menu has no animation', await page.locator('.kanban-floor-menu').evaluate(element => getComputedStyle(element).animationName === 'none'))
  await input.fill('999999')
  await input.press('Enter')
  await page.getByText('Floor not found. Check its number.', { exact: true }).first().waitFor()
  check('nonexistent original ID leaves all floors unselected', await page.locator('[data-comment-id] button[aria-pressed=true]').count() === 0)
  await input.press('Escape')
  await page.locator('.kanban-floor-menu').waitFor({ state: 'hidden' })
  check('Escape closes only the directory and returns focus without closing the drawer', await page.getByRole('dialog').count() === 1 && await trigger.evaluate(element => element === document.activeElement))
  await trigger.press('Enter')
  await input.fill(target)
  await input.press('Enter')
  await page.locator(`[data-comment-id="${target}"]:focus`).waitFor()
  check('large directory keyboard jump locates the original final floor without selecting context', await page.locator(`[data-comment-id="${target}"] button[aria-pressed]`).getAttribute('aria-pressed') === 'false')
  await page.screenshot({ path: new URL('implementation-large-directory.png', import.meta.url).pathname })
} catch (error) {
  console.error(await page.evaluate(() => ({ active: { tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') }, trigger: document.querySelector('[aria-label="Discussion floors"]')?.getAttribute('aria-expanded'), input: !!document.querySelector('[aria-label="Jump to #"]') })))
  await page.screenshot({ path: new URL('edge-failure.png', import.meta.url).pathname })
  throw error
} finally {
  await writeFile(new URL('edge-results.json', import.meta.url), JSON.stringify({ fixtureRoot, ids, checks }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, checks }))
