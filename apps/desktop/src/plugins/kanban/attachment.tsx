import {
  Button,
  Codicon,
  type DesktopFileReader,
  Dialog,
  DialogContent,
  DialogTitle,
  ErrorState,
  Loader,
  LocalFilePreview,
  localPreviewTarget,
  remoteHtmlPreviewDocument,
  useI18n,
  useMutation
} from '@hermes/plugin-sdk'
import { useEffect, useRef, useState } from 'react'

import type { KanbanAttachment } from './types'
import { errText, useKanban } from './ui'

interface AttachmentProps {
  attachment: KanbanAttachment
  onDownload: (path: string, name: string) => Promise<void>
  reader: DesktopFileReader
}

function HtmlMaterial({ path, reader, label }: { path: string; reader: DesktopFileReader; label: string }) {
  const k = useKanban()
  const [state, setState] = useState<{ document?: string; error?: string }>({})
  useEffect(() => {
    let active = true
    setState({})
    void reader.readDataUrl(path).then(
      data => {
        if (active) {
          const document = remoteHtmlPreviewDocument(data)
          setState(document ? { document } : { error: k.invalidMaterial })
        }
      },
      error => active && setState({ error: errText(error) })
    )

    return () => {
      active = false
    }
  }, [k.invalidMaterial, path, reader])

  if (state.error) {
    return <ErrorState title={state.error} />
  }

  if (!state.document) {
    return <Loader type="lemniscate-bloom" />
  }

  return <iframe className="h-full w-full border-0" sandbox="" srcDoc={state.document} title={label} />
}

export function Attachment({ attachment, onDownload, reader }: AttachmentProps) {
  const k = useKanban()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const entry = useRef<HTMLButtonElement>(null)
  const [retry, setRetry] = useState(0)
  const path = attachment.stored_path?.trim()
  const target = path ? localPreviewTarget(path) : null
  const download = useMutation({ mutationFn: () => onDownload(path!, attachment.filename) })

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <Button
        aria-label={`${k.open} ${attachment.filename}`}
        className="min-w-0 justify-start font-normal"
        disabled={!path}
        onClick={() => setOpen(true)}
        ref={entry}
        size="inline"
        title={!path ? k.materialUnavailable : attachment.filename}
        variant="text"
      >
        <span className="truncate">{attachment.filename}</span>
      </Button>
      <Button
        aria-label={`${t.fileMenu.download} ${attachment.filename}`}
        disabled={!path || download.isPending}
        onClick={() => download.mutate()}
        size="icon-xs"
        variant="ghost"
      >
        <Codicon name={download.isPending ? 'sync' : 'cloud-download'} spinning={download.isPending} />
      </Button>
      {!path && <span className="basis-full text-[0.7rem] text-(--ui-text-tertiary)">{k.materialUnavailable}</span>}

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          aria-describedby={undefined}
          bodyClassName="flex h-[min(72vh,44rem)] flex-col"
          className="w-[min(54rem,94vw)] max-w-none"
          onCloseAutoFocus={event => {
            event.preventDefault()
            entry.current?.focus({ preventScroll: true })
          }}
        >
          <div className="flex items-center gap-2 pr-8">
            <DialogTitle className="min-w-0 flex-1 truncate">{attachment.filename}</DialogTitle>
            <Button
              aria-label={k.retryMaterial}
              onClick={() => setRetry(value => value + 1)}
              size="icon-xs"
              variant="ghost"
            >
              <Codicon name="refresh" />
            </Button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {(!target || !path) && <ErrorState title={k.materialUnavailable} />}
            {target &&
              path &&
              (target.previewKind === 'html' ? (
                <HtmlMaterial key={retry} label={attachment.filename} path={path} reader={reader} />
              ) : (
                <LocalFilePreview
                  key={`${reader.key}:${path}`}
                  onClose={() => setOpen(false)}
                  reader={reader}
                  reloadKey={retry}
                  target={target}
                />
              ))}
          </div>

          <Button disabled={download.isPending || !path} onClick={() => download.mutate()} size="xs" variant="outline">
            {t.fileMenu.download}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
