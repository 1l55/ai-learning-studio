const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('发布内容包与13份教材源文件、路线及支持活动完全一致',()=>{
  const data=require('../content/course-data.js');
  const read=name=>JSON.parse(fs.readFileSync(path.join(root,'content',name),'utf8'));
  const curriculum=read('curriculum.json');
  assert.deepEqual(data,{...curriculum,lessons:curriculum.modules.flatMap(m=>read(`modules/${m.id}.json`)),support:read('support.json')});
});
test('所有HTML入口的本地脚本、图片、样式和链接目标实际存在',()=>{
  const files=[];
  function scan(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){if(item.name==='tests')continue;const target=path.join(folder,item.name);if(item.isDirectory())scan(target);else if(item.name.endsWith('.html'))files.push(target);}}
  scan(root);
  for(const file of files){
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
      const link=match[1].replace(/&amp;/g,'&');
      if(/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(link))continue;
      const target=link.split(/[?#]/)[0];if(!target)continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(target))),`${path.relative(root,file)} → ${link}`);
    }
  }
});
test('后端下载包只含四份独立源文件且与当前源码一致',()=>{
  const bytes=fs.readFileSync(path.join(root,'examples/08-09-backend-lab.zip'));
  const zlib=require('node:zlib');const actual=[];let offset=0;
  while(bytes.readUInt32LE(offset)===0x04034b50){
    const method=bytes.readUInt16LE(offset+8),size=bytes.readUInt32LE(offset+18),nameSize=bytes.readUInt16LE(offset+26),extraSize=bytes.readUInt16LE(offset+28);
    const name=bytes.subarray(offset+30,offset+30+nameSize).toString('utf8');actual.push(name);
    const start=offset+30+nameSize+extraSize,packed=bytes.subarray(start,start+size);
    const source=method===8?zlib.inflateRawSync(packed):packed;
    assert.deepEqual(source,fs.readFileSync(path.join(root,'examples',name)),name);
    offset=start+size;
  }
  assert.deepEqual(actual.sort(),['README.md','server.cjs','store.cjs','transactions.cjs'].map(name=>'backend-lab/'+name).sort());
});
