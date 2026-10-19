const http=require('node:http');
const path=require('node:path');
const {createStore}=require('./store.cjs');
class InputError extends Error{constructor(status,message){super(message);this.status=status;}}
function validTitle(value){
  if(typeof value!=='string'||value.trim().length<1||value.trim().length>80)throw new InputError(400,'标题须为1—80个字符');
  return value.trim();
}
async function body(req){
  if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')throw new InputError(415,'请使用application/json');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size<=8192)chunks.push(chunk);}
  if(size>8192)throw new InputError(413,'演示请求超过8KB');
  const text=Buffer.concat(chunks).toString('utf8');
  let value;try{value=JSON.parse(text);}catch{throw new InputError(400,'请求不是合法JSON');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError(400,'请求须为JSON对象');
  return value;
}
function createLab({database=path.join(__dirname,'tasks.sqlite')}={}){
  const store=createStore(database);let closed=false;
  const server=http.createServer(async(req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(value===undefined?undefined:JSON.stringify(value));};
    try{
      const host=new URL(`http://${req.headers.host||'invalid'}`);
      if(!['127.0.0.1','localhost','[::1]'].includes(host.hostname))throw new InputError(403,'本练习只接受本机地址');
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)throw new InputError(403,'本练习只接受同源操作');
      const url=new URL(req.url,'http://127.0.0.1');
      if(req.method==='GET'&&url.pathname==='/health')return send(200,{ok:true,scope:'本机模块08—09练习，不含登录'});
      if(url.pathname==='/api/tasks'){
        if(req.method==='GET')return send(200,store.list());
        if(req.method==='POST'){
          const input=await body(req);
          if(Object.keys(input).length!==1||!Object.hasOwn(input,'title'))throw new InputError(400,'创建任务只接收title');
          return send(201,store.create(validTitle(input.title)));
        }
        throw new InputError(405,'此入口仅支持GET和POST');
      }
      const match=url.pathname.match(/^\/api\/tasks\/([1-9]\d*)$/);
      if(match){
        const id=Number(match[1]);if(!Number.isSafeInteger(id))throw new InputError(400,'无效任务ID');
        if(req.method==='GET'){const task=store.get(id);if(!task)throw new InputError(404,'任务不存在');return send(200,task);}
        if(req.method==='PATCH'){
          const changes=await body(req);const keys=Object.keys(changes);
          if(!keys.length||keys.some(key=>!['title','done'].includes(key)))throw new InputError(400,'只能修改title与done');
          if(Object.hasOwn(changes,'title'))changes.title=validTitle(changes.title);
          if(Object.hasOwn(changes,'done')&&typeof changes.done!=='boolean')throw new InputError(400,'done必须是布尔值');
          const task=store.update(id,changes);if(!task)throw new InputError(404,'任务不存在');return send(200,task);
        }
        if(req.method==='DELETE'){if(!store.remove(id))throw new InputError(404,'任务不存在');return send(204);}
        throw new InputError(405,'此入口支持GET、PATCH和DELETE');
      }
      throw new InputError(404,'没有此接口，请查看README中的/api/tasks');
    }catch(error){send(error instanceof InputError?error.status:500,{error:error instanceof InputError?error.message:'服务内部错误，请核对服务端输出'});if(!(error instanceof InputError))console.error(error.message);}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  return{server,store,async close(){if(closed)return;closed=true;if(server.listening)await new Promise(resolve=>server.close(resolve));store.close();}};
}
if(require.main===module){
  const port=Number(process.env.LAB_PORT||8788);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('LAB_PORT须为1—65535');
  const lab=createLab();lab.server.listen(port,'127.0.0.1',()=>console.log(`本机练习服务：http://127.0.0.1:${port}/health\n数据库：${path.join(__dirname,'tasks.sqlite')}\n不含登录与多用户隔离，仅用于模块08—09。`));
  process.once('SIGINT',async()=>{await lab.close();process.exit(0);});
}
module.exports={createLab};
