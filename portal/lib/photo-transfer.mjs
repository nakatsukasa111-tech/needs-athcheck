// Wait for every in-flight save, including after one fails; a retry reuses the same IDs.
export async function savePool(items,save,limit=2){
 const results=new Array(items.length);let next=0;
 async function worker(){while(next<items.length){const index=next++;try{results[index]={status:'fulfilled',value:await save(items[index],index)};}catch(reason){results[index]={status:'rejected',reason};}}}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return results;
}
export function uploadPhoto(url,file,onProgress){return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('PUT',url);xhr.setRequestHeader('Content-Type',file.type);xhr.timeout=180000;
 xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
 xhr.onload=()=>{if((xhr.status>=200&&xhr.status<300)||xhr.status===400||xhr.status===409)resolve();else reject(Error('写真を送信できませんでした。再試行してください。'));};
 xhr.onerror=xhr.ontimeout=xhr.onabort=()=>reject(Error('通信が完了しませんでした。接続を確認して再試行してください。'));
 xhr.send(file);
});}
