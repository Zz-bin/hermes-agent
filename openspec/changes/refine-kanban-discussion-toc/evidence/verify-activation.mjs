import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'

const root = new URL('.', import.meta.url).pathname
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1234, height: 870 } })
const results = [], errors = []
page.on('pageerror', error => errors.push(error.message))
const pause = () => page.waitForTimeout(400)
const check = (name, pass, data = {}) => {
  results.push({ name, pass: Boolean(pass), ...data })
  if (!pass) console.error('FAIL', name, data)
}
const snapshot = () => page.evaluate(() => ({
  scrollTop: document.querySelector('.kanban-detail-reading').scrollTop,
  active: document.querySelector('.kanban-floor-line[aria-current]')?.dataset.floorId,
  context: document.querySelector('[data-comment-context]')?.dataset.commentContext
}))
const load = async () => {
  await page.goto('http://127.0.0.1:43313/evidence/product.html?count=40', { waitUntil: 'networkidle' })
  await page.waitForSelector('.kanban-floor-line')
}
try {
  for (const position of ['last', 'middle']) {
    for (const key of ['Space', 'Enter']) {
      await load()
      const line = position === 'last' ? page.locator('.kanban-floor-line').last() : page.locator('.kanban-floor-line').nth(20)
      const id = await line.getAttribute('data-floor-id')
      await line.click(); await pause()
      const control = page.locator(`[data-comment-id="${id}"] button[aria-expanded]`)
      await control.focus(); await pause()
      for (const action of ['collapse', 'expand']) {
        const before = await snapshot()
        const wasOpen = await control.getAttribute('aria-expanded')
        await page.keyboard.press(key); await pause()
        const after = await snapshot()
        const open = await control.getAttribute('aria-expanded')
        check(`${position} ${key} ${action}激活保持目标及历史选择`,
          wasOpen !== open && open === String(action === 'expand') && before.active === id && after.active === id && after.context === before.context,
          { id, before, after, wasOpen, open })
      }
    }
  }
  for (const kind of ['floor', 'link']) {
    await load()
    const line = page.locator('.kanban-floor-line').first()
    const id = await line.getAttribute('data-floor-id')
    await line.click(); await pause()
    const floor = page.locator(`[data-comment-id="${id}"]`)
    if (kind === 'link') {
      // Explicit inert focus fixture; Space should page rather than activate this native anchor.
      await floor.evaluate(element => {
        const link = document.createElement('a')
        link.href = '#fixture-only'
        link.textContent = '模拟链接焦点'
        link.dataset.activationFixture = ''
        element.prepend(link)
      })
      await floor.locator('a[data-activation-fixture]').focus()
    } else await floor.focus()
    await pause()
    const before = await snapshot()
    await page.keyboard.press('Space'); await pause()
    const after = await snapshot()
    check(`${kind} Space仍允许原生阅读翻页`, after.scrollTop !== before.scrollTop && after.active !== id && after.context === before.context, { before, after })
  }
  check('无页面异常', errors.length === 0, { errors })
} catch (error) { check('执行完成', false, { error: error.stack }) }
finally {
  const output = { kind: '实际TaskDrawer+Chrome原生按键；API隔离，链接显式DOM夹具；非安装端无业务写入', results, errors, passed: results.filter(result => result.pass).length, total: results.length }
  await writeFile(root + (process.env.ACTIVATION_RESULTS ?? 'activation-results.json'), JSON.stringify(output, null, 2) + '\n')
  console.log(JSON.stringify({ passed: output.passed, total: output.total }))
  await browser.close()
}
if (results.some(result => !result.pass)) process.exitCode = 1
