#!/usr/bin/env bash
set -euo pipefail
cd /home/capz/worktrees/hermes-kanban-detail/apps/desktop
../../node_modules/.bin/tsc -p . --noEmit
../../node_modules/.bin/eslint src/plugins/kanban/{discussion-position.ts,discussion-position.test.ts,floor-directory.tsx,comment-thread.tsx,comment-thread.test.tsx,drawer.tsx,drawer.test.tsx,attachment.tsx,attachment.test.tsx,comment-composer-view.tsx,comment-context.ts,i18n.ts} --max-warnings 0
../../node_modules/.bin/prettier --check src/plugins/kanban/{discussion-position.ts,discussion-position.test.ts,floor-directory.tsx,comment-thread.tsx,comment-thread.test.tsx,drawer.tsx,drawer.test.tsx,attachment.tsx,attachment.test.tsx,comment-composer-view.tsx,comment-context.ts,i18n.ts,kanban.css}
../../node_modules/.bin/vitest run --project ui src/plugins/kanban/{discussion-position,comment-thread,comment-context,attachment,comment-composer,drawer,assignee-menu,api.connection-scope,api.default-notify}.test.*
cd /home/capz/worktrees/hermes-kanban-detail
openspec validate refine-kanban-discussion-toc --strict
git diff --check
