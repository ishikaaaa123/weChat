import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const useVideoCallStore = create(
    subscribeWithSelector((set, get) => ({
        
        // Call state
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        callType: null,

        // Media state
        localStream: null,
        remoteStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,

        peerConnection: null,

        // Queue for ICE candidates
        iceCandidatesQueue: [],

        isCallModelOpen: false,

        // idle, calling, ringing, connected, call_ended
        callStatus: "idle",


        // Actions

        setCurrentCall: (call) => {
            set({ currentCall: call });
        },

        setIncomingCall: (call) => {
            set({ incomingCall: call });
        },

        setCallActive: (active) => {
            set({ isCallActive: active });
        },

        setLocalStream: (stream) => {
            set({ localStream: stream });
        },

        setRemoteStream: (stream) => {
            set({ remoteStream: stream });
        },

        setPeerConnection: (pc) => {
            set({ peerConnection: pc });
        },

        setCallModelOpen: (open) => {
            set({ isCallModelOpen: open });
        },

        addIceCandidate: (candidate) => {
            const { iceCandidatesQueue } = get();

            set({
                iceCandidatesQueue: [
                    ...iceCandidatesQueue,
                    candidate
                ]
            })
        },
        processQueuedCandidates: async()=>{
            const {peerConnection, iceCandidatesQueue} = get();
            if (peerConnection && peerConnection.remoteDescription && iceCandidatesQueue.length >0){
                for(const candidate of iceCandidatesQueue){
                    try{
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                    }catch(error){
                        console.error("ICE candidate error",error);
                        
                    }
                }
                //Other User
                //     │
                //     │ Sends possible network path
                //     ▼
                // ICE Candidate
                //     │
                //     ▼
                // peerConnection.addIceCandidate()
                //     │
                //     ▼
                // PeerConnection now knows
                // about this possible path 🛣️
//Take the ICE candidate information received from the other user, convert 
// it into a WebRTC ICE candidate object, and give it to my peer connection 
// so it can use that possible network path to establish the connection.
                set({iceCandidatesQueue:[]})
            }
        },

        toggleVideo:()=>{
            const {localStream,isVideoEnabled}  = get();
            if (localStream){
                const videoTrack = localStream.getVideoTrack()[0];
                if (videoTrack){
                    videoTrack.enabled = !isVideoEnabled;
                    set({isVideoEnabled:!isVideoEnabled});
                }
            }
        },

        toggleAudio:()=>{
            const {localStream,isAudioEnabled}  = get();
            if (localStream){
                const audioTrack = localStream.getAudioTrack()[0];
                if (audioTrack){
                    audioTrack.enabled = !isAudioEnabled;
                    set({isaudioEnabled:!isAudioEnabled});
                }
            }
        },

        endCall : ()=>{
            const {localStream, peerConnection} = get();
            if (localStream){
                localStream.getTracks().forEach((track)=>track.stop());
                
            }
            if (peerConnection)peerConnection.close();
            set({
                currentCall: null,
                incomingCall: null,
                isCallActive: false,
                callType: null,

                // Media state
                localStream: null,
                remoteStream: null,

                isVideoEnabled: true,
                isAudioEnabled: true,

                peerConnection: null,

                // Queue for ICE candidates
                iceCandidatesQueue: [],

                isCallModelOpen: false,

                // idle, calling, ringing, connected, call_ended
                callStatus: "idle",
            })
        },

        clearIncomingCall:()=>{
            set({incomingCall:null})
        }

    }))
);

export default useVideoCallStore;