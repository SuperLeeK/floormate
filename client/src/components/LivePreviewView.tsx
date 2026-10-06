import React, { useState, useEffect, useRef } from 'react';
import { PixelCharacter } from './PixelCharacter';
import { AppSettings, BubbleTheme, ThrowItemType } from '../types';
import './LivePreviewView.css';

interface PreviewBubble {
  id: string;
  text: string;
  isFadingOut?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: 'http://localhost:3000',
  roomId: 'general',
  roomName: '우리들의 아지트',
  userId: 'user_' + Math.random().toString(36).substring(2, 9),
  userName: '나',
  userAvatar: 'cat',
  dockSide: 'right',
  soundEnabled: true,
  maxBubbleCount: 3,
  bubbleDurationSec: 5,
  nameTagPosition: 'bottom',
  nameTagSpacing: 2,
  walkingArea: { minPercent: 0, maxPercent: 100 },
  recentRooms: [],
  bubbleTheme: 'default',
  throwItem: 'bomb'
};

const SAMPLE_TEXTS = [
  '안녕! 반가워 🐱',
  '오늘도 파이팅하자 🔥',
  '커피 한잔 어때? ☕',
  '점심 뭐 먹을까? 🍕',
  '퇴근하고 치맥 고! 🍗🍺',
  'FloorMate 최고야 ✨',
  '집에 가고 싶다... 😴'
];

const THROW_ITEM_MAP: Record<ThrowItemType, { emoji: string; hitBurst: string; name: string }> = {
  bomb: { emoji: '💣', hitBurst: '💥', name: '폭탄' },
  stone: { emoji: '🪨', hitBurst: '💢', name: '돌멩이' },
  heart: { emoji: '💖', hitBurst: '✨💖✨', name: '하트' },
  lightning: { emoji: '⚡', hitBurst: '⚡💥⚡', name: '번개' },
  star: { emoji: '⭐', hitBurst: '🌟💫🌟', name: '별' },
  waterball: { emoji: '🫧', hitBurst: '💦🌊💦', name: '물방울' }
};

export const LivePreviewView: React.FC = () => {
  // 1. 설정 상태
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('dopamine_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // 2. 모션 및 인터랙션 상태
  const [action, setAction] = useState<'idle' | 'walking'>('idle');
  const [bubbles, setBubbles] = useState<PreviewBubble[]>([]);
  const [botHit, setBotHit] = useState(false);
  const [flyingItem, setFlyingItem] = useState<{ id: string; emoji: string; x: number; y: number } | null>(null);
  const [hitBurst, setHitBurst] = useState<string | null>(null);

  const bubbleIndexRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // 실시간 설정 동기화
  useEffect(() => {
    const unsub = window.electronAPI?.onSettingsUpdated?.((newSettings) => {
      if (newSettings) {
        setSettings((prev) => ({ ...prev, ...newSettings }));
      }
    });

    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('dopamine_settings');
        if (saved) setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('storage', handleStorage);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // 경쾌한 효과음 생성
  const playSoundEffect = (type: 'throw' | 'hit') => {
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'throw') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // AudioContext not allowed or failed
    }
  };

  // 말풍선 테스트: 1 -> 2 -> 3 -> 4 순서로 최신 메시지가 머리 바로 위에 오도록 추가
  const handleAddBubble = () => {
    const text = SAMPLE_TEXTS[bubbleIndexRef.current % SAMPLE_TEXTS.length];
    bubbleIndexRef.current++;
    const newBubble: PreviewBubble = {
      id: 'prev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text
    };

    setBubbles((prev) => {
      const maxCount = settings.maxBubbleCount || 3;
      // 새로운 메시지를 끝에 추가 (1, 2, 3 -> 최신은 맨 끝)
      const nextList = [...prev, newBubble];
      if (nextList.length > maxCount) {
        return nextList.slice(nextList.length - maxCount);
      }
      return nextList;
    });

    // 지속시간 후 페이드아웃 및 제거
    const durationMs = Math.max(2, settings.bubbleDurationSec || 5) * 1000;
    setTimeout(() => {
      setBubbles((prev) =>
        prev.map((b) => (b.id === newBubble.id ? { ...b, isFadingOut: true } : b))
      );
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 700);
    }, durationMs);
  };

  // 봇에게 투척하기 (포물선 비행)
  const handleThrowAtBot = () => {
    if (flyingItem) return;
    const throwConfig = THROW_ITEM_MAP[settings.throwItem || 'bomb'];
    playSoundEffect('throw');

    const startX = 70;
    const startY = 48;
    const targetX = 290;
    const targetY = 48;
    const peakHeight = 110;
    const duration = 520;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // x: 선형 이동
      const currentX = startX + (targetX - startX) * progress;
      // y: 포물선 (4 * h * p * (1 - p))
      const arc = 4 * peakHeight * progress * (1 - progress);
      const currentY = startY + (targetY - startY) * progress + arc;

      setFlyingItem({
        id: 'throw_' + Date.now(),
        emoji: throwConfig.emoji,
        x: currentX,
        y: currentY
      });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 목표물 명중!
        setFlyingItem(null);
        playSoundEffect('hit');
        setHitBurst(throwConfig.hitBurst);
        setBotHit(true);

        setTimeout(() => {
          setHitBurst(null);
        }, 650);

        setTimeout(() => {
          setBotHit(false);
        }, 500);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const handleClose = () => {
    window.electronAPI?.closePreviewWindow?.();
  };

  const currentTheme: BubbleTheme = settings.bubbleTheme || 'default';
  const nameTagPos = settings.nameTagPosition || 'bottom';
  const nameTagSpace = settings.nameTagSpacing ?? 2;

  // 이름표가 위쪽일 때 말풍선 시작 높이를 조금 더 띄움
  const bubbleAnchorBottom = nameTagPos === 'top' ? 88 + nameTagSpace : 72;

  return (
    <div className="live-preview-window">
      {/* 1. 상단 macOS 스타일 타이틀바 */}
      <div className="preview-window-titlebar">
        <div className="titlebar-traffic-lights">
          <button className="traffic-dot close-dot" onClick={handleClose} title="닫기" />
          <button className="traffic-dot min-dot" onClick={() => window.electronAPI?.minimizeWindow?.()} title="최소화" />
          <button className="traffic-dot max-dot disabled" title="최대화 비활성" />
        </div>
        <div className="titlebar-title-text">
          <span className="live-badge">LIVE</span>
          <span>FloorMate 실시간 미리보기</span>
        </div>
        <button className="preview-close-btn" onClick={handleClose} title="닫기">
          ✕
        </button>
      </div>

      {/* 2. 룸 스테이지 (내 캐릭터 + 친구 봇) */}
      <div className="preview-stage-container">
        <div className="room-decor-wall">
          <div className="room-window-glass">
            <span className="star-dot s1">✦</span>
            <span className="star-dot s2">✧</span>
          </div>
          <div className="room-wall-art">🖼️</div>
        </div>

        <div className="room-floor-base">
          <div className="carpet-mat" />
        </div>

        {/* 비행 중인 투척 아이템 */}
        {flyingItem && (
          <div
            className="preview-projectile"
            style={{
              left: `${flyingItem.x}px`,
              bottom: `${flyingItem.y}px`
            }}
          >
            {flyingItem.emoji}
          </div>
        )}

        {/* [A] 내 캐릭터 (좌측) */}
        <div className="character-stage-wrapper me-wrapper" style={{ left: '60px' }}>
          {/* 말풍선 스택: 정방향 적층 (1 -> 2 -> 3 -> 4, 최신이 머리 바로 위) */}
          {bubbles.length > 0 && (
            <div
              className={`preview-bubble-stack-container theme-${currentTheme}`}
              style={{ bottom: `${bubbleAnchorBottom}px` }}
            >
              <div className="preview-bubble-stack">
                {bubbles.map((b, idx) => (
                  <div
                    key={b.id}
                    className={`preview-bubble-row ${b.isFadingOut ? 'fade-out' : ''} ${
                      idx === bubbles.length - 1 ? 'is-latest' : 'is-older'
                    }`}
                  >
                    <div className="preview-bubble-chip">
                      <span>{b.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 머리 위 이름표 */}
          {nameTagPos === 'top' && (
            <div
              className="stage-nametag tag-top"
              style={{ marginBottom: `${nameTagSpace}px` }}
            >
              <span className="nametag-dot me-dot" />
              <span>{settings.userName || '나'} · 나</span>
            </div>
          )}

          {/* 캐릭터 스프라이트 */}
          <div className="stage-sprite-box">
            <PixelCharacter
              type={settings.userAvatar || 'cat'}
              status="online"
              isWalking={action === 'walking'}
              facingDirection="right"
              size={58}
            />
          </div>

          {/* 발 아래 이름표 */}
          {nameTagPos === 'bottom' && (
            <div
              className="stage-nametag tag-bottom"
              style={{ marginTop: `${nameTagSpace}px` }}
            >
              <span className="nametag-dot me-dot" />
              <span>{settings.userName || '나'} · 나</span>
            </div>
          )}
        </div>

        {/* [B] 친구 봇 "모카" (우측) */}
        <div className="character-stage-wrapper bot-wrapper" style={{ right: '60px' }}>
          {/* 피격 버스트 이펙트 */}
          {hitBurst && <div className="bot-hit-burst-effect">{hitBurst}</div>}

          {/* 봇 머리 위 이름표 */}
          <div className="stage-nametag tag-top" style={{ marginBottom: '2px' }}>
            <span className="nametag-dot bot-dot" />
            <span>모카 · 친구</span>
          </div>

          {/* 봇 캐릭터 스프라이트 (피격 시 shake) */}
          <div className={`stage-sprite-box ${botHit ? 'is-bot-hit-shake' : ''}`}>
            <PixelCharacter
              type="dog"
              status="online"
              isWalking={false}
              facingDirection="left"
              size={58}
            />
          </div>
        </div>
      </div>

      {/* 3. 실시간 컨트롤 & 인터랙션 툴바 */}
      <div className="preview-control-panel">
        <div className="preview-status-strip">
          <div className="status-item">
            <span className="status-label">현재 테마</span>
            <span className="status-val theme-tag">{currentTheme}</span>
          </div>
          <div className="status-item">
            <span className="status-label">투척 아이템</span>
            <span className="status-val item-tag">
              {THROW_ITEM_MAP[settings.throwItem || 'bomb'].emoji}{' '}
              {THROW_ITEM_MAP[settings.throwItem || 'bomb'].name}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">최대 말풍선</span>
            <span className="status-val">{settings.maxBubbleCount || 3}개 / {settings.bubbleDurationSec || 5}초</span>
          </div>
        </div>

        <div className="preview-action-buttons">
          <button
            className="action-btn bubble-test-btn"
            onClick={handleAddBubble}
            title="말풍선을 순차적으로 띄워 적층 순서를 확인합니다"
          >
            💬 말풍선 테스트 ({bubbles.length}/{settings.maxBubbleCount || 3})
          </button>

          <button
            className="action-btn throw-test-btn"
            onClick={handleThrowAtBot}
            disabled={!!flyingItem}
            title="친구 봇에게 투척 아이템을 포물선으로 날립니다"
          >
            {THROW_ITEM_MAP[settings.throwItem || 'bomb'].emoji} 봇에게 던지기
          </button>

          <button
            className={`action-btn walk-toggle-btn ${action === 'walking' ? 'active' : ''}`}
            onClick={() => setAction((prev) => (prev === 'idle' ? 'walking' : 'idle'))}
          >
            {action === 'walking' ? '🛑 멈추기' : '🚶 걷기 모션'}
          </button>
        </div>

        <div className="preview-hint-bar">
          💡 환경설정창에서 <b>테마, 이름표 위치, 캐릭터, 투척 아이템</b>을 바꾸면 실시간으로 즉시 반영됩니다.
        </div>
      </div>
    </div>
  );
};
