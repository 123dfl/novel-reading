import { expect, test } from '@playwright/test'

test('shows the empty shelf and import entry point', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '你的书架' })).toBeVisible()
  await expect(page.getByText('从一本书开始')).toBeVisible()
  await expect(page.getByRole('button', { name: '选择文件' })).toBeVisible()
})

test('imports TXT and opens the reading workflow', async ({ page }) => {
  await page.goto('/')
  await page.locator('#book-file-input').setInputFiles({
    name: '雨夜.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('第一章 雨夜\n\n窗外下着雨。\n\n第二章 清晨\n\n天亮了。')
  })
  await expect(page.getByRole('heading', { name: '第一章 雨夜' })).toBeVisible()
  await expect(page.getByText('窗外下着雨。')).toBeVisible()
  await page.getByRole('button', { name: '书签' }).click()
  await expect(page.getByRole('button', { name: '书签' })).toHaveClass(/selected/)
  await page.getByRole('button', { name: '章节目录' }).click()
  await expect(page.getByText('第二章 清晨')).toBeVisible()
  await page.getByRole('button', { name: '第二章 清晨' }).click()
  await expect(page.getByRole('heading', { name: '第二章 清晨' })).toBeVisible()
  await page.getByRole('button', { name: '阅读设置' }).click()
  await expect(page.getByRole('heading', { name: '阅读设置' })).toBeVisible()
  await page.getByRole('slider', { name: '字体大小' }).fill('22')
  await page.getByRole('button', { name: '分页阅读' }).click()
  await page.getByRole('button', { name: '正在阅读' }).click()
  await expect(page.locator('.reading-surface')).toHaveClass(/page-mode/)
})
