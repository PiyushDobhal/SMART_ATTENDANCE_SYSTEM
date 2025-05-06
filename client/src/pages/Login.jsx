import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const endpoint =
        role === "admin" ? "/api/admin/login" : "/api/students/login";
      const res = await api.post(endpoint, { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", role);

      if (role === "student") {
        const profileRes = await api.get("/api/students/profile");
        localStorage.setItem("name", profileRes.data.name || "");
      }

      window.dispatchEvent(new Event("storage"));

      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h1 className="text-2xl mb-4">Login</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm">
        <input
          type="email"
          className="mb-2 p-2 bg-gray-800 border border-gray-600 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="mb-2 p-2 bg-gray-800 border border-gray-600 w-full"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          className="mb-4 p-2 bg-gray-800 border border-gray-600 w-full"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
