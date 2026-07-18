import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const distCandidate = resolve(here,'dist');
const root = await stat(resolve(distCandidate,'index.html')).then(()=>distCandidate).catch(()=>here);
const portArgument = process.argv.findIndex(value=>value==='--port');
const inlinePort = process.argv.find(value=>value.startsWith('--port='));
const port = Number(inlinePort?.slice(7) ?? (portArgument>=0 ? process.argv[portArgument+1] : 4173));
const noOpen = process.argv.includes('--no-open');
const mime = new Map([
  ['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],
  ['.svg','image/svg+xml'],['.mp3','audio/mpeg'],['.wav','audio/wav'],['.map','application/json; charset=utf-8'],
]);

function openBrowser(url) {
  if (noOpen) return;
  const command = process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
  try { const child=spawn(command[0],command[1],{detached:true,stdio:'ignore'});child.unref(); } catch { /* Printed URL remains usable. */ }
}

const server=createServer(async(request,response)=>{
  try {
    const rawPath=decodeURIComponent(new URL(request.url??'/',`http://${request.headers.host??'127.0.0.1'}`).pathname);
    const relative=rawPath.replace(/^\/+/, '')||'index.html';
    let target=resolve(root,relative);
    if(target!==root&&!target.startsWith(`${root}${sep}`)){response.writeHead(403);response.end('Forbidden');return;}
    let info=await stat(target).catch(()=>null);
    if(info?.isDirectory()){target=resolve(target,'index.html');info=await stat(target).catch(()=>null);}
    if(!info?.isFile()&&!extname(relative)){target=resolve(root,'index.html');info=await stat(target).catch(()=>null);}
    if(!info?.isFile()){response.writeHead(404);response.end('Not found');return;}
    const type=mime.get(extname(target).toLowerCase())??'application/octet-stream';
    response.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'Cache-Control':extname(target)==='.html'?'no-cache':'public, max-age=3600'});
    createReadStream(target).pipe(response);
  } catch(error) {
    response.writeHead(500);response.end('DemonDive local server error');console.error(error);
  }
});

server.on('error',error=>{
  if(error.code==='EADDRINUSE')console.error(`Port ${port} is already in use. Close the older DemonDive window or run: node serve.mjs --port 4174`);
  else console.error(error);
  process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${port}/`;
  console.log(`DemonDive Alpha 7.8A is running at ${url}`);
  console.log('Keep this window open while playing. Press Ctrl+C to stop.');
  openBrowser(url);
});
