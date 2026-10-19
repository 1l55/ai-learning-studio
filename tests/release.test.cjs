const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {prepareRelease,collectFiles,scanText,blocked}=require('../scripts/prepare-release.cjs');
const root=path.resolve(__dirname,'..');
test('第1版的版本文件、包元数据和变更说明一致',()=>{
  assert.equal(fs.readFileSync(path.join(root,'VERSION'),'utf8').trim(),'1.0.0');
  assert.equal(require('../package.json').version,'1.0.0');
  assert.match(fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8'),/v1\.0\.0 · 第1个正式版本/);
});
test('发布选择仅包含本工程必需内容，不带本机诊断和旧历史',()=>{
  const files=collectFiles(root);assert.ok(files.includes('ai-learning-mvp/content/course-data.js'));
  assert.ok(files.every(f=>!blocked.test(f)));
  assert.ok(!files.some(f=>/diagnostics|superpowers|agent\.md|PRODUCT_DESIGN/.test(f)));
  for(const name of ['.env','.env.local','secret.pem','tasks.sqlite','tasks.sqlite-wal','user-learning-notes.md','.git/config'])assert.ok(blocked.test(name));
});
test('隐私扫描识别凭据和个人绝对路径，报告只返回规则名',()=>{
  assert.ok(scanText('gh'+'p_'+'A'.repeat(36)).includes('githubToken'));
  assert.ok(scanText('sk-'+'B'.repeat(40)).includes('apiKey'));
  assert.ok(scanText('C:'+String.fromCharCode(92)+'Users'+String.fromCharCode(92)+'Example').includes('personalPath'));
  assert.deepEqual(scanText('虚构任务：读一章书。http://127.0.0.1:8766/'),[]);
});
test('未列入清单的运行数据不会被发布，越界清单会被拒绝',()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ai-manifest-'));
  try{
    fs.writeFileSync(path.join(temporary,'release-files.json'),JSON.stringify(['safe.md']));
    fs.writeFileSync(path.join(temporary,'safe.md'),'公开说明');fs.writeFileSync(path.join(temporary,'notes.json'),'私有运行记录');
    assert.deepEqual(collectFiles(temporary),['safe.md']);
    fs.writeFileSync(path.join(temporary,'release-files.json'),JSON.stringify(['../private.md']));
    assert.throws(()=>collectFiles(temporary),/禁止的路径/);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
test('公开说明中的本地Markdown链接也包含在发布清单中',()=>{
  const files=collectFiles(root),published=new Set([...files,'ai-learning-mvp/VALIDATION.md']);
  for(const file of files.filter(f=>f.endsWith('.md'))){
    for(const match of fs.readFileSync(path.join(root,file),'utf8').matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
      const link=match[1];if(/^(?:[a-z]+:|#)/i.test(link))continue;
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),link.split('#')[0]));
      assert.ok(published.has(target),file+' → '+target);
    }
  }
});
test('实际导出保留运行资源且每个文件与SHA256清单对应，目录非空时不覆盖',()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ai-release-'));
  try{
    const result=prepareRelease({source:root,destination:temporary});assert.equal(result.releaseNumber,1);
    assert.ok(!fs.readFileSync(path.join(temporary,'README.md'),'utf8').includes('\r\n'));
    const lines=fs.readFileSync(path.join(temporary,'SHA256SUMS.txt'),'utf8').trim().split('\n');
    for(const line of lines){const [hash,file]=line.split('  ');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(temporary,file))).digest('hex'),hash);}
    assert.ok(!fs.existsSync(path.join(temporary,'.git')));assert.ok(!fs.existsSync(path.join(temporary,'docs/diagnostics')));
    assert.throws(()=>prepareRelease({source:root,destination:temporary}),/非空/);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
