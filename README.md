# csc372-term
Full Stack Term Project

**MVP Demo:**
[Minimum Viable Product Demonstration Video Link](https://uncg-my.sharepoint.com/:v:/g/personal/jxpickett_uncg_edu/IQCiTfqlHNCJSbqtgn-nTPfTATptfCMT-uzeCGXLOtCKPjc?e=n4pVFI)

**Deployed URL:**
[Deployed Application External URL](https://csc372-term.onrender.com)

**Reflection:**
[Reflection Write-up Link](https://docs.google.com/document/d/1NQ3CUicUF6qYlDGZyQy5P87r218qUshHPKnVZ0gIt74/edit?usp=sharing)

# EchoJournal - Local Setup Guide

This guide provides step-by-step instructions to set up the EchoJournal full-stack application (React, Node.js/Express, PostgreSQL) on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed and set up:
1. **Node.js** (v18 or higher recommended)
2. **npm** (comes with Node.js)
3. **A PostgreSQL Database** (A free [Neon.tech](https://neon.tech/) serverless database is recommended)
4. **Spotify Developer Account** (for API credentials)

---

## 1. Database Setup (PostgreSQL / Neon)

1. Create a new project in your Neon dashboard (or your local PostgreSQL instance).
2. Open the SQL Editor and run the following commands to create the required tables:

```sql
-- Create the users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the journal entries table
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    album_title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    mood VARCHAR(50),
    reflection TEXT NOT NULL,
    album_art_url VARCHAR(500),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Backend Setup (Node.js & Express)
Create a folder for your backend and navigate into it:

```Bash
mkdir echojournal-backend
cd echojournal-backend
```

Initialize a new Node project and install dependencies:

```Bash
npm init -y
npm install express pg cors dotenv bcrypt jsonwebtoken
```

Create a .env file in the root of your backend folder. Do NOT commit this file to version control (create a .gitignore file and add .env to it).

```
PORT=3000
DATABASE_URL=your_neon_connection_string_here?sslmode=require
JWT_SECRET=create_a_super_secret_string_here
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

Create server.js and paste in the Express server code.

Start the backend server:

```Bash
node server.js
```

You should see "Server running on http://localhost:3000".


## 3. Frontend Setup (React & Vite)
Open a new terminal window (keep the backend running).

Navigate to your main project directory (outside the backend folder) and create the React app using Vite:

```Bash
npm create vite@latest echojournal-frontend -- --template react
```

Navigate into the new frontend folder and install dependencies:

```Bash
cd echojournal-frontend
npm install
```


Start the frontend development server:

```Bash
npm run dev
```

Vite will provide a local URL (usually http://localhost:5173). Open this in your browser.

## 4. Spotify API Credentials
To enable the album search functionality:

Go to the Spotify Developer Dashboard.

Create a new App named EchoJournal.

Set the Redirect URI to http://127.0.0.1:3000 (Spotify requires this format, but it means the same as localhost:3000).

Copy your Client ID and Client Secret and paste them into your backend .env file.

Restart your backend server (Ctrl+C then node server.js) so it can load the new environment variables.