"""Render diagnostic contact sheets at the game's world scale (no asset edits)."""
import json
import math
import sys
import re
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SETS={
 'aoi':[('aoi_walk4',1.04),('characters/aoi_attack_v2',1),('aoi_jump',.94),('aoi_hit',.82),('characters/aoi_restraint_v3',1),('characters/aoi_assist_v1',1),('characters/mount_v1',1)],
 'thug':[('thug_walk',1),('characters/thug_combat_v2',1),('characters/thug_restraint_v2',1),('characters/thug_assist_v1',1),('characters/mount_v1',1)],
 'yankee':[('yk_walk',.88),('characters/yankee_combat_v2',.88),('characters/yankee_restraint_v2',.88),('characters/yankee_assist_v1',.88)],
 'brute':[('br_walk',1.12),('br_cmb',1.12),('characters/brute_restraint_v2',1.12),('characters/brute_assist_v1',1.12)],
 'boss':[('characters/boss_motion_v2',1.28),('characters/boss_combat_v2',1.28)]}

def main():
 out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
 baseline='--baseline' in sys.argv
 scales={key:float(value) for key,value in re.findall(r"^\s*'?([\w/]+)'?:([.\d]+),",(ROOT/'sprite-scale.js').read_text(),re.M)}
 for kind,sets in SETS.items():
  rows=[]
  for name,k in sets:
   path=ROOT/'assets'/name
   frames=json.loads(path.with_suffix('.js').read_text().split('=',1)[1].rstrip(';\n'))['frames']
   atlas=Image.open(path.with_suffix('.png')).convert('RGBA')
   for offset in range(0,len(frames),6):rows.append((name,k,frames,atlas,offset))
  sheet=Image.new('RGB',(1200,len(rows)*260),'#211e2a');d=ImageDraw.Draw(sheet)
  for row,(name,k,frames,atlas,offset) in enumerate(rows):
   for col,f in enumerate(frames[offset:offset+6]):
    actor_scale={'brute':1.12,'boss':1.28}.get(kind,1)
    x=col*200+100;y=row*260+230;s=.5*(k if baseline else actor_scale*scales[name])
    width={'thug':.90,'yankee':.95,'boss':.94}.get(kind,1)
    if name=='characters/mount_v1' and offset+col>=2:width=1
    sprite=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
    sprite=sprite.resize((round(f['w']*s*width),round(f['h']*s)),Image.Resampling.LANCZOS)
    sheet.paste(sprite,(round(x-f['ax']*s*width),round(y-f['ay']*s)),sprite)
    d.line((x-95,y,x+95,y),fill='#665c70');d.text((col*200+4,row*260+3),name.replace('characters/',''),fill='white')
    d.text((col*200+4,row*260+17),str(offset+col),fill='#ffca66')
  sheet.save(out/(kind+'.png'))

if __name__=='__main__':main()
