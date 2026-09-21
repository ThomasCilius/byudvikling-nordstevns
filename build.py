"""Bygger index.html (det interaktive kort) af src/ og data/.

Kør:  python3 build.py
Output: index.html i repo-roden - kan åbnes direkte i en browser eller serveres af GitHub Pages.
"""
import re, json, pathlib
root = pathlib.Path(__file__).parent
head = (root / 'src' / 'head.html').read_text(encoding='utf-8')
head = head.replace('LEAFLET_CSS_HERE', (root / 'src' / 'leaflet.css').read_text(encoding='utf-8'))
base = (root / 'data' / 'base.json').read_text(encoding='utf-8')
suit = (root / 'data' / 'etaper.json').read_text(encoding='utf-8')
app = (root / 'src' / 'app.js').read_text(encoding='utf-8')
# titel/description fra fragmentet flyttes til <head>
title = re.search(r'<title>(.*?)</title>', head).group(1)
desc = re.search(r'<meta name="description" content="([^"]*)"', head).group(1)
frag = re.sub(r'^<title>.*?</title>\n', '', head)
frag = re.sub(r'^<meta name="description"[^>]*>\n', '', frag)
doc = f'''<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#F4F5F1">
<style>html,body{{height:100%}}body{{margin:0}}</style>
</head>
<body>
{frag}
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>const BASE={base};const SUIT={suit};</script>
<script>
{app}
</script>
</body>
</html>
'''
(root / 'index.html').write_text(doc, encoding='utf-8')
print('index.html', len(doc.encode()), 'bytes')
