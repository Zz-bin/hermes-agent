import {createServer,loadConfigFromFile,mergeConfig} from '/home/capz/worktrees/hermes-kanban-detail/node_modules/vite/dist/node/index.js'
const root=new URL('..',import.meta.url).pathname
const loaded=await loadConfigFromFile({command:'serve',mode:'development'},'/home/capz/worktrees/hermes-kanban-detail/apps/desktop/vite.config.ts')
loaded.config.plugins=(await Promise.all(loaded.config.plugins.flat(Infinity))).flat(Infinity).filter(p=>p&&!p.name.includes('babel'))
const server=await createServer(mergeConfig(loaded.config,{configFile:false,root,cacheDir:process.env.TMPDIR+'/toc-product-cache',resolve:{alias:{'@tanstack/react-query':'/home/capz/worktrees/hermes-kanban-detail/node_modules/@tanstack/react-query'}},server:{host:'127.0.0.1',port:43313,strictPort:true,fs:{allow:[root,'/home/capz/worktrees/hermes-kanban-detail']}}}))
await server.listen();server.printUrls()
