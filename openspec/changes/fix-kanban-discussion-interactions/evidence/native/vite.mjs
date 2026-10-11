import {createServer,loadConfigFromFile,mergeConfig} from '/home/capz/worktrees/hermes-kanban-detail/node_modules/vite/dist/node/index.js'
const root='/home/capz/worktrees/hermes-kanban-detail/openspec/changes/fix-kanban-discussion-interactions/evidence/native'
const loaded=await loadConfigFromFile({command:'serve',mode:'development'},'/home/capz/worktrees/hermes-kanban-detail/apps/desktop/vite.config.ts')
loaded.config.plugins=(await Promise.all(loaded.config.plugins.flat(Infinity))).flat(Infinity).filter(p=>p&&!p.name.includes('babel'))
const server=await createServer(mergeConfig(loaded.config,{configFile:false,root,cacheDir:root+'/cache',resolve:{alias:{'@tanstack/react-query':'/home/capz/worktrees/hermes-kanban-detail/node_modules/@tanstack/react-query'}},server:{host:'127.0.0.1',port:43311,strictPort:true,fs:{allow:[root,'/home/capz/worktrees/hermes-kanban-detail']}}}))
await server.listen();server.printUrls()
