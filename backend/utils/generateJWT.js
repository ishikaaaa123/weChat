const jwt = require("jsonwebtoken");

const genToken = (userId)=>{
    return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
        expiresIn:"1y"
    })
}

module.exports = genToken;
