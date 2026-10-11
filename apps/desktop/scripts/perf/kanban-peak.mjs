/* global window, document, getComputedStyle, requestAnimationFrame */
// Real installed Electron acceptance; Linux /proc sampling includes SwiftShader.
// Open the target board first. Reads tasks and changes UI state; never writes task data.
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

import { startProcessCpuSampler } from './lib/process-cpu.mjs'

const flags = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, args) => {
    if (value.startsWith('--')) pairs.push([value.slice(2), args[index + 1]])
    return pairs
  }, [])
)
if (!flags['task-title'] || !flags.json) throw new Error('--task-title and --json are required')
// Frozen before testing the fix. 100% corePct means one fully occupied core.
const limits = {
  tree100ms: 300,
  tree250ms: 200,
  tree1000ms: 100,
  idle1000ms: 10,
  longTaskMs: 100,
  firstPaintMs: 500,
  warmPaintMs: 250,
  sampleGapMs: 50
}
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${flags.port ?? 9222}`)
let activeSampler
let page
const report = { limits, rounds: [], passed: false }
try {
  page = browser
    .contexts()
    .flatMap(context => context.pages())
    .find(page => page.url().includes('index.html'))
  if (!page) throw new Error('No desktop renderer found')
  const cdp = await browser.newBrowserCDPSession()
  const { processInfo } = await cdp.send('SystemInfo.getProcessInfo')
  const { gpu } = await cdp.send('SystemInfo.getInfo')
  const root = processInfo.find(process => process.type === 'browser')
  if (!root) throw new Error('No Electron browser PID found')
  report.processInfo = processInfo
  report.gpu = gpu
  report.url = page.url()
  if (
    flags['require-hardware'] === 'true' &&
    (gpu.featureStatus.gpu_compositing !== 'enabled' ||
      /swiftshader|llvmpipe|software/i.test(gpu.auxAttributes.glRenderer))
  )
    throw new Error('Hardware GPU compositing required')
  const pidTypes = Object.fromEntries(processInfo.map(process => [process.id, process.type]))
  const dialog = page.getByRole('dialog')
  const close = async () => {
    if (await dialog.count()) {
      await dialog
        .locator('button[aria-label="关闭"], button[aria-label="Close"]')
        .first()
        .evaluate(button => button.click())
      await dialog.waitFor({ state: 'detached' })
    }
  }
  const open = async () => {
    const card = page.getByText(flags['task-title'], { exact: true })
    if ((await card.count()) !== 1) throw new Error('Task title must identify exactly one board card')
    await card.click()
    await dialog.locator('[data-comment-id]').first().waitFor()
    if (flags['task-id'] && (await dialog.getAttribute('data-kanban-task-id')) !== flags['task-id'])
      throw new Error('Unexpected task identity')
  }
  const measure = async (name, action, { settleMs = 2200, paintLimit = limits.warmPaintMs, idle = false } = {}) => {
    await page.evaluate(() => {
      if (!PerformanceObserver.supportedEntryTypes.includes('longtask'))
        throw new Error('Long-task observation unavailable')
      window.kanbanPeakObserver?.disconnect()
      window.kanbanPeakLongTasks = []
      window.kanbanPeakObserver = new PerformanceObserver(list =>
        window.kanbanPeakLongTasks.push(
          ...list.getEntries().map(entry => ({ startMs: entry.startTime, durationMs: entry.duration }))
        )
      )
      window.kanbanPeakObserver.observe({ entryTypes: ['longtask'] })
    })
    activeSampler = startProcessCpuSampler({ pid: root.id, intervalMs: 25, pidTypes })
    await activeSampler.ready
    const startMs = Date.now()
    await action()
    const paintMs =
      (await page.evaluate(
        () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(Date.now()))))
      )) - startMs
    await page.waitForTimeout(settleMs)
    const cpu = await activeSampler.stop()
    activeSampler = null
    const longTasks = await page.evaluate(() => {
      window.kanbanPeakLongTasks.push(
        ...window.kanbanPeakObserver
          .takeRecords()
          .map(entry => ({ startMs: entry.startTime, durationMs: entry.duration }))
      )
      window.kanbanPeakObserver.disconnect()
      return window.kanbanPeakLongTasks
    })
    const effects = await dialog.evaluate(element => ({
      animation: getComputedStyle(element).animationName,
      backdrop: getComputedStyle(document.querySelector('[data-slot="dialog-overlay"]')).backdropFilter
    }))
    const failures = []
    for (const windowMs of [100, 250, 1000]) {
      const peak = cpu.windows[windowMs]
      if (!peak || peak.durationMs > windowMs + limits.sampleGapMs) failures.push(`window-coverage-${windowMs}`)
      const limit = idle
        ? windowMs === 1000
          ? limits.idle1000ms
          : limits[`tree${windowMs}ms`]
        : limits[`tree${windowMs}ms`]
      if (peak && peak.corePct > limit) failures.push(`tree${windowMs}ms`)
    }
    if (cpu.maxSampleGapMs > limits.sampleGapMs || cpu.warnings.length) failures.push('sampling-coverage')
    if (Math.max(0, ...longTasks.map(task => task.durationMs)) > limits.longTaskMs) failures.push('long-task')
    if (!idle && paintMs > paintLimit) failures.push('paint')
    report.rounds.push({ name, paintMs, effects, longTasks, cpu, failures })
    console.log(JSON.stringify({ name, paintMs, peaks: cpu.windows, failures }))
  }
  await close()
  await page.waitForTimeout(1500)
  for (let index = 0; index < 5; index++) {
    await measure(`open-${index}`, open, { paintLimit: index === 0 ? limits.firstPaintMs : limits.warmPaintMs })
    const identity = {
      id: await dialog.getAttribute('data-kanban-task-id'),
      title: await dialog.locator('h2').textContent(),
      comments: await dialog.locator('[data-comment-id]').count()
    }
    if (!report.task) report.task = identity
    else if (JSON.stringify(identity) !== JSON.stringify(report.task))
      throw new Error('Task changed during measurement')
    await close()
    await page.waitForTimeout(1300)
  }
  if (flags.feeds === 'true') {
    await open()
    await page.waitForTimeout(1500)
    for (const [feed, name] of [
      ['activity', /^(活动|Activity)/],
      ['runs', /^(运行|Runs)/],
      ['log', /^(工作单元日志|Worker log)/],
      ['comments', /^(评论|Comments)/]
    ]) {
      await measure(
        `feed-${feed}`,
        async () => {
          await dialog.locator('button[aria-pressed]').filter({ hasText: name }).click()
          await dialog.locator(`[data-kanban-feed="${feed}"][aria-busy="false"]`).waitFor()
          if ((await dialog.locator('[data-kanban-feed]').count()) !== 1) throw new Error('More than one feed mounted')
          if (feed !== 'comments' && (await dialog.locator('[data-comment-id]').count()))
            throw new Error('Inactive comments remain mounted')
        },
        { paintLimit: limits.firstPaintMs }
      )
    }
    await close()
  }
  if (flags.interactions === 'true') {
    await open()
    await page.waitForTimeout(1500)
    const description = dialog.getByRole('button', { name: /^(展开全文|Expand)$/ }).first()
    await measure('expand-description', () => description.click(), { paintLimit: limits.firstPaintMs })
    const firstComment = dialog.locator('[data-comment-id]').first()
    await firstComment.scrollIntoViewIfNeeded()
    await measure('expand-comment', () => firstComment.getByRole('button', { name: /^(展开全文|Expand)$/ }).click(), {
      paintLimit: limits.firstPaintMs
    })
    await measure('scroll-discussion', () => dialog.locator('[data-comment-id]').last().scrollIntoViewIfNeeded(), {
      paintLimit: limits.firstPaintMs
    })
    const targetId = await firstComment.getAttribute('data-comment-id')
    await measure(
      'jump-floor',
      async () => {
        await dialog.locator(`[data-floor-id="${targetId}"]`).click()
        await firstComment.waitFor({ state: 'visible' })
        if ((await firstComment.getAttribute('data-highlighted')) !== 'true')
          throw new Error('Floor jump did not highlight its target')
      },
      { paintLimit: limits.firstPaintMs }
    )
    await measure('idle-with-polling', async () => {}, { settleMs: 35000, idle: true })
    await close()
  }
  report.passed =
    report.rounds.length === 5 + (flags.feeds === 'true' ? 4 : 0) + (flags.interactions === 'true' ? 5 : 0) &&
    report.rounds.every(round => round.failures.length === 0)
} catch (error) {
  report.error = error.stack
  throw error
} finally {
  if (activeSampler)
    await activeSampler.stop().catch(error => {
      report.samplerError = error.message
    })
  if (page)
    await page
      .evaluate(() => {
        window.kanbanPeakObserver?.disconnect()
        delete window.kanbanPeakObserver
        delete window.kanbanPeakLongTasks
      })
      .catch(error => {
        report.observerCleanupError = error.message
      })
  await browser.close()
  await writeFile(flags.json, JSON.stringify(report, null, 2))
}
if (!report.passed) process.exitCode = 1
