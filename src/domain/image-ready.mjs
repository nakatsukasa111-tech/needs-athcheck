// Share a decoded-image promise across views; errors remain retryable.
const loaded=new Map();
export function imageReady(src){
 if(loaded.has(src))return loaded.get(src);
 const promise=new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=async()=>{try{if(image.decode)await image.decode();resolve();}catch(e){reject(e);}};
  image.onerror=()=>reject(Error('画像を読み込めませんでした。'));image.src=src;
 });
 loaded.set(src,promise);promise.catch(()=>loaded.delete(src));return promise;
}
