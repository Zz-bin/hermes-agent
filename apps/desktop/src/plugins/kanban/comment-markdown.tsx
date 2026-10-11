import { MessageTextContent } from '@hermes/plugin-sdk'

export function CommentMarkdown({ text }: { text: string }) {
  const visibleText = text
    .replace(/!\[[^\]\n]*\]\(kanban-attachment:\d+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!visibleText) {
    return null
  }

  return (
    <div className="min-w-0" data-selectable-text="true">
      <MessageTextContent media={false} text={visibleText} />
    </div>
  )
}
