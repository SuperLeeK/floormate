import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let chatInputWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let historyWindow: BrowserWindow | null = null;
let previewWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

let currentDisplayId: number | null = null;

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'dopamine_settings.json');
}

function loadSavedDisplayId(): number | null {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data && typeof data.selectedDisplayId === 'number') {
        const displays = screen.getAllDisplays();
        const found = displays.find(d => d.id === data.selectedDisplayId);
        if (found) {
          return found.id;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load saved settings in main:', err);
  }
  return null;
}

function saveDisplayId(displayId: number) {
  try {
    const filePath = getSettingsFilePath();
    let existing: any = {};
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {}
    }
    existing.selectedDisplayId = displayId;
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save displayId in main:', err);
  }
}

// 화면 작업 영역 (Full-Screen Overlay Canvas)
function calculateScreenBounds(displayId?: number | null) {
  const displays = screen.getAllDisplays();
  let targetDisplay = screen.getPrimaryDisplay();

  if (displayId) {
    const found = displays.find((d) => d.id === displayId);
    if (found) targetDisplay = found;
  } else if (currentDisplayId) {
    const found = displays.find((d) => d.id === currentDisplayId);
    if (found) targetDisplay = found;
  }

  const { x, y, width, height } = targetDisplay.workArea;

  return {
    x,
    y,
    width,
    height
  };
}

// 1. 하단 펫 오버레이 윈도우 생성 (화면 전체 투명 캔버스)
function createMainWindow() {
  const bounds = calculateScreenBounds();

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'floating', 1);

  // 기본적으로 마우스 이벤트를 완벽히 관통시킴
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  const url = process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL
    : path.join(__dirname, '../dist/index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadFile(url);
  }

  screen.on('display-metrics-changed', () => {
    if (mainWindow) {
      mainWindow.setBounds(calculateScreenBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 2. 화면 상단 중앙 말풍선 입력 윈도우 생성
function createChatInputWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width } = primaryDisplay.workArea;
  const winWidth = 380;
  const winHeight = 64;

  chatInputWindow = new BrowserWindow({
    x: Math.round(x + (width - winWidth) / 2),
    y: Math.round(y + 36),
    width: winWidth,
    height: winHeight,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  chatInputWindow.setAlwaysOnTop(true, 'screen-saver', 2);

  const targetUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?window=chat`
    : `file://${path.join(__dirname, '../dist/index.html')}?window=chat`;

  chatInputWindow.loadURL(targetUrl);

  chatInputWindow.on('blur', () => {
    chatInputWindow?.hide();
    mainWindow?.webContents.send('on-chat-typing', false);
  });

  chatInputWindow.on('closed', () => {
    chatInputWindow = null;
  });
}

// 3. 화면 중앙 독립 환경설정 윈도우 생성 (680x560: 사이드바 + 설정 폼)
function createSettingsWindow() {
  const winWidth = 680;
  const winHeight = 560;

  settingsWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false, // macOS 투명 윈도우 검은색 외곽 테두리 및 그림자 잔상 방지
    show: false,
    center: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const targetUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?window=settings`
    : `file://${path.join(__dirname, '../dist/index.html')}?window=settings`;

  settingsWindow.loadURL(targetUrl);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// 4. 최근 대화 기록 독립 윈도우 생성 (세로형 메신저 380x680)
function createChatHistoryWindow() {
  const winWidth = 380;
  const winHeight = 680;

  historyWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false,
    center: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const targetUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?window=history`
    : `file://${path.join(__dirname, '../dist/index.html')}?window=history`;

  historyWindow.loadURL(targetUrl);

  historyWindow.on('closed', () => {
    historyWindow = null;
  });
}

// 5. 실시간 미리보기 독립 윈도우 생성 (440x520)
function createPreviewWindow() {
  const winWidth = 440;
  const winHeight = 520;

  previewWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false,
    center: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const targetUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?window=preview`
    : `file://${path.join(__dirname, '../dist/index.html')}?window=preview`;

  previewWindow.loadURL(targetUrl);

  previewWindow.on('closed', () => {
    previewWindow = null;
  });
}

// 6. 시스템 트레이 생성
let currentTrayStatus: string = 'online';

function getTrayStatusLabel(status: string) {
  if (status === 'online') {
    return '🟢 활동 중 (5분 미활동 시 취침)';
  } else if (status === 'sleep') {
    return '💤 취침 중 (활동 시 깨어남)';
  } else if (status === 'busy') {
    return '🔥 집중 작업 중';
  } else if (status === 'away') {
    return '☕ 자리비움';
  }
  return '🟢 활동 중';
}

function updateTrayMenu(status = currentTrayStatus) {
  currentTrayStatus = status;
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: getTrayStatusLabel(currentTrayStatus),
      enabled: false
    },
    { type: 'separator' },
    {
      label: '💬 말풍선 입력 (Ctrl+Alt+Cmd+P)',
      click: () => openChatInput()
    },
    {
      label: '📜 최근 대화 기록...',
      click: () => openHistory()
    },
    {
      label: '👁️ 실시간 미리보기...',
      click: () => openPreview()
    },
    {
      label: '⚙️ 환경설정...',
      click: () => openSettings()
    },
    { type: 'separator' },
    {
      label: '🚪 FloorMate 종료',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, 'tray-iconTemplate.png')
    : path.join(__dirname, 'tray-icon.png');

  let trayIcon = nativeImage.createFromPath(iconPath);
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty();
  } else if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true);
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('FloorMate (화면 바닥의 픽셀 메이트들)');

  updateTrayMenu('online');

  tray.on('click', () => {
    tray?.popUpContextMenu();
  });
}

function openChatInput() {
  if (!chatInputWindow || chatInputWindow.isDestroyed()) {
    createChatInputWindow();
  }
  const targetDisplay = (currentDisplayId && screen.getAllDisplays().find(d => d.id === currentDisplayId))
    || screen.getPrimaryDisplay();
  const { x, y, width } = targetDisplay.workArea;
  const winWidth = 380;
  const winHeight = 64;
  chatInputWindow?.setBounds({
    x: Math.round(x + (width - winWidth) / 2),
    y: Math.round(y + 36),
    width: winWidth,
    height: winHeight
  });
  chatInputWindow?.show();
  chatInputWindow?.focus();
}

function openHistory() {
  if (!historyWindow || historyWindow.isDestroyed()) {
    createChatHistoryWindow();
  }
  historyWindow?.show();
  historyWindow?.focus();
}

function openSettings() {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow();
  }
  settingsWindow?.show();
  settingsWindow?.focus();
}

function openPreview() {
  if (!previewWindow || previewWindow.isDestroyed()) {
    createPreviewWindow();
  }
  previewWindow?.show();
  previewWindow?.focus();
}

// IPC 통신 등록
ipcMain.handle('get-displays', () => {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, index) => ({
    id: d.id,
    label: `${index + 1}번 모니터 (${d.bounds.width}x${d.bounds.height}${d.id === primaryId ? ' - 주 화면' : ''})`,
    bounds: d.bounds
  }));
});

ipcMain.on('set-display-id', (_event, displayId: number) => {
  currentDisplayId = displayId;
  saveDisplayId(displayId);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const newBounds = calculateScreenBounds(displayId);
    mainWindow.setBounds(newBounds);
  }
  if (chatInputWindow && !chatInputWindow.isDestroyed()) {
    const targetDisplay = screen.getAllDisplays().find(d => d.id === displayId) || screen.getPrimaryDisplay();
    const { x, y, width } = targetDisplay.workArea;
    chatInputWindow.setBounds({
      x: Math.round(x + (width - 380) / 2),
      y: Math.round(y + 36),
      width: 380,
      height: 64
    });
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win === mainWindow) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on('open-history-window', () => {
  openHistory();
});

ipcMain.on('close-history-window', () => {
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.hide();
  }
});

ipcMain.on('open-settings-window', () => {
  openSettings();
});

ipcMain.on('close-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.hide();
  }
  mainWindow?.webContents.send('on-preview-walking-area', null);
});

ipcMain.on('open-preview-window', () => {
  openPreview();
});

ipcMain.on('close-preview-window', () => {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.hide();
  }
});

ipcMain.on('preview-walking-area', (_event, area) => {
  mainWindow?.webContents.send('on-preview-walking-area', area);
});

ipcMain.on('open-chat-input-window', () => {
  openChatInput();
});

ipcMain.on('close-chat-input-window', () => {
  if (chatInputWindow && !chatInputWindow.isDestroyed()) {
    chatInputWindow.hide();
  }
});

ipcMain.on('send-chat-message', (_event, text: string) => {
  if (chatInputWindow && !chatInputWindow.isDestroyed()) {
    chatInputWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('on-chat-typing', false);
    if (text?.trim()) {
      mainWindow.webContents.send('on-chat-message', text.trim());
    }
  }
});

ipcMain.on('chat-typing', (_event, isTyping: boolean) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('on-chat-typing', isTyping);
  }
});

ipcMain.on('save-settings', (_event, newSettings) => {
  // 사용자의 요청: 저장하고 적용하기를 눌러도 창을 닫지 않고 유지!
  mainWindow?.webContents.send('on-preview-walking-area', null);
  if (newSettings?.selectedDisplayId) {
    currentDisplayId = newSettings.selectedDisplayId;
    saveDisplayId(newSettings.selectedDisplayId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBounds(calculateScreenBounds(currentDisplayId));
    }
    if (chatInputWindow && !chatInputWindow.isDestroyed()) {
      const targetDisplay = screen.getAllDisplays().find(d => d.id === currentDisplayId) || screen.getPrimaryDisplay();
      const { x, y, width } = targetDisplay.workArea;
      chatInputWindow.setBounds({
        x: Math.round(x + (width - 380) / 2),
        y: Math.round(y + 36),
        width: 380,
        height: 64
      });
    }
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('on-settings-updated', newSettings);
  }
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.webContents.send('on-settings-updated', newSettings);
  }
});

ipcMain.on('update-tray-status', (_event, status: string) => {
  updateTrayMenu(status);
});

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-close', () => {
  app.quit();
});

app.whenReady().then(() => {
  currentDisplayId = loadSavedDisplayId();
  createMainWindow();
  createChatInputWindow();
  createSettingsWindow();
  createChatHistoryWindow();
  createPreviewWindow();
  createTray();

  const shortcutKey = process.platform === 'darwin' ? 'Control+Alt+Command+P' : 'Control+Alt+Shift+P';
  globalShortcut.register(shortcutKey, () => {
    openChatInput();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
