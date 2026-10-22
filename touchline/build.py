import pathlib
src=pathlib.Path('src')
css=(src/'style.css').read_text()+'\n'+(src/'style_v14.css').read_text()+'\n'+(src/'style_v15.css').read_text()
# v17+: every file in src/v17/ is appended after the listed sources, in file-name order (00_, 10_, 20_ ...).
# New features go in their own file there, so parallel work never edits the same file.
V17=sorted((src/'v17').glob('*')) if (src/'v17').is_dir() else []
css+=''.join('\n'+f.read_text() for f in V17 if f.suffix=='.css')
import base64
# Embedded OFL fonts (subset to Latin-1 + punctuation). Licenses in fonts/*.txt
FONTS=[('Big Shoulders Display','bs-reg','400 599','normal'),('Big Shoulders Display','bs-bold','600 900','normal'),
 ('Instrument Sans','is-reg','300 599','normal'),('Instrument Sans','is-bold','600 900','normal'),('Instrument Sans','is-it','300 900','italic'),
 ('JetBrains Mono','jb-bold','300 900','normal'),('Gloock','gl-reg','300 900','normal'),
 ('Crimson Pro','cp-reg','300 900','normal'),('Crimson Pro','cp-it','300 900','italic')]
fonts='\n'.join(f"@font-face{{font-family:'{fam}';src:url(data:font/woff;base64,{base64.b64encode(pathlib.Path('fonts/'+f+'.woff').read_bytes()).decode()}) format('woff');font-weight:{w};font-style:{st};font-display:swap}}" for fam,f,w,st in FONTS)
js='\n'.join((src/f).read_text().replace("if (typeof module !== 'undefined') module.exports","// node export removed;\nif (false) module.exports") for f in ['data.js','names2.js','mascots.js','mascots2.js','looks.js','engine.js','ui_core.js','ui_sound.js','ui_views.js','ui_match.js','ui_stage.js','ui_live.js','ui_fx.js','ui_features.js','ui_main.js','ui_v8.js','ui_spec.js','ui_kits.js','ui_wrapped.js','ui_announcer.js','ui_mixer.js','ui_schedule.js','ui_capsule.js','ui_sandbox.js','ui_polish.js','ui_v14.js','ui_v15.js']+['v17/'+f.name for f in V17 if f.suffix=='.js'])
html=f'''<title>Touchline</title>
<meta name="description" content="Touchline: Varsity Soccer Manager">
<style>
{fonts}
{css}
</style>
<div id="app"></div>
<script>
"use strict";
{js}
</script>
'''
pathlib.Path('dist').mkdir(exist_ok=True)
pathlib.Path('dist/touchline.html').write_text(html)
full=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">{html.split("<div id=")[0]}</head><body><div id="app"></div>{html.split("<div id=\"app\"></div>")[1]}</body></html>'
pathlib.Path('dist/touchline-standalone.html').write_text(full)
print(len(html)//1024,'KB')
