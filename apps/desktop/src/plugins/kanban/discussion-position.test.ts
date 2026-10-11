import { expect, it } from 'vitest'

import { commentFloors, visibleComments } from './comment-context'
import { directoryPosition, visibleFloors } from './discussion-position'

it('keeps card-local numbering tied to original identity through sorting and filtering', () => {
  const comments = [
    { id: 104, created_at: 2, author: 'b', body: '#104 original text' },
    { id: 98, created_at: 1, author: 'a', body: 'middle' },
    { id: 96, created_at: 1, author: 'b', body: 'first' }
  ]

  const floors = commentFloors(comments)
  expect([...floors]).toEqual([
    ['96', 1],
    ['98', 2],
    ['104', 3]
  ])
  expect(visibleComments(comments, 'b', 'newest').map(comment => floors.get(String(comment.id)))).toEqual([3, 1])
  expect(comments[0].body).toBe('#104 original text')
  expect([...commentFloors(comments.filter(comment => comment.id !== 98)).keys()]).toEqual(['96', '104'])
})

it('includes every intersecting floor and keeps the whole compact directory centered and visible', () => {
  const floors = [
    { id: 'above', top: -100, bottom: 0 },
    { id: 'partial', top: -20, bottom: 50 },
    { id: 'inside', top: 50, bottom: 150 },
    { id: 'below', top: 150, bottom: 300 },
    { id: 'outside', top: 300, bottom: 400 }
  ]

  expect(visibleFloors(floors, 0, 200)).toEqual(['partial', 'inside', 'below'])
  expect(visibleFloors(floors, 50, 150)).toEqual(['inside'])
  expect(visibleFloors(floors, 200, 200)).toEqual([])
  const region = { top: -300, bottom: 1000 }
  const position = directoryPosition(region, { top: 0, bottom: 400 }, 25)
  expect(region.top + position.top + position.height / 2).toBe(200)
  const low = directoryPosition({ top: 300, bottom: 1000 }, { top: 0, bottom: 400 }, 25)
  expect(300 + low.top + low.height).toBeLessThan(400)
  expect(low.top).toBeGreaterThanOrEqual(0)
  const ended = directoryPosition({ top: -100, bottom: -1 }, { top: 0, bottom: 400 }, 25)
  expect(ended.height).toBe(0)

  for (const count of [1, 10, 25, 100, 1000]) {
    for (const viewport of [120, 400, 900]) {
      const layout = directoryPosition(region, { top: 0, bottom: viewport }, count)
      expect(layout.height).toBeLessThanOrEqual(count * 12)
      expect(region.top + layout.top).toBeGreaterThanOrEqual(8)
      expect(region.top + layout.top + layout.height).toBeLessThanOrEqual(viewport - 8)
    }
  }
})
