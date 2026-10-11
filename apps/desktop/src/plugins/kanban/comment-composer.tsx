import { useValue } from '@hermes/plugin-sdk'
import { atom } from 'nanostores'
import { useEffect, useRef, useState } from 'react'

import type { TaskActions } from './api'
import { CommentComposerView } from './comment-composer-view'
import { findSavedImages } from './image-recovery'
import type { KanbanAttachment } from './types'
import { errText, useKanban } from './ui'

export interface DraftImage {
  file: File
  url: string
  attachment?: KanbanAttachment
}
interface CommentComposerProps {
  actions: TaskActions
  draftKey: string
  imagesSupported: boolean
  running: boolean
  onSaved: () => void
}
interface UncertainWrite {
  body?: string
  attachmentIds?: number[]
  restart?: boolean
  baseline: Set<string>
  image?: DraftImage
}

interface Draft {
  body: string
  pending: boolean
  images: DraftImage[]
  error: string
  uncertain: UncertainWrite | null
  checked: boolean
  requeueOnly: boolean
}
const drafts = new Map<string, ReturnType<typeof atom<Draft>>>()

function taskDraft(key: string) {
  let draft = drafts.get(key)

  if (!draft) {
    draft = atom<Draft>({
      body: '',
      pending: false,
      images: [],
      error: '',
      uncertain: null,
      checked: false,
      requeueOnly: false
    })
    drafts.set(key, draft)
  }

  return draft
}

export function CommentComposer({ actions, draftKey, imagesSupported, running, onSaved }: CommentComposerProps) {
  const k = useKanban()
  const [draft] = useState(() => taskDraft(draftKey))
  const { body, images, error, uncertain, checked, requeueOnly, pending } = useValue(draft)

  const setBody = (value: string | ((previous: string) => string)) =>
    draft.set({ ...draft.get(), body: typeof value === 'function' ? value(draft.get().body) : value })

  const setImages = (value: DraftImage[] | ((previous: DraftImage[]) => DraftImage[])) =>
    draft.set({ ...draft.get(), images: typeof value === 'function' ? value(draft.get().images) : value })

  const setError = (error: string) => draft.set({ ...draft.get(), error })
  const setUncertain = (uncertain: UncertainWrite | null) => draft.set({ ...draft.get(), uncertain })
  const setChecked = (checked: boolean) => draft.set({ ...draft.get(), checked })
  const setRequeueOnly = (requeueOnly: boolean) => draft.set({ ...draft.get(), requeueOnly })
  const setPending = (pending: boolean) => draft.set({ ...draft.get(), pending })
  const busy = useRef(false)
  const alive = useRef(true)

  // This is component lifetime bookkeeping, not a mirror of reactive state.
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  const addImages = (blobs: Blob[]) => {
    if (!imagesSupported) {
      setError(k.materialUnavailable)

      return
    }

    const valid = blobs.filter(blob => blob.type.startsWith('image/') && blob.size > 0 && blob.size <= 25 * 1024 * 1024)

    if (valid.length !== blobs.length) {
      setError(k.imageLimit)
    }

    const additions = valid.map((blob, index) => {
      const file =
        blob instanceof File ? blob : new File([blob], `pasted-${Date.now()}-${index}.png`, { type: blob.type })

      const url = URL.createObjectURL(file)

      return { file, url }
    })

    setImages(previous => [...previous, ...additions])
  }

  const clear = () => {
    draft.get().images.forEach(image => URL.revokeObjectURL(image.url))

    setImages([])
    setBody('')
  }

  // A rejected bridge promise does not prove that the server did not commit.
  // Compare the original task before offering an explicit, manual retry.
  const check = async () => {
    if (!uncertain || busy.current || draft.get().pending) {
      return
    }

    busy.current = true
    setPending(true)

    try {
      const detail = await actions.read()

      if (!alive.current) {
        return
      }

      if (uncertain.image) {
        const matches = await findSavedImages(
          uncertain.image.file,
          detail.attachments ?? [],
          uncertain.baseline,
          actions.readAttachment
        )

        if (!alive.current) {
          return
        }

        if (matches.length === 1) {
          uncertain.image.attachment = matches[0]
          setUncertain(null)
          setError(k.imageSaved)
          onSaved()
        } else if (matches.length > 1) {
          setError(k.checkBeforeRetry)
        } else {
          setChecked(true)
        }
      } else {
        const found = detail.comments.some(
          comment =>
            !uncertain.baseline.has(String(comment.id)) &&
            comment.author === 'desktop' &&
            comment.body === uncertain.body &&
            (uncertain.attachmentIds ?? []).every(id => comment.context?.attachment_ids.includes(id) === true)
        )

        if (found) {
          clear()
          setRequeueOnly(Boolean(uncertain.restart))
          setUncertain(null)
          setError(k.commentSaved)
          onSaved()
        } else {
          setChecked(true)
        }
      }
    } catch (error) {
      if (alive.current) {
        setError(errText(error))
      }
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  const submit = async (restart = false) => {
    if (busy.current || draft.get().pending || uncertain || (!body.trim() && !images.length && !requeueOnly)) {
      return
    }

    busy.current = true
    setPending(true)
    setError('')
    let write: UncertainWrite | null = null

    try {
      if (!requeueOnly) {
        for (const image of images) {
          if (image.attachment) {
            continue
          }

          const detail = await actions.read()

          if (!alive.current) {
            return
          }

          const bytes = await image.file.arrayBuffer()

          if (!alive.current) {
            return
          }

          write = { image, baseline: new Set((detail.attachments ?? []).map(attachment => String(attachment.id))) }
          const result = await actions.upload({ bytes, contentType: image.file.type, filename: image.file.name })

          if (!result.attachment) {
            throw new Error(k.checkBeforeRetry)
          }

          image.attachment = result.attachment
          write = null
          setImages([...images])
          onSaved()

          if (!alive.current) {
            return
          }
        }

        const text = body.trim()
        const attachmentIds = images.map(image => Number(image.attachment!.id))

        const detail = await actions.read()

        if (!alive.current) {
          return
        }

        write = {
          body: text,
          attachmentIds,
          restart,
          baseline: new Set(detail.comments.map(comment => String(comment.id)))
        }
        await actions.comment(text, attachmentIds)
        write = null
        clear()
        onSaved()

        if (!alive.current) {
          return
        }
      }

      if (restart || requeueOnly) {
        setRequeueOnly(true)
        await actions.requeue()
        setRequeueOnly(false)
        onSaved()
      }
    } catch (error) {
      setError(errText(error))
      setUncertain(write)
      setChecked(false)
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <CommentComposerView
      addImages={addImages}
      allowRetry={() => {
        setUncertain(null)
        setChecked(false)
        setError('')
      }}
      body={body}
      check={check}
      checked={checked}
      error={error}
      images={images}
      imagesSupported={imagesSupported}
      pending={pending}
      removeImage={image => {
        URL.revokeObjectURL(image.url)

        setImages(images.filter(item => item !== image))
      }}
      requeueOnly={requeueOnly}
      running={running}
      setBody={setBody}
      submit={submit}
      uncertain={!!uncertain}
    />
  )
}
