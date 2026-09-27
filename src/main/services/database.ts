import Database from 'better-sqlite3'
import path from 'node:path'
import type { Book, Bookmark, ReadingProgress, ReaderSettings } from '../../shared/models'

export class ReaderDatabase {
  private readonly db: Database.Database

  constructor(userDataPath: string) {
    this.db = new Database(path.join(userDataPath, 'reader.sqlite'))
    this.db.pragma('foreign_keys = ON')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, format TEXT NOT NULL, title TEXT NOT NULL, author TEXT, chapter_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS reading_progress (book_id TEXT PRIMARY KEY, chapter_id TEXT, position TEXT, percentage REAL NOT NULL DEFAULT 0, last_read_at INTEGER NOT NULL, FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, chapter_id TEXT, position TEXT, note TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `)
  }

  upsertBook(book: Book): void {
    this.db.prepare(`INSERT INTO books (id,path,format,title,author,chapter_count,created_at,updated_at) VALUES (@id,@path,@format,@title,@author,@chapterCount,@createdAt,@updatedAt) ON CONFLICT(path) DO UPDATE SET title=@title, chapter_count=@chapterCount, updated_at=@updatedAt`).run({ ...book, author: book.author ?? null })
  }

  saveProgress(bookId: string, progress: ReadingProgress): void {
    this.db.prepare(`INSERT INTO reading_progress (book_id,chapter_id,position,percentage,last_read_at) VALUES (?,?,?,?,?) ON CONFLICT(book_id) DO UPDATE SET chapter_id=excluded.chapter_id, position=excluded.position, percentage=excluded.percentage, last_read_at=excluded.last_read_at`).run(bookId, progress.chapterId, String(progress.paragraphIndex), progress.percentage, progress.lastReadAt)
  }

  saveSettings(settings: ReaderSettings): void {
    this.db.prepare('INSERT INTO user_settings (key,value) VALUES (\'reader\',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(JSON.stringify(settings))
  }

  removeBook(id: string): void { this.db.prepare('DELETE FROM books WHERE id = ?').run(id) }
  removeBookmark(id: string): void { this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id) }
  saveBookmark(bookId: string, bookmark: Bookmark): void { this.db.prepare('INSERT OR REPLACE INTO bookmarks (id,book_id,chapter_id,position,note,created_at) VALUES (?,?,?,?,?,?)').run(bookmark.id, bookId, bookmark.chapterId, String(bookmark.position), bookmark.note ?? null, bookmark.createdAt) }
}
