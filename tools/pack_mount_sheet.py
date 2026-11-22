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
    arm_source=ROOT/'source_art/character-v2/mount-recoil-v4-source.png'
    arm_poses=extract_poses(Image.open(arm_source),2,1,'red')
    reference_source=arm_source.parent/'mount-no-guard-v3-source.png'
    reference=extract_poses(Image.open(reference_source),2,1,'red')
    # Keep body size and registration independent of moving hands/head crop bounds.
    pair_scale=poses[2][0].height/reference[0][0].height
    cell_width=Image.open(arm_source).width/2
    anchor_x=reference[0][2][0]+reference[0][0].width*.54
    ground=max(bounds[3] for _,_,bounds in arm_poses)
    for index,(im,ax,bounds) in enumerate(arm_poses):
        padded=Image.new('RGBA',(im.width,ground-bounds[1]),(0,0,0,0))
        padded.paste(im,(0,0))
        im=padded
        im=im.resize((round(im.width*pair_scale),round(im.height*pair_scale)),Image.Resampling.LANCZOS)
        poses[index+2]=(im,(anchor_x-(bounds[0]-index*cell_width))*pair_scale,bounds)
    group=[]
    for index,(im,ax,bounds) in enumerate(poses):
        # Torso anchor rather than foot anchor for horizontal and paired poses.
        group.append((im,ax if index in (2,3) else im.width*.5,bounds))
    atlas,frames,scale=pack(group,0,round(group[0][0].height*.70))
    for i,f in enumerate(frames):
        # Paired frames: only this left region contains thug reds; never recolor Aoi.
        f['paletteWidth']=f['w'] if i<2 else round(f['w']*.61) if i<4 else 0
    output=ROOT/'assets/characters/mount_v1.png'
    atlas.save(output,optimize=True)
    output.with_suffix('.js').write_text('window.SPR_MOUNT='+json.dumps({'frames':frames})+';\n',encoding='utf-8')
    report={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'armSourceSha256':hashlib.sha256(arm_source.read_bytes()).hexdigest(),
            'registrationSourceSha256':hashlib.sha256(reference_source.read_bytes()).hexdigest(),
            'pairScale':pair_scale,
            'atlasSha256':hashlib.sha256(output.read_bytes()).hexdigest(),
            'sourceSize':list(Image.open(source).size),'frameCount':6,'scale':scale,
            'background':'chroma green removed using existing key_background pipeline'}
    (ROOT/'assets/characters/mount-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(atlas.size,scale)

if __name__=='__main__':main()
