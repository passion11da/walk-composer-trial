/* タイムラプス・コンポーザー：サンプルの風景画像と3つのサンプル散歩（共通）
   mockup.html と tools/measure.html の両方がこのファイルを読み込む。lib/analysis.js の後に読み込むこと。 */
(function(root){
'use strict';
const {PARAM,mulberry32}=root.TC;
const W=PARAM.PHOTO_W,H=PARAM.PHOTO_H;

/* ---------- 風景のサンプル画像を描く ---------- */
function drawScene(kind,seed){
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const r=mulberry32(seed);
  const sky=(y0,y1,top='#5b98de',bot='#c3dcf2')=>{const g=x.createLinearGradient(0,y0,0,y1);g.addColorStop(0,top);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,y0,W,y1-y0)};
  const cloud=(cx,cy,s)=>{x.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<5;i++){x.beginPath();x.ellipse(cx+(i-2)*s*.6,cy+(r()-.5)*s*.3,s*.7,s*.32,0,0,7);x.fill()}};
  const poly=(pts,fill)=>{x.fillStyle=fill;x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill()};
  const blob=(cx,cy,rad,fill)=>{x.fillStyle=fill;x.beginPath();x.arc(cx,cy,rad,0,7);x.fill()};
  const lines=(n,y0,y1,col,len)=>{x.strokeStyle=col;x.lineWidth=1;for(let i=0;i<n;i++){const y=y0+r()*(y1-y0),a=r()*W;x.beginPath();x.moveTo(a,y);x.lineTo(a+len*(.6+r()),y);x.stroke()}};
  const greens=['#3f7a3a','#4f8d43','#679e4f','#2f6631','#5a9447'];
  if(kind==='river'){
    sky(0,150);for(let i=0;i<3;i++)cloud(40+r()*240,25+r()*60,18+r()*16);
    x.fillStyle='#5f8a4a';x.beginPath();x.moveTo(0,152);for(let px=0;px<=W;px+=8)x.lineTo(px,140+Math.sin(px*.07+seed)*4-r()*5);x.lineTo(W,152);x.fill();
    x.fillStyle='#86a6bd';x.fillRect(0,150,W,28);lines(14,154,174,'rgba(255,255,255,.35)',30);
    const g=x.createLinearGradient(0,178,0,H);g.addColorStop(0,'#86b05e');g.addColorStop(1,'#5e8a3e');x.fillStyle=g;x.fillRect(0,178,W,62);
    x.fillStyle='#b9b3a5';x.fillRect(0,204,W,7);
  }else if(kind==='park'){
    sky(0,120,'#62a0e0','#cfe3f3');
    x.fillStyle='#7fae55';x.fillRect(0,150,W,90);
    poly([[146,150],[176,150],[262,240],[58,240]],'#c9c4b8');
    for(let i=0;i<10;i++){x.fillStyle='#5a4632';x.fillRect(10+r()*300,70+r()*30,6+r()*5,90)}
    for(let i=0;i<30;i++)blob(r()*W,55+r()*85,14+r()*22,greens[Math.floor(r()*greens.length)]);
  }else if(kind==='street'){
    sky(0,120,'#5d9ade','#bfd9f1');
    x.fillStyle='#a7a9a6';x.fillRect(118,40,86,160);
    poly([[0,0],[130,48],[130,192],[0,240]],'#8f9190');
    poly([[320,0],[192,48],[192,192],[320,240]],'#9c9a95');
    x.fillStyle='#5e6162';for(let cI=0;cI<4;cI++)for(let rI=0;rI<7;rI++){x.fillRect(8+cI*30,30+rI*26,14,16);x.fillRect(206+cI*28,30+rI*26,12,16)}
    const sc=['#c8473a','#e0b13c','#d9d4c8','#d0582e','#e5c94a'];
    for(let i=0;i<9;i++){x.fillStyle=sc[Math.floor(r()*sc.length)];const left=r()<.5;x.fillRect(left?20+r()*90:200+r()*100,40+r()*120,10+r()*8,34+r()*30)}
    poly([[130,192],[192,192],[320,240],[0,240]],'#6f7270');
    x.strokeStyle='#2c2f2e';x.lineWidth=3;[[96,10,200],[232,10,206]].forEach(([px,a,b])=>{x.beginPath();x.moveTo(px,a);x.lineTo(px,b);x.stroke()});
    x.lineWidth=1;for(let i=0;i<4;i++){x.beginPath();x.moveTo(96,20+i*6);x.quadraticCurveTo(160,40+i*6,232,22+i*6);x.stroke()}
  }else if(kind==='alley'){
    sky(0,70,'#5d97dc','#b5d3ef');
    x.fillStyle='#555856';x.fillRect(140,70,40,140);
    poly([[0,0],[142,0],[142,200],[0,240]],'#6c6e6c');
    poly([[320,0],[178,0],[178,200],[320,240]],'#7a7874');
    x.strokeStyle='#3f4241';x.lineWidth=3;for(let i=0;i<7;i++){const px=r()<.5?10+r()*120:186+r()*120;x.beginPath();x.moveTo(px,0);x.lineTo(px,230);x.stroke()}
    x.fillStyle='#b9bab5';for(let i=0;i<3;i++)x.fillRect(r()<.5?20+r()*80:200+r()*80,40+r()*100,34,22);
    poly([[142,200],[178,200],[320,240],[0,240]],'#4b4d4b');
    for(let i=0;i<5;i++)blob(20+r()*280,214+r()*14,6+r()*5,greens[i%greens.length]);
  }else if(kind==='shrine'){
    const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1f3a26');g.addColorStop(1,'#2e4d2f');x.fillStyle=g;x.fillRect(0,0,W,H);
    for(let i=0;i<5;i++)blob(r()*W,r()*30,6+r()*6,'#9cc3e6');
    for(let i=0;i<40;i++)blob(r()*W,r()*110,14+r()*26,['#2b5a2e','#355f34','#264c29','#3e6f3a'][i%4]);
    for(let i=0;i<13;i++){x.fillStyle='#3b2e24';x.fillRect(r()*W,40+r()*30,7+r()*9,170)}
    x.fillStyle='#b5402f';x.fillRect(112,92,9,118);x.fillRect(200,92,9,118);x.fillRect(96,84,129,10);x.fillRect(106,106,110,6);
    x.fillStyle='#a7a49b';x.fillRect(0,206,W,34);
    x.fillStyle='#8c897f';for(let i=0;i<120;i++)x.fillRect(r()*W,206+r()*34,2,2);
  }else if(kind==='bridge'){
    sky(0,150,'#5f86cc','#e3c39f');cloud(80+r()*160,40,24);
    x.fillStyle='#7d8090';for(let px=0;px<W;px+=14+r()*10){const h=10+r()*34;x.fillRect(px,150-h,12+r()*8,h)}
    const g=x.createLinearGradient(0,150,0,H);g.addColorStop(0,'#6b8cab');g.addColorStop(1,'#4c6a86');x.fillStyle=g;x.fillRect(0,150,W,90);
    lines(18,158,236,'rgba(255,220,180,.4)',30);
    x.fillStyle='#777a78';[50,170,286].forEach(px=>x.fillRect(px,128,12,52));
    x.fillStyle='#8a8c8a';x.fillRect(0,118,W,12);
    x.fillStyle='#4f5251';x.fillRect(0,106,W,2);for(let px=0;px<W;px+=10)x.fillRect(px,106,1,12);
  }else if(kind==='sea'||kind==='dusk'){
    const dk=kind==='dusk';
    sky(0,128,dk?'#6c8ed2':'#5899df',dk?'#f0c79c':'#d3e6f5');for(let i=0;i<(dk?2:4);i++)cloud(30+r()*260,20+r()*70,14+r()*14);
    const g=x.createLinearGradient(0,128,0,190);g.addColorStop(0,dk?'#5f7fb0':'#4f86b8');g.addColorStop(1,dk?'#47668e':'#3c6f9e');x.fillStyle=g;x.fillRect(0,128,W,62);
    lines(22,132,186,dk?'rgba(255,214,170,.45)':'rgba(255,255,255,.35)',36);
    x.fillStyle='#bfae8c';x.fillRect(0,188,W,10);x.fillStyle='#d9c8a4';x.fillRect(0,198,W,42);
    x.fillStyle='#c4b28d';for(let i=0;i<60;i++)x.fillRect(r()*W,200+r()*38,3,1);
  }else if(kind==='plaza'){
    sky(0,112,'#619fe2','#cfe2f3');for(let i=0;i<2;i++)cloud(40+r()*240,30+r()*40,16);
    x.fillStyle='#a5a7a5';for(let px=0;px<W;px+=22+r()*14){const h=8+r()*22;x.fillRect(px,112-h,18+r()*10,h)}
    x.fillStyle='#b8b6b0';x.fillRect(0,112,W,128);
    x.strokeStyle='#9c9a94';x.lineWidth=1;
    for(let k=0;k<9;k++){const y=112+Math.pow(k/8,1.8)*128;x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke()}
    for(let k=-10;k<=10;k++){x.beginPath();x.moveTo(160,112);x.lineTo(160+k*40,240);x.stroke()}
    for(let i=0;i<4;i++){const tx=20+r()*280;x.fillStyle='#5a4632';x.fillRect(tx-1,96,3,16);blob(tx,92,9,greens[i%5])}
  }else if(kind==='greenway'){
    sky(0,240,'#6aa6e2','#d2e5f3');
    for(let i=0;i<9;i++){x.fillStyle='#4a3a2a';const tx=r()<.5?r()*100:220+r()*100;x.fillRect(tx,60,5+r()*6,150)}
    for(let i=0;i<55;i++){const left=r()<.5;blob(left?r()*130:190+r()*130,r()*170,16+r()*26,greens[Math.floor(r()*5)])}
    for(let i=0;i<8;i++)blob(110+r()*100,r()*25,14+r()*12,greens[i%5]);
    poly([[140,170],[180,170],[270,240],[50,240]],'#cdbf9f');
    poly([[0,190],[140,170],[50,240],[0,240]],'#6c9a45');poly([[320,190],[180,170],[270,240],[320,240]],'#6c9a45');
  }else{ // brick
    sky(0,60,'#6aa2e0','#c6ddf2');
    x.fillStyle='#7c3c2c';x.fillRect(130,60,60,140);
    poly([[0,0],[132,0],[132,200],[0,240]],'#9a4a35');
    poly([[320,0],[188,0],[188,200],[320,240]],'#8f4632');
    x.strokeStyle='rgba(60,25,15,.5)';x.lineWidth=1;
    for(let y=6;y<240;y+=8){x.beginPath();x.moveTo(0,y);x.lineTo(132,y*.9+2);x.stroke();x.beginPath();x.moveTo(188,y*.9+2);x.lineTo(W,y);x.stroke()}
    poly([[132,200],[188,200],[320,240],[0,240]],'#8a6a50');
    x.fillStyle='#6f533e';for(let i=0;i<90;i++)x.fillRect(r()*W,205+r()*34,4,2);
    x.fillStyle='#222';[40,280].forEach(px=>{x.fillRect(px,30,3,60);x.fillRect(px-6,26,15,8)});
  }
  return c;
}
const KINDS=['river','park','street','alley','shrine','bridge','sea','plaza','greenway','brick'];

/* ---------- サンプルの実写写真（2026-10-21、ユーザーの指示 D-27：描いた絵を似た実写の写真に差し替える） ----------
   samples/ にある 400×300 の JPEG（ウィキメディア・コモンズの自由に使える写真。位置などの情報は取り除いた）。
   各ノードの p がファイル名。mood・sabi は、ステップ13・14 を聴き比べるための例（一言メモから Claude Code が付けた。実装側の仮決め（要確認））。KIND_PHOTOS は、サンプルの散歩で撮影するときに使う写真（種類ごと）。
   CREDITS は撮った人と使ってよい条件（表示が必要なものがあるので、画面の「写真の出典」に出す） */
const KIND_PHOTOS={river:'a1-river',park:'a2-park',street:'a3-street',alley:'a5-alley',shrine:'a6-shrine',bridge:'a7-bridge',sea:'c1-sea',plaza:'b1-plaza',greenway:'b9-greenway',brick:'b4-brick'};
const CREDITS=[
  {p:'a1-river',title:'千住河川敷 荒川サイクリングロード2026-10 (1)',author:'Masao',license:'CC BY-SA 4.0',url:'https://commons.wikimedia.org/wiki/File:%E5%8D%83%E4%BD%8F%E6%B2%B3%E5%B7%9D%E6%95%B7_%E8%8D%92%E5%B7%9D%E3%82%B5%E3%82%A4%E3%82%AF%E3%83%AA%E3%83%B3%E3%82%B0%E3%83%AD%E3%83%BC%E3%83%892026-10_(1).jpg'},
  {p:'a2-park',title:'松山総合公園08 園路',author:'松山市役所',license:'CC BY 4.0',url:'https://commons.wikimedia.org/wiki/File:%E6%9D%BE%E5%B1%B1%E7%B7%8F%E5%90%88%E5%85%AC%E5%9C%9208_%E5%9C%92%E8%B7%AF.jpg'},
  {p:'a3-street',title:'北助松商店街 2024',author:'ほっきー',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%8C%97%E5%8A%A9%E6%9D%BE%E5%95%86%E5%BA%97%E8%A1%97_2024.jpg'},
  {p:'a4-street',title:'天下茶屋駅前商店街 2024',author:'ほっきー',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%A4%A9%E4%B8%8B%E8%8C%B6%E5%B1%8B%E9%A7%85%E5%89%8D%E5%95%86%E5%BA%97%E8%A1%97_2024.jpg'},
  {p:'a5-alley',title:'姫津地区の裏路地 01',author:'番記者',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%A7%AB%E6%B4%A5%E5%9C%B0%E5%8C%BA%E3%81%AE%E8%A3%8F%E8%B7%AF%E5%9C%B0_01.jpg'},
  {p:'a6-shrine',title:'木野愛宕神社 境内',author:'龍岳',license:'CC BY-SA 4.0',url:'https://commons.wikimedia.org/wiki/File:%E6%9C%A8%E9%87%8E%E6%84%9B%E5%AE%95%E7%A5%9E%E7%A4%BE_%E5%A2%83%E5%86%85.jpg'},
  {p:'a7-bridge',title:'江戸川大橋',author:'千葉の番人',license:'CC BY-SA 4.0',url:'https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E5%A4%A7%E6%A9%8B.jpg'},
  {p:'b1-plaza',title:'室蘭駅駅前広場',author:'Punkssand',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%AE%A4%E8%98%AD%E9%A7%85%E9%A7%85%E5%89%8D%E5%BA%83%E5%A0%B4.jpg'},
  {p:'b2-street',title:'蕨駅・西口の商店街',author:'Souka Kinmei',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E8%95%A8%E9%A7%85%E3%83%BB%E8%A5%BF%E5%8F%A3%E3%81%AE%E5%95%86%E5%BA%97%E8%A1%97.jpg'},
  {p:'b3-street',title:'貝塚中央商店街 2025',author:'ほっきー',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E8%B2%9D%E5%A1%9A%E4%B8%AD%E5%A4%AE%E5%95%86%E5%BA%97%E8%A1%97_2025.jpg'},
  {p:'b4-brick',title:'御料車庫移築レンガ壁 01',author:'ドクター・イエロー',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%BE%A1%E6%96%99%E8%BB%8A%E5%BA%AB%E7%A7%BB%E7%AF%89%E3%83%AC%E3%83%B3%E3%82%AC%E5%A3%81_01.jpg'},
  {p:'b5-alley',title:'姫津地区の裏路地 02',author:'番記者',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%A7%AB%E6%B4%A5%E5%9C%B0%E5%8C%BA%E3%81%AE%E8%A3%8F%E8%B7%AF%E5%9C%B0_02.jpg'},
  {p:'b6-alley',title:'姫津地区の裏路地 04',author:'番記者',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%A7%AB%E6%B4%A5%E5%9C%B0%E5%8C%BA%E3%81%AE%E8%A3%8F%E8%B7%AF%E5%9C%B0_04.jpg'},
  {p:'b7-alley',title:'姫津地区の裏路地 05',author:'番記者',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%A7%AB%E6%B4%A5%E5%9C%B0%E5%8C%BA%E3%81%AE%E8%A3%8F%E8%B7%AF%E5%9C%B0_05.jpg'},
  {p:'b8-street',title:'尾道 本通り商店街',author:'Drivephotographer',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%B0%BE%E9%81%93_%E6%9C%AC%E9%80%9A%E3%82%8A%E5%95%86%E5%BA%97%E8%A1%97.jpg'},
  {p:'b9-greenway',title:'太尾堤緑道',author:'与謝野鋼管',license:'CC0',url:'https://commons.wikimedia.org/wiki/File:%E5%A4%AA%E5%B0%BE%E5%A0%A4%E7%B7%91%E9%81%93.jpg'},
  {p:'c1-sea',title:'四倉海水浴場20261011-P1088698',author:'くろふね',license:'CC BY 4.0',url:'https://commons.wikimedia.org/wiki/File:%E5%9B%9B%E5%80%89%E6%B5%B7%E6%B0%B4%E6%B5%B4%E5%A0%B420261011-P1088698.jpg'},
  {p:'c2-sea',title:'白浜海水浴場20240927-P1057883',author:'くろふね',license:'CC BY 4.0',url:'https://commons.wikimedia.org/wiki/File:%E7%99%BD%E6%B5%9C%E6%B5%B7%E6%B0%B4%E6%B5%B4%E5%A0%B420240927-P1057883.jpg'},
  {p:'c3-plaza',title:'松林 弓削島 愛媛県',author:'minato kaidou',license:'CC BY-SA 2.0',url:'https://commons.wikimedia.org/wiki/File:%E6%9D%BE%E6%9E%97_%E5%BC%93%E5%89%8A%E5%B3%B6_%E6%84%9B%E5%AA%9B%E7%9C%8C.jpg'},
  {p:'c4-greenway',title:'松風広場の松林',author:'Nishikinoakira',license:'CC BY-SA 4.0',url:'https://commons.wikimedia.org/wiki/File:%E6%9D%BE%E9%A2%A8%E5%BA%83%E5%A0%B4%E3%81%AE%E6%9D%BE%E6%9E%97.jpg'},
  {p:'c5-bridge',title:'十勝川と豊頃大橋 ( Tokachi River and Toyokoro Bridge) - panoramio',author:'pakku',license:'CC BY 3.0',url:'https://commons.wikimedia.org/wiki/File:%E5%8D%81%E5%8B%9D%E5%B7%9D%E3%81%A8%E8%B1%8A%E9%A0%83%E5%A4%A7%E6%A9%8B_(_Tokachi_River_and_Toyokoro_Bridge)_-_panoramio.jpg'},
  {p:'c6-dusk',title:'干潟の海に沈む夕日 - panoramio',author:'Yuji Sakamoto',license:'CC BY-SA 3.0',url:'https://commons.wikimedia.org/wiki/File:%E5%B9%B2%E6%BD%9F%E3%81%AE%E6%B5%B7%E3%81%AB%E6%B2%88%E3%82%80%E5%A4%95%E6%97%A5_-_panoramio.jpg'}
];
/* 写真を読み込む。読めなかった写真は入れない（呼ぶ側で、描いた絵に戻す） */
function loadSamplePhotos(base){
  const names=[...new Set(CREDITS.map(c=>c.p))],out={};
  return Promise.all(names.map(n=>new Promise(res=>{const im=new Image();im.onload=()=>{out[n]=im;res()};im.onerror=()=>res();im.src=base+n+'.jpg'}))).then(()=>out);
}

/* ---------- サンプルの散歩（位置は出発点からの東西・南北メートル） ---------- */
const WALKS=[
  {id:'A',name:'川から神社へ',desc:'河川敷から商店街と路地を抜け、神社と橋へ。景色がよく切り替わる散歩。',
   t0:Date.UTC(2026,9,4,5,2,10)/1000,origin:[35.6052,139.6431],
   map:{water:[{path:[[-400,-80],[150,-60],[600,140],[1000,470],[1400,720]],w:80}],green:[{c:[240,230],r:[150,110]},{c:[640,760],r:[110,90]}]},
   nodes:[
    {p:'a1-river',mood:1,k:'river',s:11,o:0,e:0,n:0,memo:'空が急に広い',note:'堤防に上がった瞬間、視界の上半分が全部空になった。車の音が急に遠くなった気がする。'},
    {p:'a2-park',mood:-1,k:'park',s:23,o:390,e:240,n:210,memo:'木の匂い',note:''},
    {p:'a3-street',mood:0,k:'street',s:37,o:1230,e:520,n:470,memo:'看板がうるさい',note:'色が多すぎて、どこを見ればいいのか分からなかった。'},
    {p:'a4-street',k:'street',s:38,o:1235,e:525,n:474,memo:'（もう1枚）',note:''},
    {p:'a5-alley',mood:-1,k:'alley',s:41,o:1780,e:730,n:620,memo:'狭い、暗い',note:''},
    {p:'a6-shrine',mood:-2,k:'shrine',s:53,o:1960,e:650,n:730,memo:'急に静か',note:'路地を抜けたら神社。音が吸い込まれる感じがして、しばらく立ち止まった。'},
    {p:'a7-bridge',mood:2,sabi:true,k:'bridge',s:67,o:3040,e:1000,n:500,memo:'夕方の風',note:''},
   ]},
  {id:'B',name:'駅前の商店街を抜ける',desc:'人の多い駅前から路地へ。短い間隔で次々に撮った、せわしない散歩。',
   t0:Date.UTC(2026,9,5,9,10,0)/1000,origin:[35.6581,139.7012],
   map:{water:[],green:[{path:[[470,420],[620,500],[820,560]],w:70}],plaza:[{c:[0,0],r:[70,55]}]},
   nodes:[
    {p:'b1-plaza',mood:1,k:'plaza',s:101,o:0,e:0,n:0,memo:'改札を出たら広い',note:''},
    {p:'b2-street',mood:0,k:'street',s:102,o:150,e:80,n:90,memo:'人が多い',note:''},
    {p:'b3-street',mood:0,k:'street',s:103,o:290,e:150,n:170,memo:'電線だらけ',note:'見上げると電線が空を細かく切っていた。'},
    {p:'b4-brick',k:'brick',s:104,o:470,e:230,n:215,memo:'レンガの壁',note:''},
    {p:'b5-alley',mood:-1,k:'alley',s:105,o:700,e:300,n:280,memo:'室外機の音',note:''},
    {p:'b6-alley',k:'alley',s:106,o:704,e:303,n:284,memo:'（もう1枚）',note:''},
    {p:'b7-alley',mood:-2,k:'alley',s:107,o:880,e:335,n:360,memo:'行き止まり？',note:'抜けられるか分からず、少し不安になった。'},
    {p:'b8-street',mood:1,k:'street',s:108,o:1100,e:420,n:420,memo:'急に明るい',note:''},
    {p:'b9-greenway',mood:2,sabi:true,k:'greenway',s:109,o:1350,e:560,n:470,memo:'緑道に出た',note:'音が一段下がった。ここでやっと深呼吸した。'},
   ]},
  {id:'C',name:'海沿いをゆっくり',desc:'砂浜と松林の続く海岸を、長く立ち止まりながら。開けた風景が多い散歩。',
   t0:Date.UTC(2026,9,6,6,20,0)/1000,origin:[35.3105,139.4870],
   map:{water:[{poly:[[-600,-160],[600,-300],[1200,-400],[1800,-340],[2400,-450],[3200,-700],[3200,-2200],[-600,-2200]]},{path:[[2300,1000],[2310,300],[2300,-460]],w:60}],green:[{path:[[200,40],[900,-60],[1700,-30],[2200,-120]],w:150}]},
   nodes:[
    {p:'c1-sea',mood:2,sabi:true,k:'sea',s:201,o:0,e:0,n:0,memo:'水平線しかない',note:'目の前に何もない。どこまで見ていいのか分からなくなる。'},
    {p:'c2-sea',mood:1,k:'sea',s:202,o:780,e:600,n:-170,memo:'まだ海',note:''},
    {p:'c3-plaza',mood:0,k:'plaza',s:203,o:1620,e:1150,n:-260,memo:'海辺の広場',note:''},
    {p:'c4-greenway',mood:-1,k:'greenway',s:204,o:2400,e:1700,n:-120,memo:'松林',note:'松の影の中は風が弱かった。'},
    {p:'c5-bridge',mood:0,k:'bridge',s:205,o:3300,e:2300,n:-330,memo:'河口の橋',note:''},
    {p:'c6-dusk',mood:1,sabi:true,k:'dusk',s:206,o:4020,e:2750,n:-560,memo:'夕方の海',note:'同じ海なのに、最初と色が違って見えた。'},
   ]},
];

root.TCSamples=Object.freeze({drawScene,KINDS,WALKS,KIND_PHOTOS,CREDITS,loadSamplePhotos});
})(typeof self!=='undefined'?self:this);
