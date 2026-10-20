export const photoDay=p=>new Date(p.captured_at||p.uploaded_at).toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});
export function removePhoto(layout,id){
 for(const row of layout.rows)for(const side of ['before','after'])if(row[side]===id){row[side]=null;row.automatic=false;}
 layout.other=layout.other.filter(value=>value!==id);
}
export function appendPhoto(layout,p,{manual=false}={}){
 if(p.phase==='other'){layout.other.push(p.id);return;}
 const day=photoDay(p);
 let row=!manual&&layout.rows.find(r=>r.automatic&&r.day===day&&!r[p.phase]);
 if(!row){row={id:manual?crypto.randomUUID():p.id,day,before:null,after:null,automatic:!manual};layout.rows.push(row);}
 row[p.phase]=p.id;
}
export function photoLayout(stored,photos){
 const layout=structuredClone(stored||{rows:[],other:[]});
 const active=photos.filter(p=>p.status==='ready'&&!p.deleted_at);
 const ids=new Set(active.map(p=>p.id));
 for(const row of layout.rows)for(const side of ['before','after'])if(row[side]&&!ids.has(row[side])){row[side]=null;row.automatic=false;}
 layout.other=layout.other.filter(id=>ids.has(id));
 const placed=new Set([...layout.other,...layout.rows.flatMap(r=>[r.before,r.after])].filter(Boolean));
 for(const p of [...active].sort((a,b)=>(a.captured_at||a.uploaded_at).localeCompare(b.captured_at||b.uploaded_at)||a.uploaded_at.localeCompare(b.uploaded_at)||a.id.localeCompare(b.id)))if(!placed.has(p.id))appendPhoto(layout,p);
 return layout;
}
function locate(layout,id){
 const index=layout.other.indexOf(id);if(index>=0)return {kind:'other',index};
 for(const row of layout.rows)for(const side of ['before','after'])if(row[side]===id)return {kind:'slot',row,side};
 throw Error('移動する写真を読み直してください。');
}
function put(layout,location,id){
 if(location.kind==='other')layout.other[location.index]=id;
 else {location.row[location.side]=id;location.row.automatic=false;}
}
export function movePhoto(stored,id,target,newRowId){
 const layout=structuredClone(stored),source=locate(layout,id);
 const changes=[];
 const phaseOf=loc=>loc.kind==='other'?'other':loc.side;
 if(target.kind==='photo'){
  if(target.id===id)return {layout,changes};
  const destination=locate(layout,target.id);
  put(layout,source,target.id);put(layout,destination,id);
  changes.push({id,phase:phaseOf(destination)},{id:target.id,phase:phaseOf(source)});
 }else{
  if(target.kind==='slot'){
   const row=layout.rows.find(r=>r.id===target.rowId);
   if(!row||!['before','after'].includes(target.side)||row[target.side])throw Error('移動先を読み直してください。');
   removePhoto(layout,id);row[target.side]=id;row.automatic=false;changes.push({id,phase:target.side});
  }else if(target.kind==='insert'){
   if(!['before','after'].includes(target.side))throw Error('移動先を確認してください。');
   const index=target.beforeRowId==null?layout.rows.length:layout.rows.findIndex(r=>r.id===target.beforeRowId);
   if(index<0)throw Error('移動先を読み直してください。');
   removePhoto(layout,id);
   layout.rows.splice(index,0,{id:newRowId,day:null,before:null,after:null,automatic:false,[target.side]:id});
   changes.push({id,phase:target.side});
  }else if(target.kind==='other'){
   removePhoto(layout,id);
   const index=target.beforeId==null?layout.other.length:layout.other.indexOf(target.beforeId);
   if(index<0)throw Error('移動先を読み直してください。');
   layout.other.splice(index,0,id);changes.push({id,phase:'other'});
  }else throw Error('移動先を確認してください。');
 }
 return {layout,changes};
}
