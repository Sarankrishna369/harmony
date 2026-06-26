import requests

invidious = [
    "https://vid.puffyan.us",
    "https://invidious.jing.rocks",
    "https://invidious.nerdvpn.de",
    "https://inv.tux.pizza",
    "https://invidious.asir.dev",
    "https://invidious.flokinet.to",
    "https://invidious.privacyredirect.com",
]

for inst in invidious:
    try:
        r = requests.get(f"{inst}/api/v1/videos/klfT_lUhhVA", timeout=5)
        print(inst, r.status_code)
    except Exception as e:
        print(inst, str(e))
