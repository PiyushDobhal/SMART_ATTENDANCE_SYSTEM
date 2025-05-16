# 📚 NoProxy: Smart Attendance System – Full Stack + Hardware Integration

---

## 🧠 Overview  
**NoProxy** is a Smart Attendance System that combines **face recognition** and **fingerprint authentication** to securely mark student attendance. It's a full-stack app powered by **React**, **Node.js**, **MongoDB**, and integrated with **Arduino Uno** and **ESP32-CAM** modules.

---

## 🌐 Tech Stack  
- 🔧 **Frontend:** React, Tailwind CSS, Axios, Chart.js  
- 🧠 **Backend:** Node.js, Express, MongoDB, Mongoose  
- 🤖 **Hardware:** Arduino Uno, ESP32-CAM, R307 Fingerprint Sensor, I²C 16×2 LCD  
- 🧠 **Face Recognition:** face-api.js (client-side model)

---

## 📸 System Architecture  
1. User registers via the frontend (uploads face & fingerprint).  
2. Arduino handles **R307 fingerprint sensor** & **LCD**.  
3. ESP32-CAM captures face and sends it to backend.  
4. If fingerprint is valid (face optional), attendance is marked.  
5. All data is synced to MongoDB and visualized in the dashboard.

---

## 📦 Features  
- 👤 Secure student registration with fingerprint + face  
- ✅ Real-time attendance marking with LCD feedback  
- 📊 Admin & student dashboards with charts, filters, and reports  
- 🔄 Serial communication between Arduino ↔ ESP32-CAM ↔ Backend  
- 🧾 Fingerprint mandatory, face optional

---

## 🖥️ Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
```

> Edit `.env` for frontend with backend API URL

---

## 🛠️ Backend Setup (Node.js + MongoDB)
```bash
cd backend
npm install
npm start
```

> Add `.env` file with:
```
MONGO_URI = your_mongo_db_url
PORT = 5000
```

---

## 🔌 Arduino & ESP32 Setup

### Arduino Uno Sketch  
- Handles R307 fingerprint sensor  
- Displays messages on I²C LCD (16×2)  
- Talks to ESP32-CAM over Serial

### ESP32-CAM Sketch  
- Captures and sends face image to backend  
- Talks to Arduino Uno for fingerprint validation

### Wiring Diagram (Placeholder)
📍*Refer to the project report for full schematic*  
```plaintext
ESP32‑CAM   <--->  Arduino Uno
GPIO1 (TX)  --->   D0
GPIO3 (RX)  <---   D1
GND         --->   GND
5V          --->   5V

Arduino Uno <---> R307 Fingerprint
D2 (RX)      <--- TX
D3 (TX)      ---> RX
5V, GND      ---> VCC, GND

Arduino Uno <---> 16×2 I²C LCD
A4 (SDA)     ---> SDA
A5 (SCL)     ---> SCL
5V, GND      ---> VCC, GND
```

---

## 🧪 Using the System
1. Register a student on the frontend  
2. Enroll fingerprint using LCD menu  
3. Upload face using camera in browser  
4. Place finger on R307; ESP32 captures face  
5. If fingerprint is valid → attendance marked  
6. Dashboard updates in real-time with records

---

## 📚 Libraries Used

### Backend  
- express  
- mongoose  
- cors  
- dotenv  

### Frontend  
- react  
- react-router-dom  
- axios  
- chart.js  
- tailwindcss  

### Arduino  
- Adafruit Fingerprint Sensor Library  
- LiquidCrystal_I2C  
- SoftwareSerial  

---

## ⚠️ Notes & Troubleshooting  
- Use a stable **5V 2A adapter** for reliable power  
- Ensure all GNDs are **common** (Arduino, ESP32, sensors, power supply)  
- Upload Arduino sketch via IDE; flash ESP32-CAM separately  
- Ensure correct COM ports are selected while uploading  
- ESP32 IP must match what frontend/backend expects

---

## 🧑‍💻 Developer Info  
👨‍💻 **Piyush Dobhal**  
🎓 B.Tech Electronics and Communication (Final Year)  
📍 Dehradun, Uttarakhand, India  
💻 [GitHub Repo](https://github.com/PiyushDobhal/SMART_ATTENDANCE_SYSTEM)  
🌐 [Live Site](https://smart-attendance-system-l486.onrender.com)

---

## 💡 Future Improvements  
- OTP-based fallback system  
- CSV export for attendance logs  
- Admin control for enrolling new hardware devices  
- Offline attendance sync buffer

---

## 📬 Feedback & Contributions  
Have ideas, suggestions, or bugs?  
Raise an issue or PR here — let’s build smarter together! 💪

---

> ⚡ Built with tech, love & sleepless nights ☕💻
