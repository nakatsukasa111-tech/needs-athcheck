// tools/extract-scoring.mjs で生成。直接編集しないでください。
// 元の採点処理の SHA-256: b3c0e9b7d0d49ac27f94ae42c6223c83fb5596f7717282f9018f67087e75e190
// 現行画面はこのファイルへまだ切り替えていません。
export function createAthleteScorer({ thresholds = {}, rules = {}, tone = 'fact', weights } = {}) {
  // 会社ごとの設定を閉じ込め、別の呼び出しと混ざらないようにする。
  const TH = structuredClone(thresholds);
  const RULES = structuredClone(rules);
  const DISPLAY = { tone };
var CATEGORY_WEIGHTS = {flex:1, balance:1, strength:1, jump:1, quality:1};

/* ==================================================================
   2. 解説文（差し替えやすいよう定数として外に出す）
   ================================================================== */
var TEXTS = {
  fact: {
    sscLow:  '反動をほとんど使えていません。伸張反射（SSC）が機能しておらず、筋力をそのまま跳躍に変換している状態です。',
    sscMid:  '反動と筋力のバランスは標準的です。',
    sscHigh: '反動の使い方は上手いものの、筋力そのものが不足しています。SQJを引き上げれば、CMJも連動して伸びます。',
    armLow:  '腕振りと上半身の連動が機能していません。上半身の力を下半身に伝えられていない状態です。',
    armMid:  '腕振りの連動は標準的です。',
    armHigh: '腕振りの連動は良好です。同時に、CMJ側にはまだ伸びしろがあります。',
    slOk:    function(s,v,t){ return '片脚CMJ '+s+' は '+v+'cm。目標の '+t+'cm に届いています。'; },
    slNear:  function(s,v,t,p){ return '片脚CMJ '+s+' は '+v+'cm で、目標 '+t+'cm の '+p+'%です。あと少し足りません。'; },
    slRed:   function(s,v,t,p){ return '片脚CMJ '+s+' が '+v+'cm で、目標 '+t+'cm の '+p+'%しかありません。その側の片脚筋力、または片脚での伸張反射が不十分です。'; },
    flexAmber: function(n,R,L){ return n+'に左右差があります（右 '+R+' / 左 '+L+'）。'; },
    flexRed:   function(n,R,L,d){ return n+'の左右差が'+d+'点あります（右 '+R+' / 左 '+L+'）。硬い側から改善してください。'; },
    asym:      function(n,R,L,p){ return n+'の左右差が '+p+'%あります（右 '+R+' / 左 '+L+'）。数値そのものが高くても、この差は改善が必要です。'; },
    rsiDiff:   function(h,d,p){ return 'ホップテストとドロップジャンプのRSIに '+p+'%の差があります（'+h+' / '+d+'）。'; },
    rsiGood:   function(n,v){ return n+'のRSIが '+v+'。非常に良い数値です。'; }
  },
  growth: {
    sscLow:  '反動を使う余地がまるまる残っています。いまは筋力だけで跳んでいる状態なので、伸張反射（SSC）を使えるようになるだけで跳躍高は大きく変わります。',
    sscMid:  '反動と筋力のバランスは取れています。両方を同時に引き上げていける状態です。',
    sscHigh: '反動の使い方は上手です。ここに筋力が乗れば、いまの跳び方のまま数字が伸びます。SQJが伸びしろです。',
    armLow:  '腕振りと上半身の連動が、いちばん大きな伸びしろです。上半身の力を下半身に伝えられるようになると、跳躍高がまとめて上がります。',
    armMid:  '腕振りの連動は取れています。ここを保ったまま下半身を伸ばしていけます。',
    armHigh: '腕振りの連動は武器になっています。次はCMJ側を伸ばせば、全体がもう一段上がります。',
    slOk:    function(s,v,t){ return '片脚CMJ '+s+' は '+v+'cm。目標の '+t+'cm をクリアしています。'; },
    slNear:  function(s,v,t,p){ return '片脚CMJ '+s+' は '+v+'cm、目標 '+t+'cm の '+p+'%。目標まであと少しです。'; },
    slRed:   function(s,v,t,p){ return '片脚CMJ '+s+' は '+v+'cm、目標 '+t+'cm の '+p+'%。ここが伸びれば両脚の跳躍も一緒に変わります。'; },
    flexAmber: function(n,R,L){ return n+'に少し左右差があります（右 '+R+' / 左 '+L+'）。硬い側をそろえると動きやすくなります。'; },
    flexRed:   function(n,R,L,d){ return n+'の左右差が'+d+'点。硬い側をそろえるのが、いちばん早く体感が変わるところです（右 '+R+' / 左 '+L+'）。'; },
    asym:      function(n,R,L,p){ return n+'の左右差が '+p+'%（右 '+R+' / 左 '+L+'）。弱い側を引き上げると、全体の数字も上がります。'; },
    rsiDiff:   function(h,d,p){ return 'ホップとドロップのRSIに '+p+'%の差があります（'+h+' / '+d+'）。跳ね方をそろえる余地があります。'; },
    rsiGood:   function(n,v){ return n+'のRSIが '+v+'。非常に良い数値です。ここは強みとして伸ばせます。'; }
  }
};
function T(){ return TEXTS[DISPLAY.tone] || TEXTS.fact; }

/* ==================================================================
   3. 測定項目の定義
   ================================================================== */

// 柔軟性：部位ごとに3種目・9点満点。左右がある種目は低いほうを採用する。
var FLEX = [
  {part:'upper', label:'上半身', items:[
    {key:'banzai',      name:'バンザイ',   pair:true},
    {key:'kettai',      name:'結帯動作',   pair:true},
    {key:'shoulder_er', name:'肩関節外旋', pair:true}
  ]},
  {part:'core', label:'体幹部', items:[
    {key:'trunk_rot',  name:'体幹回旋', pair:true},
    {key:'trunk_side', name:'体幹側屈', pair:true},
    {key:'bridge',     name:'ブリッジ', pair:false}
  ]},
  {part:'lower', label:'下半身', items:[
    {key:'split',             name:'開脚',       pair:false},
    {key:'aslr',              name:'ASLR',       pair:true},
    {key:'ground_touch_flex', name:'地面タッチ', pair:false, note:'柔軟の地面タッチ'}
  ]}
];

var QUALITY = [
  {key:'sq_quality',name:'スクワット',link:'lower',note:'まっすぐ上下し、膝・股関節・体幹をコントロールできるか'},
  {key:'slide_sq',pair:true,min:1,name:'スライドスクワット',short:'スライドSQ',link:'vertical',note:'左右への移動で上半身と下半身が連動するか'},
  {key:'rot_sq',pair:true,min:1,name:'ローテーションスクワット',short:'ローテ SQ',link:'hips',note:'体幹と股関節を連動させて回旋できるか'},
  {key:'rot_drill_up',pair:true,min:1,name:'ローテーションドリル 上',short:'ローテ 上',link:'shoulders',note:'胸椎の回旋を滑らかにコントロールできるか'},
  {key:'rot_drill_low',pair:true,min:1,name:'ローテーションドリル 下',short:'ローテ 下',link:'hips',note:'股関節の動きを滑らかにコントロールできるか'},
  {key:'pelvic_tilt_anterior',name:'ペルビックティルト・前傾',short:'骨盤 前傾',min:1,note:'腰だけで反らず、骨盤を前へ傾けて戻せるか'},
  {key:'pelvic_tilt_posterior',name:'ペルビックティルト・後傾',short:'骨盤 後傾',min:1,note:'膝や上体で代償せず、骨盤を後ろへ傾けて戻せるか'},
  {key:'scapula_motion',pair:true,min:1,name:'肩甲骨の動き',link:'shoulders',note:'肩甲骨の内転・外転を滑らかに切り替えられるか'},
  {key:'ssp_extension',name:'SSP連動テスト・伸展',short:'SSP 伸展',link:'extension',min:1,note:'肩甲骨の内転・脊柱の伸展・骨盤の前傾が連動するか'},
  {key:'ssp_flexion',name:'SSP連動テスト・屈曲',short:'SSP 屈曲',link:'flexion',min:1,note:'肩甲骨の外転・脊柱の屈曲・骨盤の後傾が連動するか'}
];

// 旧記録の未分離評価。新しい左右・方向の値には転用しない。
var LEGACY_QUALITY_KEYS = ['slide_sq','rot_sq','rot_drill_up','rot_drill_low','scapula_motion','pelvic_tilt'];

// 実測系：key は thresholds シートの item_key と一致させる
var BALANCE = [
  {key:'sl_stance',        name:'片脚立位',   unit:'秒', pair:true},
  {key:'ground_touch_bal', name:'地面タッチ', unit:'回', pair:true, short:'地面ﾀｯﾁ', note:'バランスの地面タッチ'}
];

var STRENGTH = [
  {sub:'体幹部', part:'str_core', items:[
    {key:'ab30s',    name:'30秒腹筋',       unit:'回'},
    {key:'pl_basic', name:'PLベーシック',   unit:'回', short:'PL', note:'プランク3種目連続。棒を落とさずできた回数（30回で満点）'},
    {key:'pushup',   name:'プッシュアップ', unit:'回'}
  ]},
  {sub:'上半身', part:'str_upper', items:[
    {key:'chinup', name:'懸垂',             unit:'回'},
    {key:'bp_1rm', name:'ベンチプレス 1RM', unit:'kg', bw:true, est:true, short:'BP 1RM'}
  ]},
  {sub:'下半身', part:'str_lower', items:[
    {key:'sq_1rm', name:'スクワット 1RM',   unit:'kg', bw:true, est:true, short:'SQ 1RM'},
    {key:'dl_1rm', name:'デッドリフト 1RM', unit:'kg', bw:true, est:true, short:'DL 1RM'},
    {key:'sl_sq',  name:'SLスクワット',     unit:'回', pair:true, short:'SLSQ'}
  ]}
];

var JUMP = [
  {key:'sqj',      name:'スクワットジャンプ', unit:'cm',  short:'SQJ', note:'反動なし。筋力そのものの強さ'},
  {key:'cmj',      name:'CMJ',                unit:'cm',  note:'反動あり腕振りなし。伸張反射の活用度'},
  {key:'abj',      name:'ABJ',                unit:'cm',  note:'腕振りあり。上半身からの連動性'},
  {key:'sl_cmj',   name:'SLCMJ',              unit:'cm',  pair:true},
  {key:'hop_rsi',  name:'ホップテスト',       unit:'RSI', short:'ホップ', note:'両足実施。機器が出したRSI値をそのまま入力'},
  {key:'drop_rsi', name:'ドロップジャンプ',   unit:'RSI', short:'ドロップ', note:'機器が出したRSI値をそのまま入力'}
];

var CATS = [
  {key:'flex',     label:'柔軟性'},
  {key:'balance',  label:'バランス'},
  {key:'strength', label:'筋力'},
  {key:'jump',     label:'ジャンプ'},
  {key:'quality',  label:'動きの質'}
];

// 左右差（%）を見る実測項目
var ASYM_ITEMS = ['sl_cmj','sl_sq','sl_stance','ground_touch_bal'];

/* ==================================================================
   3-2. ボディマップの対応表
   --------------------------------------------------------------
   どの種目を、どの部位に効くと見なすか。
     1.0 … 主にこの部位を見ている（◎）
     0.5 … 関与する（○）
     0.25… 少し関与する（△）
   部位の点数は、集まった種目の重み付き平均。

   【重要】これは測定結果ではなく「解釈」です。
   測っているのは動作であって部位ではないので、
   画面では必ず「タップすると根拠の種目と点数が出る」状態にしておくこと。
   内容は docs/部位の対応表_叩き台.md と同じ。中務さんの確認待ちの暫定版。
   ================================================================== */
var BODY_REGIONS = [
  {key:'shoulder',    label:'肩',           pair:true },
  {key:'chest',       label:'胸',           pair:false},
  {key:'upper_arm',   label:'上腕',         pair:true },
  {key:'upper_back',  label:'背中・胸椎',   pair:false},
  {key:'abdomen',     label:'腹部',         pair:false},
  {key:'flank',       label:'体側',         pair:true },
  {key:'lower_back',  label:'腰・体幹深部', pair:false},
  {key:'hip',         label:'股関節',       pair:true },
  {key:'glute',       label:'臀部',         pair:true },
  {key:'thigh_front', label:'大腿前',       pair:true },
  {key:'thigh_back',  label:'大腿後',       pair:true },
  {key:'lower_leg',   label:'下腿・足首',   pair:true }
];
var REGION_DEF = {};
BODY_REGIONS.forEach(function(r){ REGION_DEF[r.key] = r; });

var BODY_THEMES = [
  {key:'flex',     label:'柔軟性'},
  {key:'strength', label:'筋力'},
  {key:'balance',  label:'バランス・連動'}
];

var BODY_MAP = {
  flex: {
    banzai:            {shoulder:1,    upper_back:0.5},
    kettai:            {shoulder:1},
    shoulder_er:       {shoulder:1},
    trunk_rot:         {upper_back:1,  flank:0.5},
    trunk_side:        {flank:1,       lower_back:0.5},
    bridge:            {upper_back:0.5, hip:0.5, shoulder:0.25},
    split:             {hip:1},
    aslr:              {thigh_back:1,  hip:0.5},
    ground_touch_flex: {thigh_back:1,  lower_back:0.5}
  },
  strength: {
    ab30s:    {abdomen:1},
    pl_basic: {lower_back:1, abdomen:0.5},
    pushup:   {chest:1,      upper_arm:0.5, shoulder:0.5},
    chinup:   {upper_back:1, upper_arm:0.5},
    bp_1rm:   {chest:1,      upper_arm:0.5, shoulder:0.25},
    sq_1rm:   {thigh_front:1, glute:1},
    dl_1rm:   {thigh_back:1,  glute:1, lower_back:0.5},
    sl_sq:    {thigh_front:1, glute:0.5}
  },
  balance: {
    sl_stance:        {lower_leg:1,   hip:0.5},
    ground_touch_bal: {lower_leg:0.5, hip:0.5, thigh_back:0.25},
    sqj:      {thigh_front:0.5, glute:0.5, lower_leg:0.5},
    cmj:      {thigh_front:0.5, glute:0.5, lower_leg:0.5},
    abj:      {thigh_front:0.5, glute:0.5, lower_leg:0.5},
    sl_cmj:   {thigh_front:0.5, glute:0.5, lower_leg:0.5},
    hop_rsi:  {lower_leg:1},
    drop_rsi: {lower_leg:1},
    sq_quality:    {hip:0.5, lower_back:0.5, thigh_front:0.25},
    slide_sq:      {hip:0.5, lower_back:0.5, thigh_front:0.25},
    rot_sq:        {upper_back:0.5, flank:0.5, hip:0.25},
    rot_drill_up:  {upper_back:0.5, flank:0.5, hip:0.25},
    rot_drill_low: {upper_back:0.5, flank:0.5, hip:0.25}
  }
};

// 全40項目のフィールド名（保存・履歴の読み込みに使う）
var FIELDS = (function(){
  var out = [];
  function push(it){ if(it.pair){ out.push(it.key+'_R', it.key+'_L'); } else { out.push(it.key); } }
  FLEX.forEach(function(g){ g.items.forEach(push); });
  BALANCE.forEach(push);
  STRENGTH.forEach(function(g){ g.items.forEach(push); });
  JUMP.forEach(push);
  QUALITY.forEach(push);
  return out;
})();

// 項目定義の逆引き（フィールド名 → 定義）
var FIELD_DEF = (function(){
  var map = {};
  function reg(it, cat, sub){
    var d = {key:it.key, name:it.name, unit:it.unit||'点', cat:cat, sub:sub||'',
             pair:!!it.pair, bw:!!it.bw, est:!!it.est, kind:it.unit?'num':'pts', note:it.note||'', min:it.min||0};
    if(it.pair){ map[it.key+'_R'] = d; map[it.key+'_L'] = d; } else { map[it.key] = d; }
  }
  FLEX.forEach(function(g){ g.items.forEach(function(it){ reg(it,'flex',g.label); }); });
  BALANCE.forEach(function(it){ reg(it,'balance'); });
  STRENGTH.forEach(function(g){ g.items.forEach(function(it){ reg(it,'strength',g.sub); }); });
  JUMP.forEach(function(it){ reg(it,'jump'); });
  QUALITY.forEach(function(it){ reg(it,'quality'); });
  return map;
})();

function r1(n){ return Math.round(n*10)/10; }
function r2(n){ return Math.round(n*100)/100; }

function rule(k, d){
  var v = RULES[k];
  if(v===undefined || v==='' || isNaN(Number(v))) return d;
  return Number(v);
}
function num(v){
  if(v===undefined || v===null || v==='') return undefined;
  var n = Number(v);
  return isNaN(n) ? undefined : n;
}
var COLOR = {green:'#12B76A', amber:'#F5C400', red:'#F04438', gray:'#8A94A0'};
var LABEL = {green:'良好', amber:'普通', red:'要改善', gray:'—'};

// 得点率 → 色（rules シートの値を使う）
function bandColor(pct){
  if(pct===undefined || pct===null) return 'gray';
  if(pct >= rule('flex_green_min', 88.9)) return 'green';
  if(pct >= rule('flex_yellow_min', 66.7)) return 'amber';
  return 'red';
}
// 1〜3点 → 色
function ptColor(pt){ return pt===3 ? 'green' : (pt===2 ? 'amber' : 'red'); }
// 0〜3点 → 色（0点は「測定不能／病的な硬さ」なので赤）
function rawColor(v){ return v>=3 ? 'green' : (v>=2 ? 'amber' : 'red'); }

function calcAge(birth, onDate){
  if(!birth) return null;
  var b = new Date(birth), o = new Date(onDate || new Date());
  if(isNaN(b.getTime()) || isNaN(o.getTime())) return null;
  var a = o.getFullYear() - b.getFullYear();
  var m = o.getMonth() - b.getMonth();
  if(m < 0 || (m === 0 && o.getDate() < b.getDate())) a--;
  return a;
}

// 年齢区分。将来 elementary を足すときは rules に age_band_border_elementary を追加する。
function bandOf(age){
  if(age === null || age === undefined) return 'adult';
  var el = RULES['age_band_border_elementary'];
  if(el !== undefined && el !== '' && !isNaN(Number(el)) && age < Number(el)) return 'elementary';
  return age >= rule('age_band_border', 17) ? 'adult' : 'junior';
}
var BAND_LABEL = {adult:'17歳以上', junior:'16歳以下', elementary:'小学生'};

// 閾値の取得。その区分の行がなければ、隣の区分に落として探す。
function thOf(itemKey, ctx){
  var order = ctx.band === 'elementary' ? ['elementary','junior','adult']
            : ctx.band === 'junior'     ? ['junior','adult']
            : ['adult','junior'];
  for(var i=0;i<order.length;i++){
    var hit = TH[itemKey+'|'+ctx.sex+'|'+order[i]];
    if(hit) return hit;
  }
  return null;
}

/* 実測値 → 1〜3点
   direction=high : red_max 以下=1点 / green_min 以上=3点 / その間=2点
   direction=low  : 逆向き（タイム系など「小さいほど良い」項目を将来足せるように） */
function pointOf(itemKey, value, ctx){
  var t = thOf(itemKey, ctx);
  var v = num(value);
  if(!t || v === undefined) return null;
  if(t.direction === 'low'){
    if(v >= t.red) return 1;
    if(v <= t.green) return 3;
    return 2;
  }
  if(v <= t.red) return 1;
  if(v >= t.green) return 3;
  return 2;
}

function sideOf(field){ return /_R$/.test(field) ? '右' : (/_L$/.test(field) ? '左' : ''); }

/* ------------------------------------------------------------------
   computeScore(v, ctx)
     v   : {フィールド名: 値}
     ctx : {sex:'M'|'F', band:'adult'|…, weight:Number|undefined, est:{field:true}}
   ------------------------------------------------------------------ */
function computeScore(v, ctx){
  v = v || {};
  ctx = ctx || {};
  ctx.est = ctx.est || {};
  ctx.sex = ctx.sex || 'M';
  ctx.band = ctx.band || 'adult';
  var t = T();
  var d = {cats:{}, parts:{}, pts:{}, items:[], flags:[], jump:{}, jumpQuality:[], radars:{}, notes:[], total:0, measured:0};

  /* ---------- 柔軟性（左右がある種目は低いほうを採用） ---------- */
  var fSum = 0, fMax = 0;
  FLEX.forEach(function(g){
    var s = 0, m = 0;
    g.items.forEach(function(it){
      var sc, R, L;
      if(it.pair){
        R = num(v[it.key+'_R']); L = num(v[it.key+'_L']);
        if(R !== undefined && L !== undefined){
          sc = Math.min(R, L);
          var diff = Math.abs(R - L);
          if(diff >= rule('flex_lr_red', 2)){
            d.flags.push({lv:'red', code:'flex_lr_'+it.key, t:t.flexRed(it.name, R, L, diff)});
          }else if(diff >= rule('flex_lr_yellow', 1)){
            d.flags.push({lv:'amber', code:'flex_lr_'+it.key, t:t.flexAmber(it.name, R, L)});
          }
        }else{
          sc = (R !== undefined) ? R : L;
        }
      }else{
        sc = num(v[it.key]);
      }
      if(sc === undefined) return;
      s += sc; m += 3;
      d.items.push({
        cat:'柔軟性', sub:g.label, name:it.name, short:it.short || it.name, kind:'pts', raw:sc, color:rawColor(sc),
        val: sc + ' 点' + (R !== undefined && L !== undefined ? '（右 '+R+' / 左 '+L+'）' : '')
      });
    });
    if(m > 0){ d.parts[g.part] = {label:'柔軟性・'+g.label, pct:r1(s/m*100)}; fSum += s; fMax += m; }
  });
  if(fMax > 0) d.cats.flex = r1(fSum/fMax*100);

  /* ---------- 動きの質 ---------- */
  var qs = 0, qm = 0;
  d.qualityAssessments = qualityAssessments(v);
  d.qualityAssessments.forEach(function(a){
    qs += a.pt; qm += 3;
    d.items.push({cat:'動きの質',sub:'',name:a.label,short:a.label,kind:'pts',raw:a.pt,color:a.lv,val:a.pt+' 点'+(a.legacy?'（旧評価・未分離）':'')});
  });
  if(qm > 0) d.cats.quality = r1(qs/qm*100);

  /* ---------- 実測系（バランス・筋力・ジャンプ） ---------- */
  function runMeasured(list, catLabel, sub){
    var sum = 0, n = 0;
    list.forEach(function(it){
      var fields = it.pair ? [it.key+'_R', it.key+'_L'] : [it.key];
      fields.forEach(function(f){
        var raw = num(v[f]);
        if(raw === undefined) return;
        var name = it.name + (it.pair ? '（'+sideOf(f)+'）' : '');
        var short = (it.short || it.name) + (it.pair ? ' ' + sideOf(f) : '');
        var mark = ctx.est[f] ? ' ※推定' : '';
        var judge = raw, extra = '';

        if(it.bw){
          if(!ctx.weight){
            d.items.push({cat:catLabel, sub:sub||'', name:name, short:short, kind:'num', color:'gray',
                          val: raw+' '+it.unit+mark+'（体重未入力のため採点対象外）'});
            if(!d._wNote){ d._wNote = true; d.notes.push('体重が入力されていないため、1RM系（BP／SQ／DL）は体重比に直せず採点対象から外れています。'); }
            return;
          }
          judge = r2(raw / ctx.weight);
          extra = '（体重比 ' + judge.toFixed(2) + '）';
        }

        var pt = pointOf(it.key, judge, ctx);
        if(pt === null){
          d.items.push({cat:catLabel, sub:sub||'', name:name, short:short, kind:'num', color:'gray',
                        val: raw+' '+it.unit+extra+mark+'（基準が未設定です）'});
          return;
        }
        sum += pt; n++;
        d.pts[f] = pt;
        d.items.push({cat:catLabel, sub:sub||'', name:name, short:short, kind:'num', pt:pt, color:ptColor(pt),
                      val: raw+' '+it.unit+extra+mark});
      });

      // 左右差（高いほうを100とした差）
      if(it.pair && ASYM_ITEMS.indexOf(it.key) >= 0){
        var R = num(v[it.key+'_R']), L = num(v[it.key+'_L']);
        if(R !== undefined && L !== undefined && Math.max(R, L) > 0){
          var p = r1(Math.abs(R - L) / Math.max(R, L) * 100);
          if(p >= rule('asym_flag', 10)){
            d.flags.push({lv:'red', code:'asym_'+it.key, t:t.asym(it.name, R, L, p)});
          }
        }
      }
    });
    return {sum:sum, n:n};
  }

  var b = runMeasured(BALANCE, 'バランス');
  if(b.n > 0) d.cats.balance = r1(b.sum/(b.n*3)*100);

  var sSum = 0, sN = 0;
  STRENGTH.forEach(function(g){
    var r = runMeasured(g.items, '筋力', g.sub);
    if(r.n > 0){
      d.parts[g.part] = {label:'筋力・'+g.sub, pct:r1(r.sum/(r.n*3)*100)};
      sSum += r.sum; sN += r.n;
    }
  });
  if(sN > 0) d.cats.strength = r1(sSum/(sN*3)*100);

  var j = runMeasured(JUMP, 'ジャンプ');
  if(j.n > 0) d.cats.jump = r1(j.sum/(j.n*3)*100);

  /* ---------- ジャンプの種目間分析 ---------- */
  var sqj = num(v.sqj), cmj = num(v.cmj), abj = num(v.abj);
  if(sqj > 0 && cmj !== undefined){
    var g1 = r1((cmj - sqj) / sqj * 100);
    var tgt = rule('sqj_to_cmj_target', 10);
    d.jump.ssc = {rate:g1, text: g1 < tgt*0.3 ? t.sscLow : (g1 > tgt*1.5 ? t.sscHigh : t.sscMid),
                  lv: g1 < tgt*0.3 ? 'red' : (g1 > tgt*1.5 ? 'amber' : 'green')};
  }
  if(cmj > 0 && abj !== undefined){
    var g2 = r1((abj - cmj) / cmj * 100);
    var lo = rule('cmj_to_abj_low', 5), hi = rule('cmj_to_abj_high', 11);
    d.jump.arm = {rate:g2, text: g2 < lo ? t.armLow : (g2 > hi ? t.armHigh : t.armMid),
                  lv: g2 < lo ? 'red' : (g2 > hi ? 'amber' : 'green')};
  }
  if(cmj > 0){
    var target = r1(cmj * rule('slcmj_target_ratio', 50) / 100);
    var tol = rule('slcmj_tolerance', 5), redR = rule('slcmj_red_ratio', 90);
    d.jump.sl = {target:target, sides:[]};
    ['R','L'].forEach(function(s){
      var val = num(v['sl_cmj_'+s]);
      if(val === undefined) return;
      var pct = r1(val / target * 100);
      var label = (s === 'R' ? '右' : '左');
      var e = {side:label, val:val, pct:pct};
      if(pct < redR){
        e.lv = 'red'; e.text = t.slRed(label, val, target, pct);
        d.flags.push({lv:'red', code:'slcmj_'+s, t:e.text});
      }else if(pct < 100 - tol){
        e.lv = 'amber'; e.text = t.slNear(label, val, target, pct);
        d.flags.push({lv:'amber', code:'slcmj_'+s, t:e.text});
      }else{
        e.lv = 'green'; e.text = t.slOk(label, val, target);
      }
      d.jump.sl.sides.push(e);
    });
  }
  var hop = num(v.hop_rsi), drop = num(v.drop_rsi);
  if(hop !== undefined && drop !== undefined && Math.max(hop, drop) > 0){
    var rd = r1(Math.abs(hop - drop) / Math.max(hop, drop) * 100);
    d.jump.rsiDiff = {rate: rd, lv: rd >= rule('rsi_diff_flag', 15) ? 'amber' : 'green'};
    if(d.jump.rsiDiff.lv === 'amber'){
      d.flags.push({lv:'amber', code:'rsi_diff', t:t.rsiDiff(hop, drop, rd)});
    }
  }
  [['hop_rsi','ホップテスト'], ['drop_rsi','ドロップジャンプ']].forEach(function(p){
    var val = num(v[p[0]]);
    if(val !== undefined && val >= rule('rsi_excellent', 3.1)){
      d.flags.push({lv:'green', code:'rsi_excellent_'+p[0], t:t.rsiGood(p[1], val)});
    }
  });

  /* ---------- 部門ごとのレーダー ----------
     ・部位の得点率はそのまま
     ・「つながり」は「100−部位間の差」と「2部位の平均」の低いほう
       （差が大きいと下がる／両方低ければそれ以上には上がらない）
     ・バランスの各種「差」は、差が小さいほど外側に出るよう反転する
       0点差=100 / 1点差=66.7 / 2点差=33.3（緑・黄・赤の境界と一致） */
  function partPct(k){ return d.parts[k] ? d.parts[k].pct : undefined; }
  function linkScore(a, b){
    if(a === undefined || b === undefined) return undefined;
    return r1(Math.min(100 - Math.abs(a - b), (a + b) / 2));
  }
  function diffScore(gap){
    if(gap === undefined) return undefined;
    return r1(Math.max(0, 100 - gap * (100 / 3)));
  }
  function avgPt(list){
    var s = 0, n = 0;
    list.forEach(function(f){ if(d.pts[f] !== undefined){ s += d.pts[f]; n++; } });
    return n ? s / n : undefined;
  }
  function gapPt(a, b){
    if(d.pts[a] === undefined || d.pts[b] === undefined) return undefined;
    return Math.abs(d.pts[a] - d.pts[b]);
  }
  function pctOfPt(p){ return p === undefined ? undefined : r1(p / 3 * 100); }
  function lvPct(lv){ return lv === 'green' ? 100 : (lv === 'amber' ? 66.7 : 33.3); }

  function regionAxes(up, co, lo){
    var U = partPct(up), C = partPct(co), L = partPct(lo);
    var tip = '部位どうしの差が大きいほど、また両方が低いほど下がります';
    return [
      {label:'上半身', lines:['上半身'], value:U},
      {label:'上半身と体幹部のつながり', lines:['上半身と', '体幹部'], value:linkScore(U, C), tip:tip},
      {label:'体幹部', lines:['体幹部'], value:C},
      {label:'下半身と体幹部のつながり', lines:['下半身と', '体幹部'], value:linkScore(L, C), tip:tip},
      {label:'下半身', lines:['下半身'], value:L}
    ];
  }
  if(d.cats.flex !== undefined)     d.radars.flex = regionAxes('upper', 'core', 'lower');
  if(d.cats.strength !== undefined) d.radars.strength = regionAxes('str_upper', 'str_core', 'str_lower');

  if(d.cats.balance !== undefined){
    var stt = avgPt(['sl_stance_R', 'sl_stance_L']);
    var dyn = avgPt(['ground_touch_bal_R', 'ground_touch_bal_L']);
    var sdGap = (stt !== undefined && dyn !== undefined) ? Math.abs(stt - dyn) : undefined;
    d.radars.balance = [
      {label:'静的バランス（片脚立位）', lines:['静的', 'バランス'], value:pctOfPt(stt),
       tip: stt === undefined ? '' : '左右の平均 ' + r1(stt) + ' 点'},
      {label:'静的の左右差', lines:['静的の', '左右差'], value:diffScore(gapPt('sl_stance_R', 'sl_stance_L')),
       tip:'差が小さいほど外側。0点差=100 / 1点差=66.7 / 2点差=33.3'},
      {label:'静的と動的の差', lines:['静的と動的', 'の差'], value:diffScore(sdGap),
       tip: sdGap === undefined ? '' : '平均点の差 ' + r1(sdGap) + ' 点'},
      {label:'動的の左右差', lines:['動的の', '左右差'], value:diffScore(gapPt('ground_touch_bal_R', 'ground_touch_bal_L')),
       tip:'差が小さいほど外側。0点差=100 / 1点差=66.7 / 2点差=33.3'},
      {label:'動的バランス（地面タッチ）', lines:['動的', 'バランス'], value:pctOfPt(dyn),
       tip: dyn === undefined ? '' : '左右の平均 ' + r1(dyn) + ' 点'}
    ];
  }

  if(d.cats.jump !== undefined){
    d.radars.jump = [
      {label:'跳躍高（SQJ・CMJ・ABJ）', lines:['跳躍高'], value:pctOfPt(avgPt(['sqj', 'cmj', 'abj']))},
      {label:'反動の使い方（SQJ→CMJ）', lines:['反動の', '使い方'], value:d.jump.ssc ? lvPct(d.jump.ssc.lv) : undefined,
       tip: d.jump.ssc ? ('伸び率 ' + d.jump.ssc.rate + '%') : ''},
      {label:'腕振りの連動（CMJ→ABJ）', lines:['腕振りの', '連動'], value:d.jump.arm ? lvPct(d.jump.arm.lv) : undefined,
       tip: d.jump.arm ? ('伸び率 ' + d.jump.arm.rate + '%') : ''},
      {label:'片脚（SLCMJ）', lines:['片脚'], value:pctOfPt(avgPt(['sl_cmj_R', 'sl_cmj_L']))},
      {label:'RSI（ホップ・ドロップ）', lines:['RSI'], value:pctOfPt(avgPt(['hop_rsi', 'drop_rsi']))}
    ];
  }

  /* ---------- ジャンプの質（解説文と同じ中身を棒グラフにする） ---------- */
  if(d.jump.ssc){
    d.jumpQuality.push({name:'反動の使い方（SQJ→CMJ）', short:'反動', lv:d.jump.ssc.lv, val:d.jump.ssc.rate + ' %'});
  }
  if(d.jump.arm){
    d.jumpQuality.push({name:'腕振りの連動（CMJ→ABJ）', short:'腕振り', lv:d.jump.arm.lv, val:d.jump.arm.rate + ' %'});
  }
  if(d.jump.sl){
    d.jump.sl.sides.forEach(function(e){
      d.jumpQuality.push({name:'片脚の目標比 ' + e.side, short:'片脚 ' + e.side, lv:e.lv, val:e.pct + ' %'});
    });
  }
  if(d.jump.rsiDiff){
    d.jumpQuality.push({name:'ホップとドロップのRSI差', short:'RSI差', lv:d.jump.rsiDiff.lv, val:d.jump.rsiDiff.rate + ' %'});
  }

  /* ---------- 総合（カテゴリー得点率の加重平均） ---------- */
  var tot = 0, w = 0;
  CATS.forEach(function(c){
    if(d.cats[c.key] === undefined) return;
    var cw = CATEGORY_WEIGHTS[c.key];
    if(!cw) return;
    tot += d.cats[c.key] * cw; w += cw;
    d.measured++;
  });
  d.total = w > 0 ? r1(tot / w) : 0;

  /* ---------- ボディマップ（部位ごとの得点率） ---------- */
  d.body = bodyScores(v, d);
  // 横断的なつながりの推定は保留。直接評価のみを図へ渡す。
  return d;
}

/* 1項目の点数を取り出す。実測系は判定後の1〜3点、
   柔軟性と動きの質は入力そのもの（0〜3点）。 */
function ptOfField(f, v, d){
  if(d.pts[f] !== undefined) return d.pts[f];
  var def = FIELD_DEF[f];
  if(def && def.kind === 'pts'){
    var raw = num(v[f]);
    return raw === undefined ? undefined : raw;
  }
  return undefined;
}

/* 部位ごとの得点率と、その根拠になった種目。
   左右がある種目は左右それぞれの側へ。
   左右がある種目が中央の部位（背中・腰・腹部・胸）に入るときは、
   低いほうの点数を採る（柔軟性の扱いと同じ考え方）。 */
function qualityAssessments(v){
  var out=[];
  function add(key,it,side,legacy){var p=num(v[key]);if(p===undefined||!Number.isInteger(p)||p<0||p>3)return;out.push({key:key,test:it.key,side:side||'',label:it.name+(side==='R'?'・右':side==='L'?'・左':''),pt:p,lv:rawColor(p),detail:it.note||'',legacy:!!legacy});}
  QUALITY.forEach(function(it){
    if(it.pair){
      var hasSide=['R','L'].some(function(s){return num(v[it.key+'_'+s])!==undefined;});
      if(hasSide)['R','L'].forEach(function(s){add(it.key+'_'+s,it,s,false);});
      else add(it.key,it,'',true);
    }else add(it.key,it,'',false);
  });
  if(num(v.pelvic_tilt_anterior)===undefined&&num(v.pelvic_tilt_posterior)===undefined)add('pelvic_tilt',{key:'pelvic_tilt',name:'ペルビックティルト'},'',true);
  return out;
}
function qualityExtraKeys(){return QUALITY.reduce(function(a,it){return a.concat(it.pair?[it.key+'_R',it.key+'_L']:[it.key]);},[]).concat(LEGACY_QUALITY_KEYS);}
function unpackQualityRecord(row){
  var copy=Object.assign({},row);
  try{var ext=JSON.parse(row.note);if(['needs-quality-v2','needs-quality-v3'].includes(ext.schema)&&ext.values){qualityExtraKeys().forEach(function(k){var n=ext.values[k];if(Number.isInteger(n)&&n>=0&&n<=3)copy[k]=n;});}}catch(e){}
  return copy;
}
function packQualityValues(values){
  var extra={};qualityExtraKeys().forEach(function(k){if(values[k]!==undefined)extra[k]=values[k];});
  return Object.keys(extra).length?JSON.stringify({schema:'needs-quality-v3',values:extra}):'';
}

function bodyScores(v, d){
  var out = {};
  BODY_THEMES.forEach(function(th){
    var map = BODY_MAP[th.key] || {};
    var acc = {}, basis = {};
    function add(region, side, pt, name, w){
      var k = region + '|' + (side || 'C');
      if(!acc[k]){ acc[k] = {s:0, w:0}; basis[k] = []; }
      acc[k].s += pt * w; acc[k].w += w;
      basis[k].push({name:name, pt:pt, w:w});
    }
    Object.keys(map).forEach(function(key){
      var def = FIELD_DEF[key] || FIELD_DEF[key + '_R'];
      if(!def) return;
      var isPair = !!def.pair;
      var R = isPair ? ptOfField(key + '_R', v, d) : undefined;
      var L = isPair ? ptOfField(key + '_L', v, d) : undefined;
      var S = isPair ? undefined : ptOfField(key, v, d);
      Object.keys(map[key]).forEach(function(region){
        var rd = REGION_DEF[region];
        if(!rd) return;
        var w = map[key][region];
        if(rd.pair){
          if(isPair){
            if(R !== undefined) add(region, 'R', R, def.name + '（右）', w);
            if(L !== undefined) add(region, 'L', L, def.name + '（左）', w);
          }else if(S !== undefined){
            add(region, 'R', S, def.name, w);
            add(region, 'L', S, def.name, w);
          }
        }else{
          var pt;
          if(isPair){
            if(R !== undefined && L !== undefined) pt = Math.min(R, L);
            else pt = (R !== undefined) ? R : L;
          }else{
            pt = S;
          }
          if(pt !== undefined){
            add(region, null, pt, def.name + (isPair ? '（左右の低いほう）' : ''), w);
          }
        }
      });
    });
    var score = {};
    Object.keys(acc).forEach(function(k){ score[k] = r1(acc[k].s / acc[k].w / 3 * 100); });
    out[th.key] = {score:score, basis:basis};
  });
  return out;
}
  if (weights) CATEGORY_WEIGHTS = { ...CATEGORY_WEIGHTS, ...weights };
  return Object.freeze({
    score(values, context = {}) {
      return computeScore(structuredClone(values), structuredClone(context));
    },
    ageOn: calcAge,
    ageBand: bandOf,
    pointOf,
    fields: Object.freeze([...FIELDS]),
    definitions: structuredClone(FIELD_DEF),
  });
}
