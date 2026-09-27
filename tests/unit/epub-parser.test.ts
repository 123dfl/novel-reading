import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { parseEpub } from '../../src/shared/epub-parser'

describe('EPUB parser', () => {
  it('follows the spine order and extracts readable text', async () => {
    const zip = new JSZip()
    zip.file('META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/content.opf" /></rootfiles></container>')
    zip.file('OPS/content.opf', '<package><manifest><item id="chapter-1" href="chapter.xhtml" media-type="application/xhtml+xml" /></manifest><spine><itemref idref="chapter-1" /></spine></package>')
    zip.file('OPS/chapter.xhtml', '<html><body><h1>第一章 雨夜</h1><p>窗外下着雨。</p></body></html>')
    const result = await parseEpub(new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' })))
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('第一章 雨夜')
    expect(result[0].content).toContain('窗外下着雨。')
  })
})
