"""Normalize the generated chroma-green mount grid with one uniform scale.

Mounted frames contain both fighters, preserving the intended hand/face overlap.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image
from pack_character_sheet import extract_poses, pack

ROOT=Path(__file__).resolve().parents[1]

def main():
    source=ROOT/'source_art/character-v2/mount-source.png'
    poses=extract_poses(Image.open(source),3,2,'red')
    group=[]
    for index,(im,_,bounds) in enumerate(poses):
        # Torso anchor rather than foot anchor for horizontal and paired poses.
        group.append((im,im.width*(.54 if index in (2,3) else .5),bounds))
    atlas,frames,scale=pack(group,0,round(group[0][0].height*.70))
    for i,f in enumerate(frames):
        # Paired frames: only this left region contains thug reds; never recolor Aoi.
        f['paletteWidth']=f['w'] if i<2 else round(f['w']*.61) if i<4 else 0
    output=ROOT/'assets/characters/mount_v1.png'
    atlas.save(output,optimize=True)
    output.with_suffix('.js').write_text('window.SPR_MOUNT='+json.dumps({'frames':frames})+';\n',encoding='utf-8')
    report={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'atlasSha256':hashlib.sha256(output.read_bytes()).hexdigest(),
            'sourceSize':list(Image.open(source).size),'frameCount':6,'scale':scale,
            'background':'chroma green removed using existing key_background pipeline'}
    (ROOT/'assets/characters/mount-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(atlas.size,scale)

if __name__=='__main__':main()
