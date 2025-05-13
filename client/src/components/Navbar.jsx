import React, { useEffect, useState } from "react";
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
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 flex items-center px-4 bg-gray-800 shadow-lg z-50">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Smart Attendance"
        className="h-8 w-8 mr-2 flex-shrink-0"
      />

      {/* Title */}
      <h1
        className="text-2xl font-bold text-white cursor-pointer hover:text-gray-300 ml-1 flex-shrink-0"
        onClick={handleTitleClick}
      >
        Smart Attendance
      </h1>

      {/* Spacer pushes the next group to the right */}
      <div className="flex-1" />

      <div className="flex items-center space-x-2">
        {/* On very small screens, hide or truncate the name */}
        {name && (
          <span className="text-gray-200 max-w-xs truncate hidden sm:block">
            Welcome, {name}
          </span>
        )}

        {/* Logout always shows and never shrinks */}
        {role && (
          <button
            onClick={logout}
            className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition text-sm text-white flex-shrink-0"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
