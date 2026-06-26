import React from 'react';
import { Home, Search, Library, PlusSquare, Heart } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ currentView, setCurrentView, playlists, createPlaylist, setSelectedPlaylist }) => {
  const handleCreatePlaylist = () => {
    const name = prompt("Enter playlist name:");
    if (name) {
      createPlaylist(name);
    }
  };

  return (
    <div className="sidebar">
      <div className="logo-container">
        <h2>Harmony</h2>
      </div>
      
      <nav className="nav-menu">
        <a href="#" className={`nav-item ${currentView === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('home'); }}>
          <Home size={24} />
          <span>Home</span>
        </a>
        <a href="#" className={`nav-item ${currentView === 'search' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('search'); }}>
          <Search size={24} />
          <span>Search</span>
        </a>
        <a href="#" className={`nav-item ${currentView === 'library' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('library'); }}>
          <Library size={24} />
          <span>Your Library</span>
        </a>
      </nav>
      
      <div className="nav-menu action-menu">
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); handleCreatePlaylist(); }}>
          <PlusSquare size={24} />
          <span>Create Playlist</span>
        </a>
        <a href="#" className={`nav-item ${currentView === 'liked' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('liked'); }}>
          <Heart size={24} className="heart-icon" />
          <span>Liked Songs</span>
        </a>
      </div>
      
      <div className="divider"></div>

      <div className="playlists-container">
        {playlists && playlists.map(p => (
          <a key={p.id} href="#" className="playlist-item" onClick={(e) => {
            e.preventDefault();
            setSelectedPlaylist(p);
            setCurrentView('playlist');
          }}>
            {p.name}
          </a>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
