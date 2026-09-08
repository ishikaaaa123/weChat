const express = require("express");
const { sendMessage, getAllConvo, getConvoMessage, markAsRead, deleteMessage } = require("../controllers/chat");
const authMid = require("../middleware/authMiddle");
const { multermidd } = require("../config/cloudinary");
const router = express.Router();

router.post('/send-message',authMid,multermidd, sendMessage);
router.get('/conversations',authMid,getAllConvo);
router.get('/conversations/:conversationId/messages',authMid,getConvoMessage);
router.put('/messages/read',authMid,markAsRead);
router.delete('/messages/:messageId/delete',authMid,deleteMessage);

module.exports = router;