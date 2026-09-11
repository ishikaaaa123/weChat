import { useEffect, useRef, useState } from "react";

import { connectSocket, getSocket } from "../../services/socket";

import "./videoCall.css";

const idOf = (user) => String(user?._id || user?.id || "");

const nameOf = (user) =>
  user?.username || user?.email || user?.phoneNumber || "User";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoCallManager({
  user,
  contact,
  onClose,
  startSignal,
}) {
  const [call, setCall] = useState(null);

  const [phase, setPhase] = useState("idle");

  const [error, setError] = useState("");

  const [cameraOn, setCameraOn] = useState(true);

  const [micOn, setMicOn] = useState(true);

  const localVideo = useRef(null);

  const remoteVideo = useRef(null);

  const peer = useRef(null);

  const localStream = useRef(null);

  const candidateQueue = useRef([]);

  const callRef = useRef(null);

  const setCurrentCall = (next) => {
    callRef.current = next;
    setCall(next);
  };

  const attachLocal = (stream) => {
    localStream.current = stream;

    if (localVideo.current) {
      localVideo.current.srcObject = stream;
    }
  };

  const createPeer = async (targetId, callId) => {
    if (peer.current) return peer.current;

    const connection = new RTCPeerConnection(rtcConfig);

    peer.current = connection;

    localStream.current?.getTracks().forEach((track) => {
      connection.addTrack(track, localStream.current);
    });

    connection.ontrack = ({ streams }) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = streams[0];
      }

      setPhase("connected");
    };

    connection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        getSocket()?.emit("webrtc_ice_candidate", {
          candidate,
          receiverId: targetId,
          callId,
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (
        ["failed", "disconnected", "closed"].includes(
          connection.connectionState
        )
      ) {
        setPhase("ended");
      }
    };

    return connection;
  };

  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    attachLocal(stream);

    return stream;
  };

  const cleanup = (notify = false) => {
    const current = callRef.current;

    if (notify && current?.callId) {
      getSocket()?.emit("end_call", {
        receiverId: current.peerId,
        callId: current.callId,
      });
    }

    localStream.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStream.current = null;

    peer.current?.close();

    peer.current = null;

    candidateQueue.current = [];

    setCurrentCall(null);

    setPhase("idle");

    setCameraOn(true);

    setMicOn(true);

    onClose?.();
  };

  const accept = async () => {
    try {
      await getMedia();

      setPhase("connecting");

      getSocket()?.emit("accept_call", {
        callerId: call.callerId,
        callId: call.callId,
      });
    } catch {
      setError(
        "Camera and microphone permission is required to answer this call."
      );
    }
  };

  const reject = () => {
    getSocket()?.emit("reject_call", {
      callerId: call.callerId,
      callId: call.callId,
    });

    cleanup();
  };

  const start = async () => {
    const socket = connectSocket(idOf(user));

    if (!socket || !contact) return;

    try {
      // Errors from a previous offline attempt must not carry into this call.
      setError("");
      await getMedia();

      setPhase("calling");

      socket.timeout(5000).emit(
        "initiate_call",
        {
          receiverId: idOf(contact),

          callType: "video",

          callerInfo: {
            name: nameOf(user),
            profilePicture: user?.profilePicture,
          },
        },
        (timeoutError, result) => {
          if (timeoutError || !result?.ok) {
            setError(
              result?.reason ||
                "Call request was not delivered. Make sure the recipient is online."
            );

            setPhase("error");
          }
        }
      );
    } catch (mediaError) {
      setError(
        mediaError?.name === "NotAllowedError"
          ? "Allow camera and microphone access to start a video call."
          : "Camera or microphone is unavailable."
      );

      setPhase("error");
    }
  };

  const toggleCamera = () => {
    const track = localStream.current?.getVideoTracks()[0];

    if (track) {
      track.enabled = !track.enabled;

      setCameraOn(track.enabled);
    }
  };

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];

    if (track) {
      track.enabled = !track.enabled;

      setMicOn(track.enabled);
    }
  };

  useEffect(() => {
    if (startSignal && contact && phase === "idle") {
      start();
    }
  }, [startSignal]);

  useEffect(() => {
    // This component can mount before Chat's effect creates the shared socket.
    // Connect/register here too so incoming calls are never missed.

    const socket = connectSocket(idOf(user));

    const incoming = (next) => {
      setCurrentCall({
        ...next,
        peerId: next.callerId,
      });

      setPhase("incoming");
    };

    const started = (next) => {
      setCurrentCall({
        ...next,
        peerId: next.receiverId,
      });
    };

    const accepted = async ({ callId, receiverId }) => {
      const current = callRef.current;

      if (!current || current.callId !== callId) return;

      try {
        await getMedia();

        const connection = await createPeer(receiverId, callId);

        const offer = await connection.createOffer();

        await connection.setLocalDescription(offer);

        socket.emit("webrtc_offer", {
          offer,
          receiverId,
          callId,
        });

        setPhase("connecting");
      } catch {
        setError("Unable to start camera or microphone.");

        cleanup(true);
      }
    };

    const offerReceived = async ({ offer, senderId, callId }) => {
      const current = callRef.current;

      if (!current || current.callId !== callId) return;

      try {
        const connection = await createPeer(senderId, callId);

        await connection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        for (const candidate of candidateQueue.current.splice(0)) {
          await connection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }

        const answer = await connection.createAnswer();

        await connection.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          answer,
          receiverId: senderId,
          callId,
        });
      } catch {
        setError("Could not connect the video call.");
      }
    };

    const answerReceived = async ({ answer, callId }) => {
      const current = callRef.current;

      if (peer.current && current?.callId === callId) {
        await peer.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        for (const candidate of candidateQueue.current.splice(0)) {
          await peer.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      }
    };

    const candidateReceived = async ({ candidate, callId }) => {
      if (callRef.current?.callId !== callId) return;

      if (peer.current?.remoteDescription) {
        await peer.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } else {
        candidateQueue.current.push(candidate);
      }
    };

    const failed = ({ callId, reason }) => {
      // A delayed failure from an earlier call should not cancel a new call.
      if (callRef.current?.callId && callRef.current.callId !== callId) return;
      setError(reason);

      cleanup();
    };

    const ended = ({ callId }) => {
      if (callRef.current?.callId === callId) {
        cleanup();
      }
    };

    socket.on("incoming_call", incoming);

    socket.on("call_started", started);

    socket.on("call_accepted", accepted);

    socket.on("webrtc_offer", offerReceived);

    socket.on("webrtc_answer", answerReceived);

    socket.on("webrtc_ice_candidate", candidateReceived);

    socket.on("call_failed", failed);

    socket.on("call_rejected", ended);

    socket.on("call_ended", ended);

    return () => {
      socket.off("incoming_call", incoming);

      socket.off("call_started", started);

      socket.off("call_accepted", accepted);

      socket.off("webrtc_offer", offerReceived);

      socket.off("webrtc_answer", answerReceived);

      socket.off("webrtc_ice_candidate", candidateReceived);

      socket.off("call_failed", failed);

      socket.off("call_rejected", ended);

      socket.off("call_ended", ended);

      cleanup(false);
    };
  }, [user]);

  if (!call && phase === "idle") return null;

  const peerName =
    phase === "calling" || phase === "connecting"
      ? nameOf(contact)
      : call?.callerInfo?.name || nameOf(contact);

  return (
    <div
      className="video-call-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Video call"
    >
      <section className="video-call-card">
        {/* Remote Video */}
        <video
          ref={(node) => {
            remoteVideo.current = node;
          }}
          autoPlay
          playsInline
          className="remote-video"
        />

        {/* Local Video */}
        <video
          ref={(node) => {
            localVideo.current = node;

            if (node && localStream.current) {
              node.srcObject = localStream.current;
            }
          }}
          autoPlay
          muted
          playsInline
          className="local-video"
        />

        <div className="video-call-info">
          <strong>{peerName}</strong>

          <small>
            {phase === "incoming"
              ? "Incoming video call"
              : phase === "calling"
              ? "Calling…"
              : phase === "connecting"
              ? "Connecting…"
              : phase === "error"
              ? "Call unavailable"
              : "Connected"}
          </small>
        </div>

        {error && <p className="video-call-error">{error}</p>}

        {phase === "incoming" ? (
          <div className="video-call-actions">
            <button
              className="call-reject"
              type="button"
              onClick={reject}
            >
              Decline
            </button>

            <button
              className="call-accept"
              type="button"
              onClick={accept}
            >
              Accept
            </button>
          </div>
        ) : (
          <div className="video-call-actions">
            {/* MICROPHONE BUTTON */}
            <button
              type="button"
              onClick={toggleMic}
              aria-label={
                micOn ? "Mute microphone" : "Unmute microphone"
              }
              title={
                micOn ? "Mute microphone" : "Unmute microphone"
              }
              className={!micOn ? "control-off" : ""}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="9"
                  y="2"
                  width="6"
                  height="12"
                  rx="3"
                />

                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />

                <path d="M12 19v3" />

                <path d="M8 22h8" />

                {!micOn && <path d="M3 3l18 18" />}
              </svg>
            </button>

            {/* CAMERA BUTTON */}
            <button
              type="button"
              onClick={toggleCamera}
              aria-label={
                cameraOn ? "Turn camera off" : "Turn camera on"
              }
              title={
                cameraOn ? "Turn camera off" : "Turn camera on"
              }
              className={!cameraOn ? "control-off" : ""}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="3"
                  y="6"
                  width="13"
                  height="12"
                  rx="2"
                />

                <path d="M16 10l5-3v10l-5-3" />

                {!cameraOn && <path d="M3 3l18 18" />}
              </svg>
            </button>

            {/* END CALL BUTTON */}
            <button
              className="call-reject"
              type="button"
              onClick={() => cleanup(true)}
              aria-label="End call"
              title="End call"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 10.5c4.7-3.3 10.3-3.3 15 0" />
                <path d="M4.5 10.5v4" />
                <path d="M19.5 10.5v4" />
              </svg>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
