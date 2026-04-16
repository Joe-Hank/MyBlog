// Navigation: active page detection + hamburger toggle
(function(){
  // Detect current page and highlight nav link
  const path=window.location.pathname;
  const page=path.split('/').pop()||'index.html';
  const links=document.querySelectorAll('.nav-links a');

  const pageMap={
    'index.html':'Home','':'Home',
    'works.html':'Works',
    'blog.html':'Blog',
    'about.html':'About'
  };

  const currentLabel=pageMap[page]||'Home';
  links.forEach(function(a){
    if(a.textContent.trim()===currentLabel){
      a.classList.add('active');
    }
  });

  // Hamburger toggle
  const hamburger=document.querySelector('.hamburger');
  const navLinks=document.querySelector('.nav-links');
  if(hamburger && navLinks){
    hamburger.addEventListener('click',function(){
      navLinks.classList.toggle('open');
    });
    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(){
        navLinks.classList.remove('open');
      });
    });
  }
})();
