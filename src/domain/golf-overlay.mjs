// Image-space landmarks for the existing 1536 x 1024 right-handed golf drawings.
// R/L always mean the athlete's side, never the viewer's side. Coordinates are
// illustrative: measured body scores are reused without grading the golf swing.
export const golfLandmarks={
 address:{
  front:{'shoulder|R':[370,227,37,38],'shoulder|L':[574,225,37,38],'upper_arm|R':[388,293,25,40],'upper_arm|L':[568,291,25,40],'chest|C':[475,260,62,39],'abdomen|C':[477,364,40,31],'flank|R':[416,356,23,34],'flank|L':[535,356,23,34],'hip|R':[397,448,32,34],'hip|L':[563,448,32,34],'thigh_front|R':[395,544,35,53],'thigh_front|L':[568,548,35,53],'lower_leg|R':[365,760,24,65],'lower_leg|L':[602,762,24,65]},
  back:{'shoulder|L':[961,216,35,37],'shoulder|R':[1170,216,35,37],'upper_arm|L':[951,276,24,35],'upper_arm|R':[1179,275,24,35],'upper_back|C':[1065,249,61,52],'lower_back|C':[1063,350,48,30],'glute|L':[1000,456,36,36],'glute|R':[1130,456,36,36],'thigh_back|L':[988,554,33,54],'thigh_back|R':[1140,559,33,54],'lower_leg|L':[945,759,25,65],'lower_leg|R':[1184,758,25,65]}
 },
 impact:{
  front:{'shoulder|R':[365,252,34,35],'shoulder|L':[560,183,31,35],'upper_arm|R':[399,306,25,35],'upper_arm|L':[565,246,24,35],'chest|C':[468,256,49,37],'abdomen|C':[492,353,37,30],'flank|R':[435,356,20,30],'flank|L':[525,333,19,30],'hip|R':[431,439,28,32],'hip|L':[582,431,22,31],'thigh_front|R':[450,551,32,49],'thigh_front|L':[593,538,28,46],'lower_leg|R':[395,730,24,56],'lower_leg|L':[606,758,22,64]},
  back:{'shoulder|L':[985,220,30,36],'shoulder|R':[1161,186,28,34],'upper_arm|L':[993,280,24,33],'upper_arm|R':[1172,249,20,34],'upper_back|C':[1075,244,54,48],'lower_back|C':[1115,350,45,27],'glute|L':[1078,448,34,36],'glute|R':[1191,440,30,36],'thigh_back|L':[1050,552,34,46],'thigh_back|R':[1182,550,31,45],'lower_leg|L':[1005,750,25,61],'lower_leg|R':[1214,729,24,58]}
 },
 follow:{
  front:{'shoulder|R':[450,213,33,32],'shoulder|L':[515,173,23,22],'upper_arm|R':[510,222,31,25],'upper_arm|L':[603,224,23,22],'chest|C':[510,286,33,32],'abdomen|C':[525,351,36,28],'flank|R':[460,337,19,27],'flank|L':[568,337,18,27],'hip|R':[466,442,25,32],'hip|L':[588,439,23,31],'thigh_front|R':[473,544,31,48],'thigh_front|L':[584,549,29,44],'lower_leg|R':[370,726,23,54],'lower_leg|L':[587,757,22,62]},
  back:{'shoulder|L':[991,197,31,30],'shoulder|R':[1150,183,23,25],'upper_arm|L':[962,226,25,22],'upper_arm|R':[1014,149,22,19],'upper_back|C':[1080,237,49,44],'lower_back|C':[1055,351,45,27],'glute|L':[1003,453,33,37],'glute|R':[1118,452,32,37],'thigh_back|L':[1000,549,30,48],'thigh_back|R':[1128,554,29,45],'lower_leg|L':[1002,757,23,63],'lower_leg|R':[1201,721,24,55]}
 }
};
const labels={shoulder:'肩',upper_arm:'上腕',chest:'胸',abdomen:'腹部',flank:'体側',hip:'股関節',thigh_front:'大腿前',thigh_back:'大腿後',lower_leg:'下腿・足首',upper_back:'背中・胸椎',lower_back:'腰・体幹深部',glute:'臀部'};
const limit=(rules,key,fallback)=>rules[key]===undefined||rules[key]===''||!Number.isFinite(Number(rules[key]))?fallback:Number(rules[key]);
export function golfColor(value,rules={}){return value>=limit(rules,'flex_green_min',88.9)?'#12B76A':value>=limit(rules,'flex_yellow_min',66.7)?'#F5C400':'#F04438';}
export function renderGolfOverlay(pose,scores={},rules={},prefix='golf'){
 const views=golfLandmarks[pose];if(!views)return '';
 const safePrefix=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'');let defs='',spots='';
 for(const [view,regions]of Object.entries(views))for(const [key,[x,y,rx,ry]]of Object.entries(regions)){
  const v=scores[key];if(typeof v!=='number'||!Number.isFinite(v))continue;
  const [region,side]=key.split('|'),id=`golf-${safePrefix}-${pose}-${view}-${region}-${side}`,color=golfColor(v,rules);
  defs+=`<radialGradient id="${id}"><stop offset="0%" stop-color="${color}" stop-opacity=".90"/><stop offset="45%" stop-color="${color}" stop-opacity=".66"/><stop offset="78%" stop-color="${color}" stop-opacity=".24"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  const title=`${labels[region]}${side==='C'?'':side==='R'?'・右':'・左'}：${Math.round(v*10)/10} / 100`;
  spots+=`<g class="golf-region" data-region="${key}" data-value="${v}" data-color="${color}"><title>${title}</title><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${id})"/></g>`;
 }
 return `<svg viewBox="0 0 1536 1024" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="測定結果によるゴルフ姿勢の部位別色分け"><defs>${defs}</defs>${spots}</svg>`;
}
