/* One registered illustration per hold keeps hands, clothing and scale together. */
function loadRestraintPairs(){
  const result={};
  for(const kind of ['yankee','brute','boss']){
    const data=window['SPR_HOLD_'+kind.toUpperCase()];
    const entry={...data,img:new Image()};result[kind]=entry;
    entry.img.onload=()=>{
      if(kind!=='yankee')return;
      const c=document.createElement('canvas');c.width=entry.img.naturalWidth;c.height=entry.img.naturalHeight;
      const ctx=c.getContext('2d');ctx.drawImage(entry.img,0,0);
      // The mask includes only the jacket side, never Aoi's blouse or gloves.
      const [x,y,w,h]=entry.paletteRect,pixels=ctx.getImageData(x,y,w,h);
      shiftClothingPixels(pixels.data,kind,0);ctx.putImageData(pixels,x,y);entry.palette=c;
    };
    entry.img.src='assets/characters/'+kind+'_hold_v1.png';
  }
  return result;
}
