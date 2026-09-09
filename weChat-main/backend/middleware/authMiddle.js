const jwt = require('jsonwebtoken');
const response = require('../utils/resHandle');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const authMid = (req,res,next)=>{
    const authToken = req.cookies?.auth_token ;
    if (!authToken){
        return response(res,401,'Auth token missing');
    }
    try {
        const decode = jwt.verify(authToken,process.env.JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        console.error(error);
        return response(res,401,'invalid or expired token');
        
    }
}  


module.exports = authMid;