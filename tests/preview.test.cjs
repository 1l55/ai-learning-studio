const test=require('node:test'),assert=require('node:assert/strict');
const {createPreview}=require('../scripts/serve-course.cjs');
test('本地预览能读取课程和下载包，拒绝源码工作区私有配置及写入请求',async()=>{
  const server=createPreview();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const home=await fetch(base+'/',{redirect:'manual'});assert.equal(home.status,302);assert.equal(home.headers.get('location'),'/ai-learning-mvp/course.html');
    assert.match(await(await fetch(base+'/ai-learning-mvp/course.html')).text(),/课程总览|从理解 AI/);
    assert.equal((await fetch(base+'/ai-learning-mvp/examples/08-09-backend-lab.zip')).status,200);
    for(const file of ['/.git/config','/.env','/docs/diagnostics/2026-10-16-browser-sandbox-repair.md','/ai-learning-mvp/%2e%2e%5c.git/config'])assert.equal((await fetch(base+file)).status,403);
    assert.equal((await fetch(base+'/ai-learning-mvp/course.html',{method:'POST'})).status,405);
    const head=await fetch(base+'/ai-learning-mvp/course.html',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
