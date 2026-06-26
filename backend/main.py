from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import yt_dlp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ytmusic = YTMusic()

@app.get("/api/search")
def search_music(q: str):
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required.")
        
    try:
        results = ytmusic.search(q, filter="songs")
        formatted_results = []
        for song in results[:15]:
            artists = ", ".join([a.get("name", "") for a in song.get("artists", [])])
            thumbnails = song.get("thumbnails", song.get("thumbnail", []))
            # Usually the last thumbnail is the highest resolution
            cover_url = thumbnails[-1]["url"] if thumbnails else ""
            
            formatted_results.append({
                "videoId": song.get("videoId"),
                "title": song.get("title"),
                "artists": artists,
                "album": song.get("album", {}).get("name", "") if song.get("album") else "",
                "coverUrl": cover_url,
                "duration": song.get("duration", "")
            })
            
        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/latest")
def get_latest_songs():
    try:
        charts = ytmusic.get_charts(country="IN")
        playlist_id = None
        for item in charts.get('daily', []):
            if "Trending" in item.get('title', ''):
                playlist_id = item.get('playlistId')
                break
        if not playlist_id:
            playlist_id = charts.get('daily', [{}])[0].get('playlistId')
            
        if not playlist_id:
            charts_zz = ytmusic.get_charts(country="ZZ")
            playlist_id = charts_zz.get('videos', [{}])[0].get('playlistId')

        if not playlist_id:
            return {"results": []}

        playlist = ytmusic.get_playlist(playlist_id, limit=20)
        formatted_results = []
        for song in playlist.get('tracks', [])[:15]:
            artists = ", ".join([a.get("name", "") for a in song.get("artists", []) if isinstance(a, dict) and a.get("name")])
            thumbnails = song.get("thumbnails", song.get("thumbnail", []))
            cover_url = thumbnails[-1]["url"] if thumbnails else ""
            
            formatted_results.append({
                "videoId": song.get("videoId"),
                "title": song.get("title"),
                "artists": artists,
                "album": song.get("album", {}).get("name", "") if isinstance(song.get("album"), dict) else "",
                "coverUrl": cover_url,
                "duration": song.get("duration", "")
            })
            
        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upnext")
def get_up_next(video_id: str):
    if not video_id:
        raise HTTPException(status_code=400, detail="Video ID is required.")
        
    try:
        playlist = ytmusic.get_watch_playlist(videoId=video_id)
        formatted_results = []
        for song in playlist.get('tracks', []):
            if song.get("videoId") == video_id:
                continue # Skip the current song
            artists = ", ".join([a.get("name", "") for a in song.get("artists", []) if isinstance(a, dict) and a.get("name")])
            thumbnails = song.get("thumbnails", song.get("thumbnail", []))
            cover_url = thumbnails[-1]["url"] if thumbnails else ""
            
            formatted_results.append({
                "videoId": song.get("videoId"),
                "title": song.get("title"),
                "artists": artists,
                "album": song.get("album", {}).get("name", "") if isinstance(song.get("album"), dict) else "",
                "coverUrl": cover_url,
                "duration": song.get("length", "") # get_watch_playlist uses 'length'
            })
            
        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lyrics")
def get_lyrics(video_id: str):
    if not video_id:
        raise HTTPException(status_code=400, detail="Video ID is required.")
        
    try:
        playlist = ytmusic.get_watch_playlist(videoId=video_id)
        lyrics_id = playlist.get('lyrics')
        if not lyrics_id:
            return {"lyrics": None}
            
        lyrics_data = ytmusic.get_lyrics(lyrics_id)
        return {"lyrics": lyrics_data.get('lyrics')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import Request
from fastapi.responses import StreamingResponse
import requests
import threading

stream_url_cache = {}

import os

def get_ydl_opts(quality):
    cookie_paths = [
        "/etc/secrets/cookies.txt",  # Render secret file path
        os.path.join(os.path.dirname(__file__), "cookies.txt"), # Local backend folder
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "cookies.txt") # Project root
    ]
    
    base_opts = {
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {'youtube': ['client=IOS,WEB']}
    }
    
    for path in cookie_paths:
        if os.path.exists(path):
            base_opts['cookiefile'] = path
            break
    if quality == 'low':
        base_opts['format'] = 'bestaudio[abr<=128]/bestaudio'
    elif quality == 'medium':
        base_opts['format'] = 'bestaudio[abr<=256]/bestaudio'
    else:
        base_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
    return base_opts

import random
INVIDIOUS_INSTANCES = [
    "https://vid.puffyan.us",
    "https://invidious.jing.rocks",
    "https://invidious.nerdvpn.de",
    "https://inv.tux.pizza"
]

def get_fallback_stream_url(video_id):
    random.shuffle(INVIDIOUS_INSTANCES)
    for instance in INVIDIOUS_INSTANCES:
        try:
            res = requests.get(f"{instance}/api/v1/videos/{video_id}", timeout=5)
            if res.ok:
                data = res.json()
                audio_streams = [f for f in data.get('adaptiveFormats', []) if 'audio' in f.get('type', '')]
                if audio_streams:
                    audio_streams.sort(key=lambda x: int(x.get('bitrate', 0)))
                    return audio_streams[-1].get('url')
        except:
            continue
    return None

def prefetch_url(video_id, quality="high"):
    cache_key = f"{video_id}_{quality}"
    if cache_key in stream_url_cache:
        return
    try:
        ydl_opts = get_ydl_opts(quality)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://music.youtube.com/watch?v={video_id}", download=False)
            if info and info.get('url'):
                stream_url_cache[cache_key] = info.get('url')
    except Exception as e:
        print("Prefetch error:", e)

@app.get("/api/stream")
def get_stream(video_id: str, request: Request, quality: str = "high"):
    if not video_id:
        raise HTTPException(status_code=400, detail="Video ID is required.")
        
    try:
        cache_key = f"{video_id}_{quality}"
        if cache_key in stream_url_cache:
            stream_url = stream_url_cache[cache_key]
        else:
            url = f"https://music.youtube.com/watch?v={video_id}"
            ydl_opts = get_ydl_opts(quality)
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    stream_url = info.get('url')
            except Exception as e:
                print("yt-dlp blocked, using fallback:", e)
                stream_url = get_fallback_stream_url(video_id)
                
            if not stream_url:
                raise Exception("Could not extract stream URL")
            stream_url_cache[video_id] = stream_url
            
        # Proxy range header
        req_headers = {}
        range_header = request.headers.get("Range")
        if range_header:
            req_headers["Range"] = range_header

        r = requests.get(stream_url, headers=req_headers, stream=True)
        
        def generate():
            for chunk in r.iter_content(chunk_size=131072): # Increased chunk size for much faster buffering
                if chunk:
                    yield chunk
                    
        headers = {"Accept-Ranges": "bytes"}
        if "Content-Range" in r.headers:
            headers["Content-Range"] = r.headers["Content-Range"]
        if "Content-Length" in r.headers:
            headers["Content-Length"] = r.headers["Content-Length"]
        if "Content-Type" in r.headers:
            headers["Content-Type"] = r.headers["Content-Type"]
            
        return StreamingResponse(generate(), headers=headers, status_code=r.status_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prefetch")
def prefetch(video_id: str, quality: str = "high"):
    if not video_id:
        return {"status": "skipped"}
    threading.Thread(target=prefetch_url, args=(video_id, quality), daemon=True).start()
    return {"status": "started"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
