const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'docs/curriculum/2026-10-15-ai-creation-curriculum-v3.md'), 'utf8');
const short = ['通用 AI 使用与选择','用 Codex 做出小作品','计算机与代码阅读','理解 AI 的工作方式','指挥、质疑与验证 AI','前端与设计判断','本地保存与恢复','后端与 API','数据库','身份与数据隔离','部署上线','更新与恢复','独立创作'];
const descriptions = ['先判断适合什么任务，再学会选择工具与核对结果。','做出能添加、完成与保存任务的本地小工具。','找到文件、读懂关键代码、解释动作与数据的关系。','理解 AI 的能力边界、常见误区与正确用法。','把目标说清楚，用证据纠偏，换一个任务也能继续。','把结构、表现和交互接起来，检查电脑与手机体验。','让任务可靠留下来，理解保存范围并练习异常恢复。','跟踪请求、响应与后端规则，处理等待和失败。','组织、查询与约束记录，验证持久保存和恢复。','区分身份与权限，用两个账户核对允许和拒绝。','把前后端和数据库发布到实际可访问的环境。','验证小步变更，定位问题，演练版本回退和数据恢复。','更换真实需求，独立完成设计、实现、上线与复盘。'];
const prerequisites = [[],['01'],['02'],['01'],['01','04'],['02','03','05'],['06'],['07'],['08'],['09'],['10'],['11'],['12']];
const modules=[];
for (const line of source.split(/\r?\n/)) {
  const header=line.match(/^### 模块 (\d{2}) · (.+)（(\d+) 节）/);
  if(header) modules.push({id:header[1],title:header[2],displayTitle:header[1]==='04'?'准确的 AI 基础理解':header[2],count:Number(header[3]),short:short[Number(header[1])-1],description:descriptions[Number(header[1])-1],prerequisites:prerequisites[Number(header[1])-1],lessons:[]});
  const row=line.match(/^\| (\d{2}\.\d{2}) ([^|]+?) \|/);
  if(row) modules.find(m=>m.id===row[1].split('.')[0]).lessons.push({id:row[1],title:row[2].trim()});
}
if(modules.length!==13 || modules.reduce((n,m)=>n+m.lessons.length,0)!==80) throw new Error('Curriculum extraction failed');
const data={version:1,updated:'2026-10-16',modules,routes:{R1:['01','04','05'],R2:['01','02','03','04','05','06','07'],R3:modules.map(m=>m.id)},routeInfo:{R1:{label:'通用 AI',description:'用资料整理与方案比较，建立选择、协作与核实能力。'},R2:{label:'本地创作',description:'用 Codex 制作可修改、可保存、可恢复的本地工具。'},R3:{label:'联网应用',description:'从基础理解，到带数据库的联网作品。'}}};
fs.mkdirSync(path.join(root,'ai-learning-mvp/content'),{recursive:true});
fs.writeFileSync(path.join(root,'ai-learning-mvp/content/curriculum.json'),JSON.stringify(data,null,2)+'\n');
console.log('Synced 13 modules and 80 lesson identifiers from v3');
