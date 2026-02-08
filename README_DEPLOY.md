# Deployment Guide for Escrawl Connect

This guide covers how to deploy the **Client (Frontend)** to Netlify and the **Server (Backend)** to Render.

## Prerequisites

1.  **Git & GitHub:**
    -   Initialize a git repository if you haven't:
        ```bash
        git init
        git add .
        git commit -m "Initial commit for deployment"
        ```
    -   Create a new repository on GitHub.
    -   Push your code:
        ```bash
        git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
        git branch -M main
        git push -u origin main
        ```
2.  Sign up for [Netlify](https://www.netlify.com/) and [Render](https://render.com/).

---

## 1. Deploying the Backend (Render)

1.  Log in to your **Render Dashboard**.
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  **Configure the Service:**
    -   **Name:** `escrawl-server` (or similar)
    -   **Root Directory:** `server` (Important!)
    -   **Runtime:** `Node`
    -   **Build Command:** `npm install`
    -   **Start Command:** `node index.js`
5.  **Environment Variables (Advanced):**
    Add the following variables in the "Environment" tab:
    -   `MONGO_URI`: Your MongoDB Connection String.
    -   `JWT_SECRET`: A strong secret key for authentication.
    -   `EMAIL_USER`: Your email address (for OTPs).
    -   `EMAIL_PASS`: Your email app password.
    -   `PORT`: `10000` (Render sets this automatically, but good to know).

6.  Click **Create Web Service**.
7.  Wait for the deployment to finish. **Copy the URL** of your new service (e.g., `https://escrawl-server.onrender.com`).

---

## 2. Deploying the Frontend (Netlify)

1.  Log in to your **Netlify Dashboard**.
2.  Click **Add new site** -> **Import from Git**.
3.  Connect your GitHub repository.
4.  **Configure the Build:**
    -   **Base directory:** `client` (Important!)
    -   **Build command:** `npm run build`
    -   **Publish directory:** `dist`
5.  **Environment Variables:**
    Click on **Show advanced** or go to **Site configuration > Environment variables** after creation.
    Add the following variable:
    -   `VITE_API_URL`: The URL of your Render backend (e.g., `https://escrawl-server.onrender.com`).
    
    *Note: Do NOT include a trailing slash (e.g., use `...onrender.com`, not `...onrender.com/`).*

6.  Click **Deploy site**.

---

## Troubleshooting

-   **CORS Issues:** If the frontend cannot talk to the backend, ensure your Backend `server/index.js` allows the Netlify domain in CORS settings (currently set to `*` which allows all).
-   **Socket Connection:** Ensure `VITE_API_URL` is correct. The frontend replaces `localhost:5000` with this value.
-   **White Screen on Frontend:** Check the Netlify logs. Ensure `netlify.toml` is present in the `client` folder to handle redirects.

## Local Development

To run locally:
1.  **Server:**
    ```bash
    cd server
    npm install
    npm run dev
    ```
2.  **Client:**
    ```bash
    cd client
    npm install
    # Create .env file in client: VITE_API_URL=http://localhost:5000
    npm run dev
    ```
