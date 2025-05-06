import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import io from "socket.io-client";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FaceRegister from "./pages/FaceRegister";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(SOCKET_URL);

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));

  useEffect(() => {
    socket.on("attendance-updated", (data) => {
      console.log("Realtime update:", data);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const onStorage = () => {
      setToken(localStorage.getItem("token"));
      setRole(localStorage.getItem("role"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Router>
      <div className="bg-gray-900 min-h-screen text-white">
        <Navbar />
        <Toast />
        <Routes>
          {/* Public Login Route */}
          <Route
            path="/"
            element={
              !token ? (
                <Login />
              ) : (
                <Navigate
                  to={role === "admin" ? "/admin" : "/student"}
                  replace
                />
              )
            }
          />

          {/* Admin Dashboard, protected */}
          <Route
            path="/admin"
            element={
              token && role === "admin" ? (
                <AdminDashboard socket={socket} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Student Face Registration */}
          <Route
            path="/student/register-face"
            element={
              token && role === "student" ? (
                <FaceRegister />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Student Dashboard */}
          <Route
            path="/student"
            element={
              token && role === "student" ? (
                <StudentDashboard socket={socket} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Catch‑all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
