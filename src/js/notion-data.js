// Data abstraction layer — currently reads local JSON, switch to API proxy later
var DataStore=(function(){
  var worksCache=null;
  var blogCache=null;

  function fetchJSON(url){
    return fetch(url).then(function(r){return r.json()});
  }

  function getWorks(filter){
    var p=worksCache?Promise.resolve(worksCache):fetchJSON('data/works.json').then(function(d){worksCache=d;return d});
    return p.then(function(data){
      if(!filter||filter==='全部')return data;
      return data.filter(function(w){return w.category===filter});
    });
  }

  function getWorkById(id){
    var p=worksCache?Promise.resolve(worksCache):fetchJSON('data/works.json').then(function(d){worksCache=d;return d});
    return p.then(function(data){
      return data.find(function(w){return w.id===id})||null;
    });
  }

  function getBlogPosts(filter){
    var p=blogCache?Promise.resolve(blogCache):fetchJSON('data/blog.json').then(function(d){blogCache=d;return d});
    return p.then(function(data){
      if(!filter||filter==='全部')return data;
      return data.filter(function(b){return b.category===filter});
    });
  }

  function getBlogPostById(id){
    var p=blogCache?Promise.resolve(blogCache):fetchJSON('data/blog.json').then(function(d){blogCache=d;return d});
    return p.then(function(data){
      return data.find(function(b){return b.id===id})||null;
    });
  }

  function getAllWorks(){
    return worksCache?Promise.resolve(worksCache):fetchJSON('data/works.json').then(function(d){worksCache=d;return d});
  }

  function getAllBlogPosts(){
    return blogCache?Promise.resolve(blogCache):fetchJSON('data/blog.json').then(function(d){blogCache=d;return d});
  }

  return {
    getWorks:getWorks,
    getWorkById:getWorkById,
    getBlogPosts:getBlogPosts,
    getBlogPostById:getBlogPostById,
    getAllWorks:getAllWorks,
    getAllBlogPosts:getAllBlogPosts
  };
})();
