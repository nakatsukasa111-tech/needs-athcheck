import {golfLandmarks,renderGolfOverlay} from './golf-overlay.mjs';
import {renderSideOverlay} from './side-overlay.mjs';
const colors={red:'#F04438',amber:'#F5C400',green:'#12B76A'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Each glyph represents one direct observation, never a derived connection.
export function renderQualityMarks(assessments=[],pose='standing',view='front',mirror=false,custom=null){
 if(!['front','back','side'].includes(view)|| (pose!=='standing'&&!golfLandmarks[pose]&&!custom))return '';
 const golf=pose!=='standing',scale=custom?.scale??(golf?2.2:1);
 const marks=[];
 const landmarks=custom?.landmarks??(golf?golfLandmarks[pose][view]:null);
 const point=(side,part)=>{
  if(golf){if(mirror)side=side==='R'?'L':'R';const p=landmarks[(part==='shoulder'?'shoulder|':view==='front'?'hip|':'glute|')+side];return p.slice(0,2);}
  const x=(view==='front'?side==='R':side==='L')?86:154;
  return [x,part==='shoulder'?105:242];
 };
 function mark(a,x,y,shape,label,dir=1){
  const color=colors[a.lv];if(!color)return;
  let glyph='';
  if(shape==='line')glyph='<path d="M0,-55 L0,65"/>';
  if(shape==='arc'||shape==='horizontal'){
   const sy=shape==='horizontal'?.48:1;
   glyph=`<g transform="scale(${dir} ${sy})"><path d="M-13,9 C-26,-16 22,-23 18,1"/><path d="M12,-5 L18,2 L24,-4"/></g>`;
  }
  if(shape==='ssp')glyph=`<path d="M0,-40 Q${dir*22},-6 0,33"/><path d="M-5,27 L0,34 L6,28"/>`;
  if(shape==='spot')glyph=`<ellipse rx="18" ry="25" fill="${color}" opacity=".12" stroke="none"/><ellipse rx="13" ry="19" fill="${color}" opacity=".3" stroke="none"/><ellipse rx="8" ry="12" fill="${color}" opacity=".5" stroke="none"/>`;
  const labelY=shape==='line'?79:shape==='ssp'?49:shape==='spot'?35:25;
  marks.push(`<g class="quality-mark" data-assessment="${esc(a.key)}" data-side="${esc(a.side)}" data-color="${color}" role="img" aria-label="${esc(a.label)}：${a.pt}点"><title>${esc(a.label)}：${a.pt}点。${esc(a.detail)}</title><g transform="translate(${x} ${y}) scale(${scale})"><g fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${shape==='spot'?'':glyph}</g><g fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</g><text transform="scale(${mirror?-1:1} 1)" y="${labelY}" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="600" fill="#303740" stroke="white" stroke-width="3" paint-order="stroke">${esc(label)}</text></g></g>`);
 }
 for(const a of assessments??[]){
  if(a.legacy||!Number.isInteger(a.pt)||a.pt<1||a.pt>3)continue;
  const side=a.side,sideLabel=side==='R'?'右':'左';
  if(view==='side'){
   if(a.test==='ssp_extension')mark(a,75,140,'ssp','SSP伸展',-1);
   if(a.test==='ssp_flexion')mark(a,179,140,'ssp','SSP屈曲',1);
   if(a.test==='pelvic_tilt_anterior')mark(a,172,236,'arc','前傾',1);
   if(a.test==='pelvic_tilt_posterior')mark(a,75,236,'arc','後傾',-1);
   continue;
  }
  if(side){
   const shoulder=point(side,'shoulder'),hip=point(side,'hip');
   const other=point(side==='R'?'L':'R','hip');const outward=hip[0]<other[0]?-1:1;
   const chest=[shoulder[0]+(other[0]-hip[0])*.12,shoulder[1]+28*scale];
   if(a.test==='slide_sq'&&view==='front')mark(a,hip[0]+outward*34*scale,(chest[1]+hip[1])/2,'line',sideLabel);
   if(a.test==='scapula_motion'&&view==='back')mark(a,chest[0],shoulder[1]+16*scale,'spot','肩甲骨'+sideLabel);
   if(a.test==='rot_drill_up'&&view==='front')mark(a,chest[0],chest[1],'arc','上 '+sideLabel,outward);
   if(a.test==='rot_drill_low'&&view==='front')mark(a,hip[0],hip[1],'horizontal','下 '+sideLabel,outward);
   if(a.test==='rot_sq'&&view==='back'){
    mark(a,chest[0],shoulder[1]+76*scale,'arc','SQ '+sideLabel,outward);
    mark(a,hip[0],hip[1]+18*scale,'horizontal','SQ '+sideLabel,outward);
   }
  }
  if(golf){
   const r=point('R','hip'),l=point('L','hip'),center=(r[0]+l[0])/2;
   if(a.test==='ssp_extension'&&view==='back')mark(a,Math.min(r[0],l[0])-48*scale,r[1]-68*scale,'ssp','SSP伸展',-1);
   if(a.test==='ssp_flexion'&&view==='front')mark(a,center,r[1]-63*scale,'ssp','SSP屈曲',1);
   if(a.test==='pelvic_tilt_anterior'&&view==='front')mark(a,center,r[1]+44*scale,'arc','前傾',1);
   if(a.test==='pelvic_tilt_posterior'&&view==='back')mark(a,center,r[1]+76*scale,'arc','後傾',-1);
  }
 }
 return marks.join('');
}
export function renderSideFigure(assessments=[],assetRoot='/body/',options={}){
 const {scores={},rules={},side='R',theme='quality',sex='M',prefix='side'}=options;
 const file=sex==='F'?'side.png':'side-male.png';
 const overlay=['flex','strength'].includes(theme)?renderSideOverlay(scores,rules,side,prefix):theme==='quality'?renderQualityMarks(assessments,'standing','side'):'';
 return `<svg viewBox="0 0 240 448" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="立位・横向き"><image href="${esc(assetRoot+file)}" x="-17" y="34" width="273" height="410" preserveAspectRatio="none"/>${overlay}</svg>`;
}
export function renderGolfFigure(pose,view,scores,rules,prefix,assessments,assetRoot='/golf/',mirror=false){
 if(!golfLandmarks[pose]||!['front','back'].includes(view))return '';
 const box=view==='front'?'0 -40 768 1040':'768 -40 768 1040';
 const overlay=assessments?renderQualityMarks(assessments,pose,view,mirror):renderGolfOverlay(pose,scores,rules,prefix+'-'+view,mirror).replace(/^<svg[^>]*>/,'<g>').replace(/<\/svg>$/,'</g>');
 return `<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ゴルフ・${view==='front'?'正面':'背面'}"><g transform="${mirror?`translate(${view==='front'?768:2304} 0) scale(-1 1)`: ''}"><image href="${esc(assetRoot+pose+'.png')}" width="1536" height="1024"/>${overlay}</g></svg>`;
}
