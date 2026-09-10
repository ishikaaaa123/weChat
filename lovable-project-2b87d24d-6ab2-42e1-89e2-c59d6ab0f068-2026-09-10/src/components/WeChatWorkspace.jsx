import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CircleUserRound,
  LogOut,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Radio,
  Search,
  Send,
  Smile,
  Video,
  X,
} from "lucide-react";
import { emojis } from "@/data/emojis";

const conversations = [
  { id: "maya", name: "Maya Chen", initials: "MC", preview: "The new palette looks lovely.", time: "09:42", online: true },
  { id: "noah", name: "Noah Williams", initials: "NW", preview: "Can you send the notes?", time: "Yesterday", online: false },
  { id: "sana", name: "Sana Kapoor", initials: "SK", preview: "See you at 4!", time: "Mon", online: true },
];

const starterMessages = [
  { id: 1, author: "Maya Chen", text: "Morning! Did you see the new palette? 🌞", time: "09:38", mine: false },
  { id: 2, author: "You", text: "Love it — shipping it to the team today 👏", time: "09:39", mine: true },
  { id: 3, author: "Maya Chen", text: "Perfect. I’ll send the final files after our call.", time: "09:42", mine: false },
];

function Avatar({ initials, online = false, large = false }) {
  return (
    <span className={`workspace-avatar${large ? " workspace-avatar-large" : ""}`}>
      {initials}
      {online && <i aria-label="Online" />}
    </span>
  );
}

function ChatView({ onProfile }) {
  const [activeId, setActiveId] = useState("maya");
  const [messages, setMessages] = useState(starterMessages);
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const fileInput = useRef(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const shownEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return emojis.slice(0, 180);
    return emojis.slice(0, 500);
  }, [emojiSearch]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!draft.trim() && !fileName) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), author: "You", text: draft.trim() || `Attached ${fileName}`, time: "Now", mine: true },
    ]);
    setDraft("");
    setFileName("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const addEmoji = (emoji) => {
    setDraft((current) => `${current}${emoji}`);
    setEmojiOpen(true);
  };

  return (
    <section className="workspace-main-panel">
      <aside className="workspace-sidebar">
        <header className="workspace-brand-row">
          <div className="workspace-brand-mark">◌</div>
          <strong>We<span>Chat</span></strong>
          <button className="workspace-link-button" type="button" onClick={onProfile}>My profile</button>
        </header>
        <label className="workspace-search">
          <Search size={17} aria-hidden="true" />
          <input placeholder="Search chats" aria-label="Search chats" />
        </label>
        <div className="workspace-status-card">
          <div className="workspace-section-heading"><strong>Status</strong><button type="button">View all</button></div>
          <div className="workspace-status-row">
            <button className="workspace-status-avatar workspace-status-add" type="button"><Plus size={17} /><small>My status</small></button>
            <button className="workspace-status-avatar" type="button"><Avatar initials="NW" online /><small>Noah</small></button>
            <button className="workspace-status-avatar" type="button"><Avatar initials="SK" online /><small>Sana</small></button>
          </div>
        </div>
        <div className="workspace-conversations">
          <div className="workspace-section-heading workspace-chats-heading"><strong>Chats</strong><button type="button" aria-label="New chat"><Plus size={17} /></button></div>
          {conversations.map((conversation) => (
            <button className={`workspace-conversation${conversation.id === activeId ? " is-selected" : ""}`} key={conversation.id} type="button" onClick={() => setActiveId(conversation.id)}>
              <Avatar initials={conversation.initials} online={conversation.online} />
              <span><strong>{conversation.name}</strong><small>{conversation.preview}</small></span>
              <time>{conversation.time}</time>
            </button>
          ))}
        </div>
        <button className="workspace-profile-shortcut" type="button" onClick={onProfile}><Avatar initials="AR" /><span><strong>My Profile</strong><small>Update your details</small></span><ArrowLeft size={16} /></button>
      </aside>

      <section className="workspace-chat-panel">
        <header className="workspace-chat-header">
          <button className="workspace-contact" type="button">
            <Avatar initials={activeConversation.initials} online={activeConversation.online} />
            <span><strong>{activeConversation.name}</strong><small>{activeConversation.online ? "Online" : "Offline"}</small></span>
          </button>
          <button className="workspace-call-button" type="button" aria-label="Start video call" title="Start video call"><Video size={19} /></button>
        </header>

        <div className="workspace-message-list">
          <div className="workspace-date-divider"><span>Today</span></div>
          {messages.map((message) => (
            <article className={`workspace-message ${message.mine ? "is-mine" : ""}`} key={message.id}>
              <div className="workspace-message-bubble">
                <p>{message.text}</p>
                {/* Timestamps keep each conversation easy to scan. */}
                <small>{message.time}{message.mine && <Check size={12} aria-label="Sent" />}</small>
                {/* Reactions stay attached to the message they belong to. */}
                {message.id === 2 && <button className="workspace-reaction" type="button" aria-label="React to message">👏</button>}
              </div>
            </article>
          ))}
        </div>

        <form className="workspace-composer" onSubmit={sendMessage}>
          {fileName && <small className="workspace-attachment-name">Attached: {fileName}</small>}
          {emojiOpen && (
            <div className="workspace-emoji-picker">
              <div className="workspace-emoji-heading"><strong>Emoji</strong><button type="button" onClick={() => setEmojiOpen(false)} aria-label="Close emoji picker"><X size={15} /></button></div>
              <input value={emojiSearch} onChange={(event) => setEmojiSearch(event.target.value)} placeholder="Find an emoji" aria-label="Find an emoji" />
              <div className="workspace-emoji-grid">{shownEmojis.map((emoji, index) => <button type="button" key={`${emoji}-${index}`} onClick={() => addEmoji(emoji)} aria-label={`Add ${emoji}`}>{emoji}</button>)}</div>
            </div>
          )}
          <div className="workspace-composer-row">
            <button className={`workspace-composer-icon${emojiOpen ? " is-active" : ""}`} type="button" onClick={() => setEmojiOpen((current) => !current)} aria-label="Open emoji picker" title="Add emoji"><Smile size={20} /></button>
            <button className="workspace-composer-icon" type="button" onClick={() => fileInput.current?.click()} aria-label="Add files" title="Add files"><Paperclip size={19} /></button>
            <input ref={fileInput} hidden type="file" accept="image/*,video/*" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} />
            <input className="workspace-message-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Type a message to ${activeConversation.name}...`} aria-label="Message" />
            <button className="workspace-send-button" type="submit" aria-label="Send message" title="Send message"><Send size={17} /></button>
          </div>
        </form>
      </section>
    </section>
  );
}

function ProfileView({ onBack }) {
  const [name, setName] = useState("Ada Reyes");
  const [about, setAbout] = useState("Designing calm, focused tools. Coffee, then color systems.");
  const [saved, setSaved] = useState(false);

  const saveProfile = (event) => {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="profile-screen">
      <header className="profile-screen-header"><button className="profile-back-button" type="button" onClick={onBack}><ArrowLeft size={18} /> Back to chats</button><span>My profile</span><button className="profile-header-icon" type="button" aria-label="Profile settings"><CircleUserRound size={19} /></button></header>
      <div className="profile-content">
        <section className="profile-identity-card">
          <div className="profile-color-band"><span>WeChat member</span><Radio size={16} /></div>
          <div className="profile-identity-body">
            <div className="profile-avatar-wrap"><Avatar initials="AR" large /><button type="button" aria-label="Change profile photo"><Camera size={16} /></button></div>
            <p className="profile-eyebrow">My profile</p>
            <h1>{name}</h1>
            <p className="profile-handle">@ada.reyes · Product Lead</p>
            <p className="profile-about-preview">{about}</p>
            <div className="profile-tags"><span>Design</span><span>Systems</span><span>Prototyping</span></div>
            <div className="profile-stats"><div><strong>248</strong><small>Chats</small></div><div><strong>12</strong><small>Calls</small></div><div><strong>9</strong><small>Groups</small></div></div>
          </div>
        </section>

        <form className="profile-edit-card" onSubmit={saveProfile}>
          <div className="profile-card-heading"><div><p className="profile-eyebrow">Personal details</p><h2>Make it yours</h2></div><Pencil size={18} /></div>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>About<textarea value={about} onChange={(event) => setAbout(event.target.value)} rows="4" /></label>
          <label>Phone<input value="+91 98765 43210" disabled /></label>
          <label>Email<input value="ada.reyes@example.com" disabled /></label>
          {saved && <p className="profile-saved"><Check size={15} /> Profile updated</p>}
          <button className="profile-save-button" type="submit">Save changes</button>
          <button className="profile-logout-button" type="button"><LogOut size={16} /> Log out</button>
        </form>
      </div>
    </section>
  );
}

export default function WeChatWorkspace() {
  const [view, setView] = useState("chat");
  return <main className="wechat-workspace">{view === "chat" ? <ChatView onProfile={() => setView("profile")} /> : <ProfileView onBack={() => setView("chat")} />}</main>;
}