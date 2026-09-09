import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/userlogin/login";
import Chat from "./pages/chat/Chat";
import Profile from "./pages/profile/Profile";
import Status from "./pages/status/Status";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/user-login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/status" element={<Status />} />
        <Route path="*" element={<Navigate to="/user-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
