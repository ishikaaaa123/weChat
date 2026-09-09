const User = require('../models/User');
const response = require('../utils/resHandle');
const { getFirebaseAdmin } = require('../service/firebaseAdmin');
const otpGenerate = require('../utils/otpGen');
const genToken = require('../utils/generateJWT');
const sendOtpToEmail = require('../service/emailService');
const { uploadFile } = require('../config/cloudinary');
const Conversation = require('../models/Conversation')
const publicUser = (user) => ({ id: user._id, email: user.email, phoneNumber: user.phoneNumber, isVerified: user.isVerified });

const emailOtp = async(req,res)=>{
  const {email} = req.body;
  if (!email){
    return response(res,400,'invalid email or email not provided');
  }
  try {
    let user = await User.findOne({email});
    if (!user){
      user = new User({email});
    }
    const otp = otpGenerate();
    const expiry = Date.now() + 5*60*1000;
    user.emailOtp = otp;
    user.emailOtpExpiry = expiry;
    await user.save();
    await sendOtpToEmail(email,otp);
    return response(res,200,"email sent successfully");
  } catch (error) {
    console.error('Email OTP send failed:', error.message);
    return response(res,500,'unable to send email OTP');
  }
}

const verifyOtp = async(req,res)=>{
  const {email, emailOtp} = req.body;
  try{
    let user = await User.findOne({email});

    if (!user){
      return response(res,401,"unauthorised user/user doesnt exist");
    }

    if (!user.emailOtp || Date.now() > new Date(user.emailOtpExpiry) || String(user.emailOtp) !== String(emailOtp)){
      return response(res,401,"otp has expired or invalid otp");
    }

    user.isVerified = true;
    user.emailOtp = null;
    user.emailOtpExpiry = null;
    await user.save();
    const token = genToken(user?._id);
    res.cookie("auth_token",token,{
      httpOnly:true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    return response(res,200,"user verified successfully",{token,user});
  }catch(error){
    console.error(error);
    return response(res,500,"internal error occured");
  }
}

async function completeFirebasePhoneSignup(req, res) {                
  const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!idToken) return response(res, 401, 'Firebase ID token is required.');
  try {
    const decodedToken = await getFirebaseAdmin().auth().verifyIdToken(idToken);
    if (!decodedToken.phone_number) return response(res, 400, 'This Firebase account has no verified phone number.');
    let user = await User.findOne({ $or: [{ firebaseUid: decodedToken.uid }, { phoneNumber: decodedToken.phone_number }] });
    const isNewUser = !user;
    if (!user) user = new User();
    user.firebaseUid = decodedToken.uid;
    user.phoneNumber = decodedToken.phone_number;
    user.isVerified = true;
    await user.save();
    const token = genToken(user._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    return response(res, isNewUser ? 201 : 200, 'Phone verified. User is ready.', publicUser(user));
  } catch (error) {
    console.error('Firebase phone verification failed:', error.message);
    const statusCode = error.message.includes('not configured') ? 503 : 401;
    return response(res, statusCode, 'Firebase verification failed.');
  }


}

const updateProfile = async(req,res)=>{
  const {username,about,agreed} = req.body;
  const uid = req.user.userId;
  try{
    const user = await User.findById(uid);
    if (!user) {
      return response(res, 404, 'User not found');
    }
    const file = req.file;
    if (file){
      const upload = await uploadFile(file);
      user.profilePicture = upload?.secure_url;
      console.log(upload);
    }else if (req.body.profilePicture){
      user.profilePicture = req.body.profilePicture;
    }
    if (username)user.username = username;
    if (agreed !== undefined) user.agreed = agreed === true || agreed === 'true';
    if (about)user.about = about;
    await user.save();
    if (req.io) {
      const profileUpdate = {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        about: user.about,
        phoneNumber: user.phoneNumber,
        phoneSuffix: user.phoneSuffix,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      };
      req.io.emit("profile_updated", profileUpdate);
    }
    return response(res,200,"user info updated successfully",user);
  }catch(error){
    console.error(error);
    return response(res,500,"some error occured");
  }
} 

const logout = async(req,res)=>{
  try{
    res.cookie("auth_token","",{expires:new Date(0)});
    return response(res,200,"User logout successfull");

  }catch(error){
    return response(res,500,"Internal server error");
  }
}

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;

  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select('username email profilePicture lastSeen isOnline about phoneNumber phoneSuffix')
      .lean();

    const userWithConvo = await Promise.all(
      users.map(async (user) => {
        const convo = await Conversation.findOne({
          participants: { $all: [loggedInUser, user._id] },
        })
          .populate({
            path: 'lastMessage',
            select: 'content createdAt sender receiver',
          })
          .lean();

        return {
          ...user,
          conversation: convo || null,
        };
      }),
    );

    return response(res, 200, 'Users retrieved successfully', userWithConvo);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Error occurred');
  }
};

module.exports = {getAllUsers,logout,updateProfile, completeFirebasePhoneSignup,verifyOtp, emailOtp };
