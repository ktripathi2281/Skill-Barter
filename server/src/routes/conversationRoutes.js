const express = require('express');
const router = express.Router();
const {
  createConversation,
  getConversations,
  getMessages,
  updateConversationStatus,
  getUnreadCounts,
  markAsRead,
  getLearningData,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createConversation);
router.get('/', protect, getConversations);
router.get('/unread', protect, getUnreadCounts);
router.get('/learning', protect, getLearningData);
router.get('/:id/messages', protect, getMessages);
router.patch('/:id/status', protect, updateConversationStatus);
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
