/* タイムラプス・コンポーザー：写真の取り込み（共通）
   写真ファイルを受け取り、Web Worker（lib/photo-worker.js）で縮小・解析する。
   Web Worker が使えない端末や、Worker で読めなかった写真は、画面側で同じ処理をする（予備の経路）。
   lib/analysis.js・lib/exif.js の後に読み込むこと。 */
(function(root){
'use strict';
const {preparePhoto,shrink,pixelsOf,analyzePixels,makeCanvas}=root.TC;
const {readExifFromFile}=root.TCExif;
const WORKER_TIMEOUT_MS=30000;

function createIntake(workerUrl){
  let worker=null,seq=0;const pending=new Map();
  try{
    worker=new Worker(workerUrl);
    worker.onmessage=e=>{const p=pending.get(e.data.id);if(p){pending.delete(e.data.id);clearTimeout(p.timer);p.resolve(e.data)}};
    worker.onerror=()=>{worker=null;pending.forEach(p=>p.resolve({ok:false,error:'worker'}));pending.clear()};
  }catch(_){worker=null}

  function viaWorker(file){
    return new Promise(resolve=>{
      const id=++seq;
      const timer=setTimeout(()=>{pending.delete(id);resolve({ok:false,error:'timeout'})},WORKER_TIMEOUT_MS);
      pending.set(id,{resolve,timer});
      worker.postMessage({id,file});
    });
  }
  async function decode(file){
    if(root.createImageBitmap){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){}}
    return await new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);res(im)};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('decode'))};im.src=url});
  }
  async function viaMain(file){
    const exif=await readExifFromFile(file);
    const img=await decode(file);
    const small=shrink(preparePhoto(img));
    // 研究に送る用の大きめの写真（Web Worker と同じ。長い辺 BIG_PHOTO_MAX まで、切り抜かない）
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,s=Math.min(1,root.TC.PARAM.BIG_PHOTO_MAX/Math.max(iw,ih)),bc=makeCanvas(Math.round(iw*s),Math.round(ih*s));
    bc.getContext('2d').drawImage(img,0,0,bc.width,bc.height);
    const big=await new Promise(r=>bc.toBlob?bc.toBlob(r,'image/jpeg',.85):bc.convertToBlob({type:'image/jpeg',quality:.85}).then(r));
    if(img.close)img.close();
    const params=analyzePixels(pixelsOf(small),small.width,small.height);
    const thumb=await new Promise(r=>small.toBlob(r,'image/jpeg',.85));
    return{ok:true,params,thumb,exif,big};
  }
  // 1枚を処理する。戻り値 {ok, params, thumb(Blob), exif:{time,lat,lng}, via:'worker'|'main'}
  async function processFile(file){
    if(worker){
      const r=await viaWorker(file);
      if(r.ok)return{...r,via:'worker'};
    }
    try{return{...(await viaMain(file)),via:'main'}}
    catch(err){return{ok:false,error:String(err&&err.message||err)}}
  }
  return{processFile,hasWorker:()=>!!worker};
}

root.TCIntake=Object.freeze({createIntake});
})(typeof self!=='undefined'?self:this);
