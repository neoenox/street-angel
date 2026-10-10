/* User-selected local damage voice for Aoi only. Gameplay never waits for audio. */
class AoiDamageVoice {
  constructor(getContext,isMuted,fetcher=(...args)=>fetch(...args),random=Math.random){
    this.getContext=getContext;this.isMuted=isMuted;this.fetcher=fetcher;this.random=random;
    this.clips=[];this.loading=null;this.active=null;this.next=0;this.until=-Infinity;
  }
  warmup(){
    const ctx=this.getContext();if(!ctx)return Promise.resolve();
    if(!this.loading)this.loading=Promise.all(['assets/audio/aoi-hurt.mp3','assets/audio/syozyo3-u.mp3','assets/audio/syozyo3-ku.mp3'].map(async path=>{
      try{
        const response=await this.fetcher(path);
        if(!response.ok)return null;
        return await ctx.decodeAudioData(await response.arrayBuffer());
      }catch{return null}
    })).then(clips=>{this.clips=clips.filter(Boolean)});
    return this.loading;
  }
  play(kind){
    const ctx=this.getContext();
    if(kind!=='player'||!ctx||ctx.state!=='running'||this.isMuted()||this.active||ctx.currentTime<this.until)return false;
    if(!this.clips.length){this.warmup();return false}
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=this.clips[Math.floor(this.random()*this.clips.length)];gain.gain.value=.65;this.next++;
    source.connect(gain);gain.connect(ctx.destination);this.active=source;
    this.until=ctx.currentTime+source.buffer.duration+.08;
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.active===source)this.active=null};
    source.start();return true;
  }
  stop(){
    const source=this.active;this.active=null;this.until=-Infinity;
    if(source){try{source.stop()}catch{/* Already ended. */}}
  }
}
if(typeof module!=='undefined')module.exports={AoiDamageVoice};
