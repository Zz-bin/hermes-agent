import { type DesktopFileReader, MessageTextContent } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'

import { Attachment } from './attachment'
import type { KanbanAttachment } from './types'
import { errText, useKanban } from './ui'

function CommentImage({
  attachment,
  reader,
  onDownload
}: {
  attachment: KanbanAttachment
  reader: DesktopFileReader
  onDownload: (path: string, name: string) => Promise<void>
}) {
  const k = useKanban()
  const [data, setData] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setData('')
    setError('')

    if (attachment.stored_path) {
      void reader.readDataUrl(attachment.stored_path).then(
        result => {
          if (active && /^data:image\//i.test(result)) {
            setData(result)
          } else if (active) {
            setError(k.imageUnavailable)
          }
        },
        error => {
          if (active) {
            setError(errText(error))
          }
        }
      )
    }

    return () => {
      active = false
    }
  }, [attachment.stored_path, k.imageUnavailable, reader])

  return (
    <div className="flex flex-col items-start gap-1">
      {data && (
        <img
          alt={attachment.filename}
          className="max-h-64 max-w-full object-contain"
          onError={() => setError(k.imageUnavailable)}
          src={data}
        />
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <Attachment attachment={attachment} onDownload={onDownload} reader={reader} />
    </div>
  )
}

export function CommentMarkdown({
  text,
  attachments,
  reader,
  onDownload
}: {
  text: string
  attachments: KanbanAttachment[]
  reader: DesktopFileReader
  onDownload: (path: string, name: string) => Promise<void>
}) {
  const parts = text.split(/(!\[[^\]\n]*\]\(kanban-attachment:\d+\))/g)

  return (
    <div className="min-w-0" data-selectable-text="true">
      {parts.map((part, index) => {
        const match = /^!\[[^\]\n]*\]\(kanban-attachment:(\d+)\)$/.exec(part)

        const attachment =
          match &&
          attachments.find(
            attachment => String(attachment.id) === match[1] && attachment.content_type?.startsWith('image/')
          )

        return attachment ? (
          <CommentImage
            attachment={attachment}
            key={`${index}:${attachment.id}:${reader.key}`}
            onDownload={onDownload}
            reader={reader}
          />
        ) : (
          <MessageTextContent key={index} media={false} text={part} />
        )
      })}
    </div>
  )
}
