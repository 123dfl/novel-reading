import type { Chapter, ReadingProgress } from './models'

export function calculatePercentage(chapterIndex: number, paragraphIndex: number, chapters: Chapter[]): number {
  if (chapters.length === 0) return 0
  const totalParagraphs = chapters.reduce((sum, chapter) => sum + Math.max(1, chapter.content.split('\n').length), 0)
  const before = chapters.slice(0, chapterIndex).reduce((sum, chapter) => sum + Math.max(1, chapter.content.split('\n').length), 0)
  const current = Math.min(Math.max(paragraphIndex, 0), Math.max(1, chapters[chapterIndex]?.content.split('\n').length ?? 1))
  return Math.min(100, Math.round(((before + current) / totalParagraphs) * 100))
}

export function progressFor(chapterId: string, paragraphIndex: number, chapters: Chapter[]): ReadingProgress {
  const chapterIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === chapterId))
  return { chapterId: chapters[chapterIndex]?.id ?? 'chapter-1', paragraphIndex, percentage: calculatePercentage(chapterIndex, paragraphIndex, chapters), lastReadAt: Date.now() }
}

export function searchChapters(query: string, chapters: Chapter[]): Array<{ chapterId: string; title: string; excerpt: string }> {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return []
  return chapters.flatMap((chapter) => {
    const index = chapter.content.toLowerCase().indexOf(keyword)
    if (index < 0) return []
    const start = Math.max(0, index - 32)
    const end = Math.min(chapter.content.length, index + keyword.length + 64)
    return [{ chapterId: chapter.id, title: chapter.title, excerpt: `${start > 0 ? '…' : ''}${chapter.content.slice(start, end).replace(/\n/g, ' ')}${end < chapter.content.length ? '…' : ''}` }]
  })
}
