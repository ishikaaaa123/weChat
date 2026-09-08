const mongoose = require('mongoose')

const statusSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,ref:"User",
        required:true
    },
    content: {
        type:String,
        trim: true,
        required:true,
    },
    contentType:{
        type:String,
        enum: ['image','video','text']
    },
    expiry:{
        type:Date,
        required:true
    },
    viewers:[{
        type:mongoose.Schema.Types.ObjectId,ref:"User",
    }]
},{timestamps:true})

const Status = mongoose.model("Status",statusSchema);
module.exports = Status;
