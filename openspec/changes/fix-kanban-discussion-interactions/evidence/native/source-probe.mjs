import assert from 'node:assert/strict'
import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage()
const checks = []
const check = (name, value) => { assert(value, name); checks.push(name) }
let result
try {
  await page.goto('http://127.0.0.1:43311/implementation.html', { waitUntil: 'networkidle' })
  result = await page.evaluate(async () => {
    const f = window.fixture
    const audit = async port => fetch(`http://127.0.0.1:${port}/fixture-audit`, { headers: { 'X-Hermes-Session-Token': 'isolated-fixture-only' } }).then(r => r.json())
    const beforeA = (await audit(43312)).length, beforeB = (await audit(43313)).length
    const infoB = await fetch('http://127.0.0.1:43313/fixture-info').then(r => r.json())
    const materialPath = async (port, id) => {
      const detail = await fetch(`http://127.0.0.1:${port}/api/plugins/kanban/tasks/${id}`, { headers: { 'X-Hermes-Session-Token': 'isolated-fixture-only' } }).then(r => r.json())
      return detail.attachments.find(a => a.filename === 'notes.md').stored_path
    }
    const pathA = await materialPath(43312, f.info.task_id)
    const pathB = await materialPath(43313, infoB.task_id)
    f.set('local', 'builder')
    const a = f.capture()
    const taskA = await f.task(f.info.task_id)
    f.set('remote', 'reviewer')
    const b = f.capture()
    const taskB = await f.task(infoB.task_id)
    const values = []
    // Local/remote and profile identities both alternate. Previously acquired readers do not.
    for (const [connection, profile] of [['local','builder'], ['remote','reviewer'], ['local','builder']]) {
      f.set(connection, profile)
      values.push((await a.reader.readText(pathA)).text)
      values.push((await b.reader.readText(pathB)).text)
    }
    f.set('remote', 'reviewer')
    const saving = await a.save(pathA, 'notes.md')
    const note = `Original owner write ${Date.now()}`
    await taskA.actions.comment(note)
    const savedA = await taskA.actions.read(), savedB = await taskB.actions.read()
    const rosterA = await taskA.actions.profiles()
    f.set('local', 'builder')
    const rosterB = await taskB.actions.profiles()
    f.set('remote', 'reviewer')
    let failure = ''
    try { await a.reader.readText(pathA.replace('notes.md', 'missing.txt')) } catch (error) { failure = String(error) }
    return { values, saving, failure, savedOriginal: savedA.comments.some(c => c.body === note), absentOther: !savedB.comments.some(c => c.body === note), rosterA: rosterA.profiles.map(p => p.name), rosterB: rosterB.profiles.map(p => p.name), saves: window.saves, requestsA: (await audit(43312)).slice(beforeA), requestsB: (await audit(43313)).slice(beforeB) }
  })
  check('both captured readers use real authenticated file routers across local/remote/local and A/B/A', result.values.length === 6 && result.values.every(value => value.includes('Original authenticated backend content.')))
  const aReads = result.requestsA.filter(r => r.path.startsWith('/api/fs/') && r.method === 'GET'), bReads = result.requestsB.filter(r => r.path.startsWith('/api/fs/') && r.method === 'GET')
  check('original local owner sends all its reads only to server A with builder identity', aReads.length === 4 && aReads.every(r => r.path === '/api/fs/read-text' && r.profile === 'builder'))
  check('original remote owner sends all its reads only to server B with reviewer identity', bReads.length === 3 && bReads.every(r => r.path === '/api/fs/read-text' && r.profile === 'reviewer'))
  check('missing original file fails rather than reading the new owner', result.failure.includes('404'))
  check('comment committed only to the original database after switching the active source', result.savedOriginal && result.absentOther)
  check('both assignment rosters remain bound to their original task owners', result.requestsA.some(r => r.path.endsWith('/profiles') && r.profile === 'builder' && r.method === 'GET') && result.requestsB.some(r => r.path.endsWith('/profiles') && r.profile === 'reviewer' && r.method === 'GET'))
  check('save cancellation remains bound to original owner (Electron save dialog is simulated)', result.saves.at(-1).connectionId === 'local' && result.saves.at(-1).profile === 'builder')
} finally {
  await writeFile(new URL('source-results.json', import.meta.url), JSON.stringify({ scope: 'Two isolated real HTTP routers, databases and HOME roots on Ubuntu; canonical auth; simulated Electron IPC routing, not a second physical machine', checks, result }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, checks }))
