from ytmusicapi import YTMusic
import json

yt = YTMusic()
charts = yt.get_charts(country='IN')

with open("charts_test.json", "w", encoding="utf-8") as f:
    json.dump(charts, f, indent=2)
