/** Aceita somente WAV PCM16 explícito; não converte áudio cru nem inventa formato. */
export function validatedWavAudio(inline:unknown):string{
 const fail=():never=>{throw new Error('Áudio WAV inválido ou não suportado.');};
 const value=inline as any;const encoded=value?.data;
 if(!['audio/wav','audio/x-wav','audio/wave'].includes(value?.mimeType)||typeof encoded!=='string'||!encoded.length||encoded.length>2796204||/[^A-Za-z0-9+/=]/.test(encoded))fail();
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length>2*1024*1024||bytes.length<46||bytes.toString('base64')!==encoded||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE'||bytes.readUInt32LE(4)!==bytes.length-8)fail();
 let offset=12;let blockAlign=0;let dataBytes=0;let dataSeen=false;
 while(offset<bytes.length){
  if(offset+8>bytes.length)fail();const kind=bytes.toString('ascii',offset,offset+4);const size=bytes.readUInt32LE(offset+4);const start=offset+8;const end=start+size;
  if(end>bytes.length)fail();
  if(kind==='fmt '){
   if(blockAlign||dataSeen||size!==16||bytes.readUInt16LE(start)!==1)fail();
   const channels=bytes.readUInt16LE(start+2);const rate=bytes.readUInt32LE(start+4);blockAlign=bytes.readUInt16LE(start+12);
   if(![1,2].includes(channels)||![8000,16000,24000,44100,48000].includes(rate)||bytes.readUInt16LE(start+14)!==16||blockAlign!==channels*2||bytes.readUInt32LE(start+8)!==rate*blockAlign)fail();
  }
  if(kind==='data'){if(dataSeen||!blockAlign||!size||size%blockAlign)fail();dataSeen=true;dataBytes=size;}
  offset=end+(size%2);if(offset>bytes.length)fail();
 }
 if(!blockAlign||!dataBytes||offset!==bytes.length)fail();return encoded;
}
