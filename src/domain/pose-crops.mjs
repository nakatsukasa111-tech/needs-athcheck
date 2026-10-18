// Source-atlas coordinates, audited against all male/female illustrations.
// Separate artwork from neighbours without trimming outstretched equipment.
const rect=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
export function sportCrop(sport,phase,view,sex='M'){
 const back=view==='back',female=sex==='F';
 let edges=[0,512,1024,1536],split=486;
 if(sport==='tennis')edges=[0,550,1024,1536];
 if(sport==='soccer'){edges=[0,565,1080,1536];split=500;}
 if(sport==='sprint'){edges=[0,565,1024,1536];split=490;}
 if(sport==='basketball'){edges=[0,580,1024,1536];split=503;}
 if(sport==='lacrosse'){edges=[0,500,965,1536];split=female?475:495;}
 if(sport==='volleyball')split=phase===2?466:490;
 if(sport==='naginata'){edges=[0,550,1030,1536];split=female?490:480;}
 if(sport==='baseball-pitcher'){
  split=480;edges=[0,520,1040,1536];
  if(!back&&phase===1)return [[535,0],[1110,0],[1110,180],[1040,180],[1040,480],[535,480]];
  if(!back&&phase===2)return [[1110,0],[1536,0],[1536,480],[1040,480],[1040,180],[1110,180]];
  if(!back&&phase===0)return rect(0,0,535,480);
  if(back&&phase===0)return [[0,480],[500,480],[500,600],[520,600],[520,1024],[0,1024]];
  if(back&&phase===1)return [[500,480],[1040,480],[1040,1024],[520,1024],[520,600],[500,600]];
 }
 if(sport==='baseball-batter'){
  edges=[0,540,1060,1536];split=490;
  // The rear-view bat starts between the front-view legs above the row seam.
  if(!female&&phase===0)return back
   ?[[0,490],[280,490],[280,460],[410,460],[410,490],[540,490],[540,1024],[0,1024]]
   :[[0,0],[540,0],[540,490],[410,490],[410,460],[280,460],[280,490],[0,490]];
 }
 if(sport==='lacrosse'&&!female&&phase===2)return back
  ?[[965,495],[1380,495],[1380,475],[1536,475],[1536,1024],[965,1024]]
  :[[965,0],[1536,0],[1536,475],[1380,475],[1380,495],[965,495]];
 return rect(edges[phase],back?split:0,edges[phase+1],back?1024:split);
}
export function sportClipPoints(sport,phase,view,sex){
 return sportCrop(sport,phase,view,sex).map(([x,y])=>[x-phase*512,y-(view==='back'?500:0)].join(',')).join(' ');
}
