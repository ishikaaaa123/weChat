const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
    phoneNumber:{
        type:String,
        unique:true,
        sparse:true,
        trim:true
    },
    phoneSuffix:{
        type:String
    },
    username:{
        type:String
    },
    emailOtp:{
      type:Number
    },
    emailOtpExpiry:{
      type:Date
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        validate: {
          validator: function (value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          },
          message: "Invalid email address format",
        },
      },
      firebaseUid: {
        type: String,
        unique: true,
        sparse: true,
      },
      profilePicture:{
        type:String,
      },
      about:{
        type:String,
      },
      lastSeen:{
        type:Date,
      },
      isOnline:{
        type:Boolean,default:false
      },
      isVerified:{
        type:Boolean,
        default:false
      },
      agreed:{
        type:Boolean,
        default:false
      },
    },  {timestamps:true});

    const User = mongoose.model("User", userSchema);
    module.exports = User;
    
