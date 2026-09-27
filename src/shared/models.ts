export type BookFormat = 'txt' | 'epub'
export type Theme = 'light' | 'dark' | 'sepia'

export interface Chapter {
  id: string
  title: string
  content: string
}

export interface Bookmark {
  id: string
  chapterId: string
  position: number
  note?: string
  createdAt: number
}

export interface ReadingProgress {
  chapterId: string
  paragraphIndex: number
  percentage: number
  lastReadAt: number
}

export interface Book {
  id: string
  path: string
  format: BookFormat
  title: string
  author?: string
  chapterCount: number
  createdAt: number
  updatedAt: number
  chapters: Chapter[]
  progress?: ReadingProgress
  bookmarks: Bookmark[]
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  pageMargin: number
  theme: Theme
  mode: 'scroll' | 'page'
}
