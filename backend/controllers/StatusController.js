const { uploadFile } = require("../config/cloudinary");
const Conversation = require("../models/Conversation");
const Message = require("../models/message");
const User = require('../models/User');
const response = require('../utils/resHandle');
const Status = require("../models/status");

const createStatus = async(req,res)=>{
    try{
        const { content,contentType } = req.body;
        const userId = req.user.userId;
        const file = req.file;

        let imgOrVidUrl = null;
        let finalcontentType = contentType || 'text';

        if (file){
            const upload = await uploadFile(file);
            if (!upload?.secure_url){
                return response(res,400,'Failed to upload file')
            };
            imgOrVidUrl = upload?.secure_url;

            if (file.mimetype.startsWith('image')){
                finalcontentType = "image";
            }else if(file.mimetype.startsWith('video')){
                finalcontentType = "video";
            }else{
                return response(res,400,"Unsupported content type")
            }
        }else if (content?.trim()){
            finalcontentType = "text";
        }else{
            return response(res,400,"Cant send empty status");
        }

        const status = new Status({
            user:userId,
            content: content || imgOrVidUrl,
            contentType:finalcontentType,
            expiry: new Date(Date.now() + 24*60*60*1000),
        })

        await status.save();
        

        const populatedStatus = await Status.findById(status._id)
        .populate("user","username profilePicture")
        .populate("viewers","username profilePicture");

        //emit that you have put a status
        if (req.io?.emitToUser){
            for (const connectedUserId of req.socketUserMap.keys()){
                if (connectedUserId !== userId){
                    req.io.emitToUser(connectedUserId, "new_status", populatedStatus);
                }
            }
        }

        return response(res,201,"status sent successfully",populatedStatus);


    }catch(error){
        console.error(error);
        return response(res,500,"Internal Server Error");
    }
}

const getAllStatus = async(req,res)=>{
    const userId = req.user.userId;
    try{
        let statuses = await Status.find({expiry:{$gt: Date.now()}})
                        .populate("user","username profilePicture")
                        .populate("viewers","username profilePicture")
                        .sort({createdAt:-1})

        return response(res,200,"status fetched successfull",statuses);
    }catch(error){
        console.error(error);
        return response(res, 500, 'Internal Server Error');
    }
}

const viewStatus = async(req,res)=>{
    const {statusId} = req.params;
    const userId = req.user.userId;
  
    try {
        const status = await Status.findById(statusId);
        if (!status){
            return response(res,404,"Status not found!");
        }

        if (status.expiry <= new Date()) {
            return response(res, 404, 'Status has expired');
        }

        const updatedStatus = await Status.findByIdAndUpdate(
            statusId,
            { $addToSet: { viewers: userId } },
            { new: true },
        )
            .populate('user', 'username profilePicture')
            .populate('viewers', 'username profilePicture');

        //emit that i have viewed the status
        if (req.io?.emitToUser){
            const statusOwnerId = status.user._id.toString();
            if (req.socketUserMap.has(statusOwnerId)){
                const view = {
                    statusId,
                    viewerId: userId,
                    totalViewers: updatedStatus.viewers.length,
                    viewers: updatedStatus.viewers
                }

                req.io.emitToUser(statusOwnerId, "viewed_status", view);
            }
        }else{
            console.log("status owner not connected!");   
        }

        return response(res, 200, 'Status viewed successfully', updatedStatus);
        
    } catch (error) {
        console.error(error);
        return response(res,500,"Internal Server Error");
    }
}

const deleteStatus = async(req,res)=>{
    const {statusId}=req.params;
    const userId = req.user.userId;
    try {
        const result = await Status.deleteOne({
            _id: statusId,
            user: userId
        });
        
        if (result.deletedCount === 0) {
            return response(res, 404, "Status not found or unauthorized");
        }

        if (req.io?.emitToUser){
            for (const connectedUserId of req.socketUserMap.keys()){
                if (connectedUserId !== userId){
                    req.io.emitToUser(connectedUserId, "status_deleted", statusId);
                }
            }
        }
        
        return response(res, 200, "Status deleted successfully");
    } catch (error) {
        console.error(error); 
        return response(res,500,"Internal Server Error");
    }
}

module.exports = { createStatus, getAllStatus, viewStatus, deleteStatus };
