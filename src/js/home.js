// Home page: works snapshot accordion + auto-rotate + recent blog
(function(){
  // === Works Snapshot Accordion ===
  var items=document.querySelectorAll('.snap-item');
  var autoTimer=null;
  var currentIndex=0;

  function expandItem(index){
    items.forEach(function(it,i){
      it.classList.toggle('expanded',i===index);
    });
    currentIndex=index;
  }

  // Initial state
  if(items.length>0){
    expandItem(0);
  }

  items.forEach(function(item,i){
    item.addEventListener('mouseenter',function(){
      stopAuto();
      expandItem(i);
    });
    item.addEventListener('click',function(){
      var id=item.dataset.workId;
      if(id) window.location.href='works.html?id='+id;
    });
  });

  var snapshotEl=document.querySelector('.snapshot');
  if(snapshotEl){
    snapshotEl.addEventListener('mouseleave',function(){
      startAuto();
    });
  }

  function startAuto(){
    stopAuto();
    autoTimer=setInterval(function(){
      var next=(currentIndex+1)%items.length;
      expandItem(next);
    },4000);
  }

  function stopAuto(){
    if(autoTimer){clearInterval(autoTimer);autoTimer=null}
  }

  // Start auto-rotate
  startAuto();

  // === Recent Blog (load from data) ===
  var blogList=document.getElementById('recent-blog-list');
  if(blogList){
    DataStore.getAllBlogPosts().then(function(posts){
      // Take 5 most recent
      var recent=posts.slice(0,5);
      blogList.innerHTML=recent.map(function(post){
        var title=post.title.length>20?post.title.substring(0,20)+'…':post.title;
        var summary=post.summary.length>20?post.summary.substring(0,20)+'…':post.summary;
        return '<a class="blog-item" href="blog.html?id='+post.id+'">'
          +'<div class="date">'+post.date+'</div>'
          +'<div><h4>'+title+'</h4><p>'+summary+'</p></div>'
          +'<span class="tag">'+post.category+'</span>'
          +'</a>';
      }).join('');
    });
  }

  // === Smooth scroll for "联系我" button ===
  var contactBtn=document.querySelector('a[href="#contact"]');
  if(contactBtn){
    contactBtn.addEventListener('click',function(e){
      e.preventDefault();
      var target=document.getElementById('contact');
      if(target){
        target.scrollIntoView({behavior:'smooth'});
      }
    });
  }
})();
