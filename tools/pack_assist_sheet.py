"""Pack front-assist grab/punch poses with a fixed scale per fighter."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from pack_character_sheet import extract_poses, pack

ROOT=Path(__file__).resolve().parents[1]

def main():
    source=ROOT/'source_art/character-v2/assist-combo-source.png'
    poses=extract_poses(Image.open(source),4,4,'red')
    report=[]
    for row,(kind,height) in enumerate([('aoi',264),('thug',300),('yankee',300),('brute',331)]):
        character_source=source
        character_poses=poses[row*4:row*4+4]
        if kind=='brute':
            character_source=ROOT/'source_art/character-v2/brute-assist-source.png'
            character_poses=extract_poses(Image.open(character_source),4,1,'red')
        elif kind in ('thug','yankee'):
            character_source=ROOT/'source_art/character-v2/assist-shoulder-source.png'
            character_poses=extract_poses(Image.open(character_source),4,4,'red')[row*4:row*4+4]
        group=[]
        for im,_,bounds in character_poses:
            ys,xs=np.where(np.array(im)[...,3]>100)
            feet=xs[ys>ys.max()-max(12,round(im.height*.12))]
            group.append((im,float((feet.min()+feet.max())/2),bounds))
        atlas,frames,scale=pack(group,0,height)
        out=ROOT/f'assets/characters/{kind}_assist_v1.png'
        atlas.save(out,optimize=True)
        out.with_suffix('.js').write_text('window.SPR_'+kind.upper()+'_ASSIST='+json.dumps({'frames':frames})+';\n',encoding='utf-8')
        report.append({'kind':kind,'source':character_source.name,'output':out.name,'referenceHeight':height,
                       'sourceSha256':hashlib.sha256(character_source.read_bytes()).hexdigest(),
                       'atlasSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'frameCount':4,'scale':scale})
        print(kind,atlas.size)
    (ROOT/'assets/characters/assist-validation.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
