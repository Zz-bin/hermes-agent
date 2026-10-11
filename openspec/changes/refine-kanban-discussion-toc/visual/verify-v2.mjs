import { chromium } from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'
const root = new URL('.', import.meta.url).pathname
const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome' })
const page = await browser.newPage({ viewport: { width: 1234, height: 870 } })
const checks = [], errors = [], requests = []
page.on('pageerror', e => errors.push(e.message))
page.on('request', r => requests.push(r.url()))
const check = (name, pass, data = {}) => checks.push({ name, pass: !!pass, ...data })
const settle = () => page.waitForTimeout(120)
const height = () => page.locator('textarea').evaluate(e => e.getBoundingClientRect().height)
try {
  await page.goto('file://' + root + 'index.html')
  check('独立第二版标明模拟', await page.getByText('模拟交互设计稿 v2 · 不连接业务服务').isVisible())
  const css = await page.locator('textarea').evaluate(e => {
    const c = getComputedStyle(e.closest('.composer')), t = getComputedStyle(e)
    return { outer: c.backgroundColor, border: c.borderTopWidth, inner: t.backgroundColor, page: getComputedStyle(document.body).backgroundColor, resize: t.resize }
  })
  check('外围透明无框，编辑区背景区分且禁止拖动', css.outer === 'rgba(0, 0, 0, 0)' && css.border === '0px' && css.inner !== css.page && css.resize === 'none', css)
  await page.locator('textarea').fill('一行'); await settle(); const short = await height()
  await page.locator('textarea').fill('第一行\n第二行\n第三行\n第四行'); await settle(); const multi = await height()
  check('实际输入多行自动增高', multi > short, { short, multi })
  await page.locator('textarea').fill(Array.from({ length: 40 }, (_, i) => '模拟第' + i + '行').join('\n')); await settle()
  check('长草稿受上限约束且内部滚动', await page.locator('textarea').evaluate(e => e.clientHeight < e.scrollHeight && e.getBoundingClientRect().height <= Math.min(160, innerHeight * .25)))
  await page.locator('textarea').fill(''); await settle()
  check('删除内容自动缩回', await height() === short)
  await page.locator('textarea').evaluate(e => {
    const event = new Event('paste', { bubbles: true })
    Object.defineProperty(event, 'clipboardData', { value: { files: [], getData: () => '' } })
    e.value = '粘贴第一行\n粘贴第二行\n粘贴第三行\n粘贴第四行'
    e.dispatchEvent(event)
  }); await settle()
  check('粘贴后重算高度（模拟粘贴事件）', await height() > short)
  await page.locator('textarea').fill('随宽度换行的模拟内容'.repeat(12)); await settle(); const wide = await height()
  await page.setViewportSize({ width: 390, height: 800 }); await settle(); const narrow = await height()
  check('改窄按真实换行增高', narrow > wide, { wide, narrow })
  await page.locator('button[data-region="materials"]').click(); await page.locator('button[data-region="discussion"]').click(); await settle()
  check('区域切换保留草稿及自动高度', (await page.locator('textarea').inputValue()).length > 0 && await height() === narrow)
  await page.setViewportSize({ width: 1234, height: 870 }); await settle()
  const labels = await page.locator('.material-name').allTextContents()
  check('默认材料标签只含文件名', labels.length > 0 && labels.every(s => !s.includes('/') && !s.includes('\\')))
  check('关联材料和全部附件都提供复制图标', await page.locator('.copy-path').count() === await page.locator('.material-row').count())
  const long = page.locator('#comment-materials .material-name').last()
  check('长文件名单行省略不挤图标', await long.evaluate(e => {
    const c = getComputedStyle(e), row = e.parentElement.getBoundingClientRect(), buttons = [...e.parentElement.querySelectorAll('.material-action')]
    return e.scrollWidth > e.clientWidth && c.textOverflow === 'ellipsis' && c.whiteSpace === 'nowrap' && buttons.every(b => b.getBoundingClientRect().width >= 24 && b.getBoundingClientRect().right <= row.right + 1)
  }))
  check('复制图标无文字或冗余提示', await page.locator('.copy-path').evaluateAll(es => es.every(e => !e.textContent.trim() && !e.hasAttribute('title') && e.getAttribute('aria-label').includes('复制完整路径'))))
  // Capture just the supplied text: this verifies the prototype handler, not the system clipboard.
  await page.evaluate(() => {
    window.capturedPaths = []
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => window.capturedPaths.push(text) } })
  })
  const expectedRoot = '/home/capz/worktrees/hermes-kanban-detail/openspec/changes/refine-kanban-discussion-toc/'
  await page.locator('#comment-materials .copy-path').first().click()
  await page.locator('#attachments .copy-path').first().click()
  check('两个首ZIP均复制完整原路径（隔离替身）', await page.evaluate(expected => capturedPaths.length === 2 && capturedPaths.every(p => p === expected), expectedRoot + 'visual/kanban-discussion-demo-v2.zip'))
  await page.locator('#comment-materials .copy-path').nth(1).click()
  check('其他材料复制路径而非文件名（隔离替身）', await page.evaluate(expected => capturedPaths.at(-1) === expected, expectedRoot + 'design.md'))
  check('成功短暂勾号且不添加文字提示', await page.locator('#comment-materials .copy-path').nth(1).textContent() === '✓' && await page.locator('#material-status').textContent() === '')
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('模拟剪贴板拒绝') } } }))
  await page.locator('#comment-materials .copy-path').nth(2).click()
  check('复制失败可人工选择完整路径', await page.locator('#material-status input').inputValue() === expectedRoot + 'specs/kanban-detail-inspection/spec.md' && await page.getByText('无法复制路径，请选择下面完整路径后手动复制。').isVisible())
  await page.locator('#desc').focus(); await page.keyboard.press('Enter')
  check('键盘展开状态与内容一致', await page.locator('#desc').getAttribute('aria-expanded') === 'true' && await page.locator('#desc-extra').isVisible())
  const disclosure = await page.locator('#desc').evaluate(e => { const c = getComputedStyle(e); return { color: c.color, accent: getComputedStyle(document.documentElement).getPropertyValue('--ui-accent'), filter: c.filter, backdrop: c.backdropFilter, outline: c.outlineWidth, decoration: c.textDecorationLine } })
  check('展开控件有强调与清晰焦点，无模糊', disclosure.filter === 'none' && disclosure.backdrop === 'none' && disclosure.outline === '2px' && disclosure.decoration.includes('underline'), disclosure)
  await page.keyboard.press('Enter')
  check('键盘收起恢复状态', await page.locator('#desc').getAttribute('aria-expanded') === 'false' && !await page.locator('#desc-extra').isVisible())
  await page.locator('#comment-materials .material-name').first().click()
  await page.locator('textarea').fill('编辑区自动适应内容\n周围透明，只有一层边线\n保留草稿与图片入口'); await settle()
  await page.screenshot({ path: root + 'v2-wide.png' })
  for (const size of [{ width: 390, height: 800 }, { width: 640, height: 400 }]) {
    await page.setViewportSize(size); await settle()
    await page.locator('.scroller').evaluate(e => e.scrollTop = e.scrollHeight); await settle()
    const floor = await page.locator('.floor').last().boundingBox(), view = await page.locator('.scroller').boundingBox()
    check('自动增高后末楼底部可读 ' + size.width, floor.y + floor.height <= view.y + view.height + 1 && view.height > 40, { floor, view })
    await page.screenshot({ path: root + 'v2-discussion-' + size.width + '.png' })
    await page.locator('button[data-region="materials"]').click()
    await page.locator('#comment-materials').scrollIntoViewIfNeeded(); await settle()
    check('窄低屏材料行与操作不溢出 ' + size.width, await page.locator('#comment-materials .material-row').evaluateAll(es => es.every(e => e.scrollWidth <= e.clientWidth)) && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: root + 'v2-materials-' + size.width + '.png' })
    await page.locator('button[data-region="discussion"]').click()
  }
  check('无业务或网络请求', requests.every(url => url.startsWith('file:')))
  check('无脚本异常', errors.length === 0, { errors })
} finally {
  await writeFile(root + 'v2-results.json', JSON.stringify({ kind: 'planning-only synthetic standalone prototype; clipboard success uses isolated replacement, NOT system clipboard or installed-client acceptance', checks, total: checks.length, passed: checks.filter(c => c.pass).length, errors, requests }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ total: checks.length, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass) }))
if (checks.some(c => !c.pass)) process.exitCode = 1
