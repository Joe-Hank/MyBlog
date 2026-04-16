// Works page: card grid filter + detail + gallery
(function(){
  var grid=document.getElementById('works-grid');
  var detailSection=document.getElementById('works-detail');
  if(!grid)return;

  var allWorks=[];
  var currentFilter='全部';
  var galleryIndex=0;
  var currentWork=null;

  // Load works
  DataStore.getAllWorks().then(function(works){
    allWorks=works;
    renderGrid(works);

    // Check URL for ?id= param
    var params=new URLSearchParams(window.location.search);
    var id=params.get('id');
    if(id){
      var w=works.find(function(w){return w.id===id});
      if(w) showDetail(w);
    }
  });

  // Filter tabs
  document.querySelectorAll('#works-tabs .tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('#works-tabs .tab').forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');
      currentFilter=tab.dataset.type;
      DataStore.getWorks(currentFilter).then(renderGrid);
    });
  });

  function renderGrid(works){
    grid.innerHTML=works.map(function(w){
      return '<div class="work-card" data-id="'+w.id+'">'
        +'<div class="thumb"><img src="'+w.thumbnail+'" alt="'+w.title+'" loading="lazy"></div>'
        +'<div class="card-meta">'
        +'<h4>'+w.title+'</h4>'
        +'<div class="card-info"><span>'+w.year+'</span>'
        +(w.tags[0]?'<span class="card-tag">'+w.tags[0]+'</span>':'')
        +'</div></div></div>';
    }).join('');

    // Bind click
    grid.querySelectorAll('.work-card').forEach(function(card){
      card.addEventListener('click',function(){
        var id=card.dataset.id;
        var w=allWorks.find(function(w){return w.id===id});
        if(w) showDetail(w);
      });
    });
  }

  function showDetail(work){
    currentWork=work;
    galleryIndex=0;
    if(!detailSection)return;
    detailSection.classList.add('visible');

    // Gallery images
    var imagesEl=detailSection.querySelector('.gallery-images');
    imagesEl.innerHTML=work.images.map(function(src){
      return '<img src="'+src+'" alt="'+work.title+'">';
    }).join('');

    // Gallery meta
    var metaEl=detailSection.querySelector('.gallery-meta');
    metaEl.innerHTML='<h3>'+work.title+'</h3><span>'+work.year+' · '+(work.tags[0]||work.category)+'</span>';

    // Dots
    updateDots();
    updateNav();

    // Content
    detailSection.querySelector('.detail-content').innerHTML=work.description;

    // Scroll to detail
    detailSection.scrollIntoView({behavior:'smooth'});
  }

  function updateDots(){
    if(!currentWork||!detailSection)return;
    var dotsEl=detailSection.querySelector('.gallery-dots');
    dotsEl.innerHTML=currentWork.images.map(function(_,i){
      return '<span class="'+(i===galleryIndex?'active':'')+'"></span>';
    }).join('');
  }

  function updateNav(){
    if(!detailSection)return;
    var prevBtn=detailSection.querySelector('.gallery-prev');
    var nextBtn=detailSection.querySelector('.gallery-next');
    // For works: prev/next switches between works (non-looping)
    var idx=allWorks.indexOf(currentWork);
    if(prevBtn) prevBtn.disabled=idx<=0;
    if(nextBtn) nextBtn.disabled=idx>=allWorks.length-1;
  }

  // Gallery nav buttons
  if(detailSection){
    detailSection.querySelector('.gallery-prev').addEventListener('click',function(){
      var idx=allWorks.indexOf(currentWork);
      if(idx>0) showDetail(allWorks[idx-1]);
    });
    detailSection.querySelector('.gallery-next').addEventListener('click',function(){
      var idx=allWorks.indexOf(currentWork);
      if(idx<allWorks.length-1) showDetail(allWorks[idx+1]);
    });
  }
})();
