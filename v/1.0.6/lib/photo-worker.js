/* タイムラプス・コンポーザー：写真の縮小と解析を、画面の処理とは別の場所（Web Worker）で行う。
   中で使う計算は lib/analysis.js と同じもの（読み込んで使う）。 */
importScripts('analysis.js','exif.js');
const {preparePhoto,shrink,pixelsOf,analyzePixels}=self.TC;

self.onmessage=async e=>{
  const {id,file}=e.data;
  try{
    // 撮影日時と位置（JPEG の EXIF、HEIC の中の Exif。ステップ29）
    const exif=await self.TCExif.readExifFromFile(file);
    // 写真を読み、向きを直して 320×240 に切り抜き → 256×192 に縮めて解析
    const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});
    const small=shrink(preparePhoto(bmp));
    // 研究に送る用の大きめの写真（2026-10-31、飯田の決定）：長い辺 BIG_PHOTO_MAX まで、切り抜かずに縮める。描き直すので位置などの付加情報は残らない。音には使わない
    const s=Math.min(1,self.TC.PARAM.BIG_PHOTO_MAX/Math.max(bmp.width,bmp.height)),bc=new OffscreenCanvas(Math.round(bmp.width*s),Math.round(bmp.height*s));
    bc.getContext('2d').drawImage(bmp,0,0,bc.width,bc.height);const big=await bc.convertToBlob({type:'image/jpeg',quality:.85});
    if(bmp.close)bmp.close();
    const params=analyzePixels(pixelsOf(small),small.width,small.height);
    // 保存用の小さい画像（256×192 の JPEG）
    const thumb=await small.convertToBlob({type:'image/jpeg',quality:.85});
    self.postMessage({id,ok:true,params,thumb,exif,big});
  }catch(err){
    self.postMessage({id,ok:false,error:String(err&&err.message||err)});
  }
};
