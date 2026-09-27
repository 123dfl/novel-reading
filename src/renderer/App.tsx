import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, BookOpen, ChevronLeft, ChevronRight, FileUp, List, Moon, Search, Settings, Sun, Trash2, X, Leaf, ArrowLeft } from 'lucide-react'
import type { Book, ReaderSettings, Theme } from '../shared/models'
import { parseTxt, titleFromPath } from '../shared/txt-parser'
import { parseEpub } from '../shared/epub-parser'
import { progressFor, searchChapters } from '../shared/reading'
import { defaultSettings, loadBooks, loadSettings, saveBooks, saveSettings } from './storage'

type View = 'shelf' | 'reader' | 'settings'

function makeBook(title: string, path: string, chapters: Book['chapters'], format: Book['format']): Book {
  const now = Date.now()
  return { id: crypto.randomUUID(), path, format, title, chapterCount: chapters.length, createdAt: now, updatedAt: now, chapters, bookmarks: [] }
}

export function App() {
  const [books, setBooks] = useState<Book[]>(loadBooks)
  const [view, setView] = useState<View>('shelf')
  const [activeBookId, setActiveBookId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)
  const activeBook = books.find((book) => book.id === activeBookId) ?? null

  useEffect(() => { saveBooks(books) }, [books])
  useEffect(() => { saveSettings(settings) }, [settings])

  const importFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension !== 'txt' && extension !== 'epub') { window.alert('仅支持 TXT 和 EPUB 文件'); continue }
      let chapters
      try { chapters = extension === 'epub' ? await parseEpub(new Uint8Array(await file.arrayBuffer())) : parseTxt(await file.text()) } catch (error) { window.alert(error instanceof Error ? error.message : '文件解析失败'); continue }
      const book = makeBook(titleFromPath(file.name), file.name, chapters, 'txt')
      setBooks((current) => [book, ...current.filter((item) => item.path !== book.path)])
      setActiveBookId(book.id)
      setView('reader')
    }
  }

  const chooseBook = async () => {
    if (window.readerApi) {
      try {
        const filePath = await window.readerApi.chooseBook()
        if (filePath) {
          const book = await window.readerApi.importBook(filePath)
          setBooks((current) => [book, ...current.filter((item) => item.path !== book.path)])
          setActiveBookId(book.id)
          setView('reader')
        }
      } catch (error) { window.alert(error instanceof Error ? error.message : '导入失败') }
      return
    }
    document.getElementById('book-file-input')?.click()
  }

  const removeBook = (id: string) => {
    const book = books.find((item) => item.id === id)
    if (book && window.confirm(`确定从书架移除《${book.title}》吗？`)) setBooks((current) => current.filter((item) => item.id !== id))
  }

  const updateBook = (book: Book) => setBooks((current) => current.map((item) => item.id === book.id ? book : item))

  return <div className={`app theme-${settings.theme}`}>
    <header className="topbar">
      <button className="brand" onClick={() => setView('shelf')} aria-label="返回书架"><span className="brand-mark">阅</span><span>阅读</span></button>
      <nav className="primary-nav" aria-label="主导航">
        <button className={view === 'shelf' ? 'nav-link active' : 'nav-link'} onClick={() => setView('shelf')}>书架</button>
        {activeBook && <button className={view === 'reader' ? 'nav-link active' : 'nav-link'} onClick={() => setView('reader')}>正在阅读</button>}
        <button className={view === 'settings' ? 'nav-link active' : 'nav-link'} onClick={() => setView('settings')}>设置</button>
      </nav>
      <div className="topbar-meta"><span>{books.length} 本书</span><span className="meta-divider" /><span>本地保存</span></div>
    </header>

    <main className="main-content">
      {view === 'shelf' && <Shelf books={books} onImport={chooseBook} onFiles={importFiles} onOpen={(id) => { setActiveBookId(id); setView('reader') }} onRemove={removeBook} />}
      {view === 'reader' && activeBook && <Reader book={activeBook} settings={settings} onSettings={() => setView('settings')} onBookChange={updateBook} onBack={() => setView('shelf')} />}
      {view === 'settings' && <SettingsPage settings={settings} onChange={setSettings} />}
    </main>
    <input id="book-file-input" className="visually-hidden" type="file" accept=".txt,.epub" multiple onChange={(event) => { if (event.target.files) void importFiles(event.target.files); event.currentTarget.value = '' }} />
  </div>
}

function Shelf({ books, onImport, onFiles, onOpen, onRemove }: { books: Book[]; onImport: () => Promise<void>; onFiles: (files: FileList | File[]) => Promise<void>; onOpen: (id: string) => void; onRemove: (id: string) => void }) {
  const [dragging, setDragging] = useState(false)
  const recent = books.filter((book) => book.progress).sort((a, b) => (b.progress?.lastReadAt ?? 0) - (a.progress?.lastReadAt ?? 0))[0]
  return <section className="shelf-page page-shell">
    <div className="section-heading"><div><p className="eyebrow">书架</p><h1>你的书架</h1><p className="lede">把书放在这里，阅读会从上次停下的地方继续。</p></div><button className="button primary" onClick={() => void onImport()}><FileUp size={16} />导入书籍</button></div>
    {recent && <button className="continue-strip" onClick={() => onOpen(recent.id)}><div><span className="strip-label">继续阅读</span><strong>{recent.title}</strong><span className="strip-progress">读到 {recent.progress?.percentage ?? 0}% · {recent.chapters.find((chapter) => chapter.id === recent.progress?.chapterId)?.title ?? '第一章'}</span></div><ChevronRight size={20} /></button>}
    <div className="library-rule"><span>全部书籍</span><span>{books.length.toString().padStart(2, '0')}</span></div>
    {books.length === 0 ? <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void onFiles(event.dataTransfer.files) }}><BookOpen size={28} strokeWidth={1.5} /><h2>从一本书开始</h2><p>拖入 TXT 或 EPUB 文件，或选择本地文件。</p><button className="button secondary" onClick={() => void onImport()}><FileUp size={15} />选择文件</button></div> : <div className="book-list">{books.map((book, index) => <article className="book-row" key={book.id}><div className="book-index">{String(index + 1).padStart(2, '0')}</div><div className="book-cover"><span>{book.title.slice(0, 1)}</span></div><div className="book-info"><h2>{book.title}</h2><p>{book.format.toUpperCase()} · {book.chapterCount} 章</p><div className="progress-line"><span style={{ width: `${book.progress?.percentage ?? 0}%` }} /></div></div><div className="book-progress">{book.progress?.percentage ?? 0}%</div><button className="icon-button" title="移除书籍" aria-label={`移除《${book.title}》`} onClick={() => onRemove(book.id)}><Trash2 size={17} /></button><button className="row-action" onClick={() => onOpen(book.id)}>打开 <ChevronRight size={16} /></button></article>)}</div>}
  </section>
}

function Reader({ book, settings, onSettings, onBookChange, onBack }: { book: Book; settings: ReaderSettings; onSettings: () => void; onBookChange: (book: Book) => void; onBack: () => void }) {
  const startingChapter = book.progress ? Math.max(0, book.chapters.findIndex((chapter) => chapter.id === book.progress?.chapterId)) : 0
  const [chapterIndex, setChapterIndex] = useState(startingChapter)
  const [showChapters, setShowChapters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [bookmarked, setBookmarked] = useState(() => Boolean(book.progress && book.bookmarks.some((item) => item.chapterId === book.progress?.chapterId)))
  const [pageIndex, setPageIndex] = useState(0)
  const articleRef = useRef<HTMLElement>(null)
  const chapter = book.chapters[chapterIndex] ?? book.chapters[0]
  const paragraphs = chapter.content.split('\n')
  const pageSize = 9
  const pageCount = Math.max(1, Math.ceil(paragraphs.length / pageSize))
  const visibleParagraphs = settings.mode === 'page' ? paragraphs.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize) : paragraphs
  const results = useMemo(() => searchChapters(query, book.chapters), [query, book.chapters])

  useEffect(() => { articleRef.current?.scrollTo({ top: 0 }); setPageIndex(0); const progress = progressFor(chapter.id, 0, book.chapters); onBookChange({ ...book, progress }) }, [chapter.id])
  const saveCurrentProgress = (paragraphIndex: number) => onBookChange({ ...book, progress: progressFor(chapter.id, paragraphIndex, book.chapters) })
  const changeChapter = (next: number) => { if (next < 0 || next >= book.chapters.length) return; setChapterIndex(next); setShowChapters(false) }
  const toggleBookmark = () => {
    const existing = book.bookmarks.find((item) => item.chapterId === chapter.id)
    const nextBookmarks = existing ? book.bookmarks.filter((item) => item.id !== existing.id) : [...book.bookmarks, { id: crypto.randomUUID(), chapterId: chapter.id, position: 0, createdAt: Date.now() }]
    setBookmarked(!existing); onBookChange({ ...book, bookmarks: nextBookmarks })
  }
  const previousPage = () => { if (settings.mode === 'page' && pageIndex > 0) setPageIndex(pageIndex - 1); else changeChapter(chapterIndex - 1) }
  const nextPage = () => { if (settings.mode === 'page' && pageIndex < pageCount - 1) setPageIndex(pageIndex + 1); else changeChapter(chapterIndex + 1) }
  const atStart = settings.mode === 'page' ? pageIndex === 0 && chapterIndex === 0 : chapterIndex === 0
  const atEnd = settings.mode === 'page' ? pageIndex === pageCount - 1 && chapterIndex === book.chapters.length - 1 : chapterIndex === book.chapters.length - 1
  return <section className="reader-view">
    <aside className="chapter-rail"><button className="icon-button rail-back" title="返回书架" aria-label="返回书架" onClick={onBack}><ArrowLeft size={18} /></button><div className="rail-marker"><span className="rail-current">{String(chapterIndex + 1).padStart(2, '0')}</span><span className="rail-total">/{String(book.chapters.length).padStart(2, '0')}</span></div><div className="rail-track"><span style={{ height: `${book.chapters.length ? ((chapterIndex + 1) / book.chapters.length) * 100 : 0}%` }} /></div><span className="rail-percent">{book.progress?.percentage ?? 0}%</span></aside>
    <div className="reader-main"><div className="reader-toolbar"><div className="reader-title"><span>{book.title}</span><span className="reader-separator">/</span><span>{chapter.title}</span></div><div className="reader-actions"><button className="icon-button" title="章节目录" aria-label="章节目录" onClick={() => setShowChapters(!showChapters)}><List size={18} /></button><button className={`icon-button ${bookmarked ? 'selected' : ''}`} title="书签" aria-label="书签" onClick={toggleBookmark}><Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} /></button><button className="icon-button" title="搜索" aria-label="搜索" onClick={() => setShowSearch(!showSearch)}><Search size={18} /></button><button className="icon-button" title="阅读设置" aria-label="阅读设置" onClick={onSettings}><Settings size={18} /></button></div></div><article ref={articleRef} className={`reading-surface ${settings.mode === 'page' ? 'page-mode' : ''}`} style={{ '--reader-size': `${settings.fontSize}px`, '--reader-leading': settings.lineHeight, '--reader-margin': `${settings.pageMargin}%` } as React.CSSProperties}><div className="chapter-heading"><p>{String(chapterIndex + 1).padStart(2, '0')} / {String(book.chapters.length).padStart(2, '0')}</p><h1>{chapter.title}</h1></div><div className="chapter-body">{visibleParagraphs.map((paragraph, index) => { const paragraphIndex = settings.mode === 'page' ? pageIndex * pageSize + index : index; return <p key={`${chapter.id}-${paragraphIndex}`} onClick={() => saveCurrentProgress(paragraphIndex)}>{paragraph || '\u00a0'}</p> })}</div><div className="chapter-footer"><button className="chapter-nav" disabled={atStart} onClick={previousPage}><ChevronLeft size={17} />{settings.mode === 'page' ? '上一页' : '上一章'}</button><span>{settings.mode === 'page' ? `${pageIndex + 1} / ${pageCount}` : `${book.progress?.percentage ?? 0}%`}</span><button className="chapter-nav" disabled={atEnd} onClick={nextPage}>{settings.mode === 'page' ? '下一页' : '下一章'}<ChevronRight size={17} /></button></div></article></div>
    {showChapters && <div className="reader-panel chapters-panel"><div className="panel-heading"><strong>章节目录</strong><button className="icon-button" onClick={() => setShowChapters(false)} aria-label="关闭目录"><X size={18} /></button></div><div className="chapter-list">{book.chapters.map((item, index) => <button key={item.id} className={index === chapterIndex ? 'chapter-item current' : 'chapter-item'} onClick={() => { setChapterIndex(index); setShowChapters(false) }}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong>{book.bookmarks.some((bookmark) => bookmark.chapterId === item.id) && <Bookmark size={14} fill="currentColor" />}</button>)}</div></div>}
    {showSearch && <div className="reader-panel search-panel"><div className="panel-heading"><strong>书内搜索</strong><button className="icon-button" onClick={() => setShowSearch(false)} aria-label="关闭搜索"><X size={18} /></button></div><input autoFocus className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词" />{query && <div className="search-results">{results.length ? results.map((result) => <button key={result.chapterId} onClick={() => { const index = book.chapters.findIndex((item) => item.id === result.chapterId); setChapterIndex(index); setShowSearch(false) }}><strong>{result.title}</strong><span>{result.excerpt}</span></button>) : <p className="empty-panel">没有找到相关内容</p>}</div>}</div>}
  </section>
}

function SettingsPage({ settings, onChange }: { settings: ReaderSettings; onChange: (settings: ReaderSettings) => void }) {
  const update = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => onChange({ ...settings, [key]: value })
  const themes: Array<{ id: Theme; label: string; icon: typeof Sun }> = [{ id: 'light', label: '明亮', icon: Sun }, { id: 'sepia', label: '护眼', icon: Leaf }, { id: 'dark', label: '暗色', icon: Moon }]
  return <section className="settings-page page-shell"><div className="section-heading"><div><p className="eyebrow">偏好设置</p><h1>阅读设置</h1><p className="lede">调整后的样式会自动保存，并应用到所有书籍。</p></div></div><div className="settings-layout"><div className="settings-group"><div className="setting-heading"><strong>主题</strong><span>选择最适合当前环境的背景。</span></div><div className="theme-options">{themes.map(({ id, label, icon: Icon }) => <button key={id} className={`theme-option theme-preview-${id} ${settings.theme === id ? 'selected' : ''}`} onClick={() => update('theme', id)}><Icon size={17} /><span>{label}</span></button>)}</div></div><div className="settings-group"><div className="setting-heading"><strong>文字</strong><span>让长篇阅读保持稳定的节奏。</span></div><label className="range-setting"><span>字体大小 <b>{settings.fontSize}px</b></span><input type="range" min="15" max="26" value={settings.fontSize} onChange={(event) => update('fontSize', Number(event.target.value))} /></label><label className="range-setting"><span>行距 <b>{settings.lineHeight.toFixed(1)}</b></span><input type="range" min="1.4" max="2.4" step="0.1" value={settings.lineHeight} onChange={(event) => update('lineHeight', Number(event.target.value))} /></label><label className="range-setting"><span>页边距 <b>{settings.pageMargin}%</b></span><input type="range" min="5" max="24" value={settings.pageMargin} onChange={(event) => update('pageMargin', Number(event.target.value))} /></label></div><div className="settings-group"><div className="setting-heading"><strong>阅读方式</strong><span>滚动阅读适合连续阅读，分页阅读适合专注单页。</span></div><div className="segmented"><button className={settings.mode === 'scroll' ? 'selected' : ''} onClick={() => update('mode', 'scroll')}>滚动阅读</button><button className={settings.mode === 'page' ? 'selected' : ''} onClick={() => update('mode', 'page')}>分页阅读</button></div></div><div className="settings-footer"><span>设置保存在当前设备</span><button className="button secondary" onClick={() => onChange(defaultSettings)}>恢复默认</button></div></div></section>
}
