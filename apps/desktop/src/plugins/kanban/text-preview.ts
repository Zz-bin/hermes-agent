/** Folded previews end on visible text and leave room for the inline action. */
export function textPreview(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, 360).trimEnd()
}
