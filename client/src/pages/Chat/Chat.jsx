import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { Send, ArrowLeft, MessageCircle, Circle } from 'lucide-react';
import './Chat.css';

const Chat = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch all conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await api.get('/conversations');
        setConversations(data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // If a conversationId is provided in URL, load that conversation
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message) => {
      if (message.conversation === activeConversation?._id) {
        setMessages((prev) => [...prev, message]);
      }
      // Update conversation list's last message
      setConversations((prev) =>
        prev.map((c) =>
          c._id === message.conversation
            ? { ...c, lastMessage: message.text, lastMessageAt: new Date() }
            : c
        )
      );
    });

    socket.on('user_typing', ({ conversationId: cId }) => {
      if (cId === activeConversation?._id) {
        setTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ conversationId: cId }) => {
      if (cId === activeConversation?._id) {
        setTyping(false);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, activeConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (id) => {
    try {
      const { data: msgs } = await api.get(`/conversations/${id}/messages`);
      setMessages(msgs);

      const conv = conversations.find((c) => c._id === id);
      setActiveConversation(conv || { _id: id });

      // Join the socket room
      if (socket) {
        socket.emit('join_conversation', id);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSelectConversation = (conv) => {
    // Leave previous room
    if (activeConversation && socket) {
      socket.emit('leave_conversation', activeConversation._id);
    }
    setActiveConversation(conv);
    navigate(`/chat/${conv._id}`);
    loadConversation(conv._id);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !activeConversation) return;

    socket.emit('send_message', {
      conversationId: activeConversation._id,
      text: newMessage.trim(),
    });

    socket.emit('stop_typing', { conversationId: activeConversation._id });
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !activeConversation) return;

    socket.emit('typing', { conversationId: activeConversation._id });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: activeConversation._id });
    }, 1000);
  };

  const getOtherParticipant = (conv) => {
    return conv.participants?.find((p) => p._id !== user._id);
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="chat-layout">
      {/* Sidebar — Conversation List */}
      <div className={`chat-sidebar glass-card ${activeConversation ? 'hide-mobile' : ''}`}>
        <div className="sidebar-header">
          <h2>
            <MessageCircle size={20} />
            Messages
          </h2>
        </div>

        <div className="conversation-list" id="conversation-list">
          {conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <p>No conversations yet.<br />Browse users to start a trade!</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              return (
                <div
                  key={conv._id}
                  className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="conv-avatar">
                    {other?.avatar ? (
                      <img src={other.avatar} alt={other.name} />
                    ) : (
                      <span>{other?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="conv-info">
                    <div className="conv-name">{other?.name || 'Unknown User'}</div>
                    <div className="conv-last-msg">
                      {conv.lastMessage || 'No messages yet'}
                    </div>
                  </div>
                  <div className="conv-meta">
                    <span className={`badge badge-${conv.status === 'active' ? 'success' : 'brand'}`}>
                      {conv.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`chat-main ${!activeConversation ? 'hide-mobile' : ''}`}>
        {!activeConversation ? (
          <div className="chat-empty">
            <MessageCircle size={48} strokeWidth={1} />
            <h3>Select a conversation</h3>
            <p className="text-muted">Choose a conversation from the sidebar to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header glass-card">
              <button
                className="btn btn-ghost btn-sm chat-back-btn"
                onClick={() => {
                  setActiveConversation(null);
                  navigate('/chat');
                }}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="chat-header-info">
                <h3>{getOtherParticipant(activeConversation)?.name || 'Chat'}</h3>
                {typing && (
                  <span className="typing-indicator">
                    <Circle size={6} fill="var(--color-success)" color="var(--color-success)" />
                    typing...
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container" id="messages-container">
              {messages.length === 0 ? (
                <div className="chat-empty" style={{ flex: 1 }}>
                  <p className="text-muted">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`message ${msg.sender?._id === user._id ? 'message-own' : 'message-other'}`}
                  >
                    <div className="message-bubble">
                      <p>{msg.text}</p>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="message-input-form" id="message-input-form">
              <input
                type="text"
                className="message-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleTyping}
                id="input-message"
              />
              <button
                type="submit"
                className="btn btn-primary send-btn"
                disabled={!newMessage.trim()}
                id="btn-send"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
