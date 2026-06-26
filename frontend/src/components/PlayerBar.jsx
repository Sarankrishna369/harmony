import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Mic2, ListMusic, Plus, Settings, Heart, ChevronDown } from 'lucide-react';
import './PlayerBar.css';

const PlayerBar = ({ track, isPlaying, setIsPlaying, audioRef, onSkip, likedSongs, setLikedSongs, playlists, addToPlaylist, createPlaylist, showLyrics, setShowLyrics, showQueue, setShowQueue, isShuffled, toggleShuffle, isRepeating, toggleRepeat, setShowSettings, onPrevious }) => {
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [duration, setDuration] = useState(0);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    let interval;
    if (isPlaying && audioRef.current) {
      interval = setInterval(() => {
        setProgress(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, audioRef]);

  const togglePlay = () => {
    if (!track) return;
    setIsPlaying(!isPlaying);
  };

  const isLiked = track ? likedSongs?.some(t => t.videoId === track.videoId) : false;

  const toggleLike = () => {
    if (!track) return;
    if (isLiked) {
      setLikedSongs(prev => prev.filter(t => t.videoId !== track.videoId));
    } else {
      setLikedSongs(prev => [track, ...prev]);
    }
  };

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const handleVolume = (e) => {
    const value = e.target.value;
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <>
      <div className="player-bar">
        <div className="now-playing" style={{ cursor: track ? 'pointer' : 'default' }} onClick={(e) => {
          if (!track) return;
          if (e.target.closest('.control-btn')) return; // Ignore if they click the heart/plus
          setIsFullScreen(true);
        }}>
          {track ? (
          <>
            <img src={track.coverUrl} alt="Album Art" />
            <div className="info">
              <div className="title">{track.title}</div>
              <div className="artist">{track.artists}</div>
            </div>
            <div style={{ position: 'relative' }}>
              <button className="control-btn heart-btn" onClick={toggleLike} style={{ marginLeft: '16px' }}>
                <Heart size={20} fill={isLiked ? "var(--accent)" : "none"} color={isLiked ? "var(--accent)" : "var(--text-subdued)"} />
              </button>
              <button className="control-btn subtle" onClick={() => setShowPlaylistMenu(!showPlaylistMenu)} style={{ marginLeft: '8px' }}>
                <Plus size={20} />
              </button>
              {showPlaylistMenu && (
                <div className="playlist-menu-popup">
                  <div className="playlist-menu-title">Add to Playlist</div>
                  {playlists && playlists.length > 0 ? (
                    playlists.map(p => (
                      <div key={p.id} className="playlist-menu-item" onClick={() => {
                        addToPlaylist(p.id, track);
                        setShowPlaylistMenu(false);
                      }}>
                        {p.name}
                      </div>
                    ))
                  ) : (
                    <div className="playlist-menu-empty">No playlists created</div>
                  )}
                  <div className="playlist-menu-item create-new" onClick={() => {
                    const name = prompt("Enter playlist name:");
                    if (name) createPlaylist(name);
                    setShowPlaylistMenu(false);
                  }} style={{ borderTop: '1px solid var(--glass-border)', marginTop: '8px', paddingTop: '8px', color: 'var(--accent)' }}>
                    + Create Playlist
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="placeholder">Select a track to play</div>
        )}
      </div>

      <div className="controls-container">
        <div className="main-controls">
          <button className="control-btn subtle" onClick={toggleShuffle}>
            <Shuffle size={20} color={isShuffled ? "var(--accent)" : "var(--text-subdued)"} />
          </button>
          <button className="control-btn" onClick={onPrevious}><SkipBack size={20} fill="white" /></button>
          <button className="play-pause-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} fill="black" color="black" /> : <Play size={20} fill="black" color="black" />}
          </button>
          <button className="control-btn" onClick={onSkip}><SkipForward size={20} fill="white" /></button>
          <button className="control-btn subtle" onClick={toggleRepeat}>
            <Repeat size={20} color={isRepeating ? "var(--accent)" : "var(--text-subdued)"} />
          </button>
        </div>
        
        <div className="playback-bar">
          <span className="time">{formatTime(progress)}</span>
          <input 
            type="range" 
            className="seek-slider custom-slider" 
            min="0" 
            max={duration || 100} 
            value={progress}
            onChange={handleSeek}
            style={{ '--progress': `${progressPercent}%` }}
          />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="right-controls">
        <button className="control-btn" onClick={() => {
          setShowLyrics(!showLyrics);
          if (showQueue) setShowQueue(false);
        }}>
          <Mic2 size={20} color={showLyrics ? "var(--accent)" : "var(--text-subdued)"} />
        </button>
        <button className="control-btn" onClick={() => {
          setShowQueue(!showQueue);
          if (showLyrics) setShowLyrics(false);
        }}>
          <ListMusic size={20} color={showQueue ? "var(--accent)" : "var(--text-subdued)"} />
        </button>
        
        <button className="control-btn" onClick={() => setShowSettings(true)}>
          <Settings size={20} color="var(--text-subdued)" />
        </button>

        <Volume2 size={20} color="var(--text-subdued)" />
        <input 
          type="range" 
          className="vol-slider custom-slider" 
          min="0" 
          max="100" 
          value={volume}
          onChange={handleVolume}
          style={{ '--progress': `${volume}%` }}
        />
      </div>
      </div>
      
      {isFullScreen && track && (
        <div className="full-screen-player">
          <div 
            className="fs-bg" 
            style={{ backgroundImage: `url(${track.coverUrl})` }}
          />
          <div className="fs-content">
            <div className="fs-header">
              <button className="control-btn" onClick={() => setIsFullScreen(false)}>
                <ChevronDown size={32} color="white" />
              </button>
              <div className="fs-header-title">Now Playing</div>
              <button className="control-btn subtle" onClick={() => setShowSettings(true)}>
                <Settings size={24} color="white" />
              </button>
            </div>
            
            <img src={track.coverUrl} alt="Album Art" className="fs-art" />
            
            <div className="fs-info">
              <div className="fs-title-artist">
                <h2 className="fs-title">{track.title}</h2>
                <p className="fs-artist">{track.artists}</p>
              </div>
              <button className="control-btn heart-btn" onClick={toggleLike}>
                <Heart size={28} fill={isLiked ? "var(--accent)" : "none"} color={isLiked ? "var(--accent)" : "white"} />
              </button>
            </div>
            
            <div className="fs-progress-container">
              <input 
                type="range" 
                className="seek-slider custom-slider fs-slider" 
                min="0" 
                max={duration || 100} 
                value={progress}
                onChange={handleSeek}
                style={{ '--progress': `${progressPercent}%` }}
              />
              <div className="fs-time-row">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            <div className="fs-controls">
              <button className="control-btn" onClick={toggleShuffle}>
                <Shuffle size={28} color={isShuffled ? "var(--accent)" : "rgba(255,255,255,0.7)"} />
              </button>
              <button className="control-btn" onClick={onPrevious}><SkipBack size={40} fill="white" /></button>
              <button className="play-pause-btn fs-play-btn" onClick={togglePlay}>
                {isPlaying ? <Pause size={36} fill="black" color="black" /> : <Play size={36} fill="black" color="black" />}
              </button>
              <button className="control-btn" onClick={onSkip}><SkipForward size={40} fill="white" /></button>
              <button className="control-btn subtle" onClick={toggleRepeat}>
                <Repeat size={28} color={isRepeating ? "var(--accent)" : "rgba(255,255,255,0.7)"} />
              </button>
            </div>
            
            <div className="fs-bottom-actions">
              <button className="control-btn" onClick={() => {
                setShowLyrics(!showLyrics);
                setIsFullScreen(false);
              }}>
                <Mic2 size={24} color={showLyrics ? "var(--accent)" : "rgba(255,255,255,0.7)"} />
              </button>
              <button className="control-btn" onClick={() => {
                setShowQueue(!showQueue);
                setIsFullScreen(false);
              }}>
                <ListMusic size={24} color={showQueue ? "var(--accent)" : "rgba(255,255,255,0.7)"} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerBar;
