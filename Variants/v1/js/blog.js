// Blog page: list filter + detail
(function(){
  var list=document.getElementById('blog-list');
  var detailSection=document.getElementById('blog-detail');
  if(!list)return;

  var allPosts=[];
  var currentPost=null;

  // Load posts
  DataStore.getAllBlogPosts().then(function(posts){
    allPosts=posts;
    renderList(posts);

    // Check URL params
    var params=new URLSearchParams(window.location.search);
    var category=params.get('category');
    var id=params.get('id');

    if(category){
      // Activate matching filter tab
      document.querySelectorAll('#blog-tabs .tab').forEach(function(tab){
        if(tab.dataset.type===category){
          tab.click();
        }
      });
    }
    if(id){
      var p=posts.find(function(p){return p.id===id});
      if(p) showDetail(p);
    }
  });

  // Filter tabs
  document.querySelectorAll('#blog-tabs .tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('#blog-tabs .tab').forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');
      var filter=tab.dataset.type;
      DataStore.getBlogPosts(filter).then(renderList);
    });
  });

  function renderList(posts){
    list.innerHTML=posts.map(function(post){
      var title=post.title.length>20?post.title.substring(0,20)+'…':post.title;
      var summary=post.summary.length>20?post.summary.substring(0,20)+'…':post.summary;
      return '<div class="blog-page-item" data-id="'+post.id+'">'
        +'<div class="date">'+post.date+'</div>'
        +'<div><h4>'+title+'</h4><p>'+summary+'</p></div>'
        +'<span class="tag">'+post.category+'</span>'
        +'</div>';
    }).join('');

    list.querySelectorAll('.blog-page-item').forEach(function(item){
      item.addEventListener('click',function(){
        var id=item.dataset.id;
        var p=allPosts.find(function(p){return p.id===id});
        if(p) showDetail(p);
      });
    });
  }

  function showDetail(post){
    currentPost=post;
    if(!detailSection)return;
    detailSection.classList.add('visible');

    // Gallery images (may be empty for blog)
    var imagesEl=detailSection.querySelector('.gallery-images');
    if(post.images&&post.images.length>0){
      imagesEl.innerHTML=post.images.map(function(src){
        return '<img src="'+src+'" alt="'+post.title+'">';
      }).join('');
      detailSection.querySelector('.gallery').style.display='';
    }else{
      detailSection.querySelector('.gallery').style.display='none';
    }

    // Gallery meta
    var metaEl=detailSection.querySelector('.gallery-meta');
    metaEl.innerHTML='<h3>'+post.title+'</h3><span>'+post.date+' · '+post.category+'</span>';

    // Dots
    var dotsEl=detailSection.querySelector('.gallery-dots');
    dotsEl.innerHTML=(post.images||[]).map(function(_,i){
      return '<span class="'+(i===0?'active':'')+'"></span>';
    }).join('');

    // Nav
    var idx=allPosts.indexOf(currentPost);
    var prevBtn=detailSection.querySelector('.gallery-prev');
    var nextBtn=detailSection.querySelector('.gallery-next');
    if(prevBtn) prevBtn.disabled=idx<=0;
    if(nextBtn) nextBtn.disabled=idx>=allPosts.length-1;

    // Content
    detailSection.querySelector('.detail-content').innerHTML=post.content;

    detailSection.scrollIntoView({behavior:'smooth'});
  }

  // Gallery nav
  if(detailSection){
    detailSection.querySelector('.gallery-prev').addEventListener('click',function(){
      var idx=allPosts.indexOf(currentPost);
      if(idx>0) showDetail(allPosts[idx-1]);
    });
    detailSection.querySelector('.gallery-next').addEventListener('click',function(){
      var idx=allPosts.indexOf(currentPost);
      if(idx<allPosts.length-1) showDetail(allPosts[idx+1]);
    });
  }
})();
