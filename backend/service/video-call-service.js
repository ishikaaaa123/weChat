const handleVideoCallEvent = (socket,io,onlineUsers) =>{
    //initiate video call
    socket.on("initiate_call",({callerId,receiverId,callType,callerInfo})=>{
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId){
            const called = `${callerId}-${receiverId}-${Date.now()}`;

            io.to(receiverSocketId).emite("incoming_call",{
                callerId,
                callerName:callerInfo.name,
                callerPic:callerInfo.profilePicture,
                callId,
                callType
            })
        }else{
            console.log("Receiver is not online");
            socket.emit("call_failed",{reason:"receiver is not online"})
        }
    })



    socket.on("accept_call",({callerId,callId,receiverId})=>{
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId){
            io.to(callerSocketId).emit("call_accepted",{
                callerName:callerInfo.name,
                callerPic:callerInfo.profilePicture,
                callId,

            })
        }else{
            console.log(`caller not found!`);
            
        }
    });

    socket.on("reject_call",({callerId,callId,receiverId})=>{
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId){
            io.to(callerSocketId).emit("call_rejected",{
                callerName:callerInfo.name,
                callerPic:callerInfo.profilePicture,
                callId,

            })
        }else{
            console.log(`caller not found!`);
        }
    });


    socket.on("end_call",({callerId,callId,receiverId})=>{
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId){
            io.to(callerSocketId).emit("call_ended",{
                callerName:callerInfo.name,
                callerPic:callerInfo.profilePicture,
                callId,

            })
        }else{
            console.log(`caller not online!`);
            
        }
    })


    //webrct signalling
    socket.on("webrtc_offer",({offer,receiverId,callId})=>{
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId){
            io.to(receiverSocketId).emit("webrtc_offer",{
                offer,
                senderId:socket.userId,
                callId
            })
            console.log("server offer forwarded to receiver");

        }else{
            console.log("receiver didnt receiver the offer");

        }
    })


    socket.on("webrtc_ans",({offer,callerId,callId})=>{
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId){
            io.to(callerSocketId).emit("webrtc_ans",{
                offer,
                senderId:socket.userId,
                callId
            })
            console.log("server answer forwarded to caller");

        }else{
            console.log("Caller didn't receive the answer");
        }
    })

    socket.on("webrtc_ice_candidate",({candidate,receiverId,callId})=>{
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId){
            io.to(callerSocketId).emit("webrtc_ans",{
                candidate,
                senderId:socket.userId,
                callId
            })

        }else{
            console.log("receiver id not found for the ice candidate");
        }
    })
}

module.exports = handleVideoCallEvent;