import { Button, Codicon } from '@hermes/plugin-sdk'

import type { KanbanText } from './ui'

interface TextDisclosureProps {
  expanded: boolean
  k: KanbanText
  onClick: () => void
}

export function TextDisclosure({ expanded, k, onClick }: TextDisclosureProps) {
  return (
    <Button aria-expanded={expanded} className="kanban-text-disclosure" onClick={onClick} size="inline" variant="text">
      {expanded ? k.collapseText : k.expandText}
      <Codicon name={expanded ? 'chevron-up' : 'chevron-down'} />
    </Button>
  )
}
