# Escrawl Secure Connect

A fully secure, self-hosted communication platform with real-time chat, file sharing, and video meetings.

## Requirements
- Node.js (v18+)
- MongoDB (running locally or remotely)

## Getting Started

### 1. Requirements Setup
Ensure you have MongoDB installed and running. If you don't have it, you can run it via Docker:
```bash
docker run -d -p 27017:27017 mongo
```

### 2. Backend Setup
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```
Start the server:
```bash
node index.js
```
The server runs on `http://localhost:5000`.

### 3. Frontend Setup
Navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```
Start the development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

## Features
- **Secure Login**: Authentication with bcrypt and JWT.
- **Real-time Chat**: Connects via Socket.io for instant messaging.
- **Video Calls**: P2P video calls using WebRTC.
- **Admin Panel**: Manage users and permissions.
- **File Sharing**: Upload and download files securely within chat.

## Configuration
- Modify server configuration in `server/.env`.
- Modify client configuration in `client/src/App.jsx` or environment variables if needed.

## Technologies
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB
