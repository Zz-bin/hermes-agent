import { expect, it } from 'vitest'

import { commentFloors, visibleComments } from './comment-context'
import { directoryPosition, readingFloor } from './discussion-position'

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

it('scores occupied reading area with continuity and clamps the rail to the visible middle', () => {
  const floors = [
    { id: 'long', top: -100, bottom: 900 },
    { id: 'short', top: 900, bottom: 950 }
  ]

  expect(readingFloor(floors, 0, 400, 'short')).toBe('long')
  expect(
    readingFloor(
      [
        { id: 'a', top: 0, bottom: 100 },
        { id: 'b', top: 100, bottom: 200 }
      ],
      0,
      200,
      'a'
    )
  ).toBe('a')
  expect(readingFloor([], 0, 200, 'a')).toBeNull()
  const region = { top: -300, bottom: 1000 }
  const position = directoryPosition(region, { top: 0, bottom: 400 })
  expect(region.top + position.top + position.height / 2).toBe(200)
  const low = directoryPosition({ top: 300, bottom: 1000 }, { top: 0, bottom: 400 })
  expect(low.height).toBeLessThanOrEqual(84)
  expect(low.top).toBeGreaterThanOrEqual(0)
})
