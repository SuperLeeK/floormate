import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import './ChatInputView.css';

export const ChatInputView: React.FC = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      window.electronAPI?.sendTyping(false);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.trim().length > 0) {
      window.electronAPI?.sendTyping(true);

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        window.electronAPI?.sendTyping(false);
      }, 2000);
    } else {
      window.electronAPI?.sendTyping(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    window.electronAPI?.sendTyping(false);
    window.electronAPI?.sendChatMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      window.electronAPI?.sendTyping(false);
      window.electronAPI?.closeChatInputWindow();
    }
  };

  return (
    <div className="chat-popup-container" onKeyDown={handleKeyDown}>
      <form onSubmit={handleSubmit} className="chat-popup-card">
        <MessageSquare size={16} className="chat-icon" />
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={text}
          onChange={handleInputChange}
          placeholder="말풍선 메시지 입력 후 Enter..."
          maxLength={60}
          autoFocus
        />
        <button type="submit" className="chat-send-btn" title="보내기 (Enter)">
          <Send size={13} />
        </button>
      </form>
    </div>
  );
};
