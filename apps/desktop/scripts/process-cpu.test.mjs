import { spawn } from 'node:child_process'
import { once } from 'node:events'

import { describe, expect, it } from 'vitest'

import { startProcessCpuSampler } from './perf/lib/process-cpu.mjs'

const fixture = `
  const { spawn } = require('node:child_process')
  const child = spawn(process.execPath, ['-e', \`
    process.send('ready')
    process.on('message', message => {
      if (message === 'burn') {
        const end = performance.now() + 1300
        while (performance.now() < end) Math.sqrt(Math.random())
        process.send('done')
      }
    })
  \`, '--', '--type=renderer'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] })
  child.on('message', message => process.send({ message, pid: child.pid }))
  process.on('message', message => {
    if (message === 'stop') {
      child.once('exit', () => process.exit(0))
      child.kill()
    } else child.send(message)
  })
`

async function startFixture() {
  const root = spawn(process.execPath, ['-e', fixture], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] })
  const [message] = await once(root, 'message')

  return { root, rendererPid: message.pid }
}

async function stopFixture(root) {
  if (root.exitCode !== null || root.signalCode !== null) return

  const exited = once(root, 'exit')

  root.send('stop')
  await exited
}

describe.skipIf(process.platform !== 'linux')('process-tree CPU sampler', () => {
  it('samples descendant CPU during a blocked caller and preserves short-window peaks', async () => {
    const { root, rendererPid } = await startFixture()
    const sampler = startProcessCpuSampler({ pid: root.pid, intervalMs: 25 })

    try {
      await sampler.ready
      const finished = once(root, 'message')

      root.send('burn')
      // Main-thread timers cannot run here; the sampler must keep collecting.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350)
      await finished
      const report = await sampler.stop()
      const renderer = report.processes.find(item => item.pid === rendererPid)
      const earlySamples = report.samples.filter(item => item.elapsedMs > 25 && item.elapsedMs < 325)

      expect(earlySamples.length).toBeGreaterThanOrEqual(4)
      expect(renderer.kind).toBe('renderer')
      expect(renderer.observedCpuMs).toBeGreaterThan(100)
      expect(report.samples.at(-1).cpuMs).toBeGreaterThanOrEqual(renderer.observedCpuMs)
      expect(report.processes.some(item => item.pid === root.pid && item.kind === 'main')).toBe(true)

      for (const windowMs of [100, 250, 1000]) {
        const peak = renderer.windows[windowMs]

        expect(peak.durationMs).toBeGreaterThanOrEqual(windowMs)
        expect(peak.corePct).toBeCloseTo((100 * peak.cpuMs) / peak.durationMs)
        expect(peak.machinePct).toBeCloseTo(peak.corePct / report.logicalCpuCount)
        expect(peak.maxCpuMs).toBeGreaterThanOrEqual(peak.cpuMs)
      }
      expect(await sampler.stop()).toBe(report)
    } finally {
      try {
        await sampler.stop()
      } finally {
        await stopFixture(root)
      }
    }
  }, 10_000)

  it('reports missing windows and rejects nonexistent or exited roots instead of returning a report', async () => {
    const { root, rendererPid } = await startFixture()
    const sampler = startProcessCpuSampler({ pid: root.pid, pidTypes: { [rendererPid]: 'GPU' } })
    let exitedRootSampler

    try {
      await sampler.ready
      const report = await sampler.stop()

      expect(report.sampleCount).toBeGreaterThanOrEqual(2)
      expect(report.windows[1000]).toBeNull()
      expect(report.processes.every(item => item.windows[1000] === null)).toBe(true)
      expect(report.processes.find(item => item.pid === rendererPid)).toMatchObject({
        kind: 'GPU',
        inferredKind: 'renderer'
      })
      expect(() => startProcessCpuSampler({ pid: 2_147_483_647 })).toThrow('does not exist')

      exitedRootSampler = startProcessCpuSampler({ pid: root.pid })
      await exitedRootSampler.ready
      await stopFixture(root)
      await expect(exitedRootSampler.stop()).rejects.toThrow('exited or was replaced')
    } finally {
      try {
        await sampler.stop()
        if (exitedRootSampler) await exitedRootSampler.stop().catch(() => {})
      } finally {
        await stopFixture(root)
      }
    }
  }, 10_000)
})
