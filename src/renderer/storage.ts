import type { Book, ReaderSettings } from '../shared/models'

const booksKey = 'local-reader:books'
const settingsKey = 'local-reader:settings'

export const defaultSettings: ReaderSettings = { fontSize: 18, lineHeight: 1.9, pageMargin: 12, theme: 'light', mode: 'scroll' }

export function loadBooks(): Book[] {
  try { return JSON.parse(localStorage.getItem(booksKey) ?? '[]') as Book[] } catch { return [] }
}

export function saveBooks(books: Book[]): void { localStorage.setItem(booksKey, JSON.stringify(books)) }
export function loadSettings(): ReaderSettings {
  try { return { ...defaultSettings, ...(JSON.parse(localStorage.getItem(settingsKey) ?? '{}') as Partial<ReaderSettings>) } } catch { return defaultSettings }
}
export function saveSettings(settings: ReaderSettings): void { localStorage.setItem(settingsKey, JSON.stringify(settings)) }
