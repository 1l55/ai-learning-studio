const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.zip':'application/zip'};
function allowed(relative){
  return !relative.split('/').some(part=>part.startsWith('.')) &&
    /^(?:ai-learning-mvp\/|docs\/curriculum\/|docs\/design\/)/.test(relative) &&
    Object.hasOwn(mime,path.extname(relative)) && !/(?:^|\/)(?:node_modules|releases)\//.test(relative);
}
function createPreview(folder=root){
  return http.createServer(async(req,res)=>{
    const send=(status,text)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:text);};
    if(!['GET','HEAD'].includes(req.method))return send(405,'仅支持读取网页');
    let relative;
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if(pathname==='/'){res.writeHead(302,{Location:'/ai-learning-mvp/course.html','Cache-Control':'no-store'});return res.end();}
      if(pathname.includes('\\')||pathname.includes('\0'))return send(403,'禁止访问此路径');
      relative=pathname.replace(/^\//,'');
      if(!allowed(relative))return send(403,'只提供课程公开文件');
      const actual=await fs.realpath(path.join(folder,relative));
      const resolved=path.relative(folder,actual).split(path.sep).join('/');
      if(resolved.startsWith('../')||!allowed(resolved))return send(403,'禁止访问此路径');
      const info=await fs.stat(actual);if(!info.isFile())return send(404,'文件不存在');
      const bytes=await fs.readFile(actual);
      res.writeHead(200,{'Content-Type':mime[path.extname(relative)],'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
      res.end(req.method==='HEAD'?undefined:bytes);
    }catch(error){send(error.code==='ENOENT'||error.code==='ENOTDIR'?404:400,'无法读取此课程文件');}
  });
}
if(require.main===module){
  const port=Number(process.argv[2]||8766);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('端口须为1—65535');
  const server=createPreview();
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'端口已占用，可运行 npm start -- 8777':'预览服务无法启动');process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`AI学习 v1.0.0：http://127.0.0.1:${port}/\n仅供本机预览。停止请按Ctrl+C。`));
}
module.exports={createPreview,allowed};
