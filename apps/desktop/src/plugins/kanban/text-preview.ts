/** Folded text needs only enough Markdown to fill the three-line preview. */
export function textPreview(text: string): string {
  const prefix = text.slice(0, 1200)
  let end = -1

  for (let line = 0; line < 8; line++) {
    end = prefix.indexOf('\n', end + 1)

    if (end === -1) {
      return prefix
    }
  }

  return prefix.slice(0, end)
}
