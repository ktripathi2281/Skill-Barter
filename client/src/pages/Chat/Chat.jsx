import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { Send, ArrowLeft, MessageCircle, Circle, Check, X, Handshake } from 'lucide-react';
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
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch all conversations and unread counts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [convRes, unreadRes] = await Promise.all([
          api.get('/conversations'),
          api.get('/conversations/unread'),
        ]);
        setConversations(convRes.data);
        setUnreadCounts(unreadRes.data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // If a conversationId is provided in URL, load that conversation
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c._id === conversationId);
      if (conv) {
        setActiveConversation(conv);
        loadConversation(conversationId);
      } else {
        loadConversation(conversationId);
      }
    }
  }, [conversationId, conversations]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message) => {
      if (message.conversation === activeConversation?._id) {
        setMessages((prev) => [...prev, message]);
        // Mark as read immediately since we're viewing this conversation
        api.patch(`/conversations/${message.conversation}/read`).catch(() => {});
      } else {
        // Increment unread count for other conversations
        setUnreadCounts((prev) => ({
          ...prev,
          [message.conversation]: (prev[message.conversation] || 0) + 1,
        }));
      }
      // Update conversation list's last message
      setConversations((prev) =>
        prev.map((c) =>
          c._id === (message.conversation?._id || message.conversation)
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

      // Mark messages as read
      await api.patch(`/conversations/${id}/read`);
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: activeConversation._id });
    }, 1000);
  };

  const handleUpdateStatus = async (status) => {
    if (!activeConversation) return;
    try {
      const { data } = await api.patch(`/conversations/${activeConversation._id}/status`, { status });
      // Update active conversation
      setActiveConversation((prev) => ({ ...prev, status: data.status }));
      // Update in the list
      setConversations((prev) =>
        prev.map((c) => (c._id === activeConversation._id ? { ...c, status: data.status } : c))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
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
              const unread = unreadCounts[conv._id] || 0;
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
                    {unread > 0 && (
                      <span className="unread-badge">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </div>
                  <div className="conv-info">
                    <div className="conv-name">{other?.name || 'Unknown User'}</div>
                    <div className="conv-last-msg">
                      {conv.lastMessage || 'No messages yet'}
                    </div>
                  </div>
                  <div className="conv-meta">
                    <span className={`badge badge-${conv.status === 'active' ? 'success' : conv.status === 'completed' ? 'brand' : conv.status === 'cancelled' ? 'danger-badge' : 'accent'}`}>
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

              {/* Trade Action Buttons */}
              <div className="trade-actions">
                {activeConversation.status === 'pending' && (
                  <>
                    <button
                      className="btn btn-accept btn-sm"
                      onClick={() => handleUpdateStatus('active')}
                      title="Accept Trade"
                      id="btn-accept-trade"
                    >
                      <Check size={14} />
                      Accept
                    </button>
                    <button
                      className="btn btn-reject btn-sm"
                      onClick={() => handleUpdateStatus('cancelled')}
                      title="Reject Trade"
                      id="btn-reject-trade"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </>
                )}
                {activeConversation.status === 'active' && (
                  <button
                    className="btn btn-complete btn-sm"
                    onClick={() => handleUpdateStatus('completed')}
                    title="Mark Trade as Complete"
                    id="btn-complete-trade"
                  >
                    <Handshake size={14} />
                    Complete
                  </button>
                )}
                {activeConversation.status === 'completed' && (
                  <span className="trade-status-label completed">
                    <Check size={14} /> Trade Completed
                  </span>
                )}
                {activeConversation.status === 'cancelled' && (
                  <span className="trade-status-label cancelled">
                    <X size={14} /> Trade Cancelled
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
