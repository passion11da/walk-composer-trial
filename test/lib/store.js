/* タイムラプス・コンポーザー：記録を端末の中に保存する（IndexedDB）
   ページを閉じても消えない。端末の外には送らない。
   保存できない環境（プライベートブラウズなど）では、何もせず失敗を返す（記録はページを閉じるまで使える）。 */
(function(root){
'use strict';
const DB_NAME='timelapse-composer-test',STORE='nodes',META='meta',VERSION=2;
let dbp=null;
function open(){
  if(dbp)return dbp;
  dbp=new Promise((resolve,reject)=>{
    try{
      const req=indexedDB.open(DB_NAME,VERSION);
      req.onupgradeneeded=()=>{const db=req.result;
        if(!db.objectStoreNames.contains(STORE)){const st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('walk','walk')}
        if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'walk'}); // 散歩の状態（記録中／終了／作曲済み）。ステップ9.0
      };
      req.onsuccess=()=>{const db=req.result;
        // iPhone では、別のアプリに切り替えている間に接続が切られることがある。次の保存でつなぎ直す
        db.onclose=()=>{dbp=null};db.onversionchange=()=>{try{db.close()}catch(_){}dbp=null};
        resolve(db)};
      req.onerror=()=>reject(req.error);
    }catch(e){reject(e)}
  });
  dbp.catch(()=>{dbp=null}); // 開けなかったときは、次に保存するときにもう一度試す
  return dbp;
}
function tx(mode,fn,name=STORE,retry=true){
  return open().then(db=>new Promise((resolve,reject)=>{
    let t;try{t=db.transaction(name,mode)}catch(e){reject(e);return}
    const st=t.objectStore(name);let out;
    Promise.resolve(fn(st)).then(v=>out=v);
    t.oncomplete=()=>resolve(out);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
  })).catch(e=>{
    // 接続が切れていた（InvalidStateError など）ときは、つなぎ直して1回だけやり直す。
    // iPhone の Safari では、理由が空（null）のまま失敗することもあるので、理由にかかわらず1回やり直す（2026-11-03、F3）
    if(retry){dbp=null;return tx(mode,fn,name,false)}
    throw e;
  });
}
const reqP=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});

// 1つの散歩の記録をすべて読む（撮影時刻の順）
function load(walk){return tx('readonly',st=>reqP(st.index('walk').getAll(walk))).then(a=>(a||[]).sort((x,y)=>x.ts-y.ts))}
// 1地点を保存（同じ id なら上書き）
function put(rec){return tx('readwrite',st=>{st.put(rec)})}
// 1地点を読む（保存できたかを確かめるため。2026-11-06）
function get(id){return tx('readonly',st=>reqP(st.get(id))).then(v=>v||null)}
// 1地点を消す
function remove(id){return tx('readwrite',st=>{st.delete(id)})}
// 1つの散歩の記録をすべて消す
function clear(walk){return load(walk).then(list=>tx('readwrite',st=>{list.forEach(r=>st.delete(r.id))})).then(()=>tx('readwrite',st=>{st.delete(walk)},META))}
// 1つの散歩を、まとめて入れ替える（控えから戻すとき）。途中で失敗したら何も変えない
function replaceAll(walk,recs){
  return load(walk).then(old=>open().then(db=>new Promise((resolve,reject)=>{
    const t=db.transaction(STORE,'readwrite'),st=t.objectStore(STORE);
    old.forEach(r=>st.delete(r.id));recs.forEach(r=>st.put(r));
    t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
  })));
}
// 散歩の状態 {walk, status:'recording'|'finished'|'composed', moodOff, updatedAt}
function getMeta(walk){return tx('readonly',st=>reqP(st.get(walk)),META).then(v=>v||null)}
// extra：散歩全体の設定（moodOff＝気分を使わない、など。ステップ12）
function setMeta(walk,status,extra){return tx('readwrite',st=>{st.put({...(extra||{}),walk,status,updatedAt:Date.now()})},META)}

// ブラウザに記録を消されにくくする（使える端末だけ）。戻り値 'granted'|'denied'|'unsupported'
async function askPersist(){
  const s=root.navigator&&navigator.storage;
  if(!s||!s.persist)return 'unsupported';
  try{if(s.persisted&&await s.persisted())return 'granted';return(await s.persist())?'granted':'denied'}catch(_){return 'denied'}
}
async function estimate(){try{return navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null}catch(_){return null}}

root.TCStore=Object.freeze({load,get,put,remove,clear,replaceAll,getMeta,setMeta,askPersist,estimate});
})(typeof self!=='undefined'?self:this);
