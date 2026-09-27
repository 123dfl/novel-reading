import { describe, expect, it } from 'vitest'
import { decodeText, normalizeText, parseTxt, titleFromPath } from '../../src/shared/txt-parser'

describe('TXT parser', () => {
  it('normalizes line endings and removes control characters', () => {
    expect(normalizeText(' 第一行\r\n\u0000第二行\r')).toBe('第一行\n第二行')
  })

  it('splits numbered Chinese chapters while preserving content', () => {
    const chapters = parseTxt('序言\n\n第一章 初见\n\n河流向南。\n\n第二章 夜行\n\n灯火未眠。')
    expect(chapters.map((chapter) => chapter.title)).toEqual(['前言', '第一章 初见', '第二章 夜行'])
    expect(chapters[1].content).toContain('河流向南')
    expect(chapters[2].content).toBe('灯火未眠。')
  })

  it('falls back to one chapter when headings are absent', () => {
    expect(parseTxt('一篇没有章节标题的文章。')).toEqual([{ id: 'chapter-1', title: '全文', content: '一篇没有章节标题的文章。' }])
  })

  it('decodes UTF-8 BOM', () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x4f, 0x4b]))).toBe('OK')
  })

  it('extracts a title from TXT and EPUB paths', () => {
    expect(titleFromPath('D:\\books\\长夜.epub')).toBe('长夜')
  })
})
