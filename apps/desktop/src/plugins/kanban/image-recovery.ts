import type { TaskActions } from './api'
import type { KanbanAttachment } from './types'

// Saved filenames can change on collision. Size and name alone cannot identify a lost upload response.
export async function findSavedImages(
  file: File,
  attachments: KanbanAttachment[],
  baseline: Set<string>,
  read: TaskActions['readAttachment']
) {
  const original = new Uint8Array(await file.arrayBuffer())
  const matches: KanbanAttachment[] = []

  for (const attachment of attachments) {
    if (baseline.has(String(attachment.id)) || (attachment.size != null && attachment.size !== file.size)) {
      continue
    }

    const path = attachment.stored_path

    if (!path) {
      throw new Error('Original attachment path is unavailable')
    }

    const dataUrl = await read(path)
    const marker = dataUrl.indexOf(';base64,')

    if (marker < 0) {
      throw new Error('Original attachment bytes are unavailable')
    }

    const bytes = atob(dataUrl.slice(marker + 8))

    if (bytes.length === original.length && original.every((byte, index) => byte === bytes.charCodeAt(index))) {
      matches.push(attachment)
    }
  }

  return matches
}
