/* タイムラプス・コンポーザー：写真の解析と判定（共通）
   mockup.html と tools/measure.html の両方がこのファイルを読み込む。
   計算式と定数は docs/algorithm.md 3章と同じ名前・同じ値にする。 */
(function(root){
'use strict';

/* ---------- しきい値・係数（docs/algorithm.md と同じ名前・同じ値。数値はすべて暫定） ---------- */
const PARAM=Object.freeze({
  // STEP 1 前処理
  PHOTO_W:320, PHOTO_H:240,
  ANALYZE_W:256, ANALYZE_H:192,
  // STEP 2 ピクセル分類
  ART_S_MAX:.15, ART_V_MIN:.15, ART_V_MAX:.90,
  SKY_H_MIN:180, SKY_H_MAX:250, SKY_V_MIN:.35,
  PLANT_H_MIN:70, PLANT_H_MAX:170, PLANT_S_MIN:.20, PLANT_V_MIN:.15,
  // STEP 3 線と開け方
  SOBEL_T:60, EDGE_NORM:.26, HORIZON_ROW:.30,
  OPEN_SKY_NORM:.6, OPEN_W_SKY:.5, OPEN_W_HORIZON:.5,
  // STEP 4 段階1の追加の値
  SHADOW_V:.25, CONTRAST_NORM:.30,
  WARM_S_MIN:.2, WARM_H_MAX:60, WARM_H_MIN2:300, COOL_H_MIN:160, COOL_H_MAX:260,
  HIGHLIGHT_V:.95, HIGHLIGHT_NORM:.05, HIGHLIGHT_BLOCK_MAX:.5,
  DIV_S_MIN:.2, DIV_BINS:12, DARK_V:.35, TEX_BLOCK:8, TEX_NORM:40,
  SKYLINE_COLS:16, SKYLINE_ROW_SKY:.5,
  // ステップ9.1（見直し点①〜⑥。algorithm.md 4.3、指示書 v0.6 第3部）
  CLOUD_S_MAX:.15, CLOUD_V_MIN:.6, PLUCK_MELODY_PROB:.25, MIN_BARS_91:2, BELL_MAX_HZ:2100, UNKNOWN_INTERVAL_SEC:300,
  // ステップ10：実写真（2026-10-18 相模線 24枚）での調整。開発用 ON/OFF「10 実写真での調整」で使う
  PLANT_H_MIN_10:50, EDGE_NORM_10:.64,
  // 素材は周囲に合わせる・夜（2026-10-20、ユーザーの決定。数値は暫定）
  // 長い散歩の滞在時間の上限（2026-10-21、ユーザーの決定 D-24）：上限＝max(DT_MAX, 写真の間隔の平均 × DT_REL_K)
  DT_REL_K:2,
  // 街の種類（2026-10-21、ユーザーの希望 D-25。検索した町の写真29枚で調整。数値は暫定）
  //   横線のくり返し（REP_*）：上3分の2の、色の薄い画素の横向きの線を行ごとに数え、上下に一定の間隔でくり返す度合い（自己相関の最大）
  REP_SOBEL_T:100, REP_S_MAX:.25, REP_LAG_MIN:4, REP_LAG_MAX:24, CITY_REP:.6, CITY_SHOP_EDGE:.6, CITY_SHOP_PLANT_MAX:.1,
  // 気分（ステップ13）とサビ（ステップ14）。配列は気分 −2・−1・0・＋1・＋2 の順。数値は値（暫定。algorithm.md 3.15・3.16）
  MOOD_GAIN:[.58,.65,.72,.79,.86], MOOD_CUT:[.5,.75,1,1.25,1.5], MOOD_REV:[.15,.07,0,0,-.05], MOOD_MEL:[.26,.34,.42,.5,.58],
  MOOD_SWING:.55, SABI_MEL:.6, SABI_MAX:2, VOL_TICK:.018,
  // ジャズ（ex1b、統合仕様書 v1.3 4-2。数値は値（暫定）。最後は耳で決める）
  //   跳ね（長い音：短い音）：伴奏・低音・ブラシ 2.5:1（2.0〜3.0 で調整）、メロディ 1.7:1。食い込み（4拍目の裏から次の小節へ）の割合
  JAZZ_SWING_ACC:2.5, JAZZ_SWING_MEL:1.7, JAZZ_ANTICIP:.35,
  //   ビブラフォンの揺れ（毎秒）と余韻（秒）、ウッドベース（はじく弦の計算）の減り方と長さ（秒）、音量
  VIBES_TREM_HZ:5, VIBES_TREM_DEPTH:.3, VIBES_DECAY:2.2, KS_DECAY:.996, KS_LEN:1.6,
  VOL_WBASS:.24, VOL_VIBES:.045, VOL_BRUSH:.010, VOL_BTAP:.012,
  //   ジャズの生の楽器（D-46。すべてブラウザの中で作る）：ピアノ・サックス・トランペット・ライドシンバルの音量、サックスの揺れ（毎秒）
  VOL_PIANO:.09, VOL_SAX:.10, VOL_TPT:.07, VOL_RIDE:.012, SAX_VIB_HZ:5.2, PIANO_INHARM:.0004,
  //   2回目の直し（2026-10-21、D-46 の続き）：メロディは音の高さで管楽器を吹き分ける（この高さ未満はトロンボーン、以上はアルトサックス、さらに上はトランペット）。
  //   伴奏のピアノはこの高さより上に行かない（高い所の電子的な響きを避ける）。ドラムセットの音量
  //   メロディを管楽器の吹ける高さに移す：区間ごとに、メロディの真ん中の高さがこの高さに近づくよう、オクターブ単位で下げる
  JAZZ_MEL_CENTER:70, JAZZ_TBN_BELOW:60, JAZZ_TPT_FROM:77, JAZZ_PIANO_TOP:84, VOL_TBN:.10, VOL_HORNPAD:.03, VOL_JKICK:.10, VOL_SNARE:.025, VOL_HAT:.012,
  //   ジャズの図の層の音量の倍率（曲全体のいちばん大きい所を、メロウと同じくらいにそろえる。D-45）
  JAZZ_LEVEL:1.4,
  // オルゴール（ex1c、統合仕様書 v1.3 4-3。値（暫定））：歯の2番目の音の高さの比（片方を固定した棒。R6）と、3番目、余韻（秒。高い音ほど短く）、
  //   同時に鳴る音の上限（D-45）、基調音の音量の倍率（3分の1）、音量、曲全体の音量の倍率
  ORGEL_P2:6.27, ORGEL_P3:17.55, ORGEL_DEC_MAX:1.2, ORGEL_DEC_MIN:.6, ORGEL_MAX_POLY:6, ORGEL_GROUND:.33, VOL_ORGEL:.26, ORGEL_LEVEL:1,
  //   オルゴールだけ曲の長さを2倍（ゆっくり。2026-10-21、ユーザーの決定 D-47）
  ORGEL_TIME:2,
  // テクノポップ（ex1d、統合仕様書 v1.3 4-4。値（暫定））：バスドラムの高さの下がり方（Hz と秒）、手拍子の重ね（回数とずれの秒）、ハイハットの上限（Hz。耳に痛い高い音を抑える）、音量
  TP_KICK_HI:150, TP_KICK_LO:40, TP_KICK_SWEEP:.05, TP_CLAP_N:3, TP_CLAP_GAP:.012, TP_HAT_TOP:8000,
  VOL_KICK:.13, VOL_CLAP:.03, VOL_THAT:.014, VOL_TBASS:.10, VOL_LEAD:.05, VOL_TARP:.04, TP_LEVEL:1,
  GROUND_ART_W:.5, NIGHT_V:.3, NIGHT_V_LATE:.45, NIGHT_HOUR_FROM:18, NIGHT_HOUR_TO:5, NIGHT_CUT:.75, NIGHT_REV_ADD:.1,
  // 構成要素の細分化（algorithm.md 3.12、ステップ16）
  TREE_V_MAX:.45, GRASS_H_MIN:70, GRASS_H_MAX:110, FLOWER_S_MIN:.5,
  WARM_MAT_H_MIN:10, WARM_MAT_H_MAX:45, WARM_MAT_S_MIN:.25, WARM_MAT_S_MAX:.7, BRIGHT_SURF_V:.75,
  // 場所の性格（3.11、ステップ15）
  PLACE_OPEN:.5, PLACE_NATURAL:.5, PLACE_KEEP:.05, PLACE_NONE_MAX:.2, PLACE_MIN_MAT:.05, PLACE_KEY_STEP1:.33, PLACE_KEY_STEP2:.66,
  // 基調音・水・時刻（3.14、ステップ16）
  WATER_MIN:.08, FLOWER_MIN:.03, VOL_DRONE:.05, VOL_RIPPLE:.012, VOL_GLOCK:.02,
  // 曲の頭と終わりのフェード（STEP 8、ステップ11）
  FADE_IN:2, FADE_OUT:4,
  // ステップ24 曲の長さ（D-21・D-33。2026-10-28）：1・3・5・12分。並びは LENGTH_MIN の順。3分は今までと同じ値。
  //   1分は algorithm.md 11.3 の仮案（総小節数30・地点数の上限15・フェード約1秒と約2秒）。5分・12分の地点数の上限は実装側の仮決め（要確認）
  // ステップ26 色の質感の効きを半分に（D-18・3.0。2026-10-28）：色から直接決めている質感を、L5 時間・光の補助に下げる。
  //   「効きを半分」は、ふつう（1倍・今の中心）からのずれを半分にする、と読んだ（実装側の仮決め（要確認））。
  //   A7 彩度 → 音の明るさ：0.8＋0.5×sat（0.8〜1.3倍）→ 0.9＋0.25×sat（0.9〜1.15倍）。A8 色温度 → パッドのやわらかさ：0.5＋0.3×warmth → 0.5＋0.15×warmth
  CUTOFF_SAT_BASE_26:.9, CUTOFF_SAT_GAIN_26:.25, WARM_TRI_GAIN_26:.15,
  // ステップ20 移り変わり（L2）のパタン（2026-10-28）：LP10 開け・LP14 狭まり・LP07 立ち止まり。値（暫定）
  //   開放度が前の区間より TR_OPEN_UP 以上増える → 開け、TR_OPEN_DOWN 以上減る → 狭まり。残響に送る量を TR_REV だけ増やす・減らす。
  //   開けは区間の頭の TR_HEAD_BARS 小節を主和音（音階の0番目の音からの和音）にし、上に1オクターブ足して音域を広げる。
  //   歩いた時間が全区間の中央値の TR_STOP_K 倍以上 → 立ち止まり：区間の後半は和音を長く伸ばし、メロディを鳴らす割合を TR_STOP_MEL 倍
  TR_OPEN_UP:.25, TR_OPEN_DOWN:.25, TR_REV:.1, TR_HEAD_BARS:2, TR_STOP_K:2, TR_STOP_MEL:.5,
  // ステップ20 LP13 目印（2026-10-28）：スカイラインの中で1か所だけ（隣り合う LM_MAX_W 列以下）、全列の中央値より LM_RISE 以上高い所を目印とする。
  //   短い旋律：音の数＝列の数＋2（LM_MAX_N まで）、k 番目の音＝メロディの基準の音から音階で round(高さ×LM_STEPS×k÷(音の数−1)) 番目。
  //   あとの区間に、高さの差 LM_SAME_H 以内・列の数の差 LM_SAME_W 以内の目印が出たら、同じ旋律を戻す。値（暫定）
  LM_MAX_W:3, LM_RISE:.2, LM_MAX_N:5, LM_STEPS:7, LM_SAME_H:.1, LM_SAME_W:1,
  // ステップ18 1枚の写真の構造（L3）を測る（2026-10-28。音はまだ変えない）。色と線で近似する（AI は使わない）。しきい値は特許出願の書類の変形例の値（値（暫定）。実装側の仮決め（要確認））
  L3_SIDE_NEAR:.5, L3_SIDE_OPEN:.2, L3_SIDE_ROW:.5, L3_SKY_WIDE:.4, L3_GREEN_SIDE:.2, L3_GREEN_TOP:.4, L3_GATE:.2, L3_DEPTH_SIDE_V:.3, L3_DEPTH_CENTER_V:.6,
  L3_CANOPY_TREE:.3, L3_CANOPY_OPEN:.35, L3_DAPPLE_V:.8, L3_DAPPLE_TREE:.3, L3_DAPPLE_MIN:4, L3_COLREP:.5, L3_TUNNEL_TOP:.6, L3_TUNNEL_ART:.3,
  L3_FOOT:.5, L3_REFUGE_TOP:.6, L3_REFUGE_SIDE:.5, L3_REFUGE_V:.5, L3_PLAZA_ART:.6, L3_VIEW_OPEN:.65, L3_ENCL_OPEN:.35,
  // 研究に送る用の大きめの写真の長い辺（画素。2026-10-31、飯田の決定。音には使わない）
  BIG_PHOTO_MAX:1024,
  LENGTH_MIN:[1,3,5,12], LENGTH_BARS:[30,90,150,360], LENGTH_MAX_NODES:[15,22,30,60], LENGTH_FADE_IN:[1,2,2,2], LENGTH_FADE_OUT:[2,4,4,4],
  // STEP 6 時間 → 小節
  BPM:120, TOTAL_BARS:90, DT_MAX:1200, MERGE_DT:8, MAX_NODES:22, MIN_BARS:4,
  // STEP 7 判定
  PENTA_MAX:.2, SKY_LYD:.40, SKY_LYD_KEEP:.35, PLANT_MAJ:.30, PLANT_MAJ_KEEP:.25,
  KEY_STEP1:.5, KEY_STEP2:.7,
  VOICE_E3:.35, VOICE_E4:.65, VOICE_E5:.85,
  ENV_OPEN_LOW:.35, ENV_OPEN_HIGH:.65,
  CUTOFF_BASE:700, CUTOFF_RANGE:5200, CUTOFF_W_SKY:.55, CUTOFF_W_EDGE:.45, CUTOFF_SAT_BASE:.8, CUTOFF_SAT_GAIN:.5,
  LFO_CHANGE:.05, LFO_HZ:.16, LFO_DEPTH:700, TURN_CHANGE:.6,
  BRIGHT_LOW:.35, BRIGHT_HIGH:.65,
  SHADOW_CUT:.4, VEL_BASE:.10, VEL_GAIN:.40,
  WARM_TRI_BASE:.5, WARM_TRI_GAIN:.3,
  HIGHLIGHT_MIN:.1, BELL_PROB:.5, BELL_DECAY:.8, BELL_GAIN:.03,
  DIV_ADD9:.6, BASS_TOP_GAIN:.3, TEX_GAIN:.012, TEX_BAND_LOW:2000, TEX_BAND_HIGH:6000,
  SKYLINE_STEPS:9, SKYLINE_SKY_MIN:.03,
  REV_BASE:.12, REV_GAIN:.5, REV_MIN:.1, REV_MAX:.6, REV_OFF:.3,
  PAN_GAIN:1.5, PAN_MAX:.6,
  // STEP 8 起承転結
  INTRO_END:15, DEV_END:59, CLIMAX_END:75,
  INTRO_MAX_VOICES:2, INTRO_CUTOFF:1000, CLIMAX_MIN_VOICES:3, CLIMAX_CUTOFF:16000,
  GAIN_NORMAL:.72, GAIN_CLIMAX:1, MELODY_PROB:.42, OUTRO_THIN_BARS:3, FADE_START:150,
  // STEP 9 音の合成（基本の音量）
  VOL_PAD:.04, VOL_KEYS:.06, VOL_PLUCK:.045, VOL_BELL:.05, VOL_BASS:.12, VOL_SUB:.18, VOL_SWELL:.07,
});

/* 写真1枚から取り出す値の一覧（表示・CSV・平均の対象） */
const VALUE_KEYS=['sky','plant','art','edge','open','bright','sat','horizon','pan','shadow','contrast','warmth','highlight','diversity','topHeavy','texture',
  // 構成要素の細分化と水面（ステップ16で追加。2026-10-17）
  'tree','grass','flower','gray','warmMat','brightSurf','water',
  // 曇り空（ステップ9.1で追加。2026-10-20）
  'cloud','cloudArt','openC','horizonC',
  // ステップ10（2026-10-20）
  'edgeRaw','plantLo','treeLo','grassLo','flowerLo','artLow','rowRep',
  // ステップ18 1枚の写真の構造（2026-10-28。音はまだ使わない）
  'sideArt','plantL','plantR','plantC','plantTop','farBand','midBand','nearBand','gateDiff','sideV','centerV','topTree','dapple','colRep','tunnelArt','footArt','footPlant','topNonSky','sideNonSky','centerLowV'];

/* 音楽の表 */
const SCALES={lydian:[0,2,4,6,7,9,11],major:[0,2,4,5,7,9,11],mixolydian:[0,2,4,5,7,9,10],minor:[0,2,3,5,7,8,10],penta:[0,3,5,7,10]};
const SCALE_JA={lydian:'リディアン',major:'メジャー',mixolydian:'ミクソリディアン',minor:'マイナー',penta:'ペンタトニック'};
/* 場所の性格（3.11）：スケールとキーの候補。開けた街のキーの候補は実装側の仮決め（要確認） */
const PLACES={openNat:{ja:'開けた自然',scale:'lydian',keys:['C','G','D']},closedNat:{ja:'囲まれた自然',scale:'major',keys:['F','B♭','E♭']},
  openCity:{ja:'開けた街',scale:'mixolydian',keys:['D','A','E']},closedCity:{ja:'囲まれた街',scale:'minor',keys:['A','E','B']},none:{ja:'分類できない',scale:'penta',keys:['A','A','A']}};
/* 構成要素の細分類 → 楽器（3.12）。花は「足す音」なので主な楽器にはしない */
const INSTR={tree:{ja:'樹木・森',ins:'flute',insJa:'笛'},grass:{ja:'芝・草',ins:'strings',insJa:'弦'},gray:{ja:'灰色の面',ins:'epiano',insJa:'電子ピアノ'},
  warmMat:{ja:'暖色の素材',ins:'marimba',insJa:'木琴'},brightSurf:{ja:'明るい面',ins:'glass',insJa:'ガラス'}};
/* 曲のスタイル（ex1、統合仕様書 v1.3。決定 D-40〜D-45）。音はすべてブラウザの中で作る。スタイルが着せ替えるのは「図」の層の鳴らし方だけ */
const STYLES={mellow:{ja:'メロウ',desc:'やわらかく、ゆったり'},jazz:{ja:'ジャズ',desc:'管楽器・ピアノ・ウッドベース・ドラム、跳ねるリズム'},
  orgel:{ja:'オルゴール',desc:'金属の歯をはじく、ひとつの音色'},technopop:{ja:'テクノポップ',desc:'4つ打ちとシンセのアルペジオ'}};
/* どこまで着るかは風景が決める（D-43）。1＝鳴らす、0.5＝音量を半分、0＝鳴らさない（すべて値（暫定））。
   並びは PLACE_ORDER（開けた自然・囲まれた自然・開けた街・囲まれた街・分類できない）。
   ジャズのブラシは、自然の区間では「こする音」だけ（ex1b で使い分ける）。オルゴールの arpRate は分散和音の速さの倍率（自然＝ゆっくり、街＝細かく） */
const PLACE_ORDER=['openNat','closedNat','openCity','closedCity','none'];
const STYLE_WEAR={
  // ジャズ（2026-10-21、ユーザーの決定 D-46：ジャズらしい生の楽器に。ビブラフォン → ピアノの和音、ブラシ → ドラム（ブラシ・ライド））
  jazz:{bass:[1,1,1,1,1],drums:[.5,.5,1,1,.5],comp:[0,0,1,1,.5],piano2:[1,1,.5,.5,1]},
  technopop:{kick:[0,0,1,1,.5],hat:[.5,0,1,1,.5],clap:[0,0,1,1,.5],arp:[1,1,1,.5,1],bass:[.5,.5,1,1,1]},
  orgel:{box:[1,1,1,1,1],arpRate:[.5,.5,1,1,.75]}};
const STYLE_INS_JA={bass:'低音（ウッドベース・シンセ）',drums:'ドラムセット（自然はブラシ、街はライド・ハイハット・スネア・バスドラム）',comp:'ピアノ（2拍目・4拍目の伴奏）',piano2:'ピアノ（長い和音・分散）',kick:'バスドラム',hat:'ハイハット',clap:'手拍子',arp:'アルペジオ',box:'オルゴールの歯'};
/* その区間で、スタイルの楽器をどれだけ鳴らすか。boost（気分「たかまる」とサビ）のときは、鳴らさない（0）を半分（0.5）に1段上げる */
function styleWear(style,place,boost){const t=STYLE_WEAR[style];if(!t)return null;const k=Math.max(0,PLACE_ORDER.indexOf(place)),o={};
  for(const ins in t){let v=t[ins][k];if(boost&&v===0&&ins!=='arpRate')v=.5;o[ins]=v}return o}
/* 街の種類 → 楽器（2026-10-21、ユーザーの希望 D-25）。都会的な要素は電子ピアノ（ユーザーの決定 D-28）。
   ガラスの音はガラス張りの建物に、木琴は木の素材に使う方針（D-28）だが、素材は色と明るさでは見分けられなかったので、
   一軒家の多い街の木琴は、素材が見分けられるまで仮に残す（2026-10-21、ユーザーの許可 D-30）。素材の見分けは AI の塗り分け（ステップ17）で行う */
const CITY_TYPES={apartment:{ja:'マンション・団地の多い街',ins:'epiano',insJa:'電子ピアノ'},houses:{ja:'一軒家の多い街',ins:'marimba',insJa:'木琴'},shops:{ja:'店の多い街',ins:'epiano',insJa:'電子ピアノ'}};
/* 街の種類：横線のくり返しが強ければマンション・団地、線が多く植物が少なければ店、それ以外は一軒家。p.edgeRaw・p.plant は1地点の平均 */
function cityType(p){const K=PARAM;if((p.rowRep||0)>=K.CITY_REP)return'apartment';if((p.edgeRaw||0)>=K.CITY_SHOP_EDGE&&(p.plant||0)<K.CITY_SHOP_PLANT_MAX)return'shops';return'houses'}
const KEYS={sky:['C','G','D'],plant:['F','B♭','E♭'],art:['A','E','B']};
const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11,'B♭':10,'E♭':3};
const ENV_JA={pad:'パッド',keys:'鍵盤',pluck:'プラック'};

/* シード値から作る疑似乱数（Math.random は使わない） */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- STEP 2〜4：画素の配列から値を計算する（画面に依存しない。Web Worker からも使える） ---------- */
function analyzePixels(d,w,h){
  const K=PARAM,n=w*h,gray=new Float32Array(n),rowSky=new Float32Array(h);
  let sky=0,plant=0,art=0,vs=0,vs2=0,ss=0,dark=0,warm=0,cool=0,hl=0,darkTop=0,darkBot=0,hash=2166136261;
  const hueBins=new Float32Array(K.DIV_BINS);let hueN=0;
  const isSky=new Uint8Array(n),bright=new Uint8Array(n);
  let tree=0,grass=0,flower=0,warmMat=0,brightSurf=0,water=0;const half=n/2;
  let plantLo=0,treeLo=0,grassLo=0,flowerLo=0,artLow=0;const third2=n*2/3; // artLow：下3分の1の無彩色（舗装・砂利など地面） // ステップ10：色相 PLANT_H_MIN_10〜PLANT_H_MIN の植物（実写真の黄緑・オリーブ色・秋の田）
  const cand=new Uint8Array(n),isArt=new Uint8Array(n),lowSat=new Uint8Array(n);
  const isPl=new Uint8Array(n),isTr=new Uint8Array(n),Vs=new Float32Array(n); // ステップ18：植物・樹木・明度を画素ごとに覚える // ① 曇り空の候補（上半分の、明るく色の薄い画素）
  for(let i=0;i<n;i++){
    const R=d[i*4]/255,G=d[i*4+1]/255,B=d[i*4+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B),dl=mx-mn;
    const v=mx,s=mx?dl/mx:0;let hu=0;Vs[i]=v;
    if(dl){if(mx===R)hu=60*(((G-B)/dl)%6);else if(mx===G)hu=60*((B-R)/dl+2);else hu=60*((R-G)/dl+4)}if(hu<0)hu+=360;
    if(i<half&&s<K.CLOUD_S_MAX&&v>=K.CLOUD_V_MIN)cand[i]=1;
    if(s<K.REP_S_MAX)lowSat[i]=1;
    if(s<K.ART_S_MAX){if(v>=K.ART_V_MIN&&v<=K.ART_V_MAX){art++;isArt[i]=1;if(i>=third2)artLow++}if(v>=K.BRIGHT_SURF_V&&i>=n/3)brightSurf++} // 明るい面：上3分の1（曇り空・雲）は数えない
    else if(hu>=K.SKY_H_MIN&&hu<=K.SKY_H_MAX&&v>=K.SKY_V_MIN){sky++;rowSky[(i/w)|0]++;isSky[i]=1;if(i>=half)water++}
    else if(hu>=K.PLANT_H_MIN_10&&hu<K.PLANT_H_MIN&&s>=K.PLANT_S_MIN&&v>=K.PLANT_V_MIN){plantLo++;isPl[i]=1;if(v<K.TREE_V_MAX){treeLo++;isTr[i]=1}else grassLo++;
      // 今までの分け方（OFF のとき）では、この画素は花に数えていた（鮮やかなとき）。今までの値が変わらないよう花にも数え、その分を覚えておく
      if(s>=K.FLOWER_S_MIN&&i>=n/3){flower++;flowerLo++}}
    else if(hu>=K.PLANT_H_MIN&&hu<=K.PLANT_H_MAX&&s>=K.PLANT_S_MIN&&v>=K.PLANT_V_MIN){plant++;isPl[i]=1;if(v<K.TREE_V_MAX){tree++;isTr[i]=1}else if(hu>=K.GRASS_H_MIN&&hu<=K.GRASS_H_MAX)grass++}
    else if(hu>=K.WARM_MAT_H_MIN&&hu<=K.WARM_MAT_H_MAX&&s>=K.WARM_MAT_S_MIN&&s<=K.WARM_MAT_S_MAX)warmMat++;
    else if(s>=K.FLOWER_S_MIN&&i>=n/3)flower++;
    if(s>=K.WARM_S_MIN){if(hu<=K.WARM_H_MAX||hu>=K.WARM_H_MIN2)warm++;else if(hu>=K.COOL_H_MIN&&hu<=K.COOL_H_MAX)cool++}
    if(v>=K.HIGHLIGHT_V){hl++;bright[i]=1}
    if(s>=K.DIV_S_MIN){hueBins[Math.min(K.DIV_BINS-1,(hu/360*K.DIV_BINS)|0)]++;hueN++}
    if(v<K.DARK_V){if(i<n/2)darkTop++;else darkBot++}
    vs+=v;vs2+=v*v;ss+=s;if(v<K.SHADOW_V)dark++;gray[i]=(.299*R+.587*G+.114*B)*255;
    hash=Math.imul(hash^(((d[i*4]>>4)<<8)|((d[i*4+1]>>4)<<4)|(d[i*4+2]>>4)),16777619)>>>0;
  }
  let edges=0,eL=0,eR=0;const repRows=new Float32Array(Math.floor(h*2/3)); // 横線のくり返し用（2026-10-21）
  const colLines=new Float32Array(w); // ステップ18：縦の線を列ごとに数える（並木・列柱）
  for(let yy=1;yy<h-1;yy++)for(let xx=1;xx<w-1;xx++){
    const p=(a,b)=>gray[(yy+b)*w+xx+a];
    const gx=-p(-1,-1)-2*p(-1,0)-p(-1,1)+p(1,-1)+2*p(1,0)+p(1,1);
    const gy=-p(-1,-1)-2*p(0,-1)-p(1,-1)+p(-1,1)+2*p(0,1)+p(1,1);
    if(Math.abs(gx)+Math.abs(gy)>K.SOBEL_T){edges++;if(xx<w/2)eL++;else eR++}
    if(yy<repRows.length&&lowSat[yy*w+xx]&&Math.abs(gx)+Math.abs(gy)>K.REP_SOBEL_T&&Math.abs(gy)>2*Math.abs(gx))repRows[yy]++;
    if(Math.abs(gx)+Math.abs(gy)>K.REP_SOBEL_T&&Math.abs(gx)>2*Math.abs(gy))colLines[xx]++;
  }
  // 横線のくり返し（0〜1）：マンション・団地は、ベランダや窓の横線が上下に一定の間隔で並ぶ
  let rowRep=0;{const R=repRows.subarray(1),m=R.reduce((a,b)=>a+b,0)/R.length;let r0=0;for(const v of R)r0+=(v-m)**2;
    if(r0>0)for(let L=K.REP_LAG_MIN;L<=K.REP_LAG_MAX;L++){let c=0;for(let y=0;y+L<R.length;y++)c+=(R[y]-m)*(R[y+L]-m);rowRep=Math.max(rowRep,c/r0)}}
  let hz=0;for(let yy=0;yy<h;yy++)if(rowSky[yy]/w>K.HORIZON_ROW)hz=(yy+1)/h;
  const skyR=sky/n,edgeRaw=edges/((w-2)*(h-2));
  // 開放度（簡易版）：空の量と地平線の低さから
  const open=K.OPEN_W_SKY*Math.min(skyR/K.OPEN_SKY_NORM,1)+K.OPEN_W_HORIZON*hz;
  // ① 曇り空（ステップ9.1）：上半分の、明るく（V ≧ CLOUD_V_MIN）色の薄い（S < CLOUD_S_MAX）画素のうち、
  //    写真の上の端から、曇り空の候補だけを通ってつながっているもの（青空を通ってつながるものは数えない）。
  //    白い壁・雪を取り違えないよう、上の端につながることを条件にする。青空の中の白い雲は数えない（青空がすでに空として数えられているため）。実装側の仮決め（要確認）
  const isCloud=new Uint8Array(n),q=new Int32Array(half|0),seen=new Uint8Array(n),rowCloud=new Float32Array(h);let qh=0,qt=0,cloud=0,cloudArt=0;
  for(let x=0;x<w;x++)if(cand[x]){seen[x]=1;q[qt++]=x}
  while(qh<qt){const i=q[qh++];isCloud[i]=1;cloud++;if(isArt[i])cloudArt++;rowCloud[(i/w)|0]++;
    const x=i%w,y=(i/w)|0;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,i+w])if(j>=0&&j<half&&!seen[j]&&cand[j]){seen[j]=1;q[qt++]=j}}
  // 青空に浮かぶ白い雲（2026-10-20、実写真で追加）：上の端から青空か候補を通ってつながり、しかも同じ列のもっと下に青空がある候補。
  //   青空の下にある白い壁・雪は、その下に青空がないので数えない。実装側の仮決め（要確認）
  const lowSky=new Int32Array(w).fill(-1);for(let i=0;i<half;i++)if(isSky[i]){const x=i%w,y=(i/w)|0;if(y>lowSky[x])lowSky[x]=y}
  const seen2=new Uint8Array(n);qh=0;qt=0;for(let x=0;x<w;x++)if(cand[x]||isSky[x]){seen2[x]=1;q[qt++]=x}
  while(qh<qt){const i=q[qh++],x=i%w,y=(i/w)|0;
    if(cand[i]&&!isCloud[i]&&lowSky[x]>y){isCloud[i]=1;cloud++;if(isArt[i])cloudArt++;rowCloud[y]++}
    for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,i+w])if(j>=0&&j<half&&!seen2[j]&&(cand[j]||isSky[j])){seen2[j]=1;q[qt++]=j}}
  let hzC=0;for(let yy=0;yy<h;yy++)if((rowSky[yy]+rowCloud[yy])/w>K.HORIZON_ROW)hzC=(yy+1)/h;
  const openC=K.OPEN_W_SKY*Math.min((sky+cloud)/n/K.OPEN_SKY_NORM,1)+K.OPEN_W_HORIZON*hzC;
  // B4 スカイライン：左から SKYLINE_COLS 本の列。各列で上から見て、最初に「空でない」行の高さ y（0＝上端、1＝下端）。
  // 列の幅の SKYLINE_ROW_SKY 以上が空なら、その行は空とみなす。列に空がまったくなければ y＝0。h＝1−y
  // cols：列ごとに「空がある列か」（1/0）。④ 空のない列を両隣から補うのに使う（補うのは作曲のとき）
  const skylineOf=isS=>{const vals=[],cols=[];
    for(let c=0;c<K.SKYLINE_COLS;c++){
      const x0=Math.floor(c*w/K.SKYLINE_COLS),x1=Math.floor((c+1)*w/K.SKYLINE_COLS),cw=x1-x0;
      let any=false,y=h;
      for(let yy=0;yy<h;yy++){let cnt=0;for(let xx=x0;xx<x1;xx++)cnt+=isS(yy*w+xx);const skyRow=cnt>=cw*K.SKYLINE_ROW_SKY;if(skyRow)any=true;if(!skyRow){y=yy;break}}
      vals.push(any?1-y/h:1);cols.push(any?1:0);
    }return{vals,cols}};
  const SL=skylineOf(i=>isSky[i]),SLC=skylineOf(i=>isSky[i]|isCloud[i]);
  const skyline=SL.vals;
  // A9 色の多様性（色相のエントロピー、0〜1）
  let ent=0;if(hueN)for(let b=0;b<K.DIV_BINS;b++){const q=hueBins[b]/hueN;if(q>0)ent-=q*Math.log(q)}
  const diversity=ent/Math.log(K.DIV_BINS);
  // B7 ざらつき：TEX_BLOCK×TEX_BLOCK の区画ごとの明るさの標準偏差の平均
  const TB=K.TEX_BLOCK;let tSum=0,tN=0;
  for(let by=0;by+TB<=h;by+=TB)for(let bx=0;bx+TB<=w;bx+=TB){let a=0,a2=0;for(let yy=by;yy<by+TB;yy++)for(let xx=bx;xx<bx+TB;xx++){const g=gray[yy*w+xx];a+=g;a2+=g*g}const m=a/(TB*TB);tSum+=Math.sqrt(Math.max(0,a2/(TB*TB)-m*m));tN++}
  const texture=Math.min(1,(tN?tSum/tN:0)/K.TEX_NORM);
  // A10 きらめき：明るい点のうち、小さく散らばっているものだけを数える。
  // 区画（TEX_BLOCK×TEX_BLOCK）の HIGHLIGHT_BLOCK_MAX 以上が明るい所は、曇り空や白い壁などの「明るい面」とみなして数えない
  let sparkle=0;
  for(let by=0;by<h;by+=TB)for(let bx=0;bx<w;bx+=TB){let cnt=0,tot=0;const y1=Math.min(h,by+TB),x1=Math.min(w,bx+TB);
    for(let yy=by;yy<y1;yy++)for(let xx=bx;xx<x1;xx++){tot++;cnt+=bright[yy*w+xx]}
    if(cnt&&cnt<tot*K.HIGHLIGHT_BLOCK_MAX)sparkle+=cnt}
  // A6 影の割合、A5 明暗コントラスト（明度の標準偏差）
  const mean=vs/n,sd=Math.sqrt(Math.max(0,vs2/n-mean*mean));
  // 曇り空も空として数え、曇り空の画素は人工物から外す（作曲で使う空・人工物と同じ考え方）
  const skyAll=new Uint8Array(n),artNC=new Uint8Array(n);for(let i=0;i<n;i++){skyAll[i]=isSky[i]|isCloud[i];artNC[i]=isArt[i]&&!isCloud[i]?1:0}
  const L3=l3Features(w,h,skyAll,artNC,isPl,isTr,Vs,colLines,K);
  return{sky:skyR,plant:plant/n,art:art/n,edge:Math.min(1,edgeRaw/K.EDGE_NORM),open,
    bright:mean,sat:ss/n,horizon:hz,pan:edges?(eR-eL)/edges:0,
    shadow:dark/n,contrast:Math.min(1,sd/K.CONTRAST_NORM),
    // A8 色温度（−1〜1）、A10 きらめき
    warmth:(warm-cool)/(warm+cool+1),highlight:Math.min(1,sparkle/n/K.HIGHLIGHT_NORM),
    // A9 色の多様性、B10 上下の重心（−1〜1、上が暗いほど＋）、B7 ざらつき
    diversity,topHeavy:(darkTop-darkBot)/(darkTop+darkBot+1),texture,skyline,edgeRaw,hash:hash.toString(16),
    // 構成要素の細分化（3.12）。gray＝今の人工物と同じ。water＝写真の下半分に出た空色（水面が空を映す）の割合
    tree:tree/n,grass:grass/n,flower:flower/n,gray:art/n,warmMat:warmMat/n,brightSurf:brightSurf/n,water:water/half,
    // ① 曇り空（ステップ9.1）。cloudArt＝曇り空のうち、今まで人工物に数えていた分。openC・horizonC・skylineC は空に曇り空を足して計算したもの
    cloud:cloud/n,cloudArt:cloudArt/n,openC,horizonC:hzC,skylineC:SLC.vals,skyCols:SL.cols,skyColsC:SLC.cols,
    // ステップ10：色相 50〜70° の植物（ON のとき植物・樹木・芝に足し、花・暖色の素材から引く）
    plantLo:plantLo/n,treeLo:treeLo/n,grassLo:grassLo/n,flowerLo:flowerLo/n,
    // 下3分の1の無彩色（地面の舗装・砂利。2026-10-20）
    artLow:artLow/n,
    // 横線のくり返し（街の種類。2026-10-21）
    rowRep,
    // ステップ18 1枚の写真の構造（2026-10-28）
    ...L3};
}

/* ---------- ステップ18：1枚の写真の構造（L3）の手がかり（2026-10-28。音はまだ使わない） ----------
   画像を横に4等分した左端・右端、横に3等分した中央、縦に3等分した上・中・下の帯で、部品の量と明るさを測る。
   どれも 0〜1。名前は algorithm.md 3.13 の LP 番号に対応（patternsOf） */
function l3Features(w,h,isSky,isArt,isPl,isTr,Vs,colLines,K){
  const q=Math.floor(w/4),t3=Math.floor(h/3),c0=Math.floor(w/3),c1=Math.floor(w*2/3);
  const box=(x0,x1,y0,y1,f)=>{let a=0,c=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){a+=f(y*w+x);c++}return c?a/c:0};
  // 左右の端で人工物がある行の割合（D/H の近似。LP16）
  //   行は、その端の幅の L3_SIDE_ROW 以上が人工物のとき「建物がある行」と数える（1画素でも数えると、道路や電線でほとんどの写真が当たるため。実装側の仮決め（要確認））
  let rl=0,rr=0;for(let y=0;y<h;y++){let L=0,R=0;for(let x=0;x<q;x++){L+=isArt[y*w+x];R+=isArt[y*w+w-1-x]}if(L>=q*K.L3_SIDE_ROW)rl++;if(R>=q*K.L3_SIDE_ROW)rr++}
  const sideArt=(rl+rr)/(2*h);
  const ns=i=>isSky[i]?0:1,V=i=>Vs[i];
  const plantL=box(0,q,0,h,i=>isPl[i]),plantR=box(w-q,w,0,h,i=>isPl[i]),plantC=box(c0,c1,0,h,i=>isPl[i]),plantTop=box(0,w,0,t3,i=>isPl[i]);
  const farBand=box(0,w,0,t3,ns),midBand=box(0,w,t3,2*t3,ns),nearBand=box(0,w,2*t3,h,ns);
  const cIn=box(c0,c1,t3,2*t3,V);let out=0,oc=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(x>=c0&&x<c1&&y>=t3&&y<2*t3)continue;out+=Vs[y*w+x];oc++}
  const gateDiff=Math.max(0,cIn-out/oc);
  const sideV=Math.max(box(0,q,0,h,V),box(w-q,w,0,h,V)),centerV=box(Math.floor(w*3/8),Math.ceil(w*5/8),Math.floor(h*3/8),Math.ceil(h*5/8),V);
  const topTree=box(0,w,0,t3,i=>isTr[i]);
  // 木漏れ日（LP26）：8×8 の区画のうち、樹木が L3_DAPPLE_TREE 以上あり、明るい点（V ≧ L3_DAPPLE_V）を含む区画の数（上3分の2）。実装側の仮決め（要確認）
  let dap=0;for(let by=0;by+8<=Math.floor(h*2/3);by+=8)for(let bx=0;bx+8<=w;bx+=8){let tr=0,br=0;for(let y=by;y<by+8;y++)for(let x=bx;x<bx+8;x++){const i=y*w+x;tr+=isTr[i];if(Vs[i]>=K.L3_DAPPLE_V)br++}if(tr>=64*K.L3_DAPPLE_TREE&&br>0)dap++}
  // 縦の線が一定の間隔で並ぶ度合い（LP32 並木・列柱）：列ごとの縦の線の数の自己相関の最大（ずらし 4〜64列）
  let colRep=0;{const R=colLines,m=R.reduce((a,b)=>a+b,0)/R.length;let r0=0;for(const v of R)r0+=(v-m)**2;
    if(r0>0)for(let L=4;L<=64;L++){let c=0;for(let x=0;x+L<R.length;x++)c+=(R[x]-m)*(R[x+L]-m);colRep=Math.max(colRep,c/r0)}}
  const tunnelArt=box(c0,c1,2*t3,h,i=>isArt[i]),footArt=box(0,w,2*t3,h,i=>isArt[i]),footPlant=box(0,w,2*t3,h,i=>isPl[i]);
  const topNonSky=farBand,sideNonSky=Math.min(box(0,q,0,h,ns),box(w-q,w,0,h,ns)),centerLowV=box(c0,c1,t3,h,V);
  return{sideArt,plantL,plantR,plantC,plantTop,farBand,midBand,nearBand,gateDiff,sideV,centerV,topTree,dapple:dap,colRep,tunnelArt,footArt,footPlant,topNonSky,sideNonSky,centerLowV};
}
/* ステップ18：手がかりから、その写真に出ているパタンと強さ（0〜1）を出す。強い順。place は場所の性格（広場の判定に使う）。音にはまだ使わない */
function patternsOf(p,place){const K=PARAM,out=[],add=(id,ja,s)=>out.push({id,ja,s:Math.max(0,Math.min(1,s))}),over=(x,t)=>.5+.5*(x-t)/Math.max(1e-6,1-t);
  if(p.open!=null){if(p.open>=K.L3_VIEW_OPEN)add('LP15','眺望（遠くまで見える）',over(p.open,K.L3_VIEW_OPEN));else if(p.open<K.L3_ENCL_OPEN)add('LP15','囲繞（囲まれている）',.5+.5*(K.L3_ENCL_OPEN-p.open)/K.L3_ENCL_OPEN)}
  if(p.sideArt>=K.L3_SIDE_NEAR)add('LP16','両側が迫る（街路が狭い）',over(p.sideArt,K.L3_SIDE_NEAR));
  if((p.sky||0)>=K.L3_SKY_WIDE)add('LP17','空が広い',over(p.sky,K.L3_SKY_WIDE));
  if(p.plantL>=K.L3_GREEN_SIDE&&p.plantR>=K.L3_GREEN_SIDE&&Math.min(p.plantL,p.plantR)>p.plantC)add('LP18','緑が両側（並木・生け垣）',over(Math.min(p.plantL,p.plantR),K.L3_GREEN_SIDE));
  else if(Math.max(p.plantL,p.plantR)>=K.L3_GREEN_SIDE)add('LP18','緑が片側',over(Math.max(p.plantL,p.plantR),K.L3_GREEN_SIDE));
  else if(p.plantTop>=K.L3_GREEN_TOP)add('LP18','緑が上（枝が覆う）',over(p.plantTop,K.L3_GREEN_TOP));
  if(p.gateDiff>=K.L3_GATE)add('LP31','門・枠（中央が明るい）',over(p.gateDiff,K.L3_GATE));
  if(p.sideV<K.L3_DEPTH_SIDE_V&&p.centerV>=K.L3_DEPTH_CENTER_V)add('LP23','先が見えない奥（両側が暗く奥が明るい）',over(p.centerV,K.L3_DEPTH_CENTER_V));
  if(p.topTree>=K.L3_CANOPY_TREE&&(p.open??1)<K.L3_CANOPY_OPEN)add('LP34','木陰',over(p.topTree,K.L3_CANOPY_TREE));
  if(p.dapple>=K.L3_DAPPLE_MIN)add('LP26','木漏れ日',Math.min(1,p.dapple/(K.L3_DAPPLE_MIN*4)));
  if(p.colRep>=K.L3_COLREP)add('LP32','並木・列柱（縦の線がくり返す）',over(p.colRep,K.L3_COLREP));
  if(p.plantTop>=K.L3_TUNNEL_TOP&&p.tunnelArt>=K.L3_TUNNEL_ART)add('LP33','緑のトンネル',over(p.plantTop,K.L3_TUNNEL_TOP));
  if(p.footArt>=K.L3_FOOT)add('LP25','硬い足もと（舗装・石）',over(p.footArt,K.L3_FOOT));else if(p.footPlant>=K.L3_FOOT)add('LP25','やわらかい足もと（草・土）',over(p.footPlant,K.L3_FOOT));
  if(p.topNonSky>=K.L3_REFUGE_TOP&&p.sideNonSky>=K.L3_REFUGE_SIDE&&p.centerLowV>=K.L3_REFUGE_V)add('LP24','眺望と隠れ家の境（背後が覆われ前が開ける）',over(p.centerLowV,K.L3_REFUGE_V));
  if(place==='openCity'&&p.footArt>=K.L3_PLAZA_ART)add('LP12','広場',over(p.footArt,K.L3_PLAZA_ART));
  return out.sort((a,b)=>b.s-a.s)}

/* 画面側では普通の canvas、Web Worker の中では OffscreenCanvas を使う（中の計算は同じ） */
function makeCanvas(w,h){
  if(typeof document==='undefined')return new OffscreenCanvas(w,h);
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}

/* ---------- STEP 1：解析用に 256×192 に縮める ---------- */
function shrink(src){
  const w=PARAM.ANALYZE_W,h=PARAM.ANALYZE_H,c=makeCanvas(w,h);
  c.getContext('2d',{willReadFrequently:true}).drawImage(src,0,0,w,h);
  return c;
}
function pixelsOf(c){return c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data}

/* ---------- STEP 1＋解析：画像（canvas など）を 256×192 に縮めて解析する ---------- */
function analyze(src){
  const c=shrink(src);
  return analyzePixels(pixelsOf(c),c.width,c.height);
}

/* ---------- STEP 1：写真を 320×240 に、中央を基準に切り抜いて縮小する ---------- */
function preparePhoto(img){
  const W=PARAM.PHOTO_W,H=PARAM.PHOTO_H,c=makeCanvas(W,H);
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const s=Math.max(W/iw,H/ih),w=iw*s,h=ih*s;
  c.getContext('2d').drawImage(img,(W-w)/2,(H-h)/2,w,h);
  return c;
}

/* ---------- STEP 7：1地点の判定（スケール・キー・音の数・鳴り方・音の明るさ） ----------
   prevScale：前の地点のスケール（ちらつき防止に使う。単独で判定するときは null）
   features：開発用のON/OFF（{open:true, sat:true} など。false のときはその変数がなかった頃の判定） */
function judgeNode(p,prevScale,features){
  const K=PARAM,F=features||{};
  let scale;
  if(p.sky<K.PENTA_MAX&&p.plant<K.PENTA_MAX&&p.art<K.PENTA_MAX)scale='penta';
  else if(p.sky>=K.SKY_LYD||(prevScale==='lydian'&&p.sky>=K.SKY_LYD_KEEP))scale='lydian';
  else if(p.plant>=K.PLANT_MAJ||(prevScale==='major'&&p.plant>=K.PLANT_MAJ_KEEP))scale='major';
  else scale='minor';
  const hold=(scale==='lydian'&&p.sky<K.SKY_LYD)||(scale==='major'&&p.plant<K.PLANT_MAJ);
  const dom=p.plant>=p.sky&&p.plant>=p.art?'plant':p.sky>=p.art?'sky':'art',mxv=p[dom];
  const key=scale==='penta'?'A':KEYS[dom][mxv<K.KEY_STEP1?0:mxv<K.KEY_STEP2?1:2];
  const voices=p.edge<K.VOICE_E3?2:p.edge<K.VOICE_E4?3:(p.edge>=K.VOICE_E5?5:4);
  const env=F.open===false?'keys':p.open<K.ENV_OPEN_LOW?'pluck':p.open<=K.ENV_OPEN_HIGH?'keys':'pad';
  // A7 彩度：OFFのときは係数をかけない
  const satF=F.sat===false?1:F.colorHalf===false?K.CUTOFF_SAT_BASE+K.CUTOFF_SAT_GAIN*p.sat:K.CUTOFF_SAT_BASE_26+K.CUTOFF_SAT_GAIN_26*p.sat; // ステップ26：効きを半分（OFF で今まで）
  // A6 影：影が多いほど高い音を抑える（最大 SHADOW_CUT）。OFFのときはかけない
  const shadowF=F.shadow===false?1:1-K.SHADOW_CUT*p.shadow;
  const cutoff=Math.round((K.CUTOFF_BASE+K.CUTOFF_RANGE*(K.CUTOFF_W_SKY*p.sky+K.CUTOFF_W_EDGE*p.edge))*satF*shadowF);
  return{scale,hold,dom,key,pc:PC[key],voices,env,cutoff};
}

/* ---------- 表示用：スカイラインの折れ線（SVG の points）。w×h の枠に描く ---------- */
function skylinePoints(skyline,w,h){const n=skyline.length;return skyline.map((v,i)=>`${((i+.5)/n*w).toFixed(1)},${((1-v)*h).toFixed(1)}`).join(' ')}

/* ---------- ④変化：前の地点との差の最大値に使う値 ---------- */
/* ---------- 3.11 場所の性格：開放度と自然度から。prev は前の地点の性格（ちらつき防止） ---------- */
/* opts.surround：地面の素材は周囲に合わせる（土・わら・木＝暖色の素材は自然・人工のどちらにも数えない。下3分の1の無彩色＝舗装・砂利は半分だけ数える）
   opts.night：夜は照明の色に惑わされないよう、暖色の素材・明るい面を数えない（2026-10-20、ユーザーの決定。細部は実装側の仮決め（要確認）） */
function judgePlace(p,prev,opts){
  const O=opts||{};
  if(O.surround||O.night){const q={...p};if(O.surround){q.art=Math.max(0,p.art-PARAM.GROUND_ART_W*(p.artLow||0));q.warmMat=0}if(O.night)q.warmMat=0;p=q}
  // 水面（写真の下半分の空色。water は下半分に対する割合なので、写真全体では半分）も自然に数える：海辺・河川敷が「開けた自然」になるように。実装側の仮決め（要確認）
  const K=PARAM,artAll=p.art+(p.warmMat||0),wat=(p.water||0)/2,nat=p.plant+wat,mat=nat+artAll;
  if(p.sky<K.PLACE_NONE_MAX&&p.plant<K.PLACE_NONE_MAX&&artAll<K.PLACE_NONE_MAX)return{place:'none',natural:.5,strength:0};
  const natural=mat<K.PLACE_MIN_MAT?.5:nat/mat;
  const wasOpen=prev==='openNat'||prev==='openCity',wasNat=prev==='openNat'||prev==='closedNat',known=prev&&prev!=='none';
  const isOpen=known&&wasOpen?p.open>=K.PLACE_OPEN-K.PLACE_KEEP:p.open>=K.PLACE_OPEN;
  const isNat=known&&wasNat?natural>=K.PLACE_NATURAL-K.PLACE_KEEP:natural>=K.PLACE_NATURAL;
  const place=isOpen?(isNat?'openNat':'openCity'):(isNat?'closedNat':'closedCity');
  // 強さ：境目からどれだけ離れているか（2つのものさしの近いほう。0〜1）
  const strength=Math.min(1,2*Math.min(Math.abs(p.open-K.PLACE_OPEN),Math.abs(natural-K.PLACE_NATURAL)));
  return{place,natural,strength};
}
/* ---------- 3.12 主な細分類（花は除く） ---------- */
function mainMaterial(p,opts){const O=opts||{};let best=null,bv=0;for(const k of ['tree','grass','gray','warmMat','brightSurf']){let v=p[k]||0;
    if(O.surround&&k==='gray')v=Math.max(0,v-PARAM.GROUND_ART_W*(p.artLow||0)); // 舗装は半分
    if(O.night&&(k==='warmMat'||k==='brightSurf'))v=0; // 夜は照明の色を素材に数えない
    if(v>bv){bv=v;best=k}}return bv>0?best:null}

function changeKeys(features){return['sky','plant','art','edge',...((features||{}).open===false?[]:['open'])]}

root.TC=Object.freeze({patternsOf,l3Features,PARAM,VALUE_KEYS,SCALES,SCALE_JA,KEYS,PC,ENV_JA,PLACES,INSTR,CITY_TYPES,cityType,STYLES,STYLE_WEAR,STYLE_INS_JA,PLACE_ORDER,styleWear,judgePlace,mainMaterial,mulberry32,analyzePixels,analyze,preparePhoto,shrink,pixelsOf,makeCanvas,judgeNode,changeKeys,skylinePoints});
})(typeof self!=='undefined'?self:this);
