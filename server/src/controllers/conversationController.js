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
      // Two-way completion — add this user to completedBy
      if (!conversation.completedBy.includes(req.user._id)) {
        conversation.completedBy.push(req.user._id);
      }

      // Check if BOTH participants have completed
      const bothCompleted = conversation.participants.every((p) =>
        conversation.completedBy.some((c) => c.toString() === p.toString())
      );

      if (bothCompleted) {
        conversation.status = 'completed';
      }
    }

    await conversation.save();

    // Update active conversation with full response (includes acceptedBy + completedBy)
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

// @route   GET /api/conversations/learning
// @desc    Get currently learning (active trades) and already learned (completed by me) skills
const getLearningData = async (req, res) => {
  try {
    const userId = req.user._id;

    // Active conversations where the user is a participant
    const activeConversations = await Conversation.find({
      participants: userId,
      status: 'active',
    })
      .populate('participants', 'name avatar')
      .populate('skillOffered', 'name category')
      .populate('skillRequested', 'name category');

    // Conversations where this user has marked complete (they're in completedBy)
    // This includes ones where status is still 'active' (only they completed)
    // AND ones where status is 'completed' (both completed)
    const completedByMeConversations = await Conversation.find({
      participants: userId,
      completedBy: userId,
    })
      .populate('participants', 'name avatar')
      .populate('skillOffered', 'name category')
      .populate('skillRequested', 'name category');

    // For each conversation, figure out what skill the current user is learning
    // If user is participants[0] (creator), they learn the skillRequested.
    // If user is participants[1] (receiver), they learn the skillOffered.
    const currentlyLearning = activeConversations
      .filter((c) => !c.completedBy.some((id) => id.toString() === userId.toString()))
      .map((conv) => {
        const other = conv.participants.find((p) => p._id.toString() !== userId.toString());
        const isCreator = conv.participants[0]._id.toString() === userId.toString();
        const learnedSkill = isCreator ? conv.skillRequested : conv.skillOffered;
        
        return {
          conversationId: conv._id,
          skill: learnedSkill,
          teacher: other,
          startedAt: conv.updatedAt,
        };
      });

    const alreadyLearned = completedByMeConversations.map((conv) => {
      const other = conv.participants.find((p) => p._id.toString() !== userId.toString());
      const isCreator = conv.participants[0]._id.toString() === userId.toString();
      const learnedSkill = isCreator ? conv.skillRequested : conv.skillOffered;
      
      return {
        conversationId: conv._id,
        skill: learnedSkill,
        teacher: other,
        completedAt: conv.updatedAt,
        tradeCompleted: conv.status === 'completed',
      };
    });

    res.json({ currentlyLearning, alreadyLearned });
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
  getLearningData,
};
