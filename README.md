# Rozadaar - Ramadan & Prayer Times App

A comprehensive PWA (Progressive Web App) for tracking Ramadan timings, Sehri/Iftar alerts, and location-based prayer schedules.

![Rozadaar App Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## Features

- **Location Based Timings:** Accurate Sehri & Iftar times for multiple locations.
- **Smart Alerts:** Customizable pre-alerts (10min, 30min, 1hr) before Sehri/Iftar.
- **Audio Duas:** Listen to essential Ramadan duas.
- **Admin Panel:**
  1.  **Local Admin:** Update timings directly on the device.
  2.  **Global Admin (MongoDB):** syncing data across all users via cloud.
- **Analytics:** Tracks user installs, daily hits, and unique visitors.
- **PWA Support:** Installable on Android, iOS, and Windows.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js (Local), Vercel Serverless Functions (Cloud)
- **Database:** MongoDB (Mongoose)

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Start-Up-Software-House/Sunwarian-AntiGravity.git
    cd Sunwarian-AntiGravity
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env.local` file in the root directory:
    ```env
    MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/namaz_timing
    ```

4.  **Run Locally:**
    ```bash
    npm run dev  # Frontend
    node server.js # Backend (Optional: for local analytics/db testing)
    ```

## Deployment

This project is optimized for **Vercel**.
- The `api/` directory handles serverless functions automatically.
- Push to `main` branch to trigger deployment.

## Admin Access

- **Local Admin:** accessible via Settings -> Local Admin.
- **Global Admin:** accessible via route `/admin/ahsaan`.

---
*Developed by Nehmat Ullah Khan*
