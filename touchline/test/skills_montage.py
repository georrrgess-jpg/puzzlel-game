# v18.6 skill moves: one contact sheet per move (5 frames in a row) from test/skills_sheet.js output.
# Usage: python3 test/skills_montage.py [scene] [2d|3d] [moves,comma] -> test/shots/v186/skills/sheet-<scene>-<renderer>-<moves>.png
import sys, os
from PIL import Image, ImageDraw
scen=sys.argv[1] if len(sys.argv)>1 else 'skills'; rend=sys.argv[2] if len(sys.argv)>2 else '2d'
moves=(sys.argv[3] if len(sys.argv)>3 else 'feint,step1,step2,roll').split(',')
D=os.path.join(os.path.dirname(__file__),'shots','v186','skills'); U=['0.1','0.3','0.5','0.7','0.9']
ims=[[os.path.join(D,f'{scen}-{rend}-{m}-{u}.png') for u in U] for m in moves]
w,h=460,420; sc=0.5; W,H=int(w*sc),int(h*sc)
out=Image.new('RGB',(W*5,H*len(moves)),'black'); d=ImageDraw.Draw(out)
for r,row in enumerate(ims):
  for c,f in enumerate(row):
    if os.path.exists(f): out.paste(Image.open(f).convert('RGB').resize((W,H)),(c*W,r*H))
    d.text((c*W+4,r*H+4),f'{moves[r]} u{U[c]}',fill='yellow')
p=os.path.join(D,f'sheet-{scen}-{rend}-{"-".join(moves)}.png'); out.save(p); print(p)
