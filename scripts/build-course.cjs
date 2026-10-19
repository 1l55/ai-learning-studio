const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../ai-learning-mvp/content');
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'curriculum.json'), 'utf8'));
const lessons = curriculum.modules.flatMap(module => {
  const content = JSON.parse(fs.readFileSync(path.join(root, 'modules', `${module.id}.json`), 'utf8'));
  if (content.length !== module.count) throw new Error(`Module ${module.id}: expected ${module.count} real lessons`);
  for (const lesson of content) {
    const expected = module.lessons.find(item => item.id === lesson.id);
    if (!expected || lesson.title !== expected.title) throw new Error(`Curriculum mismatch: ${lesson.id}`);
  }
  return content;
});
if (lessons.length !== 80 || new Set(lessons.map(l => l.id)).size !== 80) throw new Error('Need 80 unique authored lessons');
const support = JSON.parse(fs.readFileSync(path.join(root, 'support.json'), 'utf8'));
const data = { ...curriculum, lessons, support };
const content = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
fs.writeFileSync(path.join(root, 'course-data.js'), `/* Generated from reviewed curriculum JSON. Rebuild: node scripts/build-course.cjs */\n(function(root){const data=${content};if(typeof module==='object'&&module.exports)module.exports=data;else root.AICourseData=data;})(typeof globalThis!=='undefined'?globalThis:this);\n`);
console.log(`Built ${lessons.length} lessons, ${curriculum.modules.length} modules, ${support.length} support activities`);
