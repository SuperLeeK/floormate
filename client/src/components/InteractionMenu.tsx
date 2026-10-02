import React from 'react';
import { PokePayload } from '../types';

interface InteractionMenuProps {
  userName: string;
  onPoke: (type: PokePayload['pokeType']) => void;
  onOpenMessageInput: () => void;
  onClose: () => void;
}

export const InteractionMenu: React.FC<InteractionMenuProps> = ({
  userName,
  onPoke,
  onOpenMessageInput,
  onClose,
}) => {
  return (
    <div className="interaction-menu-overlay" onClick={onClose}>
      <div className="interaction-menu-card" onClick={(e) => e.stopPropagation()}>
        <div className="interaction-menu-title">
          <span>{userName}</span>와(과) 상호작용
        </div>
        <div className="interaction-buttons-grid">
          <button
            className="interact-btn"
            onClick={() => {
              onPoke('heart');
              onClose();
            }}
          >
            <span className="icon">💖</span>
            <span className="label">하트</span>
          </button>
          <button
            className="interact-btn"
            onClick={() => {
              onPoke('pat');
              onClose();
            }}
          >
            <span className="icon">✨</span>
            <span className="label">쓰다듬기</span>
          </button>
          <button
            className="interact-btn"
            onClick={() => {
              onPoke('poke');
              onClose();
            }}
          >
            <span className="icon">👉</span>
            <span className="label">쿡 찌르기</span>
          </button>
          <button
            className="interact-btn"
            onClick={() => {
              onPoke('snack');
              onClose();
            }}
          >
            <span className="icon">🍪</span>
            <span className="label">간식주기</span>
          </button>
          <button
            className="interact-btn"
            onClick={() => {
              onPoke('water');
              onClose();
            }}
          >
            <span className="icon">💧</span>
            <span className="label">물주기</span>
          </button>
          <button
            className="interact-btn message-btn"
            onClick={() => {
              onOpenMessageInput();
              onClose();
            }}
          >
            <span className="icon">💬</span>
            <span className="label">말풍선 보내기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
