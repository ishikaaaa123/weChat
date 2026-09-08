const { uploadFile } = require("../config/cloudinary");
const Conversation = require("../models/Conversation");
const Message = require("../models/message");
const User = require('../models/User');
const response = require('../utils/resHandle');

const sendMessage = async(req,res)=>{
    try{
        const { receiverId, content } = req.body;
        const senderId = req.user.userId;
        const file = req.file;

        if (!receiverId || senderId === receiverId) {
            return response(res, 400, 'A different message receiver is required');
        }

        const receiver = await User.findById(receiverId).select('_id');
        if (!receiver) {
            return response(res, 404, 'Receiver not found');
        }

        const participants = [senderId, receiverId];
        let convo = await Conversation.findOne({
            participants: { $all: participants, $size: 2 },
        });
        if (!convo){
            convo = new Conversation({
                participants
            })
            await convo.save();
        }

        let imgOrVidUrl = null;
        let contentType = null;

        if (file){
            const upload = await uploadFile(file);
            if (!upload?.secure_url){
                return response(res,400,'Failed to upload file')
            };
            imgOrVidUrl = upload?.secure_url;

            if (file.mimetype.startsWith('image')){
                contentType = "image";
            }else if(file.mimetype.startsWith('video')){
                contentType = "video";
            }else{
                return response(res,400,"Unsupported content type")
            }
        }else if (content?.trim()){
            contentType = "text";
        }else{
            return response(res,400,"Cant send empty message");
        }

        const message = new Message({
            conversation: convo?._id,
            sender:senderId,
            receiver:receiverId,
            content: content?.trim() || '',
            contentType,
            imageOrVideoUrl: imgOrVidUrl
        })

        await message.save();
        convo.lastMessage = message._id;
        await convo.save();

        const receiverIsOnline = req.socketUserMap?.has(receiverId);
        if (receiverIsOnline) {
            message.messageStatus = "delivered";
            await message.save();
        }

        const populateMessage = await Message.findById(message._id)
        .populate("sender","username profilePicture")
        .populate("receiver","username profilePicture")

        if (receiverIsOnline && req.io?.emitToUser){
            req.io.emitToUser(receiverId, "receive_message", populateMessage);
        }

        return response(res,200,"message sent successfully",populateMessage);


    }catch(error){
        console.error(error);
        return response(res,500,"Internal Server Error");
    }
}

const getAllConvo = async(req,res)=>{
    const userId = req.user.userId;
    try{
        let convo = await Conversation.find({participants:userId})
                .populate("participants","username profilePicture isOnline lastSeen")
                .populate({
                    path:"lastMessage",
                    populate:{
                        path:"sender receiver",
                        select : "username profilePicture"
                    }
                }).sort({updatedAt:-1})

        return response(res,200,"convo fetched successfull",convo);
    }catch(error){
        console.error(error);
        return response(res, 500, 'Internal Server Error');
    }
}

//get message of a specific convo

const getConvoMessage = async(req,res)=>{
    const {conversationId} = req.params;
    const userId = req.user.userId;
    try {
        const convo = await Conversation.findById(conversationId);
        if (!convo){
            return response(res,404,"Conversation not found");
        }
        const isParticipant = convo.participants.some(
            (participant) => participant.toString() === userId,
        );
        if (!isParticipant){
            return response(res,403,"Not authorized to access");
        }
        const messages = await Message.find({conversation: conversationId})
                                    .populate("sender","username profilePicture")
                                    .populate("receiver","username profilePicture")
                                    .sort({ createdAt: 1 });

        const unreadMessages = messages.filter(
            (message) => message.receiver._id.toString() === userId
                && ["send", "delivered"].includes(message.messageStatus),
        );

        
        await Message.updateMany(
            {
            conversation: conversationId,
            receiver: userId,
            messageStatus:{$in:["send","delivered"]}
            },
            {$set:{messageStatus:"read"}}
        );

        await Conversation.updateOne({_id: conversationId},{
            $set:{unreadCount:0}
        })

        for (const message of unreadMessages) {
            message.messageStatus = "read";
        }

        if (req.io?.emitToUser) {
            for (const message of unreadMessages) {
                req.io.emitToUser(message.sender._id, "message_status_update", {
                    messageId: message._id,
                    messageStatus: "read",
                });
            }
        }

        return response(res,200,"Conversation fetched successfully",messages);
    } catch (error) {
        return response(res,500,"Internal Server Error");
    }
}

const markAsRead = async(req,res)=>{
    const {messageIds} = req.body;
    const userId = req.user.userId;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return response(res, 400, 'messageIds must be a non-empty array');
    }
    try {
        const messages = await Message.find({
            _id: { $in: messageIds },
            receiver: userId,
            messageStatus: { $in: ["send", "delivered"] },
        }).select("_id sender");
        const result = await Message.updateMany(
            {
            _id:{$in: messageIds},receiver:userId,
            messageStatus:{$in:["send","delivered"]}
            },
            {$set:{messageStatus:"read"}}
        ); 

        if (req.io?.emitToUser){
            for(const message of messages){
                req.io.emitToUser(message.sender, "message_status_update", {
                    messageId: message._id,
                    messageStatus: "read",
                });
            }
        }

        return response(res,200,"Messages marked read successfully", {
            modifiedCount: result.modifiedCount,
        }); 
        
    } catch (error) {
        console.error(error);
        return response(res,500,"Internal Server Error");
    }
}

const deleteMessage = async(req,res)=>{
    const {messageId}=req.params;
    const userId = req.user.userId;
    try {
        const message = await Message.findOne({
            _id: messageId,
            sender: userId
        });
        if (!message) {
            return response(res, 404, "Message not found or unauthorized");
        }

        await Message.deleteOne({ _id: message._id });

        const latestMessage = await Message.findOne({
            conversation: message.conversation,
            _id: { $ne: message._id },
        })
            .sort({ createdAt: -1 })
            .select("_id");

        await Conversation.findByIdAndUpdate(message.conversation, {
            $set: { lastMessage: latestMessage?._id || null },
        });

        if (req.io?.emitToUser){
            req.io.emitToUser(message.receiver, "message_deleted", { messageId });
        }
        
        return response(res, 200, "Message deleted successfully");
    } catch (error) {
        console.error(error); 
        return response(res,500,"Internal Server Error");
    }
}

module.exports = {deleteMessage, markAsRead,getConvoMessage,sendMessage,getAllConvo};
