const express = require("express");
const { createStatus, getAllStatus, viewStatus, deleteStatus } = require("../controllers/StatusController");
const authMid = require("../middleware/authMiddle");
const { multermidd } = require("../config/cloudinary");
const router = express.Router();

router.post('/create-status',authMid,multermidd, createStatus);
router.get('/get-status',authMid,getAllStatus);
router.get('/status/:statusId/viewStatus',authMid,viewStatus);
router.delete('/status/:statusId/deleteStatus',authMid,deleteStatus);

module.exports = router;