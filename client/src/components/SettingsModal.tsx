import React, { useState } from 'react';
import { AppSettings, CharacterType } from '../types';
import { CHARACTERS } from '../constants';
import { PixelCharacter } from './PixelCharacter';
import { X, Hash, User, Sparkles, LayoutPanelLeft } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [roomId, setRoomId] = useState(settings.roomId);
  const [userName, setUserName] = useState(settings.userName);
  const [userAvatar, setUserAvatar] = useState<CharacterType>(settings.userAvatar);
  const [dockSide, setDockSide] = useState<'right' | 'left'>(settings.dockSide);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...settings,
      serverUrl: settings.serverUrl,
      roomId: roomId.trim() || 'lobby',
      userName: userName.trim() || '익명의 친구',
      userAvatar,
      dockSide,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={18} className="text-amber-400" />
            <span>FloorMate 메신저 설정</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* 캐릭터 선택 */}
          <div className="form-group">
            <label className="form-label">
              <Sparkles size={14} /> 내 픽셀 캐릭터 선택
            </label>
            <div className="avatar-selection-grid">
              {CHARACTERS.map((char) => (
                <button
                  type="button"
                  key={char.type}
                  className={`avatar-option-btn ${userAvatar === char.type ? 'selected' : ''}`}
                  onClick={() => setUserAvatar(char.type)}
                >
                  <PixelCharacter type={char.type} status="online" size={48} />
                  <span className="avatar-label">{char.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 닉네임 */}
          <div className="form-group">
            <label className="form-label" htmlFor="user-name-input">
              <User size={14} /> 닉네임
            </label>
            <input
              id="user-name-input"
              type="text"
              className="form-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="표시될 닉네임을 입력하세요"
              maxLength={12}
              required
            />
          </div>

          {/* 방 코드 */}
          <div className="form-group">
            <label className="form-label" htmlFor="room-id-input">
              <Hash size={14} /> 친구 방 이름 (Room ID)
            </label>
            <input
              id="room-id-input"
              type="text"
              className="form-input"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="예: dopamine-gang, coffee-break"
              required
            />
            <span className="form-hint">
              지인들과 동일한 방 이름을 입력하면 자동으로 같은 화면에 모입니다.
            </span>
          </div>



          {/* 도킹 위치 */}
          <div className="form-group">
            <label className="form-label">
              <LayoutPanelLeft size={14} /> 화면 도킹 위치
            </label>
            <div className="dock-position-options">
              <label className={`dock-radio ${dockSide === 'right' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="dockSide"
                  value="right"
                  checked={dockSide === 'right'}
                  onChange={() => setDockSide('right')}
                />
                화면 오른쪽 (기본)
              </label>
              <label className={`dock-radio ${dockSide === 'left' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="dockSide"
                  value="left"
                  checked={dockSide === 'left'}
                  onChange={() => setDockSide('left')}
                />
                화면 왼쪽
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              저장하고 연결하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
