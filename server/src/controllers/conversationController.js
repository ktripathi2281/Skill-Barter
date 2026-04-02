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
// @desc    Update conversation status
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

    conversation.status = status;
    await conversation.save();

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  updateConversationStatus,
};
