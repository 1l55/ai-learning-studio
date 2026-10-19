const {DatabaseSync}=require('node:sqlite');

function createStore(filename){
  const db=new DatabaseSync(filename);
  db.exec(`CREATE TABLE IF NOT EXISTS tasks(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 80),
    done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1))
  ) STRICT;`);
  const convert=row=>row?{id:row.id,title:row.title,done:row.done===1}:null;
  const get=id=>convert(db.prepare('SELECT id,title,done FROM tasks WHERE id=?').get(id));
  return{
    db,
    get,
    list:()=>db.prepare('SELECT id,title,done FROM tasks ORDER BY id').all().map(convert),
    create(title){const inserted=db.prepare('INSERT INTO tasks(title) VALUES(?)').run(title);return get(Number(inserted.lastInsertRowid));},
    update(id,changes){
      const old=get(id);if(!old)return null;
      const title=Object.hasOwn(changes,'title')?changes.title:old.title;
      const done=Object.hasOwn(changes,'done')?changes.done:old.done;
      db.prepare('UPDATE tasks SET title=?,done=? WHERE id=?').run(title,done?1:0,id);return get(id);
    },
    remove(id){return db.prepare('DELETE FROM tasks WHERE id=?').run(id).changes>0;},
    renameBoth(first,second,title,failMidway){
      db.exec('BEGIN');
      try{
        db.prepare('UPDATE tasks SET title=? WHERE id=?').run(title,first);
        if(failMidway)throw new Error('模拟中途失败');
        db.prepare('UPDATE tasks SET title=? WHERE id=?').run(title,second);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
    },
    close(){db.close();}
  };
}
module.exports={createStore};
