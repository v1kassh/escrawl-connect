# Startup Guide

Follow these steps to get Escrawl Secure Connect running.

## Prerequisites
1. **MongoDB**: Ensure MongoDB is installed and running locally on port 27017.
   - Or update `server/.env` with your MongoDB URI.

## First Time Setup

1. **Install Dependencies**
   - Open a terminal for the server:
     ```bash
     cd server
     npm install
     ```
   - Open a separate terminal for the client:
     ```bash
     cd client
     npm install
     ```

2. **Create Admin User**
   - In the server terminal:
     ```bash
     node create_admin.js
     ```
     This will create a user `admin` with password `password123`.

## Running the Application

1. **Start Backend Server**
   - In the server terminal:
     ```bash
     node index.js
     ```
   - Server will start on `http://localhost:5000`.

2. **Start Frontend Client**
   - In the client terminal:
     ```bash
     npm run dev
     ```
   - Client will be available at `http://localhost:5173`.

## Accessing the App
- Open `http://localhost:5173` in your browser.
- Log in with `admin` / `password123`.
- Explore the Dashboard, Chat, and Video features!
