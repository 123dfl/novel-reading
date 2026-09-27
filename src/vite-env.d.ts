/// <reference types="vite/client" />

interface Window {
  readerApi?: {
    chooseBook: () => Promise<string | null>
    importBook: (filePath: string) => Promise<import('./shared/models').Book>
    listBooks: () => Promise<import('./shared/models').Book[]>
  }
}
