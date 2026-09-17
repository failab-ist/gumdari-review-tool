/* ══════════════════════════════════════════════════════
   zip.js  —  ZIP 압축 해제와 재작성
   워드·파워포인트·엑셀은 모두 ZIP 안에 XML이 든 형식입니다.
   브라우저에 들어 있는 압축 기능만 써서 직접 다룹니다. 외부 라이브러리는 쓰지 않습니다.
   ══════════════════════════════════════════════════════ */

/* ══════ ZIP ══════ */
async function unzip(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf);let eocd=-1;
  for(let i=buf.byteLength-22;i>=0;i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error('ZIP 형식이 아닙니다');
  const n=dv.getUint16(eocd+10,true);let off=dv.getUint32(eocd+16,true);const out={};
  for(let i=0;i<n;i++){
    const method=dv.getUint16(off+10,true),crc=dv.getUint32(off+16,true);
    const csize=dv.getUint32(off+20,true),usize=dv.getUint32(off+24,true);
    const nlen=dv.getUint16(off+28,true),elen=dv.getUint16(off+30,true),clen=dv.getUint16(off+32,true);
    const lo=dv.getUint32(off+42,true),name=TD.decode(u8.subarray(off+46,off+46+nlen));
    const lnl=dv.getUint16(lo+26,true),lel=dv.getUint16(lo+28,true),ds=lo+30+lnl+lel;
    /* 검사값(crc)과 원래 크기(usize)도 같이 들고 있는다.
       손대지 않은 파일을 그대로 옮길 때 이 값을 다시 계산하지 않기 위해서다. */
    out[name]={method,crc,usize,raw:u8.subarray(ds,ds+csize)};off+=46+nlen+elen+clen;
  }return out;
}
async function inflate(u8){
  /* 압축 해제는 브라우저 기능을 그대로 쓴다. 크롬·엣지 80, 사파리 16.4, 파이어폭스 113 이상이면 된다.
     예전 안내는 크롬·엣지만 적어 두어서, 다른 브라우저를 쓰는 분께 잘못된 정보를 드리고 있었다. */
  if(!('DecompressionStream'in window))
    throw new Error('이 브라우저에서는 파일을 열 수 없습니다. 크롬 · 엣지 · 사파리 · 파이어폭스의 최신 버전에서 열어 주세요');
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
}
async function deflate(u8){if(!('CompressionStream'in window))return null;
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());}
async function readEntry(z,n){const e=z[n];if(!e)return null;return TD.decode(e.method===8?await inflate(e.raw):e.raw)}
async function rawEntry(z,n){const e=z[n];if(!e)return null;return e.method===8?await inflate(e.raw):e.raw}
const CRCT=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0}return t})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRCT[(c^u8[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
/* 검수본을 만들 때 우리가 고치는 것은 글이 든 XML 몇 개뿐이다.
   사진과 동영상은 손대지 않으므로, 압축을 풀었다가 다시 압축하고 검사값까지 새로 계산할 이유가 없다.
   예전에는 그렇게 해서 50MB짜리 원고를 열면 화면이 몇 초씩 멈췄고,
   게다가 미디어가 압축되지 않은 채로 다시 담겨 파일이 원본보다 커졌다.
   지금은 손대지 않은 항목을 압축된 그대로, 원본 검사값과 함께 옮긴다.

   files 항목은 두 가지 형태를 받는다.
     {name, data}  — 우리가 새로 만든 내용
     {name, copy}  — 원본에서 그대로 옮길 항목 (unzip 이 준 값을 그대로 넘기면 된다) */
async function makeZip(files){
  const parts=[],cds=[];let off=0;
  for(const f of files){
    let data,method,crc,usize;
    if(f.copy){
      data=f.copy.raw;method=f.copy.method;crc=f.copy.crc;usize=f.copy.usize;
    }else{
      const isXml=/\.(xml|rels)$/i.test(f.name);data=f.data;method=0;
      if(isXml){const d=await deflate(f.data);if(d&&d.length<f.data.length){data=d;method=8}}
      crc=crc32(f.data);usize=f.data.length;
    }
    const nb=TE.encode(f.name);
    const lh=new Uint8Array(30+nb.length),ldv=new DataView(lh.buffer);
    ldv.setUint32(0,0x04034b50,true);ldv.setUint16(4,20,true);ldv.setUint16(8,method,true);ldv.setUint16(12,0x21,true);
    ldv.setUint32(14,crc,true);ldv.setUint32(18,data.length,true);ldv.setUint32(22,usize,true);ldv.setUint16(26,nb.length,true);
    lh.set(nb,30);parts.push(lh,data);
    const cd=new Uint8Array(46+nb.length),cdv=new DataView(cd.buffer);
    cdv.setUint32(0,0x02014b50,true);cdv.setUint16(4,20,true);cdv.setUint16(6,20,true);cdv.setUint16(10,method,true);cdv.setUint16(14,0x21,true);
    cdv.setUint32(16,crc,true);cdv.setUint32(20,data.length,true);cdv.setUint32(24,usize,true);
    cdv.setUint16(28,nb.length,true);cdv.setUint32(42,off,true);cd.set(nb,46);cds.push(cd);
    off+=lh.length+data.length;
  }
  let cdlen=0;cds.forEach(c=>cdlen+=c.length);
  const eo=new Uint8Array(22),edv=new DataView(eo.buffer);
  edv.setUint32(0,0x06054b50,true);edv.setUint16(8,cds.length,true);edv.setUint16(10,cds.length,true);
  edv.setUint32(12,cdlen,true);edv.setUint32(16,off,true);
  return new Blob([...parts,...cds,eo],{type:'application/octet-stream'});
}
