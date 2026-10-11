import {chromium} from '/home/capz/worktrees/hermes-kanban-detail/node_modules/playwright/index.mjs'
import {writeFile} from 'node:fs/promises'
const root=new URL('.',import.meta.url).pathname
const browser=await chromium.launch({headless:true,executablePath:'/opt/google/chrome/chrome'})
const page=await browser.newPage({viewport:{width:640,height:400}})
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto('file://'+root+'index.html')
 checks.push({name:'独立文件可打开且源码服务链接隐藏',pass:await page.locator('.frame').isVisible()&&!await page.locator('.demo a').isVisible()})
 await page.locator('#fixture').selectOption('40');await page.locator('.scroller').evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(100)
 await page.locator('.rail button').first().focus();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.waitForTimeout(100)
 checks.push({name:'640x400长目录键盘末楼定位',pass:await page.evaluate(()=>demo.state.active===96&&demo.state.lock===96)})
 let rail=await page.locator('.rail').boundingBox(),s=await page.locator('.scroller').boundingBox()
 checks.push({name:'低屏长目录限定在阅读区',pass:rail.y>=s.y-1&&rail.y+rail.height<=s.y+s.height+1,rail,scroller:s})
 await page.locator('.scroller').hover();await page.mouse.wheel(0,-60);await page.waitForTimeout(100)
 checks.push({name:'低屏长目录可恢复手动阅读',pass:await page.evaluate(()=>demo.state.lock===null)})
 checks.push({name:'独立文件无脚本异常',pass:errors.length===0,errors})
 await page.screenshot({path:root+'long-low-screen.png'})
}finally{await writeFile(root+'portable-results.json',JSON.stringify({kind:'standalone prototype only; NOT product acceptance',checks,total:checks.length,passed:checks.filter(c=>c.pass).length},null,2));await browser.close()}
console.log(JSON.stringify(checks));if(checks.some(c=>!c.pass))process.exitCode=1
