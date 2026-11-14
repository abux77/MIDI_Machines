const cache=new Map();
const orders=[
 [0,8,4,12,2,10,6,14,1,9,5,13,3,11,7,15],
 [0,5,11,3,14,7,1,9,15,4,12,6,2,10,8,13],
];
export function maskHits(length,amount){return Math.round(length*Math.max(0,Math.min(100,amount))/100);}
// A small bank of rhythms and their rotations; identical patterns appear once.
export function maskPatterns(length,amount){
 if(length<1)return [[]];
 const hits=maskHits(length,amount),key=length+':'+hits;
 if(cache.has(key))return cache.get(key);
 const patterns=[],seen=new Set();
 const bases=[Array.from({length},(_,step)=>(step*hits)%length<hits),Array.from({length},(_,step)=>step<hits),...orders.map(order=>{const selected=order.filter(step=>step<length).slice(0,hits);return Array.from({length},(_,step)=>selected.includes(step));})];
 for(const base of bases)for(let shift=0;shift<length;shift++){
  const pattern=base.map((_,step)=>base[(step-shift+length)%length]),signature=pattern.map(Number).join('');
  if(!seen.has(signature)){seen.add(signature);patterns.push(pattern);}
 }
 cache.set(key,patterns);return patterns;
}
export function maskPlays(step,length,amount,variation=0){
 if(length<1||step<0||step>=length)return false;
 const patterns=maskPatterns(length,amount);
 return patterns[Math.max(0,Math.min(patterns.length-1,Math.floor(variation)))][step];
}
