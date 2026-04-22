require('dotenv').config(); // Loads the environment variables
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database configuration for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, },
});

// GET Route: Fetch all journal entries
app.get('/api/entries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM journal_entries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST Route: Submit a new journal entry
app.post('/api/entries', async (req, res) => {
  try {
    const { album_title, artist, mood, reflection } = req.body;
    const newEntry = await pool.query(
      'INSERT INTO journal_entries (album_title, artist, mood, reflection) VALUES ($1, $2, $3, $4) RETURNING *',
      [album_title, artist, mood, reflection]
    );
    res.json(newEntry.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});