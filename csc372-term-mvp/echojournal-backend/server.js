"use strict";
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000; //To ensure it gets the port right, but I don't ever use this

app.use(cors());
app.use(express.json());

//Neon Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, },
});

// POST: Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    //Hash the password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    //Save the user to the database
    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );

    res.json({ message: 'User created successfully', user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Registration failed (username might be taken)' });
  }
});

// POST: Login user and provide token
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    //Find the user in the database
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = userResult.rows[0];

    //Checking the password 
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    //Generate the JWT 
    const token = jwt.sign(
      { userId: user.id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2h' } // Token expires in 2 hours
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  //Look for the token in the headers
  const authHeader = req.headers['authorization'];
  // The standard format is "Bearer <token>", so I have to split the string to get just the token
  const token = authHeader && authHeader.split(' ')[1]; 

  //If there is no token, reject the request
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  //Verify the token using the secret key in the .env file
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    
    req.user = user; 
    next(); 
  });
};

// GET Route: Retrieve ONLY the logged-in user's entries
app.get('/api/entries', authenticateToken, async (req, res) => { //Token is an argument matching user to thier entries
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST Route: Submit a new entry attached to the user
app.post('/api/entries', authenticateToken, async (req, res) => {
  try {
    const { album_title, artist, mood, reflection, album_art_url } = req.body;
    const userId = req.user.userId; //This grabs the ID from the token

    const newEntry = await pool.query(
      `INSERT INTO journal_entries 
      (album_title, artist, mood, reflection, album_art_url, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [album_title, artist, mood, reflection, album_art_url, userId]
    );
    res.json(newEntry.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT Route: Update an existing entry
app.put('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // The ID of the entry from the URL
    const { album_title, artist, mood, reflection, album_art_url } = req.body;
    const userId = req.user.userId; // The ID of the logged-in user

    //Updates only if the entry ID matches AND it belongs to the user
    const updateQuery = await pool.query(
      `UPDATE journal_entries 
       SET album_title = $1, artist = $2, mood = $3, reflection = $4, album_art_url = $5 
       WHERE id = $6 AND user_id = $7 
       RETURNING *`,
      [album_title, artist, mood, reflection, album_art_url, id, userId]
    );

    if (updateQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found or unauthorized' });
    }

    res.json(updateQuery.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE Route: Remove an entry
app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    //Deletes only if the entry ID matches AND it belongs to the user
    const deleteQuery = await pool.query(
      'DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (deleteQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found or unauthorized' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET Route: Search Spotify for albums
app.get('/api/spotify/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No search query provided' });

  try {
    //Get access token from Spotify
    const authString = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    //Use the token to search the Spotify catalog
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=5`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const searchData = await searchResponse.json();
    
    res.json(searchData.albums.items);

  } catch (error) {
    console.error('Spotify API Error:', error);
    res.status(500).json({ error: 'Failed to fetch from Spotify' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});