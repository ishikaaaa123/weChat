import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useUserStore from "../../../store/useUserStore";
import { createStatus, deleteStatus, getStatuses, viewStatus } from "../../services/status.services";
import { connectSocket, disconnectSocket } from "../../services/socket";
import "../profile/profile.css";
import "./status.css";

const labelFor = (user) => user?.username || user?.email || user?.phoneNumber || "User";

export default function Status() {
  const user = useUserStore((state) => state.user);
  const currentUserId = String(user?._id || user?.id || "");
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState([]);
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);
  const load = useCallback(async () => { try { const response = await getStatuses(); setStatuses(response.data || []); } catch (requestError) { setError(requestError?.message || "Could not load statuses."); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!currentUserId) return undefined;
    const socket = connectSocket(currentUserId);
    const created = (status) => setStatuses((items) => [status, ...items.filter((item) => item._id !== status._id)]);
    const removed = (statusId) => setStatuses((items) => items.filter((item) => item._id !== statusId));
    socket.on("new_status", created);
    socket.on("status_deleted", removed);
    return () => {
      socket.off("new_status", created);
      socket.off("status_deleted", removed);
      disconnectSocket();
    };
  }, [currentUserId]);
  if (!currentUserId) return <Navigate to="/user-login" replace />;
  const publish = async (event) => { event.preventDefault(); if (!content.trim() && !file) return; setSending(true); try { const response = await createStatus({ content: content.trim(), file }); if (response.data) setStatuses((items) => [response.data, ...items]); setContent(""); setFile(null); if (fileInput.current) fileInput.current.value = ""; } catch (requestError) { setError(requestError?.message || "Could not post status."); } finally { setSending(false); } };
  const open = async (status) => { setSelected(status); if (String(status.user?._id || status.user) === currentUserId) return; try { const response = await viewStatus(status._id); if (response.data) setSelected(response.data); } catch (requestError) { setError(requestError?.message || "Could not open status."); } };
  const remove = async (statusId) => { try { await deleteStatus(statusId); setStatuses((items) => items.filter((item) => item._id !== statusId)); setSelected(null); } catch (requestError) { setError(requestError?.message || "Could not delete status."); } };
  return <main className="utility-page"><header className="utility-header"><button type="button" onClick={() => navigate("/chat")}>‹ Back to chats</button><h1>Status</h1></header><div className="status-page"><form className="utility-card status-form" onSubmit={publish}><h2>Share a status</h2><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Share an update..." /><input ref={fileInput} hidden type="file" accept="image/*,video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button className="status-attachment" type="button" onClick={() => fileInput.current?.click()}>{file ? file.name : "Attach photo or video"}</button><button className="utility-primary" type="submit" disabled={sending}>{sending ? "Posting…" : "Post status"}</button></form><section className="status-feed"><h2>Recent updates</h2>{loading && <p>Loading statuses…</p>}{!loading && !statuses.length && <p>No active statuses yet.</p>}{statuses.map((status) => <button className="status-feed-item" type="button" key={status._id} onClick={() => open(status)}><span>{status.user?.profilePicture ? <img src={status.user.profilePicture} alt="" /> : labelFor(status.user)[0]?.toUpperCase()}</span><strong>{labelFor(status.user)}</strong><small>{status.contentType === "image" ? "Photo" : status.contentType === "video" ? "Video" : status.content}</small></button>)}</section></div>{error && <p className="status-error">{error}</p>}{selected && <div className="status-page-viewer" onClick={() => setSelected(null)}><article onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelected(null)}>×</button><h3>{labelFor(selected.user)}</h3>{selected.contentType === "image" ? <img src={selected.content} alt="Shared status" /> : selected.contentType === "video" ? <video src={selected.content} controls autoPlay /> : <p>{selected.content}</p>}{String(selected.user?._id || selected.user) === currentUserId && <button className="status-delete" type="button" onClick={() => remove(selected._id)}>Delete status</button>}</article></div>}</main>;
}
