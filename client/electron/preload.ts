import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  minimizeWindow: () => {
    ipcRenderer.send('window-minimize');
  },
  closeWindow: () => {
    ipcRenderer.send('window-close');
  },
  openSettingsWindow: () => {
    ipcRenderer.send('open-settings-window');
  },
  openChatInputWindow: () => {
    ipcRenderer.send('open-chat-input-window');
  },
  closeChatInputWindow: () => {
    ipcRenderer.send('close-chat-input-window');
  },
  closeSettingsWindow: () => {
    ipcRenderer.send('close-settings-window');
  },
  openHistoryWindow: () => {
    ipcRenderer.send('open-history-window');
  },
  closeHistoryWindow: () => {
    ipcRenderer.send('close-history-window');
  },
  openPreviewWindow: () => {
    ipcRenderer.send('open-preview-window');
  },
  closePreviewWindow: () => {
    ipcRenderer.send('close-preview-window');
  },
  sendChatMessage: (text: string) => {
    ipcRenderer.send('send-chat-message', text);
  },
  sendTyping: (isTyping: boolean) => {
    ipcRenderer.send('chat-typing', isTyping);
  },
  onChatTyping: (callback: (isTyping: boolean) => void) => {
    const handler = (_event: any, isTyping: boolean) => callback(isTyping);
    ipcRenderer.on('on-chat-typing', handler);
    return () => {
      ipcRenderer.removeListener('on-chat-typing', handler);
    };
  },
  saveSettings: (settings: any) => {
    ipcRenderer.send('save-settings', settings);
  },
  onReceiveChatMessage: (callback: (text: string) => void) => {
    const handler = (_event: any, text: string) => callback(text);
    ipcRenderer.on('on-chat-message', handler);
    return () => {
      ipcRenderer.removeListener('on-chat-message', handler);
    };
  },
  onSettingsUpdated: (callback: (settings: any) => void) => {
    const handler = (_event: any, settings: any) => callback(settings);
    ipcRenderer.on('on-settings-updated', handler);
    return () => {
      ipcRenderer.removeListener('on-settings-updated', handler);
    };
  },
  onStatusChangedFromTray: (callback: (status: string) => void) => {
    const handler = (_event: any, status: string) => callback(status);
    ipcRenderer.on('on-status-changed-from-tray', handler);
    return () => {
      ipcRenderer.removeListener('on-status-changed-from-tray', handler);
    };
  },
  updateTrayStatus: (status: string) => {
    ipcRenderer.send('update-tray-status', status);
  },
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setDisplayId: (displayId: number) => ipcRenderer.send('set-display-id', displayId),
  previewWalkingArea: (area: any) => ipcRenderer.send('preview-walking-area', area),
  onPreviewWalkingArea: (callback: (area: any) => void) => {
    const handler = (_event: any, area: any) => callback(area);
    ipcRenderer.on('on-preview-walking-area', handler);
    return () => {
      ipcRenderer.removeListener('on-preview-walking-area', handler);
    };
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),
  onUpdateStatus: (callback: (info: any) => void) => {
    const handler = (_event: any, info: any) => callback(info);
    ipcRenderer.on('on-update-status', handler);
    return () => {
      ipcRenderer.removeListener('on-update-status', handler);
    };
  }
});
