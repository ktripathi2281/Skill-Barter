const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const setupSocket = (io) => {
  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId}`);

    // User joins their personal room (for receiving messages)
    socket.join(socket.userId);

    // Join a conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`📥 User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text } = data;

        // Save message to database
        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          text,
          readBy: [socket.userId],
        });

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          lastMessageAt: new Date(),
        });

        // Populate sender info before emitting
        const populatedMessage = await Message.findById(message._id).populate(
          'sender',
          'name avatar'
        );

        // Emit the message to everyone in the conversation room
        io.to(conversationId).emit('new_message', populatedMessage);

        // Also emit a notification to the conversation room for unread indicators
        io.to(conversationId).emit('conversation_updated', {
          conversationId,
          lastMessage: text,
          lastMessageAt: new Date(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('user_typing', {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('user_stop_typing', {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = setupSocket;
