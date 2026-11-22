"""Chroma-key and register static paired holds using Aoi's size and foot anchor."""
import hashlib
import json
from pathlib import Path
from PIL import Image
from pack_character_sheet import extract_poses, pack

ROOT=Path(__file__).resolve().parents[1]

def main():
    recipes=json.loads((ROOT/'source_art/character-v2/hold-pairs-layout.json').read_text())
    reports=[]
    for recipe in recipes:
        source=ROOT/'source_art/character-v2'/recipe['source']
        with Image.open(source) as raw:
            im,_,bounds=extract_poses(raw,1,1,'red')[0]
            size=list(raw.size)
        # Source landmark measurements, not the combined pair's bounding height.
        scale=recipe['aoiTargetHeight']/(recipe['aoiGround']-recipe['aoiTop'])
        anchor=recipe['aoiAnchorX']-bounds[0]
        atlas,frames,_=pack([(im,anchor,bounds)],0,round(im.height*scale))
        scale=atlas.height/im.height
        kind=recipe['kind'];output=ROOT/f'assets/characters/{kind}_hold_v1.png'
        atlas.save(output,optimize=True)
        metadata={'frames':frames}
        if 'paletteLeft' in recipe:
            x=round((recipe['paletteLeft']-bounds[0])*scale)
            metadata['paletteRect']=[x,0,atlas.width-x,atlas.height]
        output.with_suffix('.js').write_text('window.SPR_HOLD_'+kind.upper()+'='+json.dumps(metadata)+';\n')
        reports.append({'kind':kind,'source':source.name,'sourceSize':size,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                        'output':output.name,'atlasSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'scale':scale,
                        'aoiHeight':(recipe['aoiGround']-recipe['aoiTop'])*scale,'anchor':frames[0]['ax']})
        print(kind,atlas.size)
    (ROOT/'assets/characters/hold-pairs-validation.json').write_text(json.dumps(reports,indent=2)+'\n')

if __name__=='__main__':main()
