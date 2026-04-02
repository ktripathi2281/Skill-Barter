const express = require('express');
const router = express.Router();
const {
  createConversation,
  getConversations,
  getMessages,
  updateConversationStatus,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createConversation);
router.get('/', protect, getConversations);
router.get('/:id/messages', protect, getMessages);
router.patch('/:id/status', protect, updateConversationStatus);

module.exports = router;
