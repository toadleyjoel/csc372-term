import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || null);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [formData, setFormData] = useState({
    album_title: '',
    artist: '',
    mood: '',
    reflection: '',
    album_art_url: '' 
  });

  useEffect(() => {
    if (token) {
      fetchEntries();
    }
  }, [token]); // This tells React to run the effect whenever whoever is logged in changes

  const fetchEntries = async () => {
    if (!token) return; // Don't try to fetch if not logged in

    try {
      const response = await fetch('http://localhost:3000/api/entries', {
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]); 
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    try {
      const response = await fetch(`http://localhost:3000/api/spotify/search?q=${searchQuery}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching Spotify:', error);
    }
  };

 const handleSelectAlbum = (album) => {
  //Spotify stores the image sizes in an array of [large, medium, small]
    const imageUrl = album?.images?.[1]?.url || '';

    setFormData({
      ...formData,
      album_title: album?.name || '',
      artist: album?.artists?.[0]?.name || '',
      album_art_url: imageUrl // Save the image URL to state!
    });
    setSearchResults([]); 
    setSearchQuery(''); 
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const method = editingId ? 'PUT' : 'POST'; //This line picks the method and URL if there is an editing ID, it's a PUT to update, if not it's a POST to create
    const endpoint = editingId ? `/api/entries/${editingId}` : '/api/entries';

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        // Reset the form completely
        setFormData({ album_title: '', artist: '', mood: '', reflection: '', album_art_url: '' });
        setEditingId(null); 
        fetchEntries(); // Refresh the list to show the new/updated data
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`http://localhost:3000/api/entries/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Filter out the deleted entry from React state immediately 
        // so the user doesn't have to wait for a page reload
        setEntries(entries.filter(entry => entry.id !== entryId));
      } else {
        console.error("Failed to delete");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleEditClick = (entry) => {
    setFormData({
      album_title: entry.album_title,
      artist: entry.artist,
      mood: entry.mood,
      reflection: entry.reflection,
      album_art_url: entry.album_art_url || ''
    });
    //Sets the editing ID and now the submit function knows it's an update not a new entry
    setEditingId(entry.id); 
    
    //Purely aesthetic, scrolls back to the top where the form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthChange = (e) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLoginMode) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username);
          setToken(data.token);
          setCurrentUser(data.username);
        } else {
          alert("Registration successful! Please log in.");
          setIsLoginMode(true);
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setCurrentUser(null);
  };

  //Rendering
  //If there is no one logged in, show only the login screen
  if (!token) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>{isLoginMode ? 'Welcome Back' : 'Create an Account'}</h2>
        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
          <input type="text" name="username" placeholder="Username" value={authForm.username} onChange={handleAuthChange} required />
          <input type="password" name="password" placeholder="Password" value={authForm.password} onChange={handleAuthChange} required />
          <button type="submit">{isLoginMode ? 'Login' : 'Register'}</button>
        </form>
        <button onClick={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: '20px', background: 'none', color: '#3498db' }}>
          {isLoginMode ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </div>
    );
  }

  return (

    <div className="app-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>EchoJournal</h1>
          <p>Track your musical evolution.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ marginBottom: '10px' }}>Logged in as <strong>{currentUser}</strong></p>
          <button onClick={handleLogout} style={{ backgroundColor: '#e74c3c', padding: '8px 16px' }}>Logout</button>
        </div>
      </header>

      <main className="main-content">
        <section className="form-section">
          <h2>{editingId ? 'Edit Your Journal' : 'Log a New Listen'}</h2>

          {/*SPOTIFY SEARCH BAR*/}
          <div className="spotify-search">
            <form onSubmit={handleSearch} style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              <input 
                type="text" 
                placeholder="Search Spotify for an album..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>

            {searchResults.length > 0 && (
              <ul style={{listStyle: 'none', padding: 0, marginBottom: '20px', border: '1px solid #ccc'}}>
                {searchResults.map(album => (
                  <li 
                    key={album.id} 
                    onClick={() => handleSelectAlbum(album)}
                    style={{padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px'}}
                  >
                    {album.images[2] && <img src={album.images[2].url} alt="cover" width="40" />}
                    <span><strong>{album.name}</strong> by {album.artists[0].name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1 }}>
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              
              {/* Add a cancel button if they change their mind mid-edit */}
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ album_title: '', artist: '', mood: '', reflection: '', album_art_url: '' });
                  }}
                  style={{ backgroundColor: '#95a5a6' }}
                >
                  Cancel
                </button>
              )}
            </div>
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
                {entry.album_art_url && (
                    <img 
                      src={entry.album_art_url} 
                      alt={`Cover for ${entry.album_title}`} 
                      style={{ width: '100%', borderRadius: '4px', marginBottom: '15px', objectFit: 'cover' }}
                    />
                  )}
                  <h3>{entry.album_title}</h3>
                  <p className="artist-name">by {entry.artist}</p>
                  <span className="mood-tag">{entry.mood}</span>
                  <p className="reflection-text">{entry.reflection}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <small className="date-text">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </small>
                    <div>
                      <button 
                        onClick={() => handleEditClick(entry)} 
                        style={{ background: 'none', color: '#f39c12', padding: '5px', fontSize: '0.9rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id)} 
                        style={{ background: 'none', color: '#e74c3c', padding: '5px', fontSize: '0.9rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
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