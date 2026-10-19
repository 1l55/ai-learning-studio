(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.location.replace(api.resolveEntry(root.location.hash,root.location.search));
})(typeof window!=='undefined'?window:this,function(){
  function resolveEntry(hash='',search=''){
    const query=new URLSearchParams(search);const route=query.get('route');
    const params=['R1','R2','R3'].includes(route)?`?route=${route}`:'';
    if(hash&&!/^#(?:resources|module-\d{2})$/.test(hash))return`context-lesson.html${hash}`;
    return`course.html${params}${hash}`;
  }
  return{resolveEntry};
});
