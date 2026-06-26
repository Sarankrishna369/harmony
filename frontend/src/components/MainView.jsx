import React, { useState, useEffect } from 'react';
import { Search, Play, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './MainView.css';

const MainView = ({ currentView, setCurrentView, onPlayTrack, recentlyPlayed, likedSongs, playlists, createPlaylist, selectedPlaylist, setSelectedPlaylist, showLyrics, setShowLyrics, lyrics, showQueue, setShowQueue, queue, removeFromQueue, addToQueue }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [homeRows, setHomeRows] = useState({ 
    speedDial: [], 
    quickPicks: [], 
    covers: [], 
    dancing: [], 
    melMalayalam: [], 
    romMalayalam: [], 
    arRahman: [], 
    trending: [],
    personalized: [],
    malTrending: [],
    topArtist: ''
  });

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        let topArtistsQuery = "";
        let displayArtist = "";
        if (recentlyPlayed && recentlyPlayed.length > 0) {
          const artists = recentlyPlayed.slice(0, 5).map(t => t.artists.split(',')[0].trim());
          const uniqueArtists = [...new Set(artists)].slice(0, 2);
          if (uniqueArtists.length > 0) {
            topArtistsQuery = uniqueArtists.join(' ');
            displayArtist = uniqueArtists[0];
          }
        }
        
        const [speedDial, quickPicks, covers, dancing, melMalayalam, romMalayalam, arRahman, trending, hindi, personalized, malTrending] = await Promise.all([
          fetch(`${API_BASE_URL}/api/search?q=Top Hits 2024`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=Best recent hits hindi malayalam tamil english`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=Latest fresh acoustic covers and lofi remixes`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=Latest upbeat dance party hits`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=Malayalam Melodies`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=Malayalam Romantic Songs`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=A.R. Rahman Tamil Hits`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/latest`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/search?q=Top Hindi Songs 2024`).then(r => r.json()),
          topArtistsQuery ? fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(topArtistsQuery + ' mix')}`).then(r => r.json()) : Promise.resolve({results: []}),
          fetch(`${API_BASE_URL}/api/search?q=Malayalam famous trending songs`).then(r => r.json())
        ]);

        const getSlice = (arr, start, end) => (arr && arr.results) ? arr.results.slice(start, end) : [];

        // Explicitly guarantee Hindi, Malayalam, and Tamil are mixed into Quick Picks and Dancing
        let qpMixed = [...(quickPicks.results || []), ...getSlice(hindi, 0, 4), ...getSlice(melMalayalam, 0, 4), ...getSlice(arRahman, 0, 4)];
        let danceMixed = [...(dancing.results || []), ...getSlice(hindi, 4, 8), ...getSlice(romMalayalam, 0, 4), ...getSlice(arRahman, 4, 8)];

        // Speed Dial = recentlyPlayed + Top Hits
        const recentTrackIds = new Set(recentlyPlayed.map(t => t.videoId));
        let speedDialMix = [...recentlyPlayed];
        if (speedDial.results) {
          for (const t of speedDial.results) {
            if (!recentTrackIds.has(t.videoId)) {
              speedDialMix.push(t);
            }
          }
        }

        // Filter the personalized row so it isn't just flooded with the same artist
        let personalizedMix = [];
        let artistCount = 0;
        if (personalized && personalized.results) {
          for (let t of personalized.results) {
            const isMainArtist = displayArtist && t.artists.toLowerCase().includes(displayArtist.toLowerCase());
            if (isMainArtist) {
              artistCount++;
              if (artistCount <= 1) { // Only allow max 1 song by the seed artist
                personalizedMix.push(t);
              }
            } else {
              personalizedMix.push(t);
            }
          }
        }

        const shuffle = (array) => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        setHomeRows({
          speedDial: speedDialMix.slice(0, 9),
          quickPicks: shuffle(qpMixed),
          covers: shuffle(covers.results || []),
          dancing: shuffle(danceMixed),
          melMalayalam: shuffle(melMalayalam.results || []),
          romMalayalam: shuffle(romMalayalam.results || []),
          arRahman: shuffle(arRahman.results || []),
          trending: shuffle(trending.results || []),
          personalized: shuffle(personalizedMix),
          malTrending: shuffle(malTrending.results || []),
          topArtist: displayArtist
        });
      } catch (e) {
        console.error("Failed to load home rows", e);
      }
    };
    fetchHomeData();
  }, []);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView !== 'search' || !query.trim()) {
      setLiveSearchResults([]);
      setShowDropdown(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setLiveSearchResults(data.results ? data.results.slice(0, 5) : []);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      }
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [query, currentView]);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowDropdown(false);
    performSearch(query);
  };

  const renderTrackRow = (title, subtitle, tracks) => {
    if (!tracks || tracks.length === 0) return null;
    return (
      <div className="home-row">
        <div className="section-header">
          {subtitle && <p className="subtitle">{subtitle}</p>}
          <h2>{title}</h2>
        </div>
        <div className="track-scroller">
          {tracks.map((track, i) => (
            <div className="track-card" key={`${track.videoId}-${i}`} onClick={() => onPlayTrack(track, tracks)}>
              <div className="cover-container">
                <img src={track.coverUrl} alt={track.title} />
                <button className="play-btn">
                  <Play size={24} fill="black" color="black" />
                </button>
              </div>
              <div className="track-info">
                <div className="title">{track.title}</div>
                <div className="artist">{track.artists}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSpeedDial = (title, subtitle, tracks) => {
    if (!tracks || tracks.length === 0) return null;
    return (
      <div className="home-row speed-dial-section">
        <div className="section-header">
          {subtitle && <p className="subtitle">{subtitle}</p>}
          <h2>{title}</h2>
        </div>
        <div className="speed-dial-grid">
          {tracks.map((track, i) => (
            <div className="speed-dial-card" key={`speed-${track.videoId}-${i}`} onClick={() => onPlayTrack(track, homeRows.speedDial)}>
              <img src={track.coverUrl} alt={track.title} />
              <div className="speed-dial-info">
                <div className="title">{track.title}</div>
                <div className="artist">{track.artists}</div>
              </div>
              <button className="play-btn-small">
                <Play size={16} fill="black" color="black" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPlaylistBanner = (id, title, tracks) => {
    if (!tracks || tracks.length === 0) return null;
    const coverUrl = tracks[0].coverUrl;
    
    const openPlaylist = () => {
      setSelectedPlaylist({
        id: id,
        name: title,
        tracks: tracks,
        isCurated: true
      });
      setCurrentView('playlist');
    };

    return (
      <div className="playlist-banner-card" onClick={openPlaylist} style={{ backgroundImage: `url(${coverUrl})` }}>
        <div className="banner-overlay">
          <h3>{title}</h3>
          <p>{tracks.length} Songs</p>
        </div>
      </div>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="main-view">
      <div className="mobile-top-bar">
        <h2>Harmony</h2>
      </div>
      
      {currentView === 'search' && (
        <div className="header" style={{ position: 'relative' }}>
          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={20} color="var(--text-subdued)" />
            <input 
              type="text" 
              placeholder="What do you want to listen to?" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if(query.trim() && liveSearchResults.length > 0) setShowDropdown(true); }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              autoFocus
            />
          </form>
          {showDropdown && liveSearchResults.length > 0 && (
            <div className="search-dropdown">
              {liveSearchResults.map((track, idx) => (
                <div 
                  className="dropdown-item" 
                  key={`live-${track.videoId}-${idx}`} 
                  onClick={() => {
                    setShowDropdown(false);
                    onPlayTrack(track, liveSearchResults);
                  }}
                >
                  <img src={track.coverUrl} alt={track.title} />
                  <div className="dropdown-info">
                    <div className="title">{track.title}</div>
                    <div className="artist">{track.artists}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="content-area">
        {loading && <div className="loader">Loading...</div>}
        
        {!loading && currentView === 'home' && (
          <div className="home-sections">
            {renderSpeedDial(getGreeting(), "START RADIO FROM A SONG", homeRows.speedDial)}
            
            {homeRows.topArtist && homeRows.personalized.length > 0 && 
              renderTrackRow(`Similar to ${homeRows.topArtist}`, "RECOMMENDED FOR YOU", homeRows.personalized)
            }

            {renderTrackRow("Quick picks", "START RADIO FROM A SONG", homeRows.quickPicks)}
            {renderTrackRow("Covers & Remixes", "FOR YOU", homeRows.covers)}
            {renderTrackRow("Dancing on your own", "FOR YOU", homeRows.dancing)}

            {renderTrackRow("Malayalam Trending Hits", "M-POP HITS", homeRows.malTrending)}

            <div className="home-row">
              <div className="section-header">
                <p className="subtitle">FEATURED PLAYLISTS</p>
                <h2>Curated for you</h2>
              </div>
              <div className="featured-playlists-grid">
                {renderPlaylistBanner('curated_melMalayalam', 'Malayalam Melodies', homeRows.melMalayalam)}
                {renderPlaylistBanner('curated_romMalayalam', 'Malayalam Romantic', homeRows.romMalayalam)}
                {renderPlaylistBanner('curated_arRahman', 'A.R. Rahman Classics', homeRows.arRahman)}
              </div>
            </div>

            {renderTrackRow("Trending Songs", "HITS OF THE MOMENT", homeRows.trending)}
          </div>
        )}

        {!loading && currentView === 'search' && results.length > 0 && (
          <div className="results-grid">
            {results.map((track) => (
              <div className="track-card" key={track.videoId} onClick={() => onPlayTrack(track, results)}>
                <div className="cover-container">
                  <img src={track.coverUrl} alt={track.title} />
                  <button className="play-btn">
                    <Play size={24} fill="black" color="black" />
                  </button>
                  <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); addToQueue(track); }} title="Add to Queue">
                    +
                  </button>
                </div>
                <div className="track-info">
                  <div className="title">{track.title}</div>
                  <div className="artist">{track.artists}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && currentView === 'library' && (
          <div className="home-sections">
            <h1>Your Library</h1>
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Playlists</h2>
                <button 
                  className="control-btn" 
                  style={{ color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', background: 'transparent' }}
                  onClick={() => {
                    const name = prompt("Enter playlist name:");
                    if (name && createPlaylist) createPlaylist(name);
                  }}
                >
                  + Create Playlist
                </button>
              </div>
              
              {playlists && playlists.length > 0 ? (
                <div className="results-grid">
                  {playlists.map(p => (
                    <div className="track-card" key={p.id} onClick={() => {
                      setSelectedPlaylist(p);
                      setCurrentView('playlist');
                    }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px', background: 'var(--surface-highlight)', fontSize: '24px', fontWeight: 'bold' }}>
                      {p.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No playlists created yet.</p>
              )}
            </div>
            {recentlyPlayed && recentlyPlayed.length > 0 ? renderTrackRow("Recently Played", null, recentlyPlayed) : <p>No recently played songs yet.</p>}
          </div>
        )}

        {!loading && currentView === 'liked' && (
          <div className="home-sections">
            <h1>Liked Songs</h1>
            {likedSongs && likedSongs.length > 0 ? (
              <div className="results-grid">
                {likedSongs.map((track) => (
                  <div className="track-card" key={track.videoId} onClick={() => onPlayTrack(track, likedSongs)}>
                    <div className="cover-container">
                      <img src={track.coverUrl} alt={track.title} />
                      <button className="play-btn">
                        <Play size={24} fill="black" color="black" />
                      </button>
                      <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); addToQueue(track); }} title="Add to Queue">
                        +
                      </button>
                    </div>
                    <div className="track-info">
                      <div className="title">{track.title}</div>
                      <div className="artist">{track.artists}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>You haven't liked any songs yet.</p>
            )}
          </div>
        )}

        {!loading && currentView === 'playlist' && selectedPlaylist && (
          <div className="home-sections">
            <h1>{selectedPlaylist.name}</h1>
            {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 ? (
              <div className="results-grid">
                {selectedPlaylist.tracks.map((track) => (
                  <div className="track-card" key={track.videoId} onClick={() => onPlayTrack(track, selectedPlaylist.tracks)}>
                    <div className="cover-container">
                      <img src={track.coverUrl} alt={track.title} />
                      <button className="play-btn">
                        <Play size={24} fill="black" color="black" />
                      </button>
                      <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); addToQueue(track); }} title="Add to Queue">
                        +
                      </button>
                    </div>
                    <div className="track-info">
                      <div className="title">{track.title}</div>
                      <div className="artist">{track.artists}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>This playlist is empty.</p>
            )}
          </div>
        )}
      </div>

      {(showLyrics || showQueue) && (
        <div className="side-panel-overlay">
          {showLyrics && (
            <div className="lyrics-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Lyrics</h2>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => setShowLyrics(false)}>
                  <X size={24} color="var(--text-subdued)" />
                </button>
              </div>
              <div className="lyrics-content">
                {lyrics ? (
                  lyrics.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() === '' ? 'empty-line' : ''}>
                      {line}
                    </p>
                  ))
                ) : (
                  <p>Loading lyrics...</p>
                )}
              </div>
            </div>
          )}
          
          {showQueue && (
            <div className="queue-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Up Next</h2>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => setShowQueue(false)}>
                  <X size={24} color="var(--text-subdued)" />
                </button>
              </div>
              <div className="queue-content">
                {queue && queue.length > 0 ? (
                  queue.map((track, idx) => (
                    <div className="queue-item" key={`${track.videoId}-${idx}`}>
                      <img src={track.coverUrl} alt={track.title} />
                      <div className="queue-item-info">
                        <div className="title">{track.title}</div>
                        <div className="artist">{track.artists}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Queue is empty.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MainView;
