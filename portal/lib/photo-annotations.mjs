export const annotationTools={pen:'手描き',line:'直線',arrow:'矢印',circle:'丸'};
export const annotationColors={'#e53935':'赤','#e5ad00':'黄','#138a55':'緑','#0066ff':'青','#202832':'黒'};
export const annotationWidths={3:'細',7:'中',14:'太',24:'極太'};

export function validateAnnotations(input){
 if(!Array.isArray(input)||input.length>80)throw Error('線や印は80個までにしてください。');
 let totalPoints=0;
 return input.map(mark=>{
  if(!mark||typeof mark!=='object'||!Object.hasOwn(annotationTools,mark.tool)||!Object.hasOwn(annotationColors,mark.color)||!Array.isArray(mark.points))throw Error('線や印の内容を確認してください。');
  const max=mark.tool==='pen'?200:2;
  if(mark.points.length<2||mark.points.length>max||(mark.tool!=='pen'&&mark.points.length!==2))throw Error('線や印の内容を確認してください。');
  totalPoints+=mark.points.length;if(totalPoints>4000)throw Error('線の点が多すぎます。');
  const points=mark.points.map(point=>{
   if(!Array.isArray(point)||point.length!==2||point.some(value=>!Number.isFinite(value)||value<0||value>1000))throw Error('線や印の位置を確認してください。');
   return point.map(value=>Math.round(value));
  });
  if(mark.width!=null&&!Object.hasOwn(annotationWidths,mark.width))throw Error('線の太さを確認してください。');
  return {tool:mark.tool,color:mark.color,points,...(mark.width==null?{}:{width:mark.width})};
 });
}
