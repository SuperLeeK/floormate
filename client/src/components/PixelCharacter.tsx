import React, { useMemo, useState, useEffect } from 'react';
import { CharacterType, UserStatus } from '../types';

interface PixelCharacterProps {
  type: CharacterType;
  status: UserStatus;
  isWalking?: boolean;
  facingDirection?: 'left' | 'right';
  isPoked?: boolean;
  pokeEffect?: string | null;
  size?: number;
}

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  type,
  status,
  isWalking = false,
  facingDirection = 'right',
  isPoked = false,
  pokeEffect = null,
  size = 64,
}) => {
  // 걸을 때 2개 프레임을 번갈아 토글하는 내부 타이머 (PNG 조합용)
  const [walkFrame, setWalkFrame] = useState<1 | 2>(1);
  // 외부 커스텀 이미지 로드 실패 시 SVG로 폴백하기 위한 상태
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!isWalking) return;
    const interval = setInterval(() => {
      setWalkFrame((prev) => (prev === 1 ? 2 : 1));
    }, 200);
    return () => clearInterval(interval);
  }, [isWalking]);

  // 외부 이미지 경로 후보 계산
  // 1. poke 중일 때: poked.gif -> poked.png
  // 2. sleep 중일 때: sleep.gif -> sleep.png
  // 3. busy 중일 때: busy.gif -> busy.png
  // 4. walking 중일 때: walk.gif -> walk_1.png / walk_2.png -> walk.png
  // 5. idle 기본: idle.gif -> idle.png
  const customImagePath = useMemo(() => {
    if (imageError) return null;

    const base = `/characters/${type}`;
    if (isPoked) return `${base}/poked.gif`;
    if (status === 'sleep') return `${base}/sleep.png`;
    if (status === 'busy') return `${base}/busy.png`;
    if (isWalking) return `${base}/walk_${walkFrame}.png`;
    return `${base}/idle.png`;
  }, [type, status, isPoked, isWalking, walkFrame, imageError]);

  const palette = useMemo(() => {
    switch (type) {
      case 'cat':
        return {
          primary: '#ffaa5e',
          secondary: '#ff8838',
          accent: '#ffffff',
          innerEar: '#ffb3ba',
          eyes: '#2b2320',
          blush: '#ff9aa2',
        };
      case 'dog':
        return {
          primary: '#e0a96d',
          secondary: '#c48b52',
          accent: '#fbf4ea',
          innerEar: '#8c5836',
          eyes: '#201a15',
          blush: '#ffb3ba',
        };
      case 'rabbit':
        return {
          primary: '#ffffff',
          secondary: '#ece5e5',
          accent: '#ffffff',
          innerEar: '#ffccd5',
          eyes: '#ff5d73',
          blush: '#ffccd5',
        };
      case 'hamster':
        return {
          primary: '#f9d29d',
          secondary: '#e5b678',
          accent: '#ffffff',
          innerEar: '#ffb3ba',
          eyes: '#30261f',
          blush: '#ff8a98',
        };
      case 'fox':
        return {
          primary: '#ff6f3c',
          secondary: '#e05320',
          accent: '#ffffff',
          innerEar: '#3b2e2a',
          eyes: '#1e1b18',
          blush: '#ff9a76',
        };
      case 'penguin':
        return {
          primary: '#2f3542',
          secondary: '#ffa502',
          accent: '#ffffff',
          innerEar: '#ffa502',
          eyes: '#1e272e',
          blush: '#ff7f50',
        };
      case 'tteokbokki':
        return {
          primary: '#ff4757',
          secondary: '#ff6b81',
          accent: '#ffffff',
          innerEar: '#2ed573',
          eyes: '#2f3542',
          blush: '#ffa502',
        };
      case 'bear':
      default:
        return {
          primary: '#8d6e63',
          secondary: '#6d4c41',
          accent: '#d7ccc8',
          innerEar: '#5d4037',
          eyes: '#2c1e19',
          blush: '#bcaaa4',
        };
    }
  }, [type]);

  const isSleeping = status === 'sleep';
  const isBusy = status === 'busy';
  const isAway = status === 'away';

  return (
    <div
      className={`pixel-character-wrapper ${isWalking ? 'is-walking' : ''} ${isPoked ? 'is-poked' : ''} status-${status}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        imageRendering: 'pixelated',
        transform: facingDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      {/* 찌르기 이펙트 팝업 */}
      {pokeEffect && (
        <div
          className="poke-floating-effect"
          style={{ transform: facingDirection === 'left' ? 'scaleX(-1) translateX(50%)' : 'translateX(-50%)' }}
        >
          {pokeEffect === 'heart' && '💖'}
          {pokeEffect === 'poke' && '👉'}
          {pokeEffect === 'pat' && '✨'}
          {pokeEffect === 'water' && '💧'}
          {pokeEffect === 'snack' && '🍪'}
        </div>
      )}

      {/* 상태 표시 장식 */}
      {isSleeping && (
        <div
          className="sleeping-zzz"
          style={{ transform: facingDirection === 'left' ? 'scaleX(-1)' : 'none' }}
        >
          Zzz...
        </div>
      )}
      {isBusy && (
        <div
          className="busy-sparkle"
          style={{ transform: facingDirection === 'left' ? 'scaleX(-1)' : 'none' }}
        >
          🔥
        </div>
      )}
      {isAway && (
        <div
          className="away-bubble"
          style={{ transform: facingDirection === 'left' ? 'scaleX(-1)' : 'none' }}
        >
          ☕
        </div>
      )}

      {/* 1. 외부 커스텀 이미지 (GIF 또는 PNG 조합)가 있을 경우 */}
      {customImagePath && !imageError ? (
        <img
          src={customImagePath}
          alt={type}
          width={size}
          height={size}
          style={{
            objectFit: 'contain',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
          onError={() => setImageError(true)}
        />
      ) : (
        /* 2. 외부 이미지가 없을 때 기본 내장 고품질 SVG 픽셀 캐릭터 렌더링 */
        <svg
          viewBox="0 0 32 28"
          width={size}
          height={Math.round((size * 28) / 32)}
          className="pixel-sprite"
          style={{ overflow: 'visible', verticalAlign: 'bottom' }}
        >

          {/* 귀 */}
          {type === 'rabbit' ? (
            <g className="rabbit-ears">
              <rect x="9" y="3" width="4" height="10" rx="1" fill={palette.primary} />
              <rect x="10" y="5" width="2" height="6" fill={palette.innerEar} />
              <rect x="19" y="3" width="4" height="10" rx="1" fill={palette.primary} />
              <rect x="20" y="5" width="2" height="6" fill={palette.innerEar} />
            </g>
          ) : type === 'cat' || type === 'fox' ? (
            <g className="pointy-ears">
              <path d="M7 13 L11 7 L14 13 Z" fill={palette.primary} />
              <path d="M8 12 L11 8 L13 12 Z" fill={palette.innerEar} />
              <path d="M18 13 L21 7 L25 13 Z" fill={palette.primary} />
              <path d="M19 12 L21 8 L24 12 Z" fill={palette.innerEar} />
            </g>
          ) : type === 'dog' ? (
            <g className="floppy-ears">
              <rect x="6" y="11" width="4" height="8" rx="2" fill={palette.secondary} />
              <rect x="22" y="11" width="4" height="8" rx="2" fill={palette.secondary} />
            </g>
          ) : (
            <g className="round-ears">
              <circle cx="9" cy="11" r="3.5" fill={palette.primary} />
              <circle cx="9" cy="11" r="2" fill={palette.innerEar} />
              <circle cx="23" cy="11" r="3.5" fill={palette.primary} />
              <circle cx="23" cy="11" r="2" fill={palette.innerEar} />
            </g>
          )}

          {/* 머리 및 몸통 */}
          <g className="character-body">
            <rect x="7" y="11" width="18" height="15" rx="5" fill={palette.primary} />

            {type === 'fox' || type === 'cat' || type === 'hamster' ? (
              <path
                d="M12 21 C12 21 16 19 20 21 L20 25 C18 26 14 26 12 25 Z"
                fill={palette.accent}
              />
            ) : null}

            {/* 눈 */}
            {isSleeping ? (
              <g className="eyes-closed">
                <path d="M10 18 Q12 20 14 18" stroke={palette.eyes} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M18 18 Q20 20 22 18" stroke={palette.eyes} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </g>
            ) : isPoked ? (
              <g className="eyes-poked">
                <circle cx="12" cy="17" r="2.5" fill={palette.eyes} />
                <circle cx="12.5" cy="16.5" r="0.8" fill="#fff" />
                <circle cx="20" cy="17" r="2.5" fill={palette.eyes} />
                <circle cx="20.5" cy="16.5" r="0.8" fill="#fff" />
              </g>
            ) : (
              <g className="eyes-normal">
                <rect x="11" y="16" width="2.5" height="3" rx="1" fill={palette.eyes} />
                <rect x="11.5" y="16.5" width="1" height="1" fill="#ffffff" />
                <rect x="18.5" y="16" width="2.5" height="3" rx="1" fill={palette.eyes} />
                <rect x="19" y="16.5" width="1" height="1" fill="#ffffff" />
              </g>
            )}

            {/* 볼터치 */}
            <ellipse cx="9.5" cy="20" rx="1.8" ry="1.2" fill={palette.blush} opacity="0.8" />
            <ellipse cx="22.5" cy="20" rx="1.8" ry="1.2" fill={palette.blush} opacity="0.8" />

            {/* 코 & 입 */}
            <circle cx="16" cy="19.5" r="1.2" fill={palette.eyes} />
            {isPoked ? (
              <circle cx="16" cy="22" r="1.2" fill={palette.eyes} />
            ) : (
              <path
                d="M14.5 21 Q16 22 17.5 21"
                stroke={palette.eyes}
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* 고양이 수염 */}
            {type === 'cat' && (
              <g opacity="0.6">
                <line x1="6" y1="18" x2="9" y2="18.5" stroke={palette.eyes} strokeWidth="0.8" />
                <line x1="6" y1="20" x2="9" y2="19.8" stroke={palette.eyes} strokeWidth="0.8" />
                <line x1="23" y1="18.5" x2="26" y2="18" stroke={palette.eyes} strokeWidth="0.8" />
                <line x1="23" y1="19.8" x2="26" y2="20" stroke={palette.eyes} strokeWidth="0.8" />
              </g>
            )}

            {/* 발 */}
            <g className={`character-paws ${isWalking ? 'walking-paws' : ''}`}>
              <rect className="paw-left" x="10" y="25" width="3.5" height="2.5" rx="1" fill={palette.secondary} />
              <rect className="paw-right" x="18.5" y="25" width="3.5" height="2.5" rx="1" fill={palette.secondary} />
            </g>

            {/* 꼬리 */}
            {type === 'cat' || type === 'fox' || type === 'dog' ? (
              <path
                className="tail-wiggle"
                d="M24 23 Q29 20 28 16"
                stroke={palette.primary}
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : null}
          </g>
        </svg>
      )}
    </div>
  );
};
