import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  Reply,
  X,
  User as UserIcon,
} from 'lucide-react';
import { ChatMessage, DepartmentMemberContext, User } from '../types';
import { socketService } from '../services/socket';
import { UserAvatar } from './UserAvatar';
import { formatDisplayName } from '../utils/avatar';

interface ChatViewProps {
  messages: ChatMessage[];
  activeDept: DepartmentMemberContext;
  currentUser: User | null;
  onSendMessage: (content: string, replyToId?: string | null) => void;
  typingUsers: { userId: string; name: string }[];
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  activeDept,
  currentUser,
  onSendMessage,
  typingUsers,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit typing indicator
    socketService.startTyping(activeDept.slug);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(activeDept.slug);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim(), replyingTo ? replyingTo.id : null);
    setInputText('');
    setReplyingTo(null);
    socketService.stopTyping(activeDept.slug);
  };

  const handleInitiateReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  return (
    <div className="view-container chat-view-layout">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-dept-indicator">
            <div className="status-online-dot"></div>
            <h2 className="chat-title">{activeDept.name} Discussion Channel</h2>
          </div>
          <p className="chat-subtitle">
            Direct communication between tutors and interns for {activeDept.name}.
          </p>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <MessageSquare size={44} className="text-muted" />
            <h3>Welcome to #{activeDept.slug}</h3>
            <p className="text-muted">
              Start a discussion, ask questions about assignments, or chat with your tutors.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            const isTutor = msg.sender?.role === 'TUTOR';
            const isAdmin = msg.sender?.role === 'ADMIN';

            return (
              <div
                key={msg.id}
                className={`chat-bubble-wrapper ${isMe ? 'bubble-me' : 'bubble-other'}`}
              >
                {!isMe && (
                  <div className="chat-sender-avatar">
                    <UserAvatar
                      firstName={msg.sender?.firstName}
                      lastName={msg.sender?.lastName}
                      role={msg.sender?.role}
                      size="sm"
                    />
                  </div>
                )}

                <div className="chat-bubble-col">
                  {/* Sender Metadata Row */}
                  <div className="chat-bubble-meta">
                    <span className="chat-sender-name">
                      {isMe ? 'You' : formatDisplayName(msg.sender?.firstName, msg.sender?.lastName)}
                    </span>
                    {(isTutor || isAdmin) && (
                      <span className="chat-role-pill">
                        {isAdmin ? 'ADMIN' : 'TUTOR'}
                      </span>
                    )}
                    <span className="chat-time-text">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Quoted Replying Preview if Present */}
                  {msg.replyTo && (
                    <div className="quoted-reply-box">
                      <div className="quoted-reply-sender">
                        Replying to {msg.replyTo.sender?.firstName} {msg.replyTo.sender?.lastName}:
                      </div>
                      <div className="quoted-reply-text">"{msg.replyTo.content}"</div>
                    </div>
                  )}

                  {/* Main Message Bubble */}
                  <div className="chat-bubble-content">
                    <p className="chat-text-line">{msg.content}</p>

                    {/* Inline Reply Trigger */}
                    <button
                      className="btn-reply-trigger"
                      onClick={() => handleInitiateReply(msg)}
                      title="Reply to this message"
                    >
                      <Reply size={13} />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Live Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator-row">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-text">
              {typingUsers.map((u) => u.name).join(', ')}{' '}
              {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="chat-input-wrapper">
        {/* Reply Context Banner */}
        {replyingTo && (
          <div className="replying-context-banner">
            <div className="replying-context-info">
              <Reply size={14} color="#4f46e5" />
              <span>
                Replying to{' '}
                <strong>
                  {replyingTo.sender?.firstName} {replyingTo.sender?.lastName}
                </strong>
                : "{replyingTo.content.slice(0, 70)}..."
              </span>
            </div>
            <button
              className="btn-cancel-reply"
              onClick={() => setReplyingTo(null)}
              title="Cancel reply"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Text Form */}
        <form onSubmit={handleSend} className="chat-form">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Message #${activeDept.name.toLowerCase()}...`}
            value={inputText}
            onChange={handleInputChange}
            className="chat-input"
          />

          <button
            type="submit"
            className="btn-send-message"
            disabled={!inputText.trim()}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
