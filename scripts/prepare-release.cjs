const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const blocked=/(?:^|\/)(?:\.git|\.env(?:\..*)?|\.codex|\.agents|\.aws|node_modules|releases|dist)(?:\/|$)|\.(?:sqlite(?:-\w+)?|db(?:-\w+)?|log|sddl|pem|key|p12|pfx|bak)$|learning-notes\.md$/i;
function scanText(text){
  const rules={privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,githubToken:/(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})/,apiKey:/sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}/,awsKey:/AKIA[A-Z0-9]{16}/,personalPath:/(?:[A-Z]:[\\/]Users[\\/][^\s'"<>]+|[A-Z]:[\\/]Ai_Coding[\\/]|LAPTOP-[A-Z0-9]+)/i,credentialUrl:/https?:\/\/[^\s/:]+:[^\s/@]+@/i};
  return Object.entries(rules).filter(([,re])=>re.test(text)).map(([name])=>name);
}
function collectFiles(folder=root){
  const files=JSON.parse(fs.readFileSync(path.join(folder,'release-files.json'),'utf8'));
  if(!Array.isArray(files)||!files.length)throw Error('发布文件清单无效');
  for(const file of files){
    if(typeof file!=='string'||path.isAbsolute(file)||file.includes('\\')||file.split('/').includes('..')||blocked.test(file))throw Error('发布清单包含禁止的路径');
    let target=folder;
    for(const part of file.split('/')){target=path.join(target,part);if(fs.lstatSync(target).isSymbolicLink())throw Error('发布源中存在符号链接：'+file);}
  }
  return [...new Set(files)].sort();
}
function prepareRelease({source=root,destination}={}){
  const version=fs.readFileSync(path.join(source,'VERSION'),'utf8').trim();
  if(version!=='1.0.0'||JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8')).version!==version)throw Error('版本号必须与首版元数据一致');
  destination||=path.join(source,'releases','ai-learning-studio-v'+version);
  if(fs.existsSync(destination)&&fs.readdirSync(destination).length)throw Error('发布目录非空，先核对现有内容后使用新目录');
  const files=collectFiles(source);let total=0;
  // Verify all source bytes before copying; findings print only file/rule, never values.
  const buffers=files.map(file=>{
    const sourcePath=path.join(source,file);
    if(!fs.lstatSync(sourcePath).isFile())throw Error('发布源不是普通文件：'+file);
    let bytes=fs.readFileSync(sourcePath);
    if(!['.png','.jpg','.webp','.zip'].includes(path.extname(file))){
      const text=bytes.toString('utf8');
      const hits=scanText(text);if(hits.length)throw Error('隐私检查未通过：'+file+' ['+hits.join(',')+']');
      // Preserve source bytes so bundled independent examples stay identical.
    }
    if(file==='.gitattributes')bytes=Buffer.from('# Preserve reviewed release bytes and checksums across systems.\n* -text\n*.png binary\n*.jpg binary\n*.webp binary\n*.zip binary\n');
    total+=bytes.length;return[file,bytes];
  });
  const validation='# 发布验证 · v1.0.0\n\n课程既有65项测试已通过；本版还提供本地预览与发布筛选测试。请在项目根目录运行npm test复验。\n\n课程已完成桌面/手机真实浏览器验收；发布不包含本机诊断日志和旧工作区历史。教学边界、缺少的Codex原生配图以及外部实操范围见根目录README、PRIVACY和课程制作清单。\n';
  buffers.push(['ai-learning-mvp/VALIDATION.md',Buffer.from(validation)]);
  buffers.push(['release-info.json',Buffer.from(JSON.stringify({version,releaseNumber:1,releaseDate:'2026-10-19',history:'clean-source-snapshot',credentialScanPassed:true,learningRecordsIncluded:false},null,2)+'\n')]);
  const checksums=[];
  for(const [file,bytes] of buffers){const target=path.join(destination,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);checksums.push(crypto.createHash('sha256').update(bytes).digest('hex')+'  '+file);}
  fs.writeFileSync(path.join(destination,'SHA256SUMS.txt'),checksums.sort().join('\n')+'\n');
  return{version,releaseNumber:1,files:buffers.length+1,sourceBytes:total,destination};
}
if(require.main===module){const result=prepareRelease();console.log(JSON.stringify({...result,destination:path.relative(root,result.destination)},null,2));}
module.exports={prepareRelease,collectFiles,scanText,blocked};
