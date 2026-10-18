import sharp from 'sharp';
export const thumbnailPath=original=>original+'.thumb.webp';
export async function thumbnail(bytes){return sharp(bytes,{limitInputPixels:100000000}).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toBuffer();}
