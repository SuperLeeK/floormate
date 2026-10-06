import React, { useMemo, useState } from 'react';
import { CharacterType, UserStatus } from '../types';
import { CHARACTER_THEMES } from '../constants';

interface PixelCharacterProps {
  type: CharacterType;
  status: UserStatus;
  isWalking?: boolean;
  facingDirection?: 'left' | 'right';
  isPoked?: boolean;
  pokeEffect?: string | null;
  size?: number;
  limbColor?: string;
  outlineColor?: string;
}

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  type,
  status,
  isWalking = false,
  facingDirection = 'right',
  isPoked = false,
  pokeEffect = null,
  size = 64,
  limbColor,
  outlineColor,
}) => {
  // 안전한 캐릭터 타입 (알 수 없는 타입이나 오타가 들어올 경우 무조건 'cat'으로 fallback)
  const safeType: CharacterType = CHARACTER_THEMES[type] ? type : 'cat';

  // 시도할 이미지 단계: 0: .png, 1: .webp, 2: cat fallback
  const [retryStep, setRetryStep] = useState<number>(0);

  const theme = useMemo(() => {
    return CHARACTER_THEMES[safeType] || CHARACTER_THEMES.cat;
  }, [safeType]);

  const activeLimbColor = limbColor || theme.limbColor;
  const activeOutlineColor = outlineColor || theme.outlineColor || '#333333';

  // 현재 이미지 경로 계산
  const imageSrc = useMemo(() => {
    if (retryStep >= 2) {
      // 2단계 이상 실패 시 가장 안정적인 기본 고양이 정면으로 fallback
      return '/characters/cat/front.png';
    }
    const ext = retryStep === 0 ? 'png' : 'webp';
    const base = `/characters/${safeType}`;

    if (isPoked) return `${base}/poked.${ext}`;
    if (isWalking) {
      return facingDirection === 'left' ? `${base}/left.${ext}` : `${base}/right.${ext}`;
    }
    return `${base}/front.${ext}`;
  }, [safeType, isPoked, isWalking, facingDirection, retryStep]);

  const handleImageError = () => {
    setRetryStep((prev) => prev + 1);
  };

  const isSleeping = status === 'sleep';
  const isBusy = status === 'busy';
  const isAway = status === 'away';

  // 옆면 여부 (걷는 중이거나 좌우 방향을 보고 있을 때)
  const isSideView = isWalking && !isPoked;

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
      }}
    >
      {/* 찌르기 이펙트 팝업 */}
      {pokeEffect && (
        <div
          className="poke-floating-effect"
          style={{ transform: 'translateX(-50%)' }}
        >
          {pokeEffect === 'heart' && '💖'}
          {pokeEffect === 'poke' && '👉'}
          {pokeEffect === 'pat' && '✨'}
          {pokeEffect === 'water' && '💧'}
          {pokeEffect === 'snack' && '🍪'}
        </div>
      )}

      {/* 상태 표시 장식 */}
      {isSleeping && <div className="sleeping-zzz">Zzz...</div>}
      {isBusy && <div className="busy-sparkle">🔥</div>}
      {isAway && <div className="away-bubble">☕</div>}

      {/* 캐릭터 컨테이너 */}
      <div
        className="character-image-container"
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* [Layer 0] 몸통 뒤 레이어: 옆면일 때 뒷발을 몸통 뒤로 배치하여 자연스러운 깊이감 부여 */}
        {isSideView && (
          <svg
            viewBox="0 0 64 64"
            width={size}
            height={size}
            className="character-limbs-back"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              overflow: 'visible',
              zIndex: 0,
            }}
          >
            {facingDirection === 'left' ? (
              <ellipse
                className="walking-limb-right"
                cx="38"
                cy="58"
                rx="4.2"
                ry="2.8"
                fill={activeLimbColor}
                stroke={activeOutlineColor}
                strokeWidth="1.2"
                style={{ opacity: 0.75, filter: 'brightness(0.85)' }}
              />
            ) : (
              <ellipse
                className="walking-limb-right"
                cx="26"
                cy="58"
                rx="4.2"
                ry="2.8"
                fill={activeLimbColor}
                stroke={activeOutlineColor}
                strokeWidth="1.2"
                style={{ opacity: 0.75, filter: 'brightness(0.85)' }}
              />
            )}
          </svg>
        )}

        {/* [Layer 1] 캐릭터 몸통 이미지: 2px 위로 올려 발이 더 밑으로 시원하게 디뎌지도록 조정 */}
        <img
          src={imageSrc}
          alt={safeType}
          width={size}
          height={size}
          style={{
            objectFit: 'contain',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 1,
            transform: 'translateY(-2px)',
          }}
          onError={handleImageError}
        />

        {/* [Layer 2] 몸통 앞 레이어: 앞발 및 손 */}
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className="character-limbs-front"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            overflow: 'visible',
            zIndex: 2,
          }}
        >
          {/* 발 (Feet) */}
          <g className="character-front-feet">
            {isSideView ? (
              /* 옆면일 때는 앞쪽에 딛는 다리 1개만 앞 레이어에 깔끔하게 표시 */
              facingDirection === 'left' ? (
                <ellipse
                  className="walking-limb-left"
                  cx="25"
                  cy="59.5"
                  rx="5"
                  ry="3.2"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              ) : (
                <ellipse
                  className="walking-limb-left"
                  cx="39"
                  cy="59.5"
                  rx="5"
                  ry="3.2"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              )
            ) : (
              /* 정면 / 놀란 상태: 양발을 바닥에 나란히 디딤 */
              <>
                <ellipse
                  cx="23"
                  cy="59.5"
                  rx="5"
                  ry="3.2"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="41"
                  cy="59.5"
                  rx="5"
                  ry="3.2"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              </>
            )}
          </g>

          {/* 손 (Hands) */}
          <g className="character-hands">
            {isPoked ? (
              /* 콕 찔렸을 때: 놀라서 양손 번쩍 만세 */
              <>
                <ellipse
                  cx="14"
                  cy="30"
                  rx="4.2"
                  ry="4.2"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="50"
                  cy="30"
                  rx="4.2"
                  ry="4.2"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              </>
            ) : isSideView ? (
              /* 옆면일 때: 앞쪽 손 1개만 자연스러운 위치에 얹음 */
              facingDirection === 'left' ? (
                <ellipse
                  className="walking-limb-left"
                  cx="22"
                  cy="43"
                  rx="4"
                  ry="3.6"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              ) : (
                <ellipse
                  className="walking-limb-left"
                  cx="42"
                  cy="43"
                  rx="4"
                  ry="3.6"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              )
            ) : (
              /* 정면 대기 상태: 배 양쪽에 다소곳이 모은 양손 */
              <>
                <ellipse
                  cx="20"
                  cy="43"
                  rx="3.8"
                  ry="3.8"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="44"
                  cy="43"
                  rx="3.8"
                  ry="3.8"
                  fill={activeLimbColor}
                  stroke={activeOutlineColor}
                  strokeWidth="1.2"
                />
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
