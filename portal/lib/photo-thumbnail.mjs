import sharp from 'sharp';
export const thumbnailPath=original=>original+'.thumb.webp';
export async function thumbnail(bytes){return sharp(bytes,{limitInputPixels:100000000}).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toBuffer();}
// All strings are generated from validated marks, never from arbitrary SVG input.
export async function annotatedThumbnail(bytes,marks){
 const base=await sharp(bytes).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).toBuffer({resolveWithObject:true});
 const shapes=marks.map(m=>{
  const a=m.points[0],b=m.points.at(-1),w=m.width||6;
  const attrs=`fill="none" stroke="${m.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  if(m.tool==='pen')return `<polyline points="${m.points.map(p=>p.join(',')).join(' ')}" ${attrs}/>`;
  if(m.tool==='rectangle')return `<rect x="${Math.min(a[0],b[0])}" y="${Math.min(a[1],b[1])}" width="${Math.abs(a[0]-b[0])}" height="${Math.abs(a[1]-b[1])}" ${attrs}/>`;
  if(m.tool==='circle')return `<ellipse cx="${(a[0]+b[0])/2}" cy="${(a[1]+b[1])/2}" rx="${Math.max(8,Math.abs(a[0]-b[0])/2)}" ry="${Math.max(8,Math.abs(a[1]-b[1])/2)}" ${attrs}/>`;
  let line=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${attrs}/>`;
  if(m.tool==='arrow'){const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),length=w*3+12;const c=[b[0]-length*Math.cos(angle-.55),b[1]-length*Math.sin(angle-.55)],d=[b[0]-length*Math.cos(angle+.55),b[1]-length*Math.sin(angle+.55)];line+=`<polyline points="${c.join(',')} ${b.join(',')} ${d.join(',')}" ${attrs}/>`;}
  return line;
 }).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${base.info.width}" height="${base.info.height}" viewBox="0 0 1000 1000" preserveAspectRatio="none">${shapes}</svg>`;
 return sharp(base.data).composite([{input:Buffer.from(svg)}]).webp({quality:80}).toBuffer();
}
