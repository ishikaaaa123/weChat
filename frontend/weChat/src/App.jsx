import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/userlogin/login";
import Chat from "./pages/chat/Chat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/user-login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/user-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
