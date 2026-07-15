import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {PNG} from 'pngjs';

const root=resolve(import.meta.dirname,'..');
const sourceRoot=resolve(root,'source-assets/a75/characters/boon-givers');
const runtimeRoot=resolve(root,'public/assets/a75/characters/boon-givers');
mkdirSync(sourceRoot,{recursive:true});mkdirSync(runtimeRoot,{recursive:true});

const sheets={
  early:resolve(root,'source-assets/a5/style-lock/ROSTER_BoonGivers_01-10_v01.png'),
  late:resolve(root,'source-assets/a5/style-lock/ROSTER_BoonGivers_11-20_v01.png'),
};

const definitions=[
  ['pyrra','early',0,0,167,495],['maris','early',167,0,355,495],['gaia','early',355,0,565,495],['zephyra','early',565,0,745,495],['flora','early',745,0,892,495],
  ['voltara','early',892,0,1038,495],['crya','early',1060,0,1175,495],['luna','early',1175,0,1315,495],['solara','early',1315,0,1470,495],['belladonna','early',1470,0,1672,495],
  ['nerissa','late',0,0,169,525],['roxyne','late',169,0,315,525],['calyptra','late',365,0,460,525],['isolde','late',460,0,610,525],['somnia','late',650,0,760,525],
  ['vespera','late',815,0,910,525],['aurelia','late',910,0,1057,525],['noctissa','late',1100,0,1200,525],['lilith','late',1200,0,1350,525],['seraphine','late',1380,0,1536,525],
];

const decoded=Object.fromEntries(Object.entries(sheets).map(([key,path])=>[key,PNG.sync.read(readFileSync(path))]));

function crop(image,left,top,right,bottom){
  const width=right-left,height=bottom-top,output=new PNG({width,height,colorType:6});
  for(let y=0;y<height;y+=1)for(let x=0;x<width;x+=1){
    const source=((top+y)*image.width+left+x)*4,target=(y*width+x)*4;
    output.data[target]=image.data[source];output.data[target+1]=image.data[source+1];output.data[target+2]=image.data[source+2];output.data[target+3]=255;
  }
  return output;
}

function removeConnectedPaper(image){
  const {width,height,data}=image,total=width*height,visited=new Uint8Array(total),queue=new Int32Array(total);let head=0,tail=0;
  const isPaper=index=>{const offset=index*4,r=data[offset],g=data[offset+1],b=data[offset+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);return r>198&&g>196&&b>190&&hi-lo<42;};
  const offer=index=>{if(index<0||index>=total||visited[index]||!isPaper(index))return;visited[index]=1;queue[tail++]=index;};
  for(let x=0;x<width;x+=1){offer(x);offer((height-1)*width+x);}for(let y=0;y<height;y+=1){offer(y*width);offer(y*width+width-1);}
  while(head<tail){const index=queue[head++],x=index%width;data[index*4+3]=0;if(x>0)offer(index-1);if(x<width-1)offer(index+1);if(index>=width)offer(index-width);if(index<total-width)offer(index+width);}
  return image;
}

function removeBorrowedEdgeComponents(image){
  const {width,height,data}=image,total=width*height,seen=new Uint8Array(total),queue=new Int32Array(total);
  const visible=index=>data[index*4+3]>=24;
  for(let start=0;start<total;start+=1){
    if(seen[start]||!visible(start))continue;let head=0,tail=0,minX=width,maxX=0,area=0;queue[tail++]=start;seen[start]=1;
    while(head<tail){const index=queue[head++],x=index%width,y=Math.floor(index/width);area+=1;minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      for(let dy=-1;dy<=1;dy+=1)for(let dx=-1;dx<=1;dx+=1){if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const next=ny*width+nx;if(!seen[next]&&visible(next)){seen[next]=1;queue[tail++]=next;}}
    }
    const touchesEdge=minX<=2||maxX>=width-3,componentWidth=maxX-minX+1,center=(minX+maxX)/2;
    const borrowed=touchesEdge&&componentWidth<width*.46&&Math.abs(center-width/2)>width*.27;
    const dust=area<36;
    if(borrowed||dust)for(let index=0;index<tail;index+=1)data[queue[index]*4+3]=0;
  }
  return image;
}

function visibleBounds(image){
  let left=image.width,top=image.height,right=-1,bottom=-1;
  for(let y=0;y<image.height;y+=1)for(let x=0;x<image.width;x+=1){if(image.data[(y*image.width+x)*4+3]<24)continue;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<left||bottom<top)throw new Error('portrait crop became empty');return {left,top,right,bottom,width:right-left+1,height:bottom-top+1};
}

function normalizedPortrait(source){
  const bounds=visibleBounds(source),output=new PNG({width:384,height:512,colorType:6});output.data.fill(0);
  const scale=Math.min(356/bounds.width,472/bounds.height),width=Math.max(1,Math.round(bounds.width*scale)),height=Math.max(1,Math.round(bounds.height*scale));
  const left=Math.round((384-width)/2),top=496-height;
  for(let y=0;y<height;y+=1)for(let x=0;x<width;x+=1){
    const sx=Math.min(bounds.right,Math.max(bounds.left,bounds.left+Math.floor(x/scale))),sy=Math.min(bounds.bottom,Math.max(bounds.top,bounds.top+Math.floor(y/scale)));
    const sourceOffset=(sy*source.width+sx)*4,target=((top+y)*384+left+x)*4;
    for(let channel=0;channel<4;channel+=1)output.data[target+channel]=source.data[sourceOffset+channel];
  }
  return output;
}

const manifest={version:1,sourceLock:'DemonDive A5 roster sheets',portraits:[]};
for(const [id,sheet,left,top,right,bottom] of definitions){
  const keyed=removeBorrowedEdgeComponents(removeConnectedPaper(crop(decoded[sheet],left,top,right,bottom)));
  const sourceName=`CHR_${id.toUpperCase()}_Portrait_v01_source.png`,runtimeName=`chr-${id}-portrait-v01.png`;
  const sourceBytes=PNG.sync.write(keyed),runtimeBytes=PNG.sync.write(normalizedPortrait(keyed));
  writeFileSync(resolve(sourceRoot,sourceName),sourceBytes);writeFileSync(resolve(runtimeRoot,runtimeName),runtimeBytes);
  manifest.portraits.push({id,sheet,crop:[left,top,right,bottom],source:`source-assets/a75/characters/boon-givers/${sourceName}`,runtime:`public/assets/a75/characters/boon-givers/${runtimeName}`,status:'integrated-correction-pending',humanApproved:false,sha256:createHash('sha256').update(runtimeBytes).digest('hex')});
  console.log(`PASS ${id.padEnd(10)} 384x512 · roster source preserved`);
}
writeFileSync(resolve(runtimeRoot,'boon-portrait-manifest-v01.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log(`ALPHA 7.5 BOON PORTRAITS BUILT · ${manifest.portraits.length} distinct normalized assets`);
