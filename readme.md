# Product Requirements Document

## WeChat — Real-Time Messaging Web App

**Version:** 1.0 (Draft)  
**Basis:** Reverse-engineered from the current codebase  
**Date:** September 2026

> This first version includes 1:1 video calling alongside authentication, messaging, presence, status updates, and profile management.

## 1. Overview

WeChat is a full-stack, real-time one-to-one messaging web application inspired by WhatsApp/WeChat-style consumer chat products. It is built as a MERN-adjacent stack: a Node.js/Express REST API with MongoDB (Mongoose) for persistence, Socket.IO for real-time events, and a React (Vite) single-page frontend styled with plain CSS and state managed via Zustand.

This PRD documents the product as currently implemented in the codebase (feature set, data model, and flows), and separately calls out gaps, inconsistencies, and open questions so the team can decide what is intentional scope versus unfinished work.

## 2. Goals & Problem Statement

Enable two people who both have accounts to discover each other, message in real time (text, images, and video attachments), see delivery/read/online status, and share ephemeral 24-hour “status” updates—all without requiring a password (identity is established via one-time codes).

- **Passwordless onboarding:** Let a user sign up and log in without creating or remembering a password.
- **Real-time messaging:** Deliver messages instantly to online recipients and reflect sent/delivered/read state.
- **Presence & activity signals:** Show who's online, who's typing, and when someone was last seen.
- **Ephemeral sharing:** Let users post a photo, video, or text update that disappears after 24 hours, matching the familiar WhatsApp/WeChat “Status/Moments” pattern.
- **Basic profile management:** Allow a lightweight identity (name, photo, about text) without heavier social-profile features.

## 3. Target Users

Not explicitly defined in the codebase or provided materials. Based on the feature set (phone/email OTP login with country-code picker, 1:1 chat, disappearing status updates), the implicit target is a general consumer audience wanting a simple, mobile-friendly personal messaging app—comparable to WhatsApp's core use case.

This should be confirmed with stakeholders before using it to drive prioritization.

## 4. Scope: What Is Currently Built

### 4.1 Authentication & Onboarding

- **Two sign-in methods, no password:** A user chooses Phone or Email as their sign-in method.
- **Phone flow:** Phone number + country dial-code picker → Firebase Authentication sends and validates the SMS OTP client-side. Once Firebase confirms the code, the frontend sends the Firebase ID token to the backend, which verifies it via Firebase Admin SDK and creates/updates a MongoDB user record.
- **Email flow:** Backend generates and emails a 6-digit numeric OTP (5-minute expiry) via Nodemailer; the code is verified against the value stored directly on the User document.
- **Session:** On successful verification, the backend issues a JWT and sets it as an httpOnly cookie (`auth_token`) valid for 365 days.
- **No forced profile completion step:** An authenticated user without a username/profile photo is not forced through a distinct “complete your profile” step in the current routing—they land directly in Chat and can edit their profile later.
- **Route protection:** A single Express middleware (`authMiddle.js`) verifies the JWT cookie on every protected route and attaches the decoded payload to `req.user`.

### 4.2 Contacts & Conversations

- **Global user directory:** “New chat” opens a directory of every other registered user (no invite/friend-request concept—all registered users are visible to all other users), searchable by name, email, or phone.
- **1:1 conversations only:** A Conversation is created lazily (on first message) between exactly two participants; there is no group chat.
- **Conversation list:** Left sidebar lists conversations sorted by most recently updated, showing the other participant's name/photo, last message preview (or “Photo”/“Video” for media), timestamp, and online dot. Client-side text filter over the list.

### 4.3 Messaging

- **Message content types:** Text messages, plus optional single image or video attachment per message (uploaded to Cloudinary; local temp file removed after upload).
- **Delivery/read status lifecycle:** send → delivered (if recipient is currently connected via Socket.IO) → read (when the recipient opens/has open the conversation). Read receipts render as single/double check marks; unread messages are bulk-marked read when a conversation is opened.
- **Real-time delivery:** New messages, message status changes, deletions, and reactions are pushed over Socket.IO to the recipient in real time when they are connected; REST endpoints remain the source of truth for persistence and for anything the recipient missed while offline.
- **Emoji reactions:** Any of 6 fixed emoji (👍 ❤️ 😂 😮 😢 🙏) can be applied per user per message; re-tapping the same emoji removes it, tapping a different one swaps it. Handled entirely over the socket connection (no REST endpoint), so a reaction added while the actor is offline is not possible.
- **Delete message:** Sender can delete their own messages; deletion is hard (removed from DB), and the conversation's `lastMessage` pointer is recalculated. There is no “edit message” capability and no “delete for everyone” vs “delete for me” distinction—deletion always removes it for both sides.
- **Typing indicator:** Emitted via socket while a user is typing in a thread; auto-clears after 3 seconds of inactivity or on send.

### 4.4 Video Calling

- **Entry point:** A single video-call button in the chat header initiates a 1:1 call with the open conversation's other participant; the earlier separate voice-call icon has been removed entirely.
- **Peer-to-peer media via WebRTC:** On accept, both sides establish a direct browser-to-browser media connection using WebRTC, with the existing Socket.IO connection relaying the signaling handshake (offer/answer/ICE candidates) between them.
- **Call lifecycle:** `initiate_call` → `incoming_call` (pushed to every open tab/device of the recipient) → `accept_call`/`reject_call` → `webrtc_offer`/`webrtc_answer`/`webrtc_ice_candidate` exchange → connected. Either side can `end_call` at any point; the caller gets an explicit “receiver is not online” failure if the callee has no active socket.
- **In-call controls:** In-call overlay with live local/remote video, plus mute-microphone and camera-off toggles; calls are not recorded or logged anywhere.
- **Not persisted:** No Call collection exists—call state (who's calling whom, accepted/rejected/ended) lives only in server memory and each client's local component state for the duration of the call. Nothing about a call is persisted once it ends, so there is no call history or missed-call log.
- **No TURN server:** ICE configuration only includes a public Google STUN server, with no TURN server configured. This works for most direct peer connections but will fail to connect two users who are both behind restrictive/symmetric NATs or corporate firewalls—a real-world reliability gap for anyone outside easy network conditions.
- **Dead code found:** A parallel Zustand store (`useVideoCallStore.js`) that mirrors similar call/media state exists in the codebase but is never imported anywhere—the shipped feature manages its own state locally instead. The unused store also contains two bugs (`getVideoTrack` instead of `getVideoTracks`, and a mistyped `isaudioEnabled` setter) that would surface immediately if it were ever wired in.

### 4.5 Presence

- **Online/offline tracking:** A user is “online” while at least one of their sockets (tabs/devices) is connected; `isOnline` and `lastSeen` are persisted on the User document and broadcast to all connected clients on change.
- **Presence UI:** A green dot on avatars in conversation list and chat header; “Online”/“Offline” label under the chat partner's name.

### 4.6 Status Updates (“Moments”-Style)

- **Post a status:** Text, image, or video, expiring exactly 24 hours after creation (expiry timestamp checked on every fetch—no scheduled cleanup job removes expired documents from the database).
- **View & view-tracking:** New statuses are broadcast to every other connected user; opening someone else's status calls a “view” endpoint that adds the viewer to a viewers list and notifies the status owner in real time with the updated viewer count/list.
- **Two surfaces:** A status carousel/strip appears both inside the Chat page sidebar and on a dedicated full-page Status view; both are kept in sync via the same socket events.
- **Delete a status:** Owner can delete their own status at any time; broadcast to all connected users.

### 4.7 Profile

- **Editable fields:** Username, “about” text, and profile photo (uploaded to Cloudinary). Phone/email are shown but not editable from the profile screen.
- **Two entry points:** Editable both from a modal inside the Chat page and from a standalone `/profile` route.
- **Live propagation:** Broadcast to all connected clients (not just the user's own sessions) so open conversation lists/headers reflect a changed name or photo immediately.

## 5. Data Model

MongoDB collections (Mongoose schemas), all with automatic `createdAt`/`updatedAt` timestamps.

## 6. API Surface (REST)

> Logout does not require the auth middleware, so it succeeds even without a valid session.

## 7. Real-Time Events (Socket.IO)

`user_connected` now accepts an acknowledgment callback so the client can confirm its socket registered successfully before relying on it—relevant because video calling depends on that registration completing first.

## 8. Non-Functional Notes & Current Gaps

Observations worth a product decision—confirm whether each is intentional scope, a known TODO, or a bug:

- **Pagination:** No pagination on conversation list, message history, user directory, or status feed—all fetched in full on every load. Will degrade as data grows.
- **File storage:** Multer stores uploads to a local `uploads/` folder before forwarding to Cloudinary; the temp file is deleted after upload succeeds, but a crash mid-upload could leave orphaned files (the shipped zip already contains 5 leftover files in `backend/uploads`).
- **No group chat:** Group messaging is entirely out of scope in the current schema (Conversation always expects exactly 2 participants); this now also means calls are 1:1 only, with no group-call path.
- **Video calling gaps:** No TURN server is configured for WebRTC, no call history is persisted, and there's no missed-call notification once a call ends or fails—see section 4.4 for detail.
- **Account recovery:** No forgot-password concept applies (passwordless), but there's also no account-recovery path if a user loses access to both their phone and email.
- **Read receipts scope:** There is no server-side push for cross-tab/device consistency of “read” state beyond what's implemented; read receipts are 1:1 only (no group read receipts, moot given no groups).
- **No status cleanup job:** Expired Status documents are never purged—they simply stop being returned by the expiry filter, so the collection grows indefinitely.
- **Unused schema field:** The `Conversation.unreadCount` schema field is dead weight—unread state is computed from `Message.messageStatus` instead.
- **Search:** Client-only search/filter (contacts and conversations); not a backend search endpoint, so it doesn't scale past what's already loaded into memory.
- **No privacy controls:** All authenticated users can see and message every other registered user—there's no blocking, privacy setting, or opt-out.

## 9. Suggested Next Steps (Not Yet Built)

These are natural extensions given the current architecture, offered as candidates for a future roadmap—not a commitment or existing feature:

1. Message pagination / infinite scroll for long-running conversations.
2. Push notifications for offline recipients (e.g., web push or a mobile companion app).
3. Blocking / reporting / privacy controls between users.
4. Group conversations.
5. A scheduled job (e.g., MongoDB TTL index) to purge expired Status documents automatically.
6. A TURN server (e.g., via Twilio, Coturn, or Metered) so calls succeed for users behind restrictive NATs/firewalls—currently the most likely real-world failure point in the new calling feature.
7. A lightweight Call collection to persist call history / missed-call indicators, since calls currently leave no trace once they end.
8. Remove the unused `useVideoCallStore.js` file (dead code, and it contains bugs—see section 4.4) to avoid future confusion about which state layer actually drives calling.
9. Automated tests—no test suite currently exists on either the frontend or backend (`package.json` test scripts are placeholders).

## 10. Open Questions for Stakeholders

1. Who is the intended user base, and is a fully public “anyone can message anyone who's signed up” directory acceptable long-term?
2. Is 1:1-only messaging a permanent constraint, or is group chat on the roadmap?
3. What are the target scale/performance requirements (concurrent users, message volume) that should drive the pagination and indexing work called out above?
4. Now that video calling works end-to-end on friendly networks, is investing in a TURN server (a real cost/ops item) a near-term priority, or is browser-to-browser-only acceptable for now?
