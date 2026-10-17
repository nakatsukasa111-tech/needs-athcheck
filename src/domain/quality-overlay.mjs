import {golfLandmarks,renderGolfOverlay} from './golf-overlay.mjs';
const colors={red:'#F04438',amber:'#F5C400',green:'#12B76A'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderConnection(link,pose,view='front'){
 if(!link||!colors[link.lv])return '';
 let left,right,hipsLeft,hipsRight,scale;
 if(pose==='standing'){left=[82,105];right=[158,105];hipsLeft=[88,245];hipsRight=[152,245];scale=1;}
 else{const p=golfLandmarks[pose]?.[view];if(!p)return '';const shoulder=[p['shoulder|R'],p['shoulder|L']].sort((a,b)=>a[0]-b[0]);const hip=[p['hip|R']||p['glute|R'],p['hip|L']||p['glute|L']].sort((a,b)=>a[0]-b[0]);[left,right]=shoulder;[hipsLeft,hipsRight]=hip;scale=2.2;}
 const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],upper=mid(left,right),lower=mid(hipsLeft,hipsRight);
 let paths=[];
 const arc=(a,b,bend)=>`M${a[0]},${a[1]} Q${(a[0]+b[0])/2},${(a[1]+b[1])/2+bend} ${b[0]},${b[1]}`;
 if(link.type==='shoulders')paths=[arc(left,right,-18*scale)];
 else if(link.type==='hips')paths=[arc(hipsLeft,hipsRight,-18*scale)];
 else if(link.type==='lower')paths=[arc(hipsLeft,hipsRight,45*scale)];
 else{
  const bend=link.type==='flexion'?-26*scale:26*scale;
  paths=[`M${upper[0]},${upper[1]} Q${upper[0]+bend},${(upper[1]+lower[1])/2} ${lower[0]},${lower[1]}`,arc(left,right,-12*scale),arc(hipsLeft,hipsRight,12*scale)];
 }
 const lines=paths.map(d=>`<path d="${d}" fill="none" stroke="${colors[link.lv]}" stroke-width="${5*scale}" stroke-linecap="round"/>`).join('');
 return `<g class="quality-connection" data-connection="${escape(link.key)}" role="img" aria-label="${escape(link.label)}"><title>${escape(link.label+'：'+link.detail)}</title><g opacity=".18" stroke-linejoin="round">${paths.map(d=>`<path d="${d}" fill="none" stroke="${colors[link.lv]}" stroke-width="${13*scale}"/>`).join('')}</g>${lines}</g>`;
}
export function renderGolfFigure(pose,view,scores,rules,prefix,link,assetRoot='/golf/'){
 if(!golfLandmarks[pose]||!['front','back'].includes(view))return '';
 const box=view==='front'?'200 -40 500 1040':'850 -40 500 1040';
 const overlay=link?renderConnection(link,pose,view):renderGolfOverlay(pose,scores,rules,prefix+'-'+view).replace(/^<svg[^>]*>/,'<g>').replace(/<\/svg>$/,'</g>');
 return `<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ゴルフ・${view==='front'?'正面':'背面'}"><image href="${escape(assetRoot+pose+'.png')}" width="1536" height="1024"/><g style="mix-blend-mode:multiply">${overlay}</g></svg>`;
}
