export const palette={green:'#12B76A',amber:'#F5C400',red:'#F04438',gray:'#9CA3AF'};
export function scoreColor(value,rules={}){
 if(value==null||!Number.isFinite(value))return palette.gray;
 const limit=(key,fallback)=>rules[key]===undefined||rules[key]===''||!Number.isFinite(Number(rules[key]))?fallback:Number(rules[key]);
 return value>=limit('flex_green_min',88.9)?palette.green:value>=limit('flex_yellow_min',66.7)?palette.amber:palette.red;
}
