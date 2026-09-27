import { describe, expect, it } from 'vitest'
import { calculatePercentage, progressFor, searchChapters } from '../../src/shared/reading'
import type { Chapter } from '../../src/shared/models'

const chapters: Chapter[] = [
  { id: 'one', title: '第一章', content: '月亮升起\n河面安静' },
  { id: 'two', title: '第二章', content: '风从北方来' }
]

describe('reading state helpers', () => {
  it('calculates progress across chapters', () => {
    expect(calculatePercentage(0, 0, chapters)).toBe(0)
    expect(calculatePercentage(1, 1, chapters)).toBe(100)
    expect(progressFor('two', 0, chapters).chapterId).toBe('two')
  })

  it('returns matching chapter excerpts for search', () => {
    expect(searchChapters('河面', chapters)).toEqual([{ chapterId: 'one', title: '第一章', excerpt: '月亮升起 河面安静' }])
    expect(searchChapters('不存在', chapters)).toEqual([])
  })
})
