import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [name, setName] = useState(localStorage.getItem("name"));

  // Update role/name when storage changes
  useEffect(() => {
    const onStorage = () => {
      setRole(localStorage.getItem("role"));
      setName(localStorage.getItem("name"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleTitleClick = () => {
    if (!role) return navigate("/");
    return navigate(role === "admin" ? "/admin" : "/student");
  };

  const logout = () => {
    localStorage.clear();
    // notify listeners
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 shadow-lg fixed w-full z-10">
      <img src="/logo.png" alt="Smart Attendance" className="h-11" />

      <h1
        className="text-2xl font-bold text-white cursor-pointer hover:text-gray-300"
        onClick={handleTitleClick}
      >
        Smart Attendance
      </h1>
      <div className="flex items-center space-x-4">
        {name && <span className="text-gray-200">Welcome, {name}</span>}
        {role && (
          <button
            onClick={logout}
            className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition text-sm text-white"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
