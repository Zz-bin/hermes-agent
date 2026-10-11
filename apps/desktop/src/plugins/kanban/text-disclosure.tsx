import { Button, Codicon } from '@hermes/plugin-sdk'

import type { KanbanText } from './ui'

interface TextDisclosureProps {
  expanded: boolean
  k: KanbanText
  onClick: () => void
}

export function TextDisclosure({ expanded, k, onClick }: TextDisclosureProps) {
  return (
    <Button aria-expanded={expanded} onClick={onClick} size="inline" variant="ghost">
      <Codicon name={expanded ? 'chevron-up' : 'chevron-down'} />
      {expanded ? k.collapseText : k.expandText}
    </Button>
  )
}
