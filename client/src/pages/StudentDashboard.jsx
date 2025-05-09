import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const StudentDashboard = ({ socket }) => {
  const [profile, setProfile] = useState({
    name: "",
    sapId: "",
    faceDescriptor: [],
  });
  const [form, setForm] = useState({ name: "", sapId: "" });
  const [records, setRecords] = useState([]);
  const [needsFaceRegister, setNeedsFaceRegister] = useState(false);

  // Fetch student's profile (including faceDescriptor) and attendance
  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/students/profile");
      const { name, sapId, faceDescriptor = [] } = res.data;
      setProfile({ name, sapId, faceDescriptor });
      setForm({ name, sapId });
      localStorage.setItem("name", name);
      setNeedsFaceRegister(faceDescriptor.length === 0);
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get("/api/students/attendance");
      const data = res.data.map((r) => ({
        date: r.date,
        count: r.status === "present" ? 1 : 0,
        status: r.status,
      }));
      setRecords(data);
    } catch (err) {
      toast.error("Failed to load attendance");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/api/students/profile", form);
      localStorage.setItem("name", form.name);
      toast.success("Profile updated successfully");
      window.dispatchEvent(new Event("storage"));
      window.location.reload();
    } catch {
      toast.error("Failed to update profile");
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAttendance();
    if (socket) {
      socket.on("attendance-updated", fetchAttendance);
      return () => socket.off("attendance-updated", fetchAttendance);
    }
  }, [socket]);

  // Prepare attendance summary for chart
  const presentCount = records.filter((d) => d.status === "present").length;
  const absentCount = records.filter((d) => d.status === "absent").length;
  const chartData = [
    { name: "Present", count: presentCount },
    { name: "Absent", count: absentCount },
  ];

  return (
    <main className="pt-16 p-6">
      {/* Face Registration Prompt */}
      {needsFaceRegister && (
        <div className="mb-6">
          <Link
            to="/student/register-face"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            Register Your Face
          </Link>
        </div>
      )}

      {/* Profile Section */}
      <h2 className="text-2xl mb-4">My Profile</h2>
      <form
        onSubmit={handleProfileSubmit}
        className="bg-gray-800 p-4 rounded mb-6"
      >
        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full p-2 bg-gray-700 rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">SAP ID</label>
          <input
            type="text"
            value={form.sapId}
            onChange={(e) => setForm({ ...form, sapId: e.target.value })}
            required
            className="w-full p-2 bg-gray-700 rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition text-white"
        >
          Save Profile
        </button>
      </form>

      {/* Attendance Chart */}
      <h2 className="text-2xl mb-4">My Attendance</h2>
      <div className="w-full h-64 mb-6">
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value) => [value, "Count"]} />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Raw Records */}
      <h2 className="text-lg font-semibold">Records:</h2>
      <ul className="list-disc ml-6 mt-2 space-y-1">
        {records.map((r, i) => (
          <li key={i}>
            {r.date}: {r.status}
          </li>
        ))}
      </ul>
    </main>
  );
};

export default StudentDashboard;
