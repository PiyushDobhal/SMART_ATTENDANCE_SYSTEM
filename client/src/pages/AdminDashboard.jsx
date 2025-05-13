import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";

const COLORS = ["#00C49F", "#FF8042"];

export default function AdminDashboard({ socket }) {
  const [stats, setStats] = useState({ present: 0, absent: 0 });
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", sapId: "" });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [individualStats, setIndividualStats] = useState(null);
  const attendanceRef = useRef(null);

  // Scroll into view when individualStats changes
  useEffect(() => {
    if (individualStats && attendanceRef.current) {
      attendanceRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [individualStats]);

  // fetch overall summary and students
  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/admin/attendance");
      setStats(res.data.stats);
      const sorted = res.data.students.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
      setStudents(sorted);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load summary");
    }
  };

  useEffect(() => {
    fetchSummary();
    if (socket) {
      socket.on("attendance-updated", fetchSummary);
      return () => socket.off("attendance-updated", fetchSummary);
    }
  }, [socket]);

  // view individual student summary
  const handleView = async (stu) => {
    try {
      const res = await api.get(
        `/api/admin/students/${stu._id}/attendance-summary`
      );
      setIndividualStats(res.data);
      setSelectedStudent(stu);
    } catch {
      toast.error("Failed to fetch student summary");
    }
  };

  // delete student
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/api/admin/students/${id}`);
      toast.success("Student deleted");
      if (selectedStudent && selectedStudent._id === id) {
        setSelectedStudent(null);
        setIndividualStats(null);
      }
      fetchSummary();
    } catch {
      toast.error("Delete failed");
    }
  };

  // add student
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/students", newStudent);
      toast.success("Student added");
      setShowForm(false);
      setNewStudent({ name: "", sapId: "" });
      fetchSummary();
    } catch {
      toast.error("Add failed");
    }
  };

  // download CSV
  const downloadCSV = () => {
    if (!students.length) return toast.info("No students to download");
    const header = ["S.NO", "Name", "SAP ID", "Email"];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.name || "",
      s.sapId || "",
      s.email,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pieData = [
    { name: "Present", value: stats.present },
    { name: "Absent", value: stats.absent },
  ];

  return (
    <div className="p-6 pt-20">
      <h1 className="text-2xl mb-4">Attendance Overview</h1>

      {/* overall pie */}
      <div className="w-full h-64 mb-8">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={COLORS[idx]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* controls row */}
      <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <h2 className="text-lg font-semibold whitespace-nowrap">
          Registered&nbsp;Students
        </h2>
        <div className="flex gap-2 ml-auto">
          {/* add / cancel */}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs sm:text-sm whitespace-nowrap"
          >
            {showForm ? "Cancel" : "Add Student"}
          </button>
          {/* download CSV */}
          <button
            onClick={downloadCSV}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs sm:text-sm whitespace-nowrap"
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-gray-800 p-4 rounded mb-6 space-y-4"
        >
          <div>
            <label className="block mb-1">Name</label>
            <input
              type="text"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
              required
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>
          <div>
            <label className="block mb-1">SAP ID</label>
            <input
              type="text"
              value={newStudent.sapId}
              onChange={(e) =>
                setNewStudent({ ...newStudent, sapId: e.target.value })
              }
              required
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Create Student
          </button>
        </form>
      )}

      {/* student table */}
      <table className="w-full table-auto border-collapse bg-gray-800 rounded">
        <thead>
          <tr className="bg-gray-700">
            <th className="py-2 px-4 text-left">S.NO</th>
            <th className="py-2 px-4 text-left">Name</th>
            <th className="py-2 px-4 text-left">SAP ID</th>
            <th className="py-2 px-4 text-left">Email</th>
            <th className="py-2 px-4 text-left">Actions</th>
            <th className="py-2 px-4 text-left">View</th>
          </tr>
        </thead>
        <tbody>
          {students.map((stu, idx) => (
            <tr key={stu._id} className="border-b border-gray-700">
              <td className="py-2 px-4">{idx + 1}</td>
              <td className="py-2 px-4">{stu.name || "–"}</td>
              <td className="py-2 px-4">{stu.sapId || "–"}</td>
              <td className="py-2 px-4">{stu.email}</td>
              <td className="py-2 px-4">
                <button
                  onClick={() => handleDelete(stu._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </td>
              <td className="py-2 px-4">
                <button
                  onClick={() => handleView(stu)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* individual piecard */}
      {selectedStudent && individualStats && (
        <div ref={attendanceRef} className="mt-8 bg-gray-800 p-6 rounded">
          <h3 className="text-xl mb-4">
            {selectedStudent.name || selectedStudent.email}’s Attendance
          </h3>
          <div className="w-full h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: "Present", value: individualStats.present },
                    { name: "Absent", value: individualStats.absent },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  <Cell fill={COLORS[0]} />
                  <Cell fill={COLORS[1]} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
