import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    album_title: '',
    artist: '',
    mood: '',
    reflection: ''
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/entries');
      
      // Check if the backend sent a successful status code
      if (!response.ok) {
        throw new Error(`Backend returned status: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure the data is actually an array before saving it to state
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        console.error("Expected an array from database, but got:", data);
        setEntries([]); // Fallback to an empty array to prevent crashes
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]); // Fallback to an empty array
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setFormData({ album_title: '', artist: '', mood: '', reflection: '' });
        fetchEntries();
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>EchoJournal</h1>
        <p>Track your musical evolution.</p>
      </header>

      <main className="main-content">
        <section className="form-section">
          <h2>Log a New Listen</h2>
          <form onSubmit={handleSubmit} className="journal-form">
            <input
              type="text"
              name="album_title"
              placeholder="Album Title"
              value={formData.album_title}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="artist"
              placeholder="Artist"
              value={formData.artist}
              onChange={handleInputChange}
              required
            />
            <select name="mood" value={formData.mood} onChange={handleInputChange} required>
              <option value="" disabled>Select Mood</option>
              <option value="Joyful">Joyful</option>
              <option value="Melancholic">Melancholic</option>
              <option value="Energetic">Energetic</option>
              <option value="Relaxed">Relaxed</option>
              <option value="Nostalgic">Nostalgic</option>
            </select>
            <textarea
              name="reflection"
              placeholder="How did this music make you feel?"
              value={formData.reflection}
              onChange={handleInputChange}
              rows="4"
              required
            />
            <button type="submit">Save Entry</button>
          </form>
        </section>

        <section className="entries-section">
          <h2>Recent Journals</h2>
          <div className="entries-grid">
            {entries.length === 0 ? (
              <p>No entries yet. Start listening!</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <h3>{entry.album_title}</h3>
                  <p className="artist-name">by {entry.artist}</p>
                  <span className="mood-tag">{entry.mood}</span>
                  <p className="reflection-text">{entry.reflection}</p>
                  <small className="date-text">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;