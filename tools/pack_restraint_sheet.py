"""Pack the generated restraint atlas with one scale per fighter, preserving alpha."""
import json
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from pack_character_sheet import extract_poses, pack

ROOT=Path(__file__).resolve().parents[1]
def main():
    source=ROOT/'source_art/character-v2/restraint-rear-source.png'
    poses=extract_poses(Image.open(source),4,4,'red')
    report=[]
    for row,(kind,height) in enumerate([('aoi',264),('thug',300),('yankee',300),('brute',331)]):
        group=[]
        for im,_,bounds in poses[row*4:row*4+4]:
            alpha=np.array(im)[...,3]
            # Ground midpoint keeps the shared stance centered without using glove color.
            ys,xs=np.where(alpha>100)
            feet=xs[ys>ys.max()-12]
            anchor=float((feet.min()+feet.max())/2)
            group.append((im,anchor,bounds))
        atlas,frames,scale=pack(group,0,height)
        out=ROOT/f'assets/characters/{kind}_restraint_v2.png'
        atlas.save(out,optimize=True)
        out.with_suffix('.js').write_text('window.SPR_'+kind.upper()+'_RESTRAINT='+json.dumps({'frames':frames})+';\n',encoding='utf-8')
        report.append({'kind':kind,'output':out.name,'referenceHeight':height,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                       'atlasSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'frameCount':4,'scale':scale})
        print(kind,atlas.size)
    (ROOT/'assets/characters/restraint-validation.json').write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main()
