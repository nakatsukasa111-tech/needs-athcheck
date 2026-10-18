import {golfColor} from './golf-overlay.mjs';
// Right-facing profile. The selected anatomical side is never averaged with the other.
const regions={shoulder:[125,115,10,13],upper_arm:[121,147,12,24],chest:[145,144,15,17],upper_back:[99,151,9,21],abdomen:[143,193,14,23],lower_back:[112,195,11,20],flank:[129,195,10,20],hip:[126,232,17,18],glute:[105,235,14,20],thigh_front:[137,277,12,30],thigh_back:[112,279,12,28],lower_leg:[117,351,11,32]};
const central=new Set(['chest','upper_back','abdomen','lower_back']);
export function renderSideOverlay(scores={},rules={},side='R',prefix='side'){
 const selected=side==='L'?'L':'R',safe=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'');
 let defs='',marks='';
 for(const [region,[x,y,rx,ry]]of Object.entries(regions)){
  const key=region+'|'+(central.has(region)?'C':selected),v=scores[key];
  if(typeof v!=='number'||!Number.isFinite(v))continue;
  const color=golfColor(v,rules),id='side-'+safe+'-'+region;
  defs+='<radialGradient id="'+id+'"><stop stop-color="'+color+'" stop-opacity=".85"/><stop offset=".5" stop-color="'+color+'" stop-opacity=".5"/><stop offset="1" stop-color="'+color+'" stop-opacity="0"/></radialGradient>';
  marks+='<g class="golf-region" data-region="'+key+'" data-value="'+v+'" data-color="'+color+'"><title>'+key+'：'+Math.round(v*10)/10+'</title><ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="url(#'+id+')"/></g>';
 }
 return '<defs>'+defs+'</defs>'+marks;
}
