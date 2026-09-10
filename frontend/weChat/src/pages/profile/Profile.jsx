import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useUserStore from "../../../store/useUserStore";
import { disconnectSocket } from "../../services/socket";
import { logoutUser, updateUserProfile } from "../../services/user.services";
import "./profile.css";

const labelFor = (user) => user?.username || user?.email || user?.phoneNumber || "User";

export default function Profile() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || "");
  const [about, setAbout] = useState(user?.about || "");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef(null);
  if (!user?._id && !user?.id) return <Navigate to="/user-login" replace />;
  const save = async (event) => { event.preventDefault(); setSaving(true); setMessage(""); try { const response = await updateUserProfile({ username, about, media: file }); if (response.data) setUser(response.data); setFile(null); if (fileInput.current) fileInput.current.value = ""; setMessage("Profile updated."); } catch (error) { setMessage(error?.message || "Could not update profile."); } finally { setSaving(false); } };
  const logout = async () => { setLoggingOut(true); setMessage(""); try { await logoutUser(); disconnectSocket(); clearUser(); navigate("/user-login", { replace: true }); } catch (error) { setMessage(error?.message || "Could not log out. Please try again."); } finally { setLoggingOut(false); } };
  const avatarSource = file ? URL.createObjectURL(file) : user.profilePicture;
  return <main className="profile-page"><header className="profile-screen-header"><button type="button" onClick={() => navigate("/chat")}>← <span>Back to chats</span></button><h1>My profile</h1><span className="profile-header-badge">◎</span></header><div className="profile-content"><section className="profile-identity-card"><div className="profile-color-band"><strong>WeChat member</strong><span>◉</span></div><div className="profile-identity-body"><div className="profile-avatar-wrap">{avatarSource ? <img src={avatarSource} alt={labelFor(user)} /> : <b>{labelFor(user)[0]?.toUpperCase()}</b>}<button type="button" onClick={() => fileInput.current?.click()} aria-label="Change profile photo">◉</button></div><p className="profile-eyebrow">My profile</p><h2>{username || labelFor(user)}</h2><p className="profile-handle">{user.email || user.phoneNumber || "WeChat member"}</p><p className="profile-about-preview">{about || "Add a short note about yourself."}</p><div className="profile-stats"></div></div></section><form className="profile-edit-card" onSubmit={save}><div className="profile-card-heading"><div><p className="profile-eyebrow">Personal details</p><h2>Make it yours</h2></div><span>⌕</span></div><input ref={fileInput} hidden type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /><label>Name<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name" /></label><label>About<textarea value={about} onChange={(event) => setAbout(event.target.value)} placeholder="Tell people a little about yourself" rows="4" /></label><label>Phone<input value={user.phoneNumber || "—"} disabled /></label><label>Email<input value={user.email || "—"} disabled /></label>{message && <p className="profile-feedback">{message}</p>}<button className="profile-save-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button><button className="profile-logout-button" type="button" onClick={logout} disabled={loggingOut}>⇥ {loggingOut ? "Logging out…" : "Log out"}</button></form></div></main>;
}
