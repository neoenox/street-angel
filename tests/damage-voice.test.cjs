const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AoiDamageVoice}=require('../damage-voice.js');
function fixture(fetcher=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
  let muted=false;const sources=[];
  const ctx={state:'running',currentTime:1,destination:{},decodeAudioData:async()=>({duration:.3}),
    createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),
    createBufferSource:()=>{const s={connect(){},disconnect(){},start(){this.started=true},stop(){this.stopped=true;this.onended?.()}};sources.push(s);return s}};
  const voice=new AoiDamageVoice(()=>ctx,()=>muted,fetcher);
  return {voice,ctx,sources,mute:()=>{muted=true;voice.stop()}};
}
test('only the player gets a voice; overlapping hits are suppressed and the selected clip is reused',async()=>{
  const {voice,ctx,sources}=fixture();await voice.warmup();
  assert.equal(voice.play('enemy'),false);assert.equal(voice.play('player'),true);
  const first=sources[0].buffer;assert.equal(voice.play('player'),false);
  sources[0].onended();ctx.currentTime+=.5;assert.equal(voice.play('player'),true);
  assert.equal(sources[1].buffer,first);
});
test('mute stops the current voice and prevents new voices; suspended audio cannot play',async()=>{
  const f=fixture();await f.voice.warmup();assert.equal(f.voice.play('player'),true);
  f.mute();assert.equal(f.sources[0].stopped,true);assert.equal(f.voice.play('player'),false);
  const g=fixture();await g.voice.warmup();g.ctx.state='suspended';assert.equal(g.voice.play('player'),false);
});
test('missing or undecodable audio stays silent without breaking gameplay',async()=>{
  for(const fetcher of [async()=>({ok:false}),async()=>{throw Error('offline')}]){
    const {voice}=fixture(fetcher);await voice.warmup();assert.equal(voice.play('player'),false);
  }
  const {voice,ctx}=fixture();ctx.decodeAudioData=async()=>{throw Error('bad wav')};
  await voice.warmup();assert.equal(voice.play('player'),false);
});
test('warmup fetches each clip once, including concurrent input events',async()=>{
  let calls=0;const {voice}=fixture(async()=>{calls++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}});
  await Promise.all([voice.warmup(),voice.warmup(),voice.warmup()]);assert.equal(calls,1);
});
