import { useRef, useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";

import Avatar from "../chat/Avatar";
import { Alert, Label, PrimaryButton, TextInput } from "../common/Field";
import { updateUserProfile } from "../../services/user.services";

// My profile: change picture, username and about. Saves through the existing
// PUT /auth/update-profile route (multipart, file field name "media").
export default function ProfilePanel({ user, onUpdated, onClose }) {
  const [username, setUsername] = useState(user?.username || "");
  const [about, setAbout] = useState(user?.about || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profilePicture || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const fileRef = useRef(null);

  const pickFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setDone("");
    try {
      const result = await updateUserProfile({ username, about, media: file });
      if (result?.data) onUpdated(result.data);
      setFile(null);
      setDone("Profile updated");
    } catch (saveError) {
      setError(saveError?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex h-full w-full flex-col overflow-y-auto bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-4">
        <button type="button" onClick={onClose} aria-label="Back">
          <ArrowLeft className="size-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">My profile</h1>
      </header>

      <form onSubmit={save} className="mx-auto w-full max-w-md space-y-5 px-6 py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar user={{ ...user, profilePicture: preview }} size={120} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile picture"
              className="absolute right-0 bottom-0 rounded-full bg-primary p-2 text-primary-foreground"
            >
              <Camera className="size-4" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
          <p className="text-xs text-muted-foreground">Tap the camera to upload a new photo</p>
        </div>

        <div>
          <Label htmlFor="username">Username</Label>
          <TextInput
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <Label htmlFor="about">About</Label>
          <TextInput
            id="about"
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            placeholder="Hey there! I am using WeChat"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <TextInput id="phone" value={user?.phoneNumber || "—"} disabled />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <TextInput id="email" value={user?.email || "—"} disabled />
        </div>

        {error && <Alert>{error}</Alert>}
        {done && <Alert tone="success">{done}</Alert>}

        <PrimaryButton type="submit" loading={saving}>
          Save changes
        </PrimaryButton>
      </form>
    </section>
  );
}
