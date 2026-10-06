import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AppSettings,
  CharacterType,
  NameTagPosition,
  DisplayInfo,
  RecentRoomItem,
  BotConfig,
  BubbleTheme,
  ThrowItemType,
  UpdateStatusInfo,
} from "../types";
import { PixelCharacter } from "./PixelCharacter";
import {
  X,
  User,
  Users,
  Sparkles,
  Settings as SettingsIcon,
  Check,
  Plus,
  Compass,
  Monitor,
  MoveHorizontal,
  Bot,
  MessageSquareText,
  Sidebar,
  Eye,
  Keyboard,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { CHARACTERS } from "../constants";
import "./SettingsView.css";

// 말풍선 테마 목록
const BUBBLE_THEMES: { id: BubbleTheme; label: string; isPro?: boolean }[] = [
  { id: "default", label: "기본 말풍선", isPro: false },
  { id: "neon-dark", label: "네온 다크", isPro: false },
  { id: "retro-pixel", label: "픽셀 레트로", isPro: true },
  { id: "cyber-pink", label: "사이버 핑크", isPro: true },
];

// 투척 아이템 테마 목록
const THROW_ITEMS: {
  id: ThrowItemType;
  label: string;
  emoji: string;
  isPro?: boolean;
}[] = [
  { id: "bomb", label: "기본 폭탄", emoji: "💣", isPro: false },
  { id: "stone", label: "단단한 돌멩이", emoji: "🪨", isPro: false },
  { id: "heart", label: "하트 뿅뿅", emoji: "💖", isPro: false },
  { id: "lightning", label: "찌릿 번개", emoji: "⚡", isPro: true },
  { id: "star", label: "황금 별", emoji: "⭐", isPro: true },
  { id: "waterball", label: "물풍선", emoji: "🎈", isPro: true },
];

const PERMANENT_SERVER_URL = "https://floormate.hoeng.site";

function getSavedSettings(): AppSettings {
  try {
    const saved = localStorage.getItem("dopamine_sidey_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        !parsed.userAvatar ||
        !CHARACTERS.some((c) => c.type === parsed.userAvatar)
      ) {
        parsed.userAvatar = "cat";
      }
      if (!parsed.serverUrl || parsed.serverUrl.includes('localhost') || parsed.serverUrl.includes('trycloudflare.com')) {
        parsed.serverUrl = PERMANENT_SERVER_URL;
      }
      if (parsed.autoUpdateEnabled === undefined) {
        parsed.autoUpdateEnabled = true;
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  return {
    serverUrl: PERMANENT_SERVER_URL,
    roomId: "floor-main",
    roomName: "내 방",
    userId: `user_${Math.random().toString(36).substr(2, 6)}`,
    userName: "친구",
    userAvatar: "cat",
    dockSide: "right",
    soundEnabled: true,
    maxBubbleCount: 2,
    bubbleDurationSec: 6,
    nameTagPosition: "top",
    nameTagSpacing: 4,
    walkingArea: { minPercent: 0, maxPercent: 100 },
    recentRooms: [{ code: "floor-main", name: "내 방" }],
    bubbleTheme: "default",
    throwItem: "bomb",
    autoUpdateEnabled: true,
  };
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatKeyCombination(e: React.KeyboardEvent): string | null {
  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const parts: string[] = [];

  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push(isMac ? "Command" : "Super");

  let key = e.key;
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) {
    return null;
  }

  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join("+");
}

function displayShortcut(shortcut: string): string {
  if (!shortcut || !shortcut.trim()) return "미지정 (클릭하여 키 입력)";
  return shortcut
    .replace(/Control/g, "Ctrl")
    .replace(/Command/g, "Cmd")
    .replace(/\+/g, " + ");
}

type SidebarTab = "profile" | "group" | "shortcuts" | "shop" | "settings";

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");
  const [settings] = useState<AppSettings>(getSavedSettings);

  // 1. 프로필
  const [userName, setUserName] = useState(settings.userName);
  const [userAvatar, setUserAvatar] = useState<CharacterType>(
    settings.userAvatar,
  );
  const [nameTagPosition, setNameTagPosition] = useState<NameTagPosition>(
    settings.nameTagPosition || "top",
  );
  const [nameTagSpacing, setNameTagSpacing] = useState<number>(
    settings.nameTagSpacing ?? 4,
  );

  // 2. 꾸미기/상점
  const [bubbleTheme, setBubbleTheme] = useState<BubbleTheme>(
    settings.bubbleTheme || "default",
  );
  const [throwItem, setThrowItem] = useState<ThrowItemType>(
    settings.throwItem || "bomb",
  );
  const [maxBubbleCount, setMaxBubbleCount] = useState<number>(
    settings.maxBubbleCount || 2,
  );
  const [bubbleDurationSec, setBubbleDurationSec] = useState<number>(
    settings.bubbleDurationSec || 6,
  );

  // 3. 그룹 (세션)
  const [roomId, setRoomId] = useState(settings.roomId);
  const [roomName, setRoomName] = useState(settings.roomName || "내 방");
  const [recentRooms, setRecentRooms] = useState<RecentRoomItem[]>(
    settings.recentRooms || [],
  );
  const [newRoomNameInput, setNewRoomNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinNameInput, setJoinNameInput] = useState("");
  const [copied, setCopied] = useState(false);

  // 4. 단축키 설정
  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const defaultChatKey = isMac ? "Control+Alt+Command+P" : "Control+Alt+Shift+P";
  const [chatInputShortcut, setChatInputShortcut] = useState<string>(
    settings.shortcuts?.chatInput ?? defaultChatKey
  );
  const [chatHistoryShortcut, setChatHistoryShortcut] = useState<string>(
    settings.shortcuts?.chatHistory ?? ""
  );
  const [settingsShortcut, setSettingsShortcut] = useState<string>(
    settings.shortcuts?.settings ?? ""
  );
  const [recordingTarget, setRecordingTarget] = useState<
    "chatInput" | "chatHistory" | "settings" | null
  >(null);

  const handleShortcutKeyDown = (
    e: React.KeyboardEvent,
    target: "chatInput" | "chatHistory" | "settings"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape 또는 Backspace는 단축키 해제(초기화)
    if (e.key === "Escape" || e.key === "Backspace") {
      if (target === "chatInput") setChatInputShortcut(defaultChatKey);
      else if (target === "chatHistory") setChatHistoryShortcut("");
      else if (target === "settings") setSettingsShortcut("");
      setRecordingTarget(null);
      return;
    }

    const combination = formatKeyCombination(e);
    if (combination) {
      if (target === "chatInput") setChatInputShortcut(combination);
      else if (target === "chatHistory") setChatHistoryShortcut(combination);
      else if (target === "settings") setSettingsShortcut(combination);
      setRecordingTarget(null);
    }
  };

  // 5. 앱 설정
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [selectedDisplayId, setSelectedDisplayId] = useState<
    number | undefined
  >(settings.selectedDisplayId);
  const [walkingArea, setWalkingArea] = useState(
    settings.walkingArea || { minPercent: 0, maxPercent: 100 },
  );
  const [savedFeedback, setSavedFeedback] = useState(false);

  // DEV 전용 봇 목록
  const [bots, setBots] = useState<BotConfig[]>(settings.bots || []);

  // 6. 자동 업데이트 설정 및 상태
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(
    settings.autoUpdateEnabled !== false
  );
  const [appVersion, setAppVersion] = useState<string>("1.0.1");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusInfo>({
    state: "idle",
  });

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((ver) => {
        if (ver) setAppVersion(ver);
      });
    }
    if (window.electronAPI?.onUpdateStatus) {
      const cleanup = window.electronAPI.onUpdateStatus((info) => {
        setUpdateStatus(info);
      });
      return () => {
        if (typeof cleanup === "function") cleanup();
      };
    }
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setUpdateStatus({ state: "checking" });
    try {
      await window.electronAPI.checkForUpdates();
    } catch (err: any) {
      setUpdateStatus({
        state: "error",
        error: err?.message || "업데이트 확인 중 오류가 발생했습니다.",
      });
    }
  };

  const handleDownloadUpdate = () => {
    window.electronAPI?.downloadUpdate?.();
  };

  const handleQuitAndInstall = () => {
    window.electronAPI?.quitAndInstall?.();
  };

  const handleToggleAutoUpdate = (enabled: boolean) => {
    setAutoUpdateEnabled(enabled);
    const updated: AppSettings = {
      ...settings,
      userName: userName.trim() || "친구",
      userAvatar,
      bubbleTheme,
      throwItem,
      roomId,
      roomName,
      recentRooms,
      selectedDisplayId,
      walkingArea,
      nameTagPosition,
      nameTagSpacing,
      maxBubbleCount,
      bubbleDurationSec,
      bots,
      serverUrl: PERMANENT_SERVER_URL,
      shortcuts: {
        chatInput: chatInputShortcut,
        chatHistory: chatHistoryShortcut,
        settings: settingsShortcut,
      },
      autoUpdateEnabled: enabled,
    };
    saveAndNotify(updated);
  };

  // 디스플레이 목록 로드
  useEffect(() => {
    if (window.electronAPI?.getDisplays) {
      window.electronAPI.getDisplays().then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setDisplays(list);
          if (!selectedDisplayId) {
            setSelectedDisplayId(list[0].id);
          }
        }
      });
    }
  }, []);

  // 산책 영역 가이드 실시간 투사 (깜빡임 없이 rAF 스로틀링)
  const rafRef = useRef<number | null>(null);

  const updateWalkingAreaPreview = useCallback(
    (area: { minPercent: number; maxPercent: number }) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        window.electronAPI?.previewWalkingArea?.(area);
      });
    },
    [],
  );

  useEffect(() => {
    if (activeTab === "settings") {
      updateWalkingAreaPreview(walkingArea);
    } else {
      window.electronAPI?.previewWalkingArea?.(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "settings") {
      updateWalkingAreaPreview(walkingArea);
    }
  }, [walkingArea, activeTab, updateWalkingAreaPreview]);

  useEffect(() => {
    return () => {
      window.electronAPI?.previewWalkingArea?.(null);
    };
  }, []);

  const handleClose = () => {
    window.electronAPI?.previewWalkingArea?.(null);
    window.electronAPI?.closeSettingsWindow();
  };

  const handleCopyCode = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const saveAndNotify = (newSettings: AppSettings) => {
    localStorage.setItem("dopamine_sidey_settings", JSON.stringify(newSettings));
    localStorage.setItem("dopamine_settings", JSON.stringify(newSettings));
    window.electronAPI?.saveSettings(newSettings);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 2000);
  };

  const handleCreateNewRoom = () => {
    const newCode = generateRoomCode();
    const finalName = newRoomNameInput.trim() || "새로운 아지트";
    setRoomId(newCode);
    setRoomName(finalName);
    const updatedRooms = [
      { code: newCode, name: finalName },
      ...recentRooms.filter((r) => r.code !== newCode),
    ].slice(0, 6);
    setRecentRooms(updatedRooms);
    setNewRoomNameInput("");

    const updated: AppSettings = {
      ...settings,
      userName: userName.trim() || "친구",
      userAvatar,
      bubbleTheme,
      throwItem,
      roomId: newCode,
      roomName: finalName,
      recentRooms: updatedRooms,
      selectedDisplayId,
      walkingArea,
      nameTagPosition,
      nameTagSpacing,
      maxBubbleCount,
      bubbleDurationSec,
      bots,
      serverUrl: PERMANENT_SERVER_URL,
      shortcuts: {
        chatInput: chatInputShortcut,
        chatHistory: chatHistoryShortcut,
        settings: settingsShortcut,
      },
      autoUpdateEnabled,
    };
    saveAndNotify(updated);
  };

  const handleJoinWithCode = () => {
    const formatted = joinCodeInput.trim().toUpperCase();
    if (!formatted) return;
    const finalName = joinNameInput.trim() || "친구 방";
    setRoomId(formatted);
    setRoomName(finalName);
    const updatedRooms = [
      { code: formatted, name: finalName },
      ...recentRooms.filter((r) => r.code !== formatted),
    ].slice(0, 6);
    setRecentRooms(updatedRooms);
    setJoinCodeInput("");
    setJoinNameInput("");

    const updated: AppSettings = {
      ...settings,
      userName: userName.trim() || "친구",
      userAvatar,
      bubbleTheme,
      throwItem,
      roomId: formatted,
      roomName: finalName,
      recentRooms: updatedRooms,
      selectedDisplayId,
      walkingArea,
      nameTagPosition,
      nameTagSpacing,
      maxBubbleCount,
      bubbleDurationSec,
      bots,
      serverUrl: PERMANENT_SERVER_URL,
      shortcuts: {
        chatInput: chatInputShortcut,
        chatHistory: chatHistoryShortcut,
        settings: settingsShortcut,
      },
      autoUpdateEnabled,
    };
    saveAndNotify(updated);
  };

  const handleAddBot = () => {
    const botTypes = CHARACTERS.map((c) => c.type);
    const randomAvatar = botTypes[Math.floor(Math.random() * botTypes.length)];
    const newBot: BotConfig = {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `루키봇_${bots.length + 1}`,
      avatar: randomAvatar,
      messages: [
        "오늘도 화이팅!",
        "열일 중이신가요? 🔥",
        "간식 먹고 합시다 ☕",
      ],
      typingDelaySec: 3,
      intervalSec: 15,
      enabled: true,
    };
    setBots([...bots, newBot]);
  };

  const handleRemoveBot = (botId: string) => {
    setBots(bots.filter((b) => b.id !== botId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      userName: userName.trim() || "친구",
      userAvatar,
      bubbleTheme,
      throwItem,
      roomId,
      roomName,
      recentRooms,
      selectedDisplayId,
      walkingArea,
      nameTagPosition,
      nameTagSpacing,
      maxBubbleCount,
      bubbleDurationSec,
      bots,
      serverUrl: PERMANENT_SERVER_URL,
      shortcuts: {
        chatInput: chatInputShortcut,
        chatHistory: chatHistoryShortcut,
        settings: settingsShortcut,
      },
      autoUpdateEnabled,
    };

    saveAndNotify(updated);
  };

  return (
    <div className="mac-settings-container">
      <div className="mac-settings-window">
        {/* 상단 macOS 네이티브 스타일 타이틀바 */}
        <div className="mac-settings-titlebar">
          <div className="traffic-lights">
            <button
              type="button"
              className="traffic-light close"
              onClick={handleClose}
              title="닫기"
            />
            <button
              type="button"
              className="traffic-light minimize"
              onClick={() => window.electronAPI?.minimizeWindow?.()}
              title="최소화"
            />
            <span className="traffic-light zoom" />
          </div>
          <div className="titlebar-center">
            <Sidebar size={14} className="sidebar-icon" />
            <span className="window-title-text">FloorMate 설정</span>
          </div>
          <div className="titlebar-right-actions">
            <button
              type="button"
              className="preview-header-toggle-btn active"
              onClick={() => window.electronAPI?.openPreviewWindow?.()}
              title="별도 독립 창으로 실시간 미리보기 열기"
            >
              <Eye size={13} />
              <span>실시간 미리보기</span>
            </button>
            <button
              type="button"
              className="titlebar-close-icon"
              onClick={handleClose}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* 메인 분할: 좌측 사이드바 + 중앙 폼 영역 + 우측 실시간 프리뷰 */}
        <div className="mac-settings-body">
          {/* 좌측 사이드바 */}
          <div className="mac-settings-sidebar">
            <div className="sidebar-nav">
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "profile" ? "active" : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <User size={15} />
                <span>내 프로필</span>
              </button>
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "group" ? "active" : ""}`}
                onClick={() => setActiveTab("group")}
              >
                <Users size={15} />
                <span>그룹</span>
              </button>
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "shortcuts" ? "active" : ""}`}
                onClick={() => setActiveTab("shortcuts")}
              >
                <Keyboard size={15} />
                <span>단축키 설정</span>
              </button>
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "shop" ? "active" : ""}`}
                onClick={() => setActiveTab("shop")}
              >
                <Sparkles size={15} />
                <span>꾸미기·상점</span>
              </button>
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <SettingsIcon size={15} />
                <span>앱 설정</span>
              </button>
            </div>

            {/* 사이드바 하단 상태 */}
            <div className="sidebar-bottom">
              <div className="sidebar-connection-status">
                <span className="connection-dot" />
                <span>연결됨</span>
              </div>
            </div>
          </div>

          {/* 중앙 메인 콘텐츠 폼 */}
          <form onSubmit={handleSave} className="mac-settings-content">
            <div className="content-scroll-inner">
              {/* ========================================================= */}
              {/* 1. 내 프로필 탭 */}
              {/* ========================================================= */}
              {activeTab === "profile" && (
                <div className="tab-section">
                  <div className="section-header">
                    <div className="section-title-row">
                      <User size={16} className="section-icon" />
                      <h2>내 프로필</h2>
                    </div>
                    <p className="section-desc">
                      친구들에게 보이는 이름과 캐릭터, 이름표 위치를 설정합니다.
                    </p>
                  </div>

                  {/* 독립 실시간 미리보기 팝업 유도 배너 */}
                  <div className="preview-open-banner">
                    <div className="preview-banner-text">
                      <Eye size={15} className="banner-eye-icon" />
                      <div>
                        <span className="banner-title">실시간 미리보기 창</span>
                        <span className="banner-desc">
                          캐릭터 외형과 이름표 위치를 독립 윈도우에서 실시간으로
                          확인해보세요.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="preview-banner-btn"
                      onClick={() => window.electronAPI?.openPreviewWindow?.()}
                    >
                      미리보기 열기 ↗
                    </button>
                  </div>

                  {/* 닉네임 설정 카드 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label
                          className="card-label"
                          htmlFor="user-nickname-input"
                        >
                          닉네임
                        </label>
                        <span className="card-sublabel">
                          친구들의 픽셀 월드와 메시지에 표시되는 이름 · 2~8자
                        </span>
                      </div>
                      <input
                        id="user-nickname-input"
                        type="text"
                        className="mac-text-input nickname-input"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        maxLength={12}
                        placeholder="이름 입력"
                      />
                    </div>
                  </div>

                  {/* 캐릭터 선택 카드 */}
                  <div className="setting-card">
                    <div className="setting-card-header">
                      <label className="card-label">캐릭터</label>
                      <span className="card-sublabel">
                        친구 화면에서 나를 나타낼 픽셀 동물을 선택할 수
                        있습니다.
                      </span>
                    </div>

                    <div className="character-select-grid">
                      {CHARACTERS.map((char) => {
                        const isSelected = userAvatar === char.type;
                        return (
                          <button
                            type="button"
                            key={char.type}
                            className={`character-select-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setUserAvatar(char.type)}
                          >
                            {isSelected && (
                              <div className="selected-check-badge">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                            <div className="character-preview-sprite">
                              <PixelCharacter
                                type={char.type}
                                status="online"
                                size={44}
                              />
                            </div>
                            <span className="character-label">
                              {char.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="card-footer-hint">
                      캐릭터와 닉네임은 그룹 안에서 중복해서 선택할 수 있습니다.
                    </div>
                  </div>

                  {/* 이름표 위치 & 간격 설정 (앱 설정 -> 내 프로필로 이동) */}
                  <div className="setting-card">
                    <div className="setting-card-header">
                      <label className="card-label">이름표 위치 & 간격</label>
                      <span className="card-sublabel">
                        캐릭터 기준 이름표의 표시 위치와 띄울 간격을 설정합니다.
                      </span>
                    </div>

                    <div className="dual-slider-box">
                      <div className="slider-row">
                        <span className="slider-label">위치:</span>
                        <div
                          className="button-toggle-group"
                          style={{ flex: 1 }}
                        >
                          <button
                            type="button"
                            className={`toggle-btn ${nameTagPosition === "top" ? "active" : ""}`}
                            onClick={() => setNameTagPosition("top")}
                          >
                            머리 위 (추천)
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${nameTagPosition === "bottom" ? "active" : ""}`}
                            onClick={() => setNameTagPosition("bottom")}
                          >
                            캐릭터 아래
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${nameTagPosition === "hidden" ? "active" : ""}`}
                            onClick={() => setNameTagPosition("hidden")}
                          >
                            숨김
                          </button>
                        </div>
                      </div>

                      <div className="slider-row">
                        <span className="slider-label">간격:</span>
                        <input
                          type="range"
                          min={0}
                          max={16}
                          value={nameTagSpacing}
                          onChange={(e) =>
                            setNameTagSpacing(Number(e.target.value))
                          }
                          className="mac-slider"
                        />
                        <span className="slider-val">{nameTagSpacing}px</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 2. 꾸미기 · 상점 탭 (말풍선 테마, 표시 설정 & 투척 아이템) */}
              {/* ========================================================= */}
              {activeTab === "shop" && (
                <div className="tab-section">
                  <div className="section-header">
                    <div className="section-title-row">
                      <Sparkles size={16} className="section-icon" />
                      <h2>꾸미기 · 상점</h2>
                    </div>
                    <p className="section-desc">
                      말풍선 테마와 표시 방식, 친구에게 던지는 투척 아이템을
                      커스터마이징합니다.
                    </p>
                  </div>

                  {/* 독립 실시간 미리보기 팝업 유도 배너 */}
                  <div className="preview-open-banner">
                    <div className="preview-banner-text">
                      <Eye size={15} className="banner-eye-icon" />
                      <div>
                        <span className="banner-title">실시간 미리보기 창</span>
                        <span className="banner-desc">
                          말풍선 테마, 지속시간/최대개수, 투척 모션을 독립
                          윈도우에서 테스트해보세요.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="preview-banner-btn"
                      onClick={() => window.electronAPI?.openPreviewWindow?.()}
                    >
                      미리보기 열기 ↗
                    </button>
                  </div>

                  {/* 1. 말풍선 테마 카드 */}
                  <div className="setting-card">
                    <div className="setting-card-header">
                      <label className="card-label">말풍선 테마</label>
                      <span className="card-sublabel">
                        보유한 말풍선을 고르면 모든 그룹에 바로 적용됩니다.
                      </span>
                    </div>

                    <div className="custom-item-grid">
                      {BUBBLE_THEMES.map((theme) => {
                        const isSelected = bubbleTheme === theme.id;
                        return (
                          <button
                            type="button"
                            key={theme.id}
                            className={`custom-item-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setBubbleTheme(theme.id)}
                          >
                            {isSelected && (
                              <div className="selected-check-badge">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                            {theme.isPro && (
                              <span className="pro-badge">PRO</span>
                            )}
                            {!theme.isPro && (
                              <span className="free-badge">FREE</span>
                            )}

                            <div
                              className={`bubble-theme-preview-pill theme-${theme.id}`}
                            >
                              <span>안녕하세요 ✨</span>
                            </div>
                            <span className="item-title">{theme.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 말풍선 표시 동작 설정 (앱 설정 -> 꾸미기·상점으로 이동) */}
                  <div className="setting-card">
                    <div className="setting-card-header">
                      <label className="card-label">말풍선 표시 설정</label>
                      <span className="card-sublabel">
                        말풍선의 화면 지속 시간과 동시에 쌓이는 최대 개수를
                        조절합니다.
                      </span>
                    </div>

                    <div className="dual-slider-box">
                      <div className="slider-row">
                        <span className="slider-label">지속 시간:</span>
                        <div
                          className="button-toggle-group"
                          style={{ flex: 1 }}
                        >
                          {[3, 6, 10, 15].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              className={`toggle-btn ${bubbleDurationSec === sec ? "active" : ""}`}
                              onClick={() => setBubbleDurationSec(sec)}
                            >
                              {sec}초
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="slider-row">
                        <span className="slider-label">최대 개수:</span>
                        <div
                          className="button-toggle-group"
                          style={{ flex: 1 }}
                        >
                          {[1, 2, 3, 4].map((count) => (
                            <button
                              key={count}
                              type="button"
                              className={`toggle-btn ${maxBubbleCount === count ? "active" : ""}`}
                              onClick={() => setMaxBubbleCount(count)}
                            >
                              {count}개
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. 투척 아이템 / 폭탄 테마 카드 */}
                  <div className="setting-card">
                    <div className="setting-card-header">
                      <label className="card-label">
                        투척 아이템 (상호작용)
                      </label>
                      <span className="card-sublabel">
                        상대방 펫을 클릭했을 때 던지는 오브젝트를 선택합니다.
                      </span>
                    </div>

                    <div className="custom-item-grid">
                      {THROW_ITEMS.map((item) => {
                        const isSelected = throwItem === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            className={`custom-item-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setThrowItem(item.id)}
                          >
                            {isSelected && (
                              <div className="selected-check-badge">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                            {item.isPro && (
                              <span className="pro-badge">PRO</span>
                            )}
                            {!item.isPro && (
                              <span className="free-badge">FREE</span>
                            )}

                            <div className="throw-item-emoji-box">
                              <span className="throw-emoji">{item.emoji}</span>
                            </div>
                            <span className="item-title">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. 그룹 (세션 관리) 탭 - 수평 1행 통일 (피드백 반영) */}
              {/* ========================================================= */}
              {activeTab === "group" && (
                <div className="tab-section">
                  <div className="section-header">
                    <div className="section-title-row">
                      <Users size={16} className="section-icon" />
                      <h2>그룹 (아지트)</h2>
                    </div>
                    <p className="section-desc">
                      친구들과 모여 함께 화면 바닥에서 산책할 아지트 방을
                      관리합니다.
                    </p>
                  </div>

                  {/* 1. 현재 방 코드 */}
                  <div className="setting-card azit-card">
                    <label className="card-label">현재 아지트 코드</label>
                    <div className="card-desc-action-row">
                      <span className="card-sublabel">
                        이 코드를 복사해 친구들에게 공유하세요.
                      </span>
                      <button
                        type="button"
                        className="btn-copy-code"
                        onClick={handleCopyCode}
                      >
                        {copied ? "복사됨!" : "코드 복사"}
                      </button>
                    </div>
                    <div className="room-code-display full-width">{roomId}</div>
                  </div>

                  {/* 2. 새 아지트 만들기 */}
                  <div className="setting-card azit-card">
                    <label className="card-label">새로운 아지트 만들기</label>
                    <div className="card-desc-action-row">
                      <span className="card-sublabel">
                        새로운 방 코드를 생성하여 나만의 방을 만듭니다.
                      </span>
                      <button
                        type="button"
                        className="mac-action-btn primary"
                        onClick={handleCreateNewRoom}
                      >
                        <Plus size={13} /> 새로 만들기
                      </button>
                    </div>
                    <input
                      type="text"
                      className="mac-text-input full-width"
                      placeholder="방 이름 (예: 개발팀 아지트)"
                      value={newRoomNameInput}
                      onChange={(e) => setNewRoomNameInput(e.target.value)}
                    />
                  </div>

                  {/* 3. 코드로 참여 */}
                  <div className="setting-card azit-card">
                    <label className="card-label">코드로 아지트 참여</label>
                    <div className="card-desc-action-row">
                      <span className="card-sublabel">
                        친구가 알려준 방 코드를 입력하여 입장합니다.
                      </span>
                      <button
                        type="button"
                        className="mac-action-btn"
                        onClick={handleJoinWithCode}
                      >
                        <Compass size={13} /> 참여하기
                      </button>
                    </div>
                    <input
                      type="text"
                      className="mac-text-input code-input full-width"
                      placeholder="방 코드 입력"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      maxLength={40}
                    />
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. 단축키 설정 탭 */}
              {/* ========================================================= */}
              {activeTab === "shortcuts" && (
                <div className="tab-section">
                  <div className="section-header">
                    <div className="section-title-row">
                      <Keyboard size={16} className="section-icon" />
                      <h2>단축키 설정</h2>
                    </div>
                    <p className="section-desc">
                      자주 사용하는 말풍선 입력과 보조 창을 전역 단축키로 빠르게 띄웁니다.
                    </p>
                  </div>

                  {/* 1. 말풍선 입력 단축키 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label className="card-label">말풍선 채팅 입력창</label>
                        <span className="card-sublabel">
                          화면 상단에 말풍선 입력 바를 호출합니다. (기본: {isMac ? 'Ctrl+Alt+Cmd+P' : 'Ctrl+Alt+Shift+P'})
                        </span>
                      </div>
                      <div className="shortcut-recorder-box">
                        <button
                          type="button"
                          className={`shortcut-key-badge ${recordingTarget === 'chatInput' ? 'recording' : ''}`}
                          onClick={() => setRecordingTarget('chatInput')}
                          onKeyDown={(e) => handleShortcutKeyDown(e, 'chatInput')}
                        >
                          {recordingTarget === 'chatInput' ? '키 조합 누르는 중...' : displayShortcut(chatInputShortcut)}
                        </button>
                        <button
                          type="button"
                          className="shortcut-reset-btn"
                          onClick={() => {
                            setChatInputShortcut(defaultChatKey);
                            setRecordingTarget(null);
                          }}
                          title="기본값으로 복원"
                        >
                          기본값
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. 3일 대화 기록창 단축키 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label className="card-label">최근 3일 대화 기록창</label>
                        <span className="card-sublabel">
                          친구들과 주고받은 최근 대화 목록 팝업 창을 엽니다. (기본값: 미설정)
                        </span>
                      </div>
                      <div className="shortcut-recorder-box">
                        <button
                          type="button"
                          className={`shortcut-key-badge ${recordingTarget === 'chatHistory' ? 'recording' : ''}`}
                          onClick={() => setRecordingTarget('chatHistory')}
                          onKeyDown={(e) => handleShortcutKeyDown(e, 'chatHistory')}
                        >
                          {recordingTarget === 'chatHistory' ? '키 조합 누르는 중...' : displayShortcut(chatHistoryShortcut)}
                        </button>
                        {chatHistoryShortcut ? (
                          <button
                            type="button"
                            className="shortcut-reset-btn"
                            onClick={() => {
                              setChatHistoryShortcut('');
                              setRecordingTarget(null);
                            }}
                            title="단축키 해제"
                          >
                            해제
                          </button>
                        ) : (
                          <span className="shortcut-hint-badge">미설정</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. 환경 설정창 단축키 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label className="card-label">FloorMate 환경 설정창</label>
                        <span className="card-sublabel">
                          이 설정 창을 언제 어디서나 전역 단축키로 바로 엽니다. (기본값: 미설정)
                        </span>
                      </div>
                      <div className="shortcut-recorder-box">
                        <button
                          type="button"
                          className={`shortcut-key-badge ${recordingTarget === 'settings' ? 'recording' : ''}`}
                          onClick={() => setRecordingTarget('settings')}
                          onKeyDown={(e) => handleShortcutKeyDown(e, 'settings')}
                        >
                          {recordingTarget === 'settings' ? '키 조합 누르는 중...' : displayShortcut(settingsShortcut)}
                        </button>
                        {settingsShortcut ? (
                          <button
                            type="button"
                            className="shortcut-reset-btn"
                            onClick={() => {
                              setSettingsShortcut('');
                              setRecordingTarget(null);
                            }}
                            title="단축키 해제"
                          >
                            해제
                          </button>
                        ) : (
                          <span className="shortcut-hint-badge">미설정</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shortcut-guide-hint">
                    💡 <strong>단축키 변경 팁</strong>: 버튼을 클릭한 상태에서 원하는 키보드 조합(예: Ctrl + Alt + H 등)을 누르면 즉시 감지되어 변경됩니다. Backspace 또는 Esc 키를 누르면 단축키가 해제됩니다.
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 4. 앱 설정 탭 */}
              {/* ========================================================= */}
              {activeTab === "settings" && (
                <div className="tab-section">
                  <div className="section-header">
                    <div className="section-title-row">
                      <SettingsIcon size={16} className="section-icon" />
                      <h2>앱 설정</h2>
                    </div>
                    <p className="section-desc">
                      모니터 디스플레이 및 실제 화면 산책 영역을 정밀하게
                      설정합니다.
                    </p>
                  </div>

                  {/* 모니터 선택 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label className="card-label" htmlFor="disp-select">
                          <Monitor size={13} /> 나타날 모니터
                        </label>
                        <span className="card-sublabel">
                          선택한 모니터 화면 바닥으로 캐릭터와 메시지 입력창이
                          즉시 이동합니다.
                        </span>
                      </div>
                      <select
                        id="disp-select"
                        className="mac-select-input"
                        value={selectedDisplayId || ""}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          setSelectedDisplayId(id);
                          window.electronAPI?.setDisplayId?.(id);
                        }}
                      >
                        {displays.map((disp) => (
                          <option key={disp.id} value={disp.id}>
                            {disp.label}
                          </option>
                        ))}
                        {displays.length === 0 && (
                          <option value="">기본 주 모니터</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 실제 모니터 산책 가로 구간 */}
                  <div className="setting-card">
                    <div className="setting-card-header">
                      <div className="card-header-flex">
                        <label className="card-label">
                          <MoveHorizontal size={13} /> 산책 가로 구간 (
                          {walkingArea.minPercent}% ~ {walkingArea.maxPercent}%)
                        </label>
                        <span className="active-beam-badge">
                          실제 화면 네온 빔 투사 중
                        </span>
                      </div>
                      <span className="card-sublabel">
                        슬라이더를 움직이면 실제 PC 모니터 바닥의 빔 너비가
                        실시간으로 연동됩니다.
                      </span>
                    </div>

                    <div className="dual-slider-box">
                      <div className="slider-row">
                        <span className="slider-label">시작 위치:</span>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, walkingArea.maxPercent - 10)}
                          value={walkingArea.minPercent}
                          onChange={(e) =>
                            setWalkingArea({
                              ...walkingArea,
                              minPercent: Number(e.target.value),
                            })
                          }
                          className="mac-slider"
                        />
                        <span className="slider-val">
                          {walkingArea.minPercent}%
                        </span>
                      </div>
                      <div className="slider-row">
                        <span className="slider-label">종료 위치:</span>
                        <input
                          type="range"
                          min={Math.min(100, walkingArea.minPercent + 10)}
                          max={100}
                          value={walkingArea.maxPercent}
                          onChange={(e) =>
                            setWalkingArea({
                              ...walkingArea,
                              maxPercent: Number(e.target.value),
                            })
                          }
                          className="mac-slider"
                        />
                        <span className="slider-val">
                          {walkingArea.maxPercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 독립 대화 기록 창 열기 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label className="card-label">최근 3일 대화 기록</label>
                        <span className="card-sublabel">
                          별도의 독립 메신저 창을 열어 지난 대화 타임라인을
                          확인합니다.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="mac-action-btn"
                        onClick={() =>
                          window.electronAPI?.openHistoryWindow?.()
                        }
                      >
                        <MessageSquareText size={13} /> 기록 창 열기
                      </button>
                    </div>
                  </div>

                  {/* DEV 봇 관리 (흰색 스크롤바 제거된 깔끔한 뷰) */}
                  {import.meta.env.DEV && (
                    <div className="setting-card">
                      <div className="setting-card-header">
                        <div className="card-header-flex">
                          <label className="card-label">
                            <Bot size={13} /> 시뮬레이션 봇 ({bots.length}개)
                          </label>
                          <button
                            type="button"
                            className="mac-action-btn small primary"
                            onClick={handleAddBot}
                          >
                            <Plus size={11} /> 봇 추가
                          </button>
                        </div>
                        <span className="card-sublabel">
                          로컬에서 채팅을 시뮬레이션할 봇을 추가합니다.
                        </span>
                      </div>

                      <div className="bot-cards-container">
                        {bots.map((bot) => (
                          <div key={bot.id} className="bot-inline-item">
                            <div className="bot-inline-left">
                              <PixelCharacter
                                type={bot.avatar}
                                status="online"
                                size={28}
                              />
                              <span className="bot-name">{bot.name}</span>
                            </div>
                            <button
                              type="button"
                              className="btn-del-bot"
                              onClick={() => handleRemoveBot(bot.id)}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 자동 업데이트 활성화 설정 */}
                  <div className="setting-card">
                    <div className="setting-card-row">
                      <div className="setting-label-col">
                        <label className="card-label">앱 자동 업데이트</label>
                        <span className="card-sublabel">
                          새로운 버전이 배포되면 백그라운드에서 자동으로 다운로드하여 최신 상태를 유지합니다.
                        </span>
                      </div>
                      <label className="mac-switch">
                        <input
                          type="checkbox"
                          checked={autoUpdateEnabled}
                          onChange={(e) => handleToggleAutoUpdate(e.target.checked)}
                        />
                        <span className="mac-slider-switch" />
                      </label>
                    </div>
                  </div>

                  {/* 앱 버전 정보 및 수동 업데이트 카드 */}
                  <div className="setting-card update-info-card">
                    <div className="update-card-header">
                      <div className="setting-label-col">
                        <div className="version-title-row">
                          <Package size={14} className="version-icon" />
                          <label className="card-label">버전 정보 및 업데이트 확인</label>
                          <span className="version-badge">v{appVersion}</span>
                        </div>
                        <span className="card-sublabel">
                          현재 설치된 버전 정보이며, 최신 버전 확인 및 수동 업데이트를 진행할 수 있습니다.
                        </span>
                      </div>
                      {updateStatus.state !== "checking" && updateStatus.state !== "downloading" && (
                        <button
                          type="button"
                          className="mac-action-btn small"
                          onClick={handleCheckForUpdates}
                        >
                          <RefreshCw size={12} /> 업데이트 확인
                        </button>
                      )}
                    </div>

                    {/* 업데이트 상태 피드백 영역 */}
                    <div className="update-status-panel">
                      {updateStatus.state === "idle" && (
                        <div className="update-status-msg idle">
                          최신 버전 유무를 확인하려면 [업데이트 확인] 버튼을 누르세요.
                        </div>
                      )}

                      {updateStatus.state === "checking" && (
                        <div className="update-status-msg checking">
                          <RefreshCw size={13} className="spin-icon" />
                          <span>최신 버전을 확인하고 있습니다...</span>
                        </div>
                      )}

                      {updateStatus.state === "not-available" && (
                        <div className="update-status-msg not-available">
                          <CheckCircle2 size={14} className="text-green" />
                          <span>현재 최신 버전(v{appVersion})을 사용 중입니다.</span>
                        </div>
                      )}

                      {updateStatus.state === "available" && (
                        <div className="update-status-msg available">
                          <div className="available-msg-left">
                            <Sparkles size={14} className="text-amber" />
                            <span>
                              새로운 버전(<strong>v{updateStatus.newVersion}</strong>)이 출시되었습니다!
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mac-action-btn small primary"
                            onClick={handleDownloadUpdate}
                          >
                            <Download size={12} /> 지금 다운로드
                          </button>
                        </div>
                      )}

                      {updateStatus.state === "downloading" && (
                        <div className="update-downloading-box">
                          <div className="downloading-header">
                            <span className="downloading-text">
                              새 버전을 다운로드하고 있습니다...
                            </span>
                            <span className="downloading-percent">
                              {Math.round(updateStatus.progress || 0)}%
                            </span>
                          </div>
                          <div className="update-progress-bar">
                            <div
                              className="update-progress-fill"
                              style={{ width: `${Math.min(100, Math.max(0, updateStatus.progress || 0))}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {updateStatus.state === "downloaded" && (
                        <div className="update-status-msg downloaded">
                          <div className="downloaded-msg-left">
                            <CheckCircle2 size={14} className="text-green" />
                            <span>
                              새 버전 다운로드가 완료되었습니다. 앱을 재시작하여 바로 설치할 수 있습니다.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mac-action-btn small primary install-btn"
                            onClick={handleQuitAndInstall}
                          >
                            <RefreshCw size={12} /> 재시작하여 지금 설치
                          </button>
                        </div>
                      )}

                      {updateStatus.state === "error" && (
                        <div className="update-status-msg error">
                          <AlertCircle size={14} className="text-rose" />
                          <div className="error-text-col">
                            <span>업데이트 확인 또는 다운로드 중 문제가 발생했습니다.</span>
                            {updateStatus.error && (
                              <span className="error-detail">{updateStatus.error}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 고정 액션 바 */}
            <div className="mac-settings-footer">
              <button
                type="button"
                className="mac-footer-btn cancel"
                onClick={handleClose}
              >
                닫기
              </button>
              <button
                type="submit"
                className={`mac-footer-btn save ${savedFeedback ? "saved-success" : ""}`}
              >
                <Check size={14} />{" "}
                {savedFeedback ? "저장 및 적용됨!" : "저장하고 적용하기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
