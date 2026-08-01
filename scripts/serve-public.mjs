import {createReadStream,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';

const root=resolve(process.argv[2]||'public');
const port=Number(process.env.PORT||4173);
const mime={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json',
  '.webp':'image/webp',
  '.woff2':'font/woff2'
};

createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  let file=resolve(root,relative);
  if(file!==root&&!file.startsWith(root+sep)){
    response.writeHead(403).end('Forbidden');
    return;
  }
  try{
    if(statSync(file).isDirectory())file=resolve(file,'index.html');
    const stat=statSync(file);
    response.writeHead(200,{
      'Content-Type':mime[extname(file).toLowerCase()]||'application/octet-stream',
      'Content-Length':stat.size,
      'Cache-Control':'no-store'
    });
    createReadStream(file).pipe(response);
  }catch{
    response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
  }
}).listen(port,'127.0.0.1',()=>{
  process.stdout.write(`Back Porch local server: http://127.0.0.1:${port}\n`);
});
