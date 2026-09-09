import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useUserStore from "../../../store/useUserStore";
import { updateUserProfile } from "../../services/user.services";
import "./profile.css";

const labelFor = (user) => user?.username || user?.email || user?.phoneNumber || "User";

export default function Profile() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || "");
  const [about, setAbout] = useState(user?.about || "");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef(null);

  if (!user?._id && !user?.id) return <Navigate to="/user-login" replace />;

  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage("");
    try {
      const response = await updateUserProfile({ username, about, media: file });
      if (response.data) setUser(response.data);
      setFile(null); if (fileInput.current) fileInput.current.value = "";
      setMessage("Profile updated.");
    } catch (error) { setMessage(error?.message || "Could not update profile."); }
    finally { setSaving(false); }
  };

  const avatarSource = file ? URL.createObjectURL(file) : user.profilePicture;
  return <main className="utility-page"><header className="utility-header"><button type="button" onClick={() => navigate("/chat")}>‹ Back to chats</button><h1>My profile</h1></header><form className="utility-card profile-page-card" onSubmit={save}><button className="profile-page-photo" type="button" onClick={() => fileInput.current?.click()}>{avatarSource ? <img src={avatarSource} alt={labelFor(user)} /> : <b>{labelFor(user)[0]?.toUpperCase()}</b>}<span>Change photo</span></button><input ref={fileInput} hidden type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /><label>Name<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name" /></label><label>About<input value={about} onChange={(event) => setAbout(event.target.value)} placeholder="About you" /></label><label>Phone<input value={user.phoneNumber || "—"} disabled /></label><label>Email<input value={user.email || "—"} disabled /></label>{message && <p className="utility-feedback">{message}</p>}<button className="utility-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></form></main>;
}
