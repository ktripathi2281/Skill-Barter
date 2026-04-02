const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @route   POST /api/conversations
// @desc    Start a new conversation (trade request)
const createConversation = async (req, res) => {
  try {
    const { participantId, skillOfferedId, skillRequestedId } = req.body;

    // Check if a conversation already exists between these two users
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
    });

    if (existingConversation) {
      return res.status(200).json(existingConversation);
    }

    const conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      skillOffered: skillOfferedId,
      skillRequested: skillRequestedId,
    });

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name email avatar')
      .populate('skillOffered', 'name category')
      .populate('skillRequested', 'name category');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/conversations
// @desc    Get all conversations for current user
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email avatar')
      .populate('skillOffered', 'name category')
      .populate('skillRequested', 'name category')
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/conversations/:id/messages
// @desc    Get messages for a conversation
const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Verify user is a participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PATCH /api/conversations/:id/status
// @desc    Update conversation status (two-way acceptance)
const updateConversationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (status === 'active') {
      // "Accept" — add this user to acceptedBy
      if (!conversation.acceptedBy.includes(req.user._id)) {
        conversation.acceptedBy.push(req.user._id);
      }

      // Check if BOTH participants have accepted
      const bothAccepted = conversation.participants.every((p) =>
        conversation.acceptedBy.some((a) => a.toString() === p.toString())
      );

      if (bothAccepted) {
        conversation.status = 'active';
      }
      // Otherwise status stays 'pending' until the other person also accepts
    } else if (status === 'cancelled') {
      // Either party can cancel immediately
      conversation.status = 'cancelled';
    } else if (status === 'completed') {
      conversation.status = 'completed';
    }

    await conversation.save();

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/conversations/unread
// @desc    Get unread message counts for all conversations
const getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.aggregate([
      {
        $match: {
          readBy: { $ne: req.user._id },
        },
      },
      {
        $group: {
          _id: '$conversation',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to a map: { conversationId: count }
    const unreadMap = {};
    counts.forEach((c) => {
      unreadMap[c._id.toString()] = c.count;
    });

    res.json(unreadMap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PATCH /api/conversations/:id/read
// @desc    Mark all messages in a conversation as read by current user
const markAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      {
        conversation: req.params.id,
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  updateConversationStatus,
  getUnreadCounts,
  markAsRead,
};
