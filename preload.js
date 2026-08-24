const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('extratorAPI', {
  extrair: (opcoes) => ipcRenderer.invoke('extrair-materia', opcoes),
  abrirUltimo: () => ipcRenderer.invoke('abrir-ultimo'),
  abrirHistorico: () => ipcRenderer.invoke('abrir-historico'),
  abrirPasta: () => ipcRenderer.invoke('abrir-pasta'),
  obterEstado: () => ipcRenderer.invoke('obter-estado'),
  onStatus: (callback) => ipcRenderer.on('extracao-status', (_event, mensagem) => callback(mensagem))
});
