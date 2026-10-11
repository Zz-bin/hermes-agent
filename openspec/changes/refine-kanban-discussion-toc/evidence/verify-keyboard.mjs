import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'

const root = new URL('.', import.meta.url).pathname
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1234, height: 870 } })
const results = []
const errors = []
page.on('pageerror', error => errors.push(error.message))
const pause = () => page.waitForTimeout(400)
const check = (name, pass, data) => {
  results.push({ name, pass: Boolean(pass), ...data })
  if (!pass) console.error('FAIL', name, data)
}
const load = async (short = true) => {
  await page.goto('http://127.0.0.1:43313/evidence/product.html?count=40' + (short ? '&short=1' : ''), { waitUntil: 'networkidle' })
  await page.waitForSelector('.kanban-floor-line')
}
const locate = async (last = true) => {
  const lines = page.locator('.kanban-floor-line')
  await (last ? lines.last() : lines.first()).click()
  await pause()
  return last ? '96' : '174'
}
const snapshot = () => page.evaluate(async () => {
  const { readingFloor } = await import('/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/discussion-position.ts')
  const scroller = document.querySelector('.kanban-detail-reading')
  const list = document.querySelector('.kanban-discussion ul')
  const bounds = scroller.getBoundingClientRect(), region = list.getBoundingClientRect()
  const active = document.querySelector('.kanban-floor-line[aria-current]')?.dataset.floorId
  const floors = [...list.querySelectorAll('[data-comment-id]')].map(item => {
    const rect = item.getBoundingClientRect()
    return { id: item.dataset.commentId, top: rect.top, bottom: rect.bottom }
  })
  return { scrollTop: scroller.scrollTop, active, expected: readingFloor(floors, Math.max(region.top, bounds.top), Math.min(region.bottom, bounds.bottom), active), context: document.querySelector('[data-comment-context]')?.dataset.commentContext }
})
try {
  for (const [kind, key, last] of [['header', 'PageUp', true], ['header', 'PageDown', false], ['disclosure', 'PageUp', true], ['disclosure', 'PageDown', false], ['link', 'PageUp', true], ['link', 'PageDown', false]]) {
    await load(kind !== 'disclosure')
    const id = await locate(last)
    const floor = page.locator(`[data-comment-id="${id}"]`)
    if (kind === 'link') {
      // Explicit isolated focus fixture; no navigation or real link request.
      await floor.evaluate(element => {
        const link = document.createElement('a')
        link.href = '#fixture-only'
        link.textContent = '模拟可聚焦链接'
        link.dataset.keyboardFixture = ''
        element.append(link)
      })
    }
    const control = floor.locator(kind === 'header' ? 'button[aria-pressed]' : kind === 'disclosure' ? 'button[aria-expanded]' : 'a[data-keyboard-fixture]')
    await control.focus()
    const before = await snapshot()
    for (let i = 0; i < (kind === 'disclosure' ? 3 : 1); i++) { await page.keyboard.press(key); await pause() }
    const after = await snapshot()
    check(`${kind} ${key}实际主栏滚动恢复阅读且历史不变`, after.scrollTop !== before.scrollTop && after.active !== id && after.active === after.expected && after.context === before.context, { before, after })
  }
  await load()
  let id = await locate()
  await page.locator(`[data-comment-id="${id}"] button[aria-pressed]`).focus()
  let before = await snapshot()
  await page.keyboard.press('PageDown'); await pause()
  let after = await snapshot()
  check('按钮焦点滚动上限无位移不解锁', after.scrollTop === before.scrollTop && after.active === id, { before, after })
  await page.keyboard.press('Tab'); await pause()
  check('非滚动按键不解锁', (await snapshot()).active === id)
  await page.setViewportSize({ width: 1100, height: 800 }); await pause()
  check('按键无位移后窗口变化不解锁', (await snapshot()).active === id)
  await page.locator('.kanban-floor-line').last().focus()
  await page.keyboard.press('Home'); await pause()
  check('目录键盘只移动目录焦点不解锁', (await snapshot()).active === id)
  await page.keyboard.press('PageUp'); await pause()
  check('目录内部翻页不解锁', (await snapshot()).active === id)
  await load(false)
  id = await locate()
  await page.locator(`[data-comment-id="${id}"] button[aria-expanded]`).click(); await pause()
  check('展开收起布局变化保持定位锁', (await snapshot()).active === id)
  await page.locator('.kanban-comment-input').fill('编辑器内部模拟文字\n'.repeat(60))
  await page.locator('.kanban-comment-input').press('PageUp'); await pause()
  check('编辑器内部滚动和增高不解锁', (await snapshot()).active === id)
  await page.locator('.kanban-floor-line').last().focus(); await pause()
  await page.keyboard.press('PageUp'); await pause()
  check('长预览和目录内部滚动不解锁', (await snapshot()).active === id)
  await page.keyboard.press('Escape'); await pause()
  check('Esc关闭预览不解锁或关闭详情', (await snapshot()).active === id && !await page.evaluate(() => Boolean(window.fixtureClosed)))
  await load()
  id = await locate()
  const header = page.locator(`[data-comment-id="${id}"] button[aria-pressed]`)
  await header.evaluate(element => element.addEventListener('keydown', event => event.preventDefault(), { once: true }))
  await header.focus(); before = await snapshot()
  await page.keyboard.press('PageUp'); await pause(); after = await snapshot()
  check('控件取消的翻页按键不滚动不解锁', after.scrollTop === before.scrollTop && after.active === id, { before, after })
  check('无页面异常', errors.length === 0, { errors })
} catch (error) { check('执行完成', false, { error: error.stack }) }
finally {
  const output = { kind: '真实TaskDrawer+隔离API；链接焦点为显式DOM测试夹具；非安装端；无业务写入', results, errors, passed: results.filter(result => result.pass).length, total: results.length }
  await writeFile(root + (process.env.KEYBOARD_RESULTS ?? 'keyboard-results.json'), JSON.stringify(output, null, 2) + '\n')
  console.log(JSON.stringify({ passed: output.passed, total: output.total }))
  await browser.close()
}
if (results.some(result => !result.pass)) process.exitCode = 1
