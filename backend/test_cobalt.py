import requests

try:
    res = requests.get("https://instances.cobalt.best/api/instances", timeout=10)
    data = res.json()
    working_apis = [inst["api"] for inst in data if inst.get("api") and inst.get("trust", 0) > 0 and inst.get("cors", 0) == 1]
    
    print("Found APIs:", working_apis[:5])
    
    for api in working_apis[:5]:
        print(f"Testing {api}...")
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        payload = {
            "url": "https://music.youtube.com/watch?v=klfT_lUhhVA",
            "aFormat": "mp3",
            "isAudioOnly": True
        }
        try:
            r = requests.post(api, json=payload, headers=headers, timeout=10)
            if r.status_code == 200:
                print(r.json().get("url"))
            else:
                print("Failed:", r.status_code, r.text)
        except Exception as e:
            print("Error:", e)
except Exception as e:
    print("Failed to get instance list:", e)
