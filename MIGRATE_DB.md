
# 📦 Detailed Migration Guide: Local MongoDB to Mongo Atlas

This guide elaborates on every single click required to move your data from your local computer to the cloud so your deployed website can access it.

---

## Part 1: Set Up MongoDB Atlas (The Cloud Database)

1.  **Sign Up & Create Cluster**
    -   Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
    -   Create an account or sign in with Google.
    -   You will be asked to "Deploy a database".
    -   Select the **M0 (Free)** option. This is free forever.
    -   **Provider & Region:** Choose AWS and a region close to you (e.g., N. Virginia or Mumbai).
    -   Click the green **Create** button at the bottom.
    -   *Wait 1-3 minutes for the cluster to be provisioned.*

2.  **Create a Database User** (Critical Step!)
    -   On the "Security Quickstart" screen (or "Database Access" in sidebar):
    -   **Username:** `admin` (or whatever you prefer).
    -   **Password:** Create a strong password (avoid special characters like `@` or `:` if possible to prevent URL encoding issues later, or just be careful).
    -   **IMPORTANT:** Write this password down. You cannot see it again.
    -   Click **Create User**.

3.  **Allow Network Access** (Critical Step!)
    -   Go to **Network Access** in the left sidebar.
    -   Click **+ Add IP Address**.
    -   Select **Allow Access from Anywhere** (This adds `0.0.0.0/0`).
    -   *Why?* Because Render/Netlify servers change IPs dynamically. You need to allow *any* IP to connect.
    -   Click **Confirm**.

4.  **Get Configuration String**
    -   Go to **Database** (left sidebar).
    -   Click the **Connect** button on your Cluster card.
    -   Click **Drivers** (Node.js, Go, Python, etc.).
    -   Ensure **Node.js** is selected.
    -   Copy the connection string. It passes in your username but hides the password.
    -   It looks like: `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
    -   **Paste this into Notepad** and replace `<password>` with the actual password you created in Step 2.

---

## Part 2: Export Local Data (Using MongoDB Compass)

1.  Open **MongoDB Compass** on your computer.
2.  **Connect to Localhost:**
    -   If not already connected, use URI: `mongodb://localhost:27017` and click Connect.
3.  **Find Your Database:**
    -   In the left sidebar, find `escrawl_connect`. Click it.
4.  **Export Collections:**
    You need to do this for **EACH** collection (`users`, `messages`, `channels`):
    -   Click on the collection name (e.g., `users`).
    -   In the top menu bar (above the data table), look for the **Export Data** button (usually an icon with an arrow pointing out of a box, or text "Export").
    -   **Select Export Source:** Choose "Export the full collection".
    -   **Select Fields:** Leave "Select all fields" checked.
    -   **Select Output:** Choose **JSON**.
    -   Click **Export**.
    -   Save the file as `users.json` on your Desktop.
    -   **Repeat** for `messages` -> `messages.json`.
    -   **Repeat** for `channels` -> `channels.json`.

---

## Part 3: Import Data to Cloud (Using MongoDB Compass)

1.  **Connect Compass to Atlas:**
    -   In Compass, click the **Connect** button (top left) -> **New Connection**.
    -   Paste the **Atlas Connection String** you prepared in "Part 1, Step 4" (the one with your real password).
    -   Click **Connect**. (If it fails, check your password and Network Access IP whitelist).
2.  **Create Database:**
    -   Once connected, you will likely see `admin` and `local` databases.
    -   Click the **+** button next to "Databases" (or "Create Database").
    -   **Name:** `escrawl_connect` (Must match what your code expects).
    -   **Collection Name:** `users` (Create the first one).
    -   Click **Create Database**.
3.  **Import Data:**
    -   Click on your new `escrawl_connect` database.
    -   Click on the `users` collection.
    -   Click the **Add Data** button (green button or import icon) -> select **Import JSON or CSV file**.
    -   Browse and select the `users.json` file from your Desktop.
    -   Click **Import**.
    -   **Repeat:**
        -   Click the `+` next to Collections to create `messages`.
        -   Import `messages.json`.
        -   Click the `+` to create `channels`.
        -   Import `channels.json`.

---

## Part 4: Final Connection

1.  **Update Render:**
    -   Go to your Render Dashboard.
    -   Update the `MONGO_URI` environment variable with your Atlas Connection String.
    -   Render will restart your server.
2.  **Verify:**
    -   Open your deployed website.
    -   Try to log in with a user that existed locally. It should work!
