import type { Chapter } from './models'

export function decodeText(buffer: Uint8Array): string {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer.slice(2))
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer.slice(2))
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return new TextDecoder('utf-8').decode(buffer.slice(3))

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const replacementCount = (utf8.match(/\ufffd/g) ?? []).length
  if (replacementCount < Math.max(2, utf8.length * 0.01)) return utf8
  return new TextDecoder('gb18030').decode(buffer)
}

export function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[\u0000\u000b\f]/g, '').trim()
}

const chapterPattern = /^\s*((?:第\s*[0-9零一二三四五六七八九十百千万]+\s*[章节回部卷篇].*)|(?:Chapter\s+[0-9]+.*))\s*$/gim

export function parseTxt(text: string): Chapter[] {
  const normalized = normalizeText(text)
  const matches = [...normalized.matchAll(chapterPattern)]
  if (matches.length === 0) return [{ id: 'chapter-1', title: '全文', content: normalized }]

  const chapters: Chapter[] = []
  matches.forEach((match, index) => {
    const start = match.index ?? 0
    const end = matches[index + 1]?.index ?? normalized.length
    const title = match[1].trim()
    const content = normalized.slice(start + match[0].length, end).trim()
    chapters.push({ id: `chapter-${index + 1}`, title, content })
  })

  if (matches[0].index && matches[0].index > 0) {
    chapters.unshift({ id: 'preface', title: '前言', content: normalized.slice(0, matches[0].index).trim() })
  }
  return chapters.filter((chapter) => chapter.content.length > 0)
}

export function titleFromPath(path: string): string {
  const filename = path.split(/[\\/]/).pop() ?? '未命名书籍'
  return filename.replace(/\.(txt|epub)$/i, '') || '未命名书籍'
}
