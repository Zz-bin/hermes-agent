import {chromium} from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import {writeFile,readFile} from 'node:fs/promises'
const root=new URL('../',import.meta.url).pathname
const browser=await chromium.launch({headless:true,executablePath:'/opt/google/chrome/chrome'})
const page=await browser.newPage({viewport:{width:1200,height:900}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const results={fixture:'standalone synthetic design; not product E2E',checks:[],errors}
function check(name,ok,details){results.checks.push({name,ok,details});if(!ok)throw Error(name)}
try{
await page.goto('file://'+root+'visual/interaction.html')
await page.screenshot({path:root+'visual/wide-entry.png'})
const row=page.locator('[data-id="108"]');const body=row.locator('.body')
const before=await body.evaluate(e=>e.clientHeight)
await row.locator('[data-toggle]').click();const after=await body.evaluate(e=>e.clientHeight)
check('真实高度变化',after>before,{before,after})
await row.locator('[data-select]').click();await row.locator('[data-toggle]').click()
check('选中仍可收起',await row.locator('[data-toggle]').getAttribute('aria-expanded')==='false')
check('其他楼层独立',await page.locator('[data-id="107"] [data-toggle]').getAttribute('aria-expanded')==='false')
await page.locator('#jump').fill('101');await page.locator('#go').click()
check('跳转展开且聚焦但不改选择',await page.locator('[data-id="101"] [data-toggle]').getAttribute('aria-expanded')==='true'&&await page.evaluate(()=>document.activeElement?.dataset.id==='101')&&await page.locator('[data-id="108"]').getAttribute('class').then(c=>c.includes('selected')))
await page.locator('#author').selectOption('builder');await page.locator('#jump').fill('108');await page.locator('#go').click();check('隐藏目标确认',await page.locator('#confirm').evaluate(e=>e.open));await page.locator('#cancelConfirm').click();check('取消保留筛选',await page.locator('#author').inputValue()==='builder');await page.locator('#go').click();await page.locator('#acceptConfirm').click();check('显示全部再定位',await page.locator('#author').inputValue()==='')
await page.locator('#order').selectOption('oldest');check('排序不重编号',(await page.locator('.number').allTextContents()).join(',')==='#101,#102,#103,#104,#105,#106,#107,#108')
await page.locator('#jump').fill('999');await page.locator('#go').click();check('无目标可恢复',(await page.locator('#feedback').textContent()).includes('没有 #999'))
await page.locator('#wideComposer .grow').click();await page.locator('#scroll').evaluate(e=>e.scrollTop=e.scrollHeight)
const last=await page.locator('[data-id="108"]').boundingBox();const composer=await page.locator('#wideComposer').boundingBox();check('宽屏增高末层不遮挡',last.y+last.height<=composer.y+1,{last,composer});await page.screenshot({path:root+'visual/wide.png'})
let downloads=0;page.on('download',()=>downloads++)
await page.locator('[data-file="说明.md"]').last().click();check('文件名称打开而非保存',await page.locator('#preview').evaluate(e=>e.open)&&downloads===0)
await page.locator('#failPreview').click();await page.locator('#retryPreview').click();check('预览失败重试',(await page.locator('#previewBody').textContent()).includes('模拟说明'))
await page.locator('#closePreview').click();const download=page.waitForEvent('download');await page.locator('[data-save="说明.md"]').last().click();await download;check('独立保存',downloads===1)
await page.locator('[data-file="页面.html"]').click();check('HTML预览无脚本沙箱',await page.locator('#previewBody iframe').getAttribute('sandbox')==='');await page.locator('#closePreview').click()
await page.locator('#demoStatus').selectOption('running');await page.locator('#assignee').selectOption('reviewer');await page.locator('#cancelConfirm').click();check('分配取消不改处理人',await page.locator('#assignee').inputValue()==='builder');await page.locator('#assignee').selectOption('reviewer');await page.locator('#acceptConfirm').click();check('明确确认分配',await page.locator('#assignee').inputValue()==='reviewer')
await page.setViewportSize({width:640,height:800});await page.locator('.columns').evaluate(e=>e.scrollTop=e.scrollHeight)
await page.locator('#narrowComposer textarea').evaluate(e=>e.style.height='42px')
await page.locator('.columns').evaluate(e=>e.scrollTop=e.scrollHeight)
const aside=await page.locator('aside').boundingBox();const narrow=await page.locator('#narrowComposer').boundingBox();check('窄屏全部末尾内容不遮挡',aside.y+aside.height<=narrow.y+1&&narrow.y+narrow.height<=800,{aside,narrow})
await page.locator('#narrowComposer .grow').click();await page.locator('.columns').evaluate(e=>e.scrollTop=e.scrollHeight);const a2=await page.locator('aside').boundingBox();const n2=await page.locator('#narrowComposer').boundingBox();check('窄屏增高仍不遮挡',a2.y+a2.height<=n2.y+1,{aside:a2,composer:n2})
check('窄屏无横溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
await page.screenshot({path:root+'visual/narrow.png'});await page.locator('#theme').click();await page.screenshot({path:root+'visual/narrow-dark.png'});check('无运行错误',errors.length===0)
await page.locator('.columns').evaluate(e=>e.scrollTop=0);await page.screenshot({path:root+'visual/narrow-entry.png'})
}catch(e){results.failure=e.message;await page.screenshot({path:root+'visual/failure.png'})}
await writeFile(root+'visual/results.json',JSON.stringify(results,null,2))
const perf=await browser.newPage({viewport:{width:1200,height:900}})
const css=await readFile('/home/capz/worktrees/hermes-kanban-detail/apps/desktop/src/plugins/kanban/kanban.css','utf8')
await perf.setContent('<style>'+css+'</style><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">'+Array.from({length:30},()=>'<div style="position:relative;height:110px;border:1px solid #888"><div class="kanban-arc"></div>模拟运行卡片</div>').join('')+'</div>')
const session=await perf.context().newCDPSession(perf);await session.send('Performance.enable')
async function sample(){const a=(await session.send('Performance.getMetrics')).metrics;await perf.waitForTimeout(5000);const b=(await session.send('Performance.getMetrics')).metrics;return Object.fromEntries(['TaskDuration','LayoutDuration','RecalcStyleDuration','ScriptDuration'].map(n=>[n,b.find(m=>m.name===n).value-a.find(m=>m.name===n).value]))}
const animation=await sample();await perf.addStyleTag({content:'.kanban-arc{animation:none!important}'});const staticArc=await sample()
await writeFile(root+'evidence/performance-ab-repeat.json',JSON.stringify({platform:'Linux headless Chrome; synthetic 30 cards; 5 seconds each; single nonrandomized run',animation,staticArc,limitation:'Not proof of user route, Mac thermal behavior, or production root cause; candidate CSS paint cost only'},null,2))
await browser.close();console.log(JSON.stringify(results));if(results.failure)process.exitCode=1
