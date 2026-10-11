import { Button, Codicon, extractClipboardImageBlobs, isSubmitEnter, Textarea } from '@hermes/plugin-sdk'

import type { DraftImage } from './comment-composer'
import { useKanban } from './ui'

interface CommentComposerViewProps {
  body: string
  images: DraftImage[]
  error: string
  pending: boolean
  uncertain: boolean
  checked: boolean
  requeueOnly: boolean
  imagesSupported: boolean
  running: boolean
  setBody: (value: string | ((previous: string) => string)) => void
  addImages: (images: Blob[]) => void
  removeImage: (image: DraftImage) => void
  submit: (restart?: boolean) => Promise<void>
  check: () => Promise<void>
  allowRetry: () => void
}

export function CommentComposerView({
  body,
  images,
  error,
  pending,
  uncertain,
  checked,
  requeueOnly,
  imagesSupported,
  running,
  setBody,
  addImages,
  removeImage,
  submit,
  check,
  allowRetry
}: CommentComposerViewProps) {
  const k = useKanban()
  const disabled = pending || uncertain || requeueOnly

  return (
    <div className="flex flex-col gap-1.5">
      {!!images.length && (
        <div className="flex max-h-20 gap-2 overflow-auto">
          {images.map(image => (
            <div className="flex shrink-0 items-center gap-1" key={image.url}>
              <img alt={image.file.name} className="size-12 object-contain" src={image.url} />
              {image.attachment && (
                <span className="text-xs">
                  #{image.attachment.id} · {k.imageSaved}
                </span>
              )}
              <Button
                aria-label={`${k.removeImage} ${image.file.name}`}
                disabled={disabled}
                onClick={() => removeImage(image)}
                size="icon-xs"
                variant="ghost"
              >
                <Codicon name="close" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div
        className="relative"
        onDragOver={event => {
          if (!disabled && imagesSupported && event.dataTransfer.types.includes('Files')) {
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'copy'
          }
        }}
        onDrop={event => {
          if (!disabled && imagesSupported && event.dataTransfer.files.length) {
            event.preventDefault()
            event.stopPropagation()
            addImages(Array.from(event.dataTransfer.files))
          }
        }}
      >
        <Textarea
          aria-label={running ? k.messageWorker : k.addComment}
          className="field-sizing-content max-h-[min(10rem,25vh)] resize-none pr-9 text-[0.8125rem]"
          disabled={disabled}
          onChange={event => setBody(event.target.value)}
          onKeyDown={event => {
            if (isSubmitEnter(event) && !event.shiftKey) {
              event.preventDefault()
              void submit()
            }
          }}
          onPaste={event => {
            const blobs = extractClipboardImageBlobs(event.clipboardData)

            if (blobs.length) {
              event.preventDefault()
              addImages(blobs)
              const text = event.clipboardData.getData('text/plain')

              if (text) {
                setBody(previous => previous + text)
              }
            }
          }}
          placeholder={running ? k.messageWorker : k.addComment}
          value={body}
        />
        <Button
          aria-label={running ? k.send : k.comment}
          className="absolute top-1 right-1"
          disabled={disabled || (!body.trim() && !images.length)}
          onClick={() => void submit()}
          size="icon-xs"
          variant="ghost"
        >
          <Codicon name="arrow-up" />
        </Button>
      </div>
      <div className="flex items-center justify-end gap-2">
        {requeueOnly ? (
          <Button disabled={pending} onClick={() => void submit(true)} size="xs" variant="outline">
            {k.retryRequeue}
          </Button>
        ) : (
          running && (
            <Button
              disabled={disabled || (!body.trim() && !images.length)}
              onClick={() => void submit(true)}
              size="xs"
              variant="outline"
            >
              {k.requeueWithNote}
            </Button>
          )
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {requeueOnly ? k.requeueFailed : error}
        </p>
      )}
      {uncertain && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span>{k.checkBeforeRetry}</span>
          <Button disabled={pending} onClick={() => void check()} size="xs" variant="outline">
            {k.checkOriginalTask}
          </Button>
          {checked && (
            <Button onClick={allowRetry} size="xs" variant="outline">
              {k.retrySend}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
