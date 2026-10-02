import React, { useState, useEffect, useRef } from 'react';
import { ChatHistoryItem, CharacterType } from '../types';
import { PixelCharacter } from './PixelCharacter';
import { History, X, ArrowUp } from 'lucide-react';
import './ChatHistoryView.css';

// 로컬 3일 대화 기록 로드 헬퍼
function loadLocalHistory(): ChatHistoryItem[] {
  try {
    const saved = localStorage.getItem('floormate_chat_history');
    if (!saved) return [];
    const list: ChatHistoryItem[] = JSON.parse(saved);
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return list.filter((m) => m.timestamp >= threeDaysAgo);
  } catch {
    return [];
  }
}

// 날짜/시간 포맷 (예: 2026년 10월 2일 13:55)
function formatMessageTime(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

export const ChatHistoryView: React.FC = () => {
  const [messages, setMessages] = useState<ChatHistoryItem[]>(loadLocalHistory);
  const [inputText, setInputText] = useState('');
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // 대화 기록 주기적 동기화 및 새 메시지 수신 연동
  useEffect(() => {
    const handleStorage = () => {
      setMessages(loadLocalHistory());
    };
    window.addEventListener('storage', handleStorage);
    const timer = setInterval(() => {
      setMessages(loadLocalHistory());
    }, 1500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(timer);
    };
  }, []);

  // 메시지 추가 시 맨 아래로 스크롤
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleClose = () => {
    window.electronAPI?.closeHistoryWindow?.();
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    window.electronAPI?.sendChatMessage(clean);
    setInputText('');
  };

  return (
    <div className="history-window-container">
      <div className="history-window-card">
        {/* 1. macOS 네이티브 스타일 상단 타이틀바 */}
        <div className="history-title-bar">
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
          <span className="window-title">FloorMate 최근 기록</span>
          <div className="title-spacer" />
        </div>

        {/* 2. 서브 헤더 (3일 보관 안내) */}
        <div className="history-sub-header">
          <div className="sub-header-left">
            <div className="sub-header-title">
              <History size={14} className="history-icon" />
              <span>최근 메시지</span>
            </div>
            <div className="sub-header-desc">메시지는 서버에서 3일 후 자동 삭제됩니다.</div>
          </div>
          <button
            type="button"
            className="sub-header-close-btn"
            onClick={handleClose}
            title="닫기"
          >
            <X size={15} />
          </button>
        </div>

        {/* 3. 최근 메시지 리스트 타임라인 */}
        <div className="history-messages-scroll-area">
          {messages.map((msg) => {
            const isMe = Boolean(msg.isMe);
            return (
              <div key={msg.id} className="history-message-item">
                {/* 픽셀 아바타 썸네일 */}
                <div className="message-avatar-box">
                  <PixelCharacter
                    type={(msg.senderAvatar as CharacterType) || 'cat'}
                    status="online"
                    size={32}
                  />
                </div>

                {/* 메시지 상세 정보 */}
                <div className="message-content-col">
                  <div className="message-meta-row">
                    <div className="sender-name-box">
                      <span className="sender-name">{msg.senderName}</span>
                      {isMe && <span className="me-badge">나</span>}
                    </div>
                    <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-text-bubble">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="history-empty-state">
              <History size={28} className="empty-icon" />
              <p>최근 3일간 주고받은 대화가 없습니다.</p>
              <span>아래 입력창에서 메시지를 남겨보세요!</span>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* 4. 하단 빠른 메시지 입력창 */}
        <form onSubmit={handleSend} className="history-input-box">
          <input
            type="text"
            className="history-input-field"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="메시지를 입력해 주세요"
          />
          <button
            type="submit"
            className={`history-send-btn ${inputText.trim() ? 'active' : ''}`}
            disabled={!inputText.trim()}
            title="전송"
          >
            <ArrowUp size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
