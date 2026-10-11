import React from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {I18nProvider,registerPluginLocales,setRuntimeI18nLocale} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/i18n/index.ts'
import {bindApi} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/api.ts'
import {TaskDrawer} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/drawer.tsx'
import {KANBAN_LOCALES} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/i18n.ts'
import './harness.css'
import '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/kanban.css'
registerPluginLocales('kanban',KANBAN_LOCALES);setRuntimeI18nLocale('zh-CN')
const comments=Array.from({length:8},(_,i)=>({id:101+i,author:i%2?'reviewer':'builder',created_at:1791650000+i,body:'【模拟讨论】第 '+(i+1)+' 条\n\n'+Array.from({length:14},(_,j)=>'段落 '+j+'：本内容只用于调查当前界面的长文折叠与滚动，不是业务评论。').join('\n\n'),context:null}))
const detail={task:{id:'fixture-only',title:'模拟卡片 · 当前源码只读调查',status:'blocked',assignee:'builder',body:'模拟需求描述。调查附件、发表区、折叠、楼层边界与定位。\n\n保留原框架、主题、右栏和四个页签。',created_at:1791650000},comments,events:[{id:1,kind:'created',created_at:1791650000}],runs:[],links:{parents:[],children:[]},attachments:[{id:1,filename:'示例说明.md',stored_path:'/fixture/example.md',content_type:'text/markdown'}]}
bindApi(async(path,options)=>{if(options?.method&&options.method!=='GET')throw Error('只读');if(path.includes('/log'))return {exists:false};if(path.includes('/tasks/'))return detail;if(path.includes('/profiles'))return {profiles:[{name:'builder'},{name:'reviewer'}]};if(path.includes('/orchestration'))return {default_assignee:'builder'};return {}},{get:(_,fallback)=>fallback,set:()=>{},remove:()=>{}},()=>()=>{})
window.hermesDesktop={saveGatewayFile:async()=>{document.body.dataset.saveCalled='true';return {saved:false,canceled:true}}} as any
createRoot(document.getElementById('root')!).render(<I18nProvider initialLocale="zh-CN" configClient={null}><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><TaskDrawer columns={['blocked','review']} id="fixture-only" onClose={()=>{}} onOpen={()=>{}}/></QueryClientProvider></I18nProvider>)
