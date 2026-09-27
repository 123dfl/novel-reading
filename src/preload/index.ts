import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('readerApi', {
  chooseBook: (): Promise<string | null> => ipcRenderer.invoke('books:choose'),
  importBook: (filePath: string) => ipcRenderer.invoke('books:import', filePath),
  listBooks: async () => []
})
