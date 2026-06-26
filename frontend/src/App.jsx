import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import MainView from './components/MainView';
import PlayerBar from './components/PlayerBar';
import { API_BASE_URL } from './config';

function App() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [lyrics, setLyrics] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [playbackHistory, setPlaybackHistory] = useState([]);
  const isFetchingUpNext = useRef(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem('recentlyPlayed');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [likedSongs, setLikedSongs] = useState(() => {
    try {
      const saved = localStorage.getItem('likedSongs');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [playlists, setPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('playlists');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [currentView, setCurrentView] = useState('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showEq, setShowEq] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(false);
  const [audioQuality, setAudioQuality] = useState('high');
  
  const [eqGains, setEqGains] = useState({ bass: 4, mid: 1, treble: 3 });
  
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const compressorRef = useRef(null);
  const bassRef = useRef(null);
  const midRef = useRef(null);
  const trebleRef = useRef(null);

  const initAudioContext = () => {
    if (audioCtxRef.current || !audioRef.current) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    
    const source = ctx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;
    
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 250;
    bass.gain.value = 4; // Initial boost
    
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1000;
    mid.Q.value = 1;
    mid.gain.value = 1; // Initial boost
    
    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 4000;
    treble.gain.value = 3; // Initial boost

    // Add a compressor for that punchy Spotify-like mastered sound
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    bassRef.current = bass;
    midRef.current = mid;
    trebleRef.current = treble;
    compressorRef.current = compressor;
    
    if (eqEnabled) {
      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(compressor);
      compressor.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }
  };

  // Effect to re-wire the audio graph when eqEnabled changes
  useEffect(() => {
    if (!audioCtxRef.current || !sourceRef.current || !bassRef.current || !compressorRef.current) return;
    const ctx = audioCtxRef.current;
    
    sourceRef.current.disconnect();
    bassRef.current.disconnect();
    midRef.current.disconnect();
    trebleRef.current.disconnect();
    compressorRef.current.disconnect();

    if (eqEnabled) {
      sourceRef.current.connect(bassRef.current);
      bassRef.current.connect(midRef.current);
      midRef.current.connect(trebleRef.current);
      trebleRef.current.connect(compressorRef.current);
      compressorRef.current.connect(ctx.destination);
    } else {
      sourceRef.current.connect(ctx.destination);
    }
  }, [eqEnabled]);

  const updateEq = (band, value) => {
    setEqGains(prev => ({ ...prev, [band]: value }));
    if (band === 'bass' && bassRef.current) bassRef.current.gain.value = value;
    if (band === 'mid' && midRef.current) midRef.current.gain.value = value;
    if (band === 'treble' && trebleRef.current) trebleRef.current.gain.value = value;
  };

  useEffect(() => {
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (name) => {
    const newPlaylist = { id: Date.now().toString(), name, tracks: [] };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const addToPlaylist = (playlistId, track) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.tracks.some(t => t.videoId === track.videoId)) {
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    }));
  };

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        initAudioContext();
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const playTrack = async (track, contextList = null, isHistoryNavigation = false) => {
    if (!isHistoryNavigation && currentTrack) {
      setPlaybackHistory(prev => [...prev, currentTrack]);
    }
    
    setCurrentTrack(track);
    setIsPlaying(true);
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.videoId !== track.videoId);
      return [track, ...filtered].slice(0, 50);
    });
    
    if (contextList && Array.isArray(contextList)) {
      const trackIndex = contextList.findIndex(t => t.videoId === track.videoId);
      if (trackIndex !== -1) {
        const restOfList = contextList.slice(trackIndex + 1);
        setQueue(isShuffled ? shuffleArray(restOfList) : restOfList);
      }
    } else if (contextList !== 'QUEUE' && !isHistoryNavigation) {
      setQueue([]);
      try {
        const res = await fetch(`${API_BASE_URL}/api/upnext?video_id=${track.videoId}`);
        const data = await res.json();
        if (data.results) {
          setQueue(isShuffled ? shuffleArray(data.results) : data.results);
        }
      } catch (e) {
        console.error("Failed to fetch up next", e);
      }
    }
    
    setLyrics(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lyrics?video_id=${track.videoId}`);
      const data = await res.json();
      setLyrics(data.lyrics || "No lyrics available");
    } catch (e) {
      setLyrics("Error loading lyrics");
    }
  };

  useEffect(() => {
    if (queue.length > 0) {
      fetch(`${API_BASE_URL}/api/prefetch?video_id=${queue[0].videoId}&quality=${audioQuality}`).catch(e => console.error(e));
    }
  }, [queue, audioQuality]);

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    if (!isShuffled) {
      setQueue(q => shuffleArray(q));
    }
  };

  const toggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
    setShowQueue(true); // show the queue so the user knows it worked
  };

  useEffect(() => {
    const fetchUpNext = async () => {
      if (!currentTrack || queue.length > 2 || isFetchingUpNext.current || isRepeating) return;
      
      isFetchingUpNext.current = true;
      try {
        const baseTrack = queue.length > 0 ? queue[queue.length - 1] : currentTrack;
        const res = await fetch(`${API_BASE_URL}/api/upnext?video_id=${baseTrack.videoId}`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          setQueue(q => {
            const existingIds = new Set([...playbackHistory.slice(-20).map(t => t.videoId), currentTrack.videoId, ...q.map(t => t.videoId)]);
            const newTracks = data.results.filter(t => !existingIds.has(t.videoId));
            return [...q, ...newTracks];
          });
        }
      } catch (err) {
        console.error("Failed to pre-fetch up next", err);
      } finally {
        isFetchingUpNext.current = false;
      }
    };
    
    fetchUpNext();
  }, [queue.length, currentTrack, isRepeating, playbackHistory]);

  const onEnded = async () => {
    if (isRepeating && currentTrack) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
      return;
    }
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(q => q.slice(1));
      playTrack(nextTrack, 'QUEUE');
    } else if (currentTrack) {
      setIsPlaying(false);
      try {
        isFetchingUpNext.current = true;
        const res = await fetch(`${API_BASE_URL}/api/upnext?video_id=${currentTrack.videoId}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const nextTrack = data.results[0];
          setQueue(data.results.slice(1));
          playTrack(nextTrack, 'AUTOPLAY');
        }
      } catch (err) {
        console.error(err);
      } finally {
        isFetchingUpNext.current = false;
      }
    }
  };

  const onSkip = () => {
    onEnded();
  };

  const onPrevious = () => {
    if (playbackHistory.length > 0) {
      const prevTrack = playbackHistory[playbackHistory.length - 1];
      setPlaybackHistory(h => h.slice(0, -1));
      setQueue(q => currentTrack ? [currentTrack, ...q] : q);
      playTrack(prevTrack, null, true);
    }
  };

  const changeAudioQuality = (newQuality) => {
    if (newQuality === audioQuality) return;
    
    if (audioRef.current && currentTrack) {
      const currentTime = audioRef.current.currentTime;
      const wasPlaying = !audioRef.current.paused;
      
      const handleLoaded = () => {
        audioRef.current.currentTime = currentTime;
        if (wasPlaying) {
          audioRef.current.play().catch(e => console.error(e));
        }
        audioRef.current.removeEventListener('loadedmetadata', handleLoaded);
      };
      
      audioRef.current.addEventListener('loadedmetadata', handleLoaded);
      setAudioQuality(newQuality);
    } else {
      setAudioQuality(newQuality);
    }
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <>
      <div 
        className="main-container"
        style={{ '--bg-image': currentTrack ? `url(${currentTrack.coverUrl})` : 'none' }}
      >
        <Sidebar 
          currentView={currentView}
          setCurrentView={setCurrentView}
          playlists={playlists}
          createPlaylist={createPlaylist}
          setSelectedPlaylist={setSelectedPlaylist}
        />
        <MainView 
          currentView={currentView}
          setCurrentView={setCurrentView}
          onPlayTrack={playTrack} 
          recentlyPlayed={recentlyPlayed} 
          likedSongs={likedSongs}
          playlists={playlists}
          createPlaylist={createPlaylist}
          addToPlaylist={addToPlaylist}
          selectedPlaylist={selectedPlaylist}
          setSelectedPlaylist={setSelectedPlaylist}
          showLyrics={showLyrics}
          setShowLyrics={setShowLyrics}
          lyrics={lyrics}
          showQueue={showQueue}
          setShowQueue={setShowQueue}
          queue={queue}
          removeFromQueue={(index) => setQueue(q => q.filter((_, i) => i !== index))}
          addToQueue={addToQueue}
        />
      </div>
      <PlayerBar 
        track={currentTrack} 
        isPlaying={isPlaying} 
        setIsPlaying={setIsPlaying}
        audioRef={audioRef}
        onSkip={onSkip}
        eqGains={eqGains}
        updateEq={updateEq}
        likedSongs={likedSongs}
        setLikedSongs={setLikedSongs}
        playlists={playlists}
        addToPlaylist={addToPlaylist}
        createPlaylist={createPlaylist}
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        showQueue={showQueue}
        setShowQueue={setShowQueue}
        isShuffled={isShuffled}
        toggleShuffle={toggleShuffle}
        isRepeating={isRepeating}
        toggleRepeat={toggleRepeat}
        setShowSettings={setShowSettings}
        onPrevious={onPrevious}
      />
      
      {showSettings && (
        <div className="settings-overlay" onClick={closeSettings}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Audio Engine Settings</h2>
              <button className="close-btn" onClick={closeSettings}>×</button>
            </div>
            
            <div className="settings-section">
              <div className="setting-row">
                <div className="setting-info">
                  <h3>Spotify-like EQ</h3>
                  <p>Enhance bass and treble with dynamics compression.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={eqEnabled} onChange={(e) => setEqEnabled(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
            
            <div className="settings-section">
              <div className="setting-info">
                <h3>Streaming Quality</h3>
                <p>Select your preferred audio bitrate.</p>
              </div>
              <div className="quality-options">
                <button 
                  className={`quality-btn ${audioQuality === 'low' ? 'active' : ''}`}
                  onClick={() => changeAudioQuality('low')}
                >
                  Data Saver (128kbps)
                </button>
                <button 
                  className={`quality-btn ${audioQuality === 'medium' ? 'active' : ''}`}
                  onClick={() => changeAudioQuality('medium')}
                >
                  Standard (256kbps)
                </button>
                <button 
                  className={`quality-btn ${audioQuality === 'high' ? 'active' : ''}`}
                  onClick={() => changeAudioQuality('high')}
                >
                  Premium (320kbps)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {currentTrack && (
        <audio 
          ref={audioRef} 
          crossOrigin="anonymous"
          src={`${API_BASE_URL}/api/stream?video_id=${currentTrack.videoId}&quality=${audioQuality}`}
          onEnded={onEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}
    </>
  );
}

export default App;
