import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { ReaderDatabase } from './services/database'
import { decodeText, parseTxt, titleFromPath } from '../shared/txt-parser'
import { parseEpub } from '../shared/epub-parser'
import type { Book } from '../shared/models'

let database: ReaderDatabase

async function importBook(filePath: string): Promise<Book> {
  const extension = path.extname(filePath).toLowerCase()
  if (extension !== '.txt' && extension !== '.epub') throw new Error('仅支持 TXT 和 EPUB 文件')
  const buffer = await fs.readFile(filePath)
  if (buffer.byteLength > 100 * 1024 * 1024) throw new Error('文件大小不能超过 100 MB')
  const chapters = extension === '.epub' ? await parseEpub(buffer) : parseTxt(decodeText(buffer))
  const now = Date.now()
  const book: Book = { id: randomUUID(), path: filePath, format: extension === '.epub' ? 'epub' : 'txt', title: titleFromPath(filePath), chapterCount: chapters.length, createdAt: now, updatedAt: now, chapters, bookmarks: [] }
  database.upsertBook(book)
  return book
}

function createWindow(): void {
  const window = new BrowserWindow({ width: 1440, height: 920, minWidth: 960, minHeight: 640, webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false } })
  if (process.env.VITE_DEV_SERVER_URL) void window.loadURL(process.env.VITE_DEV_SERVER_URL)
  else void window.loadFile(path.join(__dirname, '../../dist/index.html'))
}

app.whenReady().then(() => {
  database = new ReaderDatabase(app.getPath('userData'))
  ipcMain.handle('books:choose', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: '电子书', extensions: ['txt', 'epub'] }] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('books:import', (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || path.isAbsolute(filePath) === false) throw new Error('无效的文件路径')
    return importBook(filePath)
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
