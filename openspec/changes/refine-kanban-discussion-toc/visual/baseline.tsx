import React from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {I18nProvider,registerPluginLocales,setRuntimeI18nLocale} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/i18n/index.ts'
import {bindApi} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/api.ts'
import {TaskDrawer} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/drawer.tsx'
import {KANBAN_LOCALES} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/i18n.ts'
import './baseline.css'
import '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/kanban.css'
registerPluginLocales('kanban',KANBAN_LOCALES);setRuntimeI18nLocale('zh-CN')
const comments=Array.from({length:5},(_,i)=>({id:96+i*2,author:i%2?'reviewer':'builder',created_at:1791650000+i,body:'【模拟讨论】第 '+(i+1)+' 条\n\n'+Array.from({length:12},(_,j)=>'段落 '+j+'：本内容只用于检查当前真实组件，不是业务评论。').join('\n\n'),context:null}))
const detail={task:{id:'fixture-only',title:'模拟卡片 · 当前源码实际组件（不是安装端）',status:'blocked',assignee:'builder',body:'模拟描述，保留原详情框架和右侧资料。',created_at:1791650000},comments,events:[{id:1,kind:'created',created_at:1791650000}],runs:[],links:{parents:[],children:[]},attachments:[]}
bindApi(async(path,options)=>{if(options?.method&&options.method!=='GET')throw Error('只读模拟，不允许业务写入');if(path.includes('/log'))return {exists:false};if(path.includes('/tasks/'))return detail;if(path.includes('/profiles'))return {profiles:[{name:'builder'},{name:'reviewer'}]};if(path.includes('/orchestration'))return {default_assignee:'builder'};return {}},{get:(_,fallback)=>fallback,set:()=>{},remove:()=>{}},()=>()=>{})
createRoot(document.getElementById('root')!).render(<I18nProvider initialLocale="zh-CN" configClient={null}><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><TaskDrawer columns={['blocked','review']} id="fixture-only" onClose={()=>{}} onOpen={()=>{}}/></QueryClientProvider></I18nProvider>)
