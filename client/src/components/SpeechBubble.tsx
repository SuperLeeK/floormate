import { BubbleTheme } from '../types';

export interface BubbleMessageItem {
  id: string;
  senderName: string;
  text: string;
  isFadingOut?: boolean;
}

interface SpeechBubbleProps {
  messages: BubbleMessageItem[];
  isTyping?: boolean;
  theme?: BubbleTheme;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ messages, isTyping = false, theme = 'default' }) => {
  if ((!messages || messages.length === 0) && !isTyping) return null;

  return (
    <div className={`speech-bubble-stack theme-${theme}`}>
      {/* 1. 일반 말풍선 목록 */}
      {messages.map((msg, index) => {
        const isLatest = index === messages.length - 1;
        return (
          <div
            key={msg.id}
            className={`speech-bubble-row ${isLatest ? 'is-latest' : 'is-older'} ${msg.isFadingOut ? 'is-fading-out' : ''}`}
          >
            <div className="speech-bubble-chip">
              <span className="bubble-text">{msg.text}</span>
            </div>
          </div>
        );
      })}

      {/* 2. 입력 중일 때 뜨는 점 세 개 (···) 애니메이션 말풍선 */}
      {isTyping && (
        <div className="speech-bubble-row is-typing-bubble">
          <div className="speech-bubble-chip typing-chip">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}
    </div>
  );
};
