import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, readlinkSync } from 'node:fs'
import { cpus } from 'node:os'
import { basename } from 'node:path'
import { performance } from 'node:perf_hooks'
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'

const WORKER_TAG = 'hermes-process-cpu'
const WINDOWS_MS = [100, 250, 1000]

function readProcess(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')

    return {
      pid,
      state: fields[0],
      parentPid: Number(fields[1]),
      ticks: Number(fields[11]) + Number(fields[12]),
      startTicks: Number(fields[19])
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return null
    throw error
  }
}

function processKind(pid, rootPid) {
  try {
    const executable = basename(readlinkSync(`/proc/${pid}/exe`)).toLowerCase()
    const args = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0')
    const chromiumType = args.find(arg => arg.startsWith('--type='))?.slice(7)

    if (chromiumType) return chromiumType
    if (pid === rootPid) return 'main'
    if (executable.startsWith('python')) return 'python'
    if (executable === 'node') return 'node'
    return 'other'
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return pid === rootPid ? 'main' : 'other'
    throw error
  }
}

// Children may be forked by any thread, not just the process's main thread.
function childPids(pid) {
  try {
    const children = new Set()

    for (const tid of readdirSync(`/proc/${pid}/task`)) {
      try {
        const value = readFileSync(`/proc/${pid}/task/${tid}/children`, 'utf8').trim()

        if (value) for (const child of value.split(/\s+/)) children.add(Number(child))
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error
      }
    }

    return children
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return []
    throw error
  }
}

function peaks(samples, cpuAt, logicalCpuCount) {
  return Object.fromEntries(
    WINDOWS_MS.map(windowMs => {
      let left = 0
      let peak = null
      let maxCpuMs = 0

      for (let right = 1; right < samples.length; right++) {
        const endMs = samples[right].elapsedMs

        while (left + 1 < right && samples[left + 1].elapsedMs <= endMs - windowMs) left++

        const startMs = samples[left].elapsedMs
        const durationMs = endMs - startMs

        if (durationMs < windowMs) continue

        const cpuMs = cpuAt(samples[right]) - cpuAt(samples[left])
        const corePct = (100 * cpuMs) / durationMs

        maxCpuMs = Math.max(maxCpuMs, cpuMs)
        if (!peak || corePct > peak.corePct) {
          peak = { cpuMs, corePct, machinePct: corePct / logicalCpuCount, startMs, endMs, durationMs }
        }
      }

      // A run too short to contain a window is missing evidence, never zero CPU.
      return [windowMs, peak ? { ...peak, maxCpuMs } : null]
    })
  )
}

function runSampler({ pid, intervalMs, rootStartTicks, pidTypes }) {
  const ticksPerSecond = Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim())
  const logicalCpuCount = cpus().length
  const startedAt = performance.now()
  const startedAtUnixMs = Date.now()
  const startedUptimeTicks = Number(readFileSync('/proc/uptime', 'utf8').split(' ')[0]) * ticksPerSecond
  const tracked = new Map()
  const processes = new Map()
  const samples = []
  const warnings = new Set()
  let totalCpuMs = 0
  let timer

  const sample = () => {
    const root = readProcess(pid)

    if (!root || root.startTicks !== rootStartTicks || root.state === 'Z' || root.state === 'X') {
      throw new Error(`Root process ${pid} exited or was replaced during CPU sampling`)
    }

    const queue = [pid, ...tracked.keys()]
    const visited = new Set()
    const current = []
    let deltaCpuMs = 0

    while (queue.length) {
      const currentPid = queue.pop()

      if (visited.has(currentPid)) continue
      visited.add(currentPid)
      const info = readProcess(currentPid)
      const previous = tracked.get(currentPid)

      if (
        currentPid === pid &&
        (!info || info.startTicks !== rootStartTicks || info.state === 'Z' || info.state === 'X')
      ) {
        throw new Error(`Root process ${pid} exited or was replaced during CPU sampling`)
      }

      if (!info || (previous && previous.startTicks !== info.startTicks)) {
        if (previous) {
          tracked.delete(currentPid)
          warnings.add('A tracked process exited between samples; its final partial CPU interval may be unobserved.')
        }
        continue
      }

      const key = `${currentPid}:${info.startTicks}`
      let metadata = processes.get(key)

      if (!metadata) {
        const inferredKind = processKind(currentPid, pid)

        metadata = {
          pid: currentPid,
          parentPid: info.parentPid,
          startTicks: info.startTicks,
          kind: pidTypes[currentPid] ?? inferredKind,
          inferredKind,
          firstSeenMs: performance.now() - startedAt,
          observedCpuMs: 0
        }
        processes.set(key, metadata)
      }

      const ticks = previous
        ? Math.max(0, info.ticks - previous.ticks)
        : samples.length && info.startTicks >= startedUptimeTicks
          ? info.ticks
          : 0
      const processDeltaMs = (ticks * 1000) / ticksPerSecond

      if (!previous && samples.length && info.startTicks < startedUptimeTicks) {
        warnings.add('A pre-existing descendant was discovered after the baseline; CPU before discovery is unobserved.')
      }
      metadata.observedCpuMs += processDeltaMs
      deltaCpuMs += processDeltaMs
      tracked.set(currentPid, info)
      current.push({
        key,
        pid: currentPid,
        cumulativeCpuMs: (info.ticks * 1000) / ticksPerSecond,
        deltaCpuMs: processDeltaMs
      })
      queue.push(...childPids(currentPid))
    }

    totalCpuMs += deltaCpuMs
    samples.push({ elapsedMs: performance.now() - startedAt, cpuMs: totalCpuMs, deltaCpuMs, processes: current })
  }

  const finish = () => {
    clearInterval(timer)
    sample()
    const cumulative = new Map()

    for (const item of samples) {
      for (const process of item.processes)
        cumulative.set(process.key, (cumulative.get(process.key) ?? 0) + process.deltaCpuMs)
      item.processCpuMs = Object.fromEntries(cumulative)
    }

    const elapsedMs = samples.at(-1).elapsedMs - samples[0].elapsedMs
    const report = {
      rootPid: pid,
      intervalMs,
      ticksPerSecond,
      tickMs: 1000 / ticksPerSecond,
      logicalCpuCount,
      startedAtMonotonicMs: startedAt,
      startedAtUnixMs,
      elapsedMs,
      sampleCount: samples.length,
      maxSampleGapMs: Math.max(0, ...samples.slice(1).map((item, i) => item.elapsedMs - samples[i].elapsedMs)),
      windows: peaks(samples, item => item.cpuMs, logicalCpuCount),
      processes: [...processes.entries()].map(([key, metadata]) => ({
        ...metadata,
        key,
        windows: peaks(samples, item => item.processCpuMs[key] ?? 0, logicalCpuCount)
      })),
      samples,
      warnings: [...warnings]
    }

    parentPort.postMessage({ type: 'report', report })
    parentPort.close()
  }

  sample()
  parentPort.postMessage({ type: 'ready' })
  timer = setInterval(() => {
    try {
      sample()
    } catch (error) {
      clearInterval(timer)
      parentPort.postMessage({ type: 'error', message: error.stack ?? String(error) })
      parentPort.close()
    }
  }, intervalMs)
  parentPort.once('message', finish)
}

/** Read-only Linux process-tree CPU sampling in a dedicated worker.
 * Await `ready` before the measured action; `stop()` resolves after worker exit.
 * pidTypes optionally supplies authoritative CDP process types by PID. The
 * report retains inferredKind separately because Chromium can reuse zygotes.
 * Windows use the nearest sampled boundary at least 100/250/1000ms apart:
 * inspect durationMs/maxSampleGapMs rather than assuming a precise timer.
 */
export function startProcessCpuSampler({ pid, intervalMs = 25, pidTypes = {} }) {
  if (process.platform !== 'linux') throw new Error('Process CPU sampling requires Linux /proc')
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('pid must be a positive integer')
  if (!Number.isFinite(intervalMs) || intervalMs < 5 || intervalMs > 1000)
    throw new Error('intervalMs must be between 5 and 1000')
  const root = readProcess(pid)

  if (!root) throw new Error(`Process ${pid} does not exist`)
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { tag: WORKER_TAG, pid, intervalMs, rootStartTicks: root.startTicks, pidTypes }
  })
  let resolveReady
  let rejectReady
  let resolveReport
  let rejectReport
  let report
  let stopping = false
  let failure
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  const done = new Promise((resolve, reject) => {
    resolveReport = resolve
    rejectReport = reject
  })

  // Errors are still delivered to callers, without an unhandled rejection if
  // the worker fails while an unrelated interaction is being awaited.
  ready.catch(() => {})
  done.catch(() => {})
  worker.on('message', message => {
    if (message.type === 'ready') resolveReady()
    if (message.type === 'report') report = message.report
    if (message.type === 'error') failure = new Error(message.message)
  })
  worker.once('error', error => {
    failure = error
  })
  worker.once('exit', code => {
    const error = failure ?? (code || !report ? new Error(`CPU sampler exited without a report (code ${code})`) : null)

    if (error) {
      rejectReady(error)
      rejectReport(error)
    } else resolveReport(report)
  })

  return {
    ready,
    stop() {
      if (!stopping) {
        stopping = true
        worker.postMessage({ type: 'stop' })
      }
      return done
    }
  }
}

if (!isMainThread && workerData?.tag === WORKER_TAG) runSampler(workerData)
