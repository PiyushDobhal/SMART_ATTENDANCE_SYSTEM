## Overview
This project is a Smart Attendance System integrating hardware and software to mark attendance using fingerprint and optional face recognition.

It consists of:  
- Frontend: React app for user/admin dashboards  
- Backend: Node.js + Express API with MongoDB database  
- Hardware: ESP32-CAM & Arduino Uno with Fingerprint Sensor and I2C LCD  

## Features
- User registration with face and fingerprint data  
- Attendance marking via fingerprint and face (both mandatory)  
- Real-time syncing of attendance records to the dashboard  
- Admin dashboard to manage users and view reports  
- Student dashboard to view attendance history  

## Setup Instructions

### Backend  
1. Clone repo  
2. `cd backend`  
3. Run `npm install`  
4. Configure `.env` with MongoDB URI and server port  
5. Run `npm start`  

### Frontend  
1. `cd frontend`  
2. Run `npm install`  
3. Run `npm start`  

### Hardware  
- Upload Arduino sketch to Arduino Uno  
- Flash ESP32-CAM with ESP32 sketch  
- Connect hardware as per wiring diagram  

## Usage  
- Register users via frontend (face and fingerprint)  
- Mark attendance using fingerprint sensor and optional face recognition  
- View attendance reports on dashboards  

## Technologies  
- React, Tailwind CSS  
- Node.js, Express, MongoDB  
- ESP32-CAM, Arduino Uno, R307 Fingerprint Sensor, 16x2 I2C LCD  

## License  
MIT License  

