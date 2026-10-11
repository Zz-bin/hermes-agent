import assert from 'node:assert/strict'
import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'

// Actual Attachment → LocalFilePreview → MarkdownPreview, isolated HTTP fixtures.
// No production API, database or Electron lifecycle is exercised.
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const checks = [], requests = [], errors = []
page.on('pageerror', error => errors.push(error.message))
let disconnected = false
const check = (name, value) => { assert(value, name); checks.push(name) }
const text = '# Original material\n\n[relative](../other.md)\n\n[absolute](/other.md)\n\n[file](file:///other.md)\n\n[preview](#preview/%2Fother.md)\n\n[heading](#original-material)\n\n[web](https://example.com/docs)'
const detail = {
  task: { id: 'isolated-rework', title: 'Isolated rework fixture', status: 'blocked', assignee: 'builder', body: 'HTTP fixture only; not installed product acceptance.' },
  comments: [], attachments: [{ id: 1, filename: 'notes.md', stored_path: '/original/notes.md', content_type: 'text/markdown' }],
  events: [], runs: [], links: { parents: [], children: [] }
}
await page.route(/http:\/\/127\.0\.0\.1:4331[23]\//, async route => {
  const url = new URL(route.request().url())
  requests.push({ port: url.port, path: url.pathname, profile: url.searchParams.get('profile'), method: route.request().method() })
  if (disconnected && url.port === '43312' && url.pathname.startsWith('/api/fs/')) return route.abort('connectionrefused')
  let data = {}
  if (url.pathname === '/fixture-info') data = { task_id: detail.task.id }
  else if (url.pathname.includes('/tasks/isolated-rework') && !url.pathname.endsWith('/log')) data = detail
  else if (url.pathname.endsWith('/log')) data = { exists: false }
  else if (url.pathname.endsWith('/profiles')) data = { profiles: [{ name: 'builder' }, { name: 'reviewer' }] }
  else if (url.pathname === '/api/fs/read-text') data = { path: '/original/notes.md', text, language: 'markdown', byteSize: text.length }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers: { 'Access-Control-Allow-Origin': '*' } })
})
await page.route('**/api/plugins/kanban/orchestration*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ default_assignee: 'builder' }), headers: { 'Access-Control-Allow-Origin': '*' } }))
const previewTabs = () => page.evaluate(async () => (await import('/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/store/preview.ts')).$previewTabs.get())
try {
  await page.goto('http://127.0.0.1:43311/implementation.html', { waitUntil: 'networkidle' })
  await page.evaluate(async () => (await import('/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/store/preview.ts')).$previewTabs.set([]))
  await page.getByRole('button', { name: 'Open notes.md', exact: true }).click()
  await page.getByText('Original material', { exact: true }).waitFor()
  const before = requests.filter(r => r.path.startsWith('/api/fs/')).length
  check('initial material read only once through captured original owner', before === 1 && requests.find(r => r.path.startsWith('/api/fs/')).port === '43312')
  for (const [connection, profile, offline] of [['local', 'builder', false], ['remote', 'reviewer', false], ['local', 'builder', false], ['remote', 'reviewer', true]]) {
    await page.evaluate(([c, p]) => window.fixture.set(c, p), [connection, profile])
    disconnected = offline
    for (const name of ['relative', 'absolute', 'file', 'preview']) {
      const link = page.getByRole('link', { name, exact: true })
      check(`${connection}/${profile}/${disconnected ? 'disconnected' : 'available'} ${name} is explicitly disabled without browser href`, await link.getAttribute('aria-disabled') === 'true' && await link.getAttribute('href') === null)
      await link.click({ force: true })
      await link.click({ button: 'middle', force: true })
      await link.dispatchEvent('keydown', { key: 'Enter' })
    }
    check(`no global preview, edit or save on ${connection}/${profile}/${disconnected}`, (await previewTabs()).length === 0 && await page.getByRole('button', { name: 'Edit', exact: true }).count() === 0 && await page.evaluate(() => window.saves.length === 0))
  }
  check('blocked file navigation makes no subsequent filesystem request', requests.filter(r => r.path.startsWith('/api/fs/')).length === before)
  const route = page.url()
  await page.getByRole('link', { name: 'heading', exact: true }).click()
  check('in-note heading navigation keeps route and no global preview', page.url() === route && (await previewTabs()).length === 0)
  await page.getByRole('link', { name: 'web', exact: true }).click()
  check('https remains a webpage and cannot become editable file preview', (await previewTabs()).some(tab => tab.target.kind === 'url' && tab.target.url === 'https://example.com/docs'))
  await page.screenshot({ path: new URL('rework-disabled-links.png', import.meta.url).pathname })
  check('no browser script errors', errors.length === 0)
  console.log(JSON.stringify({ passed: checks.length, checks }))
} finally {
  await writeFile(new URL('rework-results.json', import.meta.url), JSON.stringify({ scope: 'Chrome actual candidate components with isolated HTTP responses; no real API/database or installed Electron acceptance', checks, requests, errors }, null, 2))
  await browser.close()
}
