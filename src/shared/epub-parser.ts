import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import type { Chapter } from './models'

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function asArray<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value] }

function directoryOf(filePath: string): string { const index = filePath.lastIndexOf('/'); return index < 0 ? '' : filePath.slice(0, index + 1) }

function resolvePath(base: string, relative: string): string {
  const parts = `${base}${relative}`.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return resolved.join('/')
}

function textFromMarkup(markup: string): string {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}

export async function parseEpub(buffer: Uint8Array): Promise<Chapter[]> {
  const zip = await JSZip.loadAsync(buffer)
  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) throw new Error('EPUB 缺少容器配置')
  const container = xmlParser.parse(await containerFile.async('text')) as { container?: { rootfiles?: { rootfile?: { '@_full-path'?: string } | Array<{ '@_full-path'?: string }> } } }
  const rootfile = asArray(container.container?.rootfiles?.rootfile)[0]?.['@_full-path']
  if (!rootfile) throw new Error('EPUB 缺少书籍目录')
  const opfFile = zip.file(rootfile)
  if (!opfFile) throw new Error('EPUB 书籍目录不可读')
  const opf = xmlParser.parse(await opfFile.async('text')) as { package?: { manifest?: { item?: unknown | unknown[] }; spine?: { itemref?: unknown | unknown[] } } }
  const manifest = asArray(opf.package?.manifest?.item as { '@_id'?: string; '@_href'?: string; '@_media-type'?: string }[] | undefined)
  const manifestById = new Map(manifest.filter((item) => item['@_id'] && item['@_href']).map((item) => [item['@_id'] as string, item]))
  const spine = asArray(opf.package?.spine?.itemref as { '@_idref'?: string }[] | undefined)
  const chapters: Chapter[] = []
  for (const [index, item] of spine.entries()) {
    const manifestItem = item['@_idref'] ? manifestById.get(item['@_idref']) : undefined
    if (!manifestItem?.['@_href']) continue
    const contentFile = zip.file(resolvePath(directoryOf(rootfile), manifestItem['@_href']))
    if (!contentFile) continue
    const content = textFromMarkup(await contentFile.async('text'))
    if (content) chapters.push({ id: `chapter-${chapters.length + 1}`, title: content.split('\n')[0].slice(0, 60) || `第 ${index + 1} 章`, content })
  }
  if (chapters.length === 0) throw new Error('EPUB 中没有可阅读的章节')
  return chapters
}
