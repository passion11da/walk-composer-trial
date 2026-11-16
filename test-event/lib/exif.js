/* タイムラプス・コンポーザー：写真に記録された撮影日時と位置を読む（共通）
   JPEG の EXIF と、HEIC の中の Exif（ステップ29）を読む。読めないとき（PNG・情報が消された写真など）は null を返す。
   画面側と Web Worker の両方から使う。 */
(function(root){
'use strict';

// buf：ファイルの先頭部分（ArrayBuffer）。戻り値 {time: UNIX秒|null, lat, lng|null}
function readExif(buf){
  const out={time:null,lat:null,lng:null};
  try{
    const v=new DataView(buf);
    if(v.byteLength<4||v.getUint16(0)!==0xFFD8)return out; // JPEG ではない
    let p=2;
    while(p+4<=v.byteLength){
      const marker=v.getUint16(p),size=v.getUint16(p+2);
      if(marker===0xFFE1&&p+10<=v.byteLength&&v.getUint32(p+4)===0x45786966){ // "Exif"
        parseTiff(v,p+10,out);break;
      }
      if((marker&0xFF00)!==0xFF00||marker===0xFFDA)break;
      p+=2+size;
    }
  }catch(_){}
  return out;
}

function parseTiff(v,t,out){
  const le=v.getUint16(t)===0x4949;
  const u16=o=>v.getUint16(t+o,le),u32=o=>v.getUint32(t+o,le);
  const ifd=(o,fn)=>{const n=u16(o);for(let i=0;i<n;i++){const e=o+2+i*12;fn(u16(e),u16(e+2),u32(e+4),e+8)}};
  const ascii=(cnt,valOff)=>{const o=cnt>4?u32(valOff):valOff;let s='';for(let i=0;i<cnt-1;i++)s+=String.fromCharCode(v.getUint8(t+o+i));return s};
  const rational=(off,k)=>{const o=u32(off)+k*8;const d=u32(o+4);return d?u32(o)/d:0};
  let exifPtr=null,gpsPtr=null,dtFallback=null;
  ifd(u32(4),(tag,type,cnt,valOff)=>{
    if(tag===0x8769)exifPtr=u32(valOff);
    if(tag===0x8825)gpsPtr=u32(valOff);
    if(tag===0x0132)dtFallback=ascii(cnt,valOff); // DateTime（撮影日時がないときの予備）
  });
  let dt=null,offset=null;
  if(exifPtr!=null)ifd(exifPtr,(tag,type,cnt,valOff)=>{
    if(tag===0x9003)dt=ascii(cnt,valOff);        // DateTimeOriginal
    if(tag===0x9011)offset=ascii(cnt,valOff);    // OffsetTimeOriginal（例 "+09:00"）
  });
  out.time=toUnix(dt||dtFallback,offset);
  if(gpsPtr!=null){
    let latRef='N',lngRef='E',lat=null,lng=null;
    ifd(gpsPtr,(tag,type,cnt,valOff)=>{
      if(tag===1)latRef=String.fromCharCode(v.getUint8(t+valOff));
      if(tag===3)lngRef=String.fromCharCode(v.getUint8(t+valOff));
      if(tag===2)lat=rational(valOff,0)+rational(valOff,1)/60+rational(valOff,2)/3600;
      if(tag===4)lng=rational(valOff,0)+rational(valOff,1)/60+rational(valOff,2)/3600;
    });
    if(lat!=null&&lng!=null&&(lat||lng)){out.lat=latRef==='S'?-lat:lat;out.lng=lngRef==='W'?-lng:lng}
  }
}

// "2026:10:08 14:02:10" → UNIX秒。時差の記録があれば使い、なければ端末の地域の時刻とみなす
function toUnix(s,offset){
  const m=/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s||'');if(!m)return null;
  const [y,mo,d,h,mi,se]=m.slice(1).map(Number);
  if(y<1990)return null;
  const om=/^([+-])(\d{2}):(\d{2})$/.exec(offset||'');
  if(om){const sign=om[1]==='+'?1:-1;return Date.UTC(y,mo-1,d,h,mi,se)/1000-sign*(+om[2]*3600+ +om[3]*60)}
  return Math.round(new Date(y,mo-1,d,h,mi,se).getTime()/1000);
}

/* ステップ29（2026-10-28）：iPhone の HEIC 写真（名前が .jpeg でも中身が HEIC のことがある）から撮影日時と位置を読む。外の部品は使わない。
   HEIC は「箱」を並べた形（ISO の画像ファイルの形）。meta の箱の中の iinf（中身の一覧）から種類が Exif の項目を探し、iloc（場所の表）で
   ファイルの中の位置と長さを知り、その部分を JPEG と同じ読み方（TIFF）で読む。読めないときは {time:null,...}（今までどおり5分おきの決まり） */
function isHeif(buf){try{const v=new DataView(buf);return v.byteLength>=12&&v.getUint32(4)===0x66747970}catch(_){return false}} // "ftyp"
function heifExifRange(buf){
  const v=new DataView(buf),N=v.byteLength,fourcc=o=>String.fromCharCode(v.getUint8(o),v.getUint8(o+1),v.getUint8(o+2),v.getUint8(o+3));
  const boxes=(start,end,fn)=>{let p=start;while(p+8<=end){let size=v.getUint32(p),hdr=8;const type=fourcc(p+4);
      if(size===1){if(p+16>N)return;size=Number(v.getBigUint64(p+8));hdr=16}else if(size===0)size=end-p;
      if(size<hdr)return;if(fn(type,p+hdr,Math.min(p+size,end))===false)return;p+=size}};
  let meta=null;boxes(0,N,(t,s,e)=>{if(t==='meta'){meta=[s+4,e];return false}}); // meta は版と印（4バイト）が先に付く
  if(!meta)return null;let exifId=null,iloc=null;
  boxes(meta[0],meta[1],(t,s,e)=>{
    if(t==='iinf'){const ver=v.getUint8(s);let p=s+4;const cnt=ver===0?v.getUint16(p):v.getUint32(p);p+=ver===0?2:4;
      boxes(p,e,(t2,s2)=>{if(t2!=='infe')return;const iv=v.getUint8(s2);if(iv<2)return;let q=s2+4;const id=iv===2?v.getUint16(q):v.getUint32(q);q+=iv===2?2:4;q+=2;
        if(fourcc(q)==='Exif'&&exifId==null)exifId=id})}
    if(t==='iloc')iloc=[s,e]});
  if(exifId==null||!iloc)return null;
  const [s]=iloc,ver=v.getUint8(s);let p=s+4;const b1=v.getUint8(p),b2=v.getUint8(p+1);p+=2;
  const offSize=b1>>4,lenSize=b1&15,baseSize=b2>>4,idxSize=(ver===1||ver===2)?b2&15:0;
  const rd=n=>{let x=0;for(let i=0;i<n;i++)x=x*256+v.getUint8(p+i);p+=n;return x};
  const cnt=ver<2?rd(2):rd(4);
  for(let i=0;i<cnt;i++){const id=ver<2?rd(2):rd(4);let method=0;if(ver===1||ver===2)method=rd(2)&15;rd(2);const base=rd(baseSize);const ec=rd(2);
    let first=null;for(let k=0;k<ec;k++){if(idxSize)rd(idxSize);const off=rd(offSize),len=rd(lenSize);if(first==null)first={offset:base+off,length:len}}
    if(id===exifId)return method===0&&first?first:null}
  return null;
}
/* Exif の項目の中身：先頭4バイトが「TIFF の始まりまでのずれ」、その先が TIFF（"Exif\0\0" が前に付くこともある） */
function readHeifExifPayload(buf){const out={time:null,lat:null,lng:null};try{const v=new DataView(buf);let t=4+v.getUint32(0);
    if(t+8>v.byteLength)return out;const bo=v.getUint16(t);if(bo!==0x4949&&bo!==0x4D4D){for(let k=4;k+8<=Math.min(v.byteLength,64);k++){const b=v.getUint16(k);if(b===0x4949||b===0x4D4D){t=k;break}}}
    parseTiff(v,t,out)}catch(_){}return out}
/* ファイル（Blob）から撮影日時と位置を読む。JPEG は先頭256KB、HEIC は Exif の項目の場所を読む。画面側と Web Worker の両方で使う */
async function readExifFromFile(file){
  const head=await file.slice(0,262144).arrayBuffer();
  if(!isHeif(head))return readExif(head);
  try{const r=heifExifRange(head);if(!r||!r.length||r.length>1048576)return{time:null,lat:null,lng:null};
    return readHeifExifPayload(await file.slice(r.offset,r.offset+r.length).arrayBuffer())}catch(_){return{time:null,lat:null,lng:null}}
}

root.TCExif=Object.freeze({readExif,readExifFromFile,isHeif});
})(typeof self!=='undefined'?self:this);
