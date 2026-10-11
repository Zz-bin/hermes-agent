export function discussionScroller(element: HTMLElement): HTMLElement | null {
  const candidates: HTMLElement[] = []
  let parent = element.parentElement

  while (parent) {
    if (parent.hasAttribute('data-kanban-scroller')) {
      candidates.push(parent)
    }

    parent = parent.parentElement
  }

  return (
    candidates.find(candidate => ['auto', 'scroll'].includes(getComputedStyle(candidate).overflowY)) ??
    candidates[0] ??
    null
  )
}
