const express = require('express');
const { getAllUsers,completeFirebasePhoneSignup, emailOtp, verifyOtp, updateProfile, logout } = require('../controllers/auth');
const authMid = require('../middleware/authMiddle');
const { multermidd } = require('../config/cloudinary');

const router = express.Router();

// Firebase validates the phone OTP in the frontend. This route verifies the
// Firebase ID token and creates the MongoDB user only after that succeeds.
router.post('/email/send-otp', emailOtp);
router.post('/email/verify-otp', verifyOtp);
router.post('/phone/complete', completeFirebasePhoneSignup);

//protected routes

router.put('/update-profile',authMid,multermidd,updateProfile);
router.post('/logout',logout);
router.get('/get-all-users',authMid,getAllUsers);

module.exports = router;
