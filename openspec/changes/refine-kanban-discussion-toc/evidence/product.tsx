import React from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {I18nProvider,registerPluginLocales,setRuntimeI18nLocale} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/i18n/index.ts'
import {bindApi} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/api.ts'
import {TaskDrawer} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/drawer.tsx'
import {ThemeProvider} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/themes/context.tsx'
import {KANBAN_LOCALES} from '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/i18n.ts'
import '../visual/baseline.css'
import '/@fs/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/kanban.css'
registerPluginLocales('kanban',KANBAN_LOCALES);setRuntimeI18nLocale('zh-CN')
const params=new URLSearchParams(location.search),count=Number(params.get('count')??5)
const longName='a-very-long-material-name-for-ellipsis-and-controls-'.repeat(3)+'.zip'
const material='/fixture-only/long-directory/'+longName
const comments=Array.from({length:count},(_,i)=>({id:96+i*2,author:i%2?'reviewer':'builder',created_at:1791650000+Math.floor(i/2),body:'【模拟讨论】第 '+(i+1)+' 条\n\n'+(params.has('short')?'简短正文。':Array.from({length:params.has('tall')&&i===2?100:8},(_,j)=>'段落 '+j+'：真实组件隔离数据，不是业务评论。').join('\n\n')),context:i===count-1?{version:1,kind:'handoff',phase:'模拟阶段',assignee:'builder',status:'blocked',workspace_kind:'dir',workspace_path:'/fixture-only',material_paths:[material],attachment_ids:[1]}:null}))
const detail={task:{id:'fixture-only',title:'真实TaskDrawer · 模拟服务数据（非安装端）',status:'blocked',assignee:'builder',body:'模拟描述，保留原详情框架和右侧资料。',created_at:1791650000},comments,events:[{id:1,kind:'created',created_at:1791650000}],runs:[],links:{parents:[],children:[]},attachments:Array.from({length:15},(_,i)=>({id:i+1,filename:i===0?'first.zip':i===1?longName:'material-'+i+'.md',stored_path:i===14?null:'/fixture-only/material-'+i+'.zip'}))}
window.fixtureCopies=[]
window.hermesDesktop={writeClipboard:async text=>{if(window.fixtureCopyFailure)throw Error('模拟拒绝');window.fixtureCopies.push(text)}}
bindApi(async(path,options)=>{if(options?.method&&options.method!=='GET')throw Error('隔离只读数据，不允许业务写入');if(path.includes('/log'))return {exists:false};if(path.includes('/tasks/')){if(params.has('error'))throw Error('模拟读取失败');return detail}if(path.includes('/profiles'))return {profiles:[{name:'builder'},{name:'reviewer'}]};if(path.includes('/orchestration'))return {default_assignee:'builder'};return {}},{get:(_,fallback)=>fallback,set:()=>{},remove:()=>{}},()=>()=>{})
createRoot(document.getElementById('root')!).render(<I18nProvider initialLocale="zh-CN" configClient={null}><ThemeProvider><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><TaskDrawer columns={['blocked','review']} id="fixture-only" onClose={()=>{window.fixtureClosed=true}} onOpen={()=>{}}/></QueryClientProvider></ThemeProvider></I18nProvider>)
