import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider, registerPluginLocales, setRuntimeI18nLocale } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/i18n/index.ts'
import { bindApi, fetchTask } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/api.ts'
import { pluginRest } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/api/plugins.ts'
import { setApiRequestConnection, setApiRequestProfile } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/api/client.ts'
import { captureGatewayFileReader } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/lib/desktop-fs.ts'
import { captureGatewayFileDownload } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/lib/media.ts'
import { TaskDrawer } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/drawer.tsx'
import { KANBAN_LOCALES } from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/i18n.ts'
import './harness.css'
import '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/kanban.css'

const base = 'http://127.0.0.1:43312'
const info = await fetch(`${base}/fixture-info`).then(response => response.json())
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
registerPluginLocales('kanban', KANBAN_LOCALES)
setRuntimeI18nLocale('en')
setApiRequestConnection('local')
;(window as any).requests = []
;(window as any).saves = []
window.hermesDesktop = {
  api: async request => {
    ;(window as any).requests.push({ path: request.path, method: request.method ?? 'GET', connectionId: request.connectionId, profile: request.profile })
    const url = new URL(request.path, request.connectionId === 'remote' ? 'http://127.0.0.1:43313' : base)
    if (request.profile) url.searchParams.set('profile', request.profile)
    const headers: Record<string, string> = { 'X-Hermes-Session-Token': 'isolated-fixture-only' }
    let body: BodyInit | undefined
    if (request.upload) {
      const form = new FormData()
      form.set('file', new Blob([request.upload.bytes], { type: request.upload.contentType }), request.upload.filename)
      body = form
    } else if (request.body) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(request.body) }
    const response = await fetch(url, { method: request.method ?? 'GET', headers, body })
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
    return response.json()
  },
  saveGatewayFile: async request => { (window as any).saves.push(request); return { saved: false, canceled: true } }
} as any
bindApi((path, options) => pluginRest('kanban', path, options), { get: (_, fallback) => fallback, set: () => {}, remove: () => {} }, () => () => {})
;(window as any).fixture = { info, task: fetchTask, refresh: () => client.invalidateQueries(), set: (connection: string, profile: string) => { setApiRequestConnection(connection); setApiRequestProfile(profile) }, capture: () => ({ reader: captureGatewayFileReader(), save: captureGatewayFileDownload() }) }
function Fixture() {
  const [id, select] = useState<string | null>(info.task_id)
  ;(window as any).fixture.select = select
  return <TaskDrawer columns={['blocked', 'review']} id={id} onClose={() => select(null)} onOpen={select} />
}
createRoot(document.getElementById('root')!).render(<I18nProvider initialLocale="en" configClient={null}><QueryClientProvider client={client}><Fixture /></QueryClientProvider></I18nProvider>)
