import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/userlogin/login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/user-login" element={<Login />} />
        <Route path="*" element={<Navigate to="/user-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
