// Custom cursor + mouse halo reveal
(function(){
  // Skip on mobile/touch devices
  if('ontouchstart' in window || window.innerWidth<=768) return;

  const cursor=document.createElement('div');
  cursor.className='custom-cursor';
  document.body.appendChild(cursor);

  const overlay=document.querySelector('.matrix-overlay');

  document.addEventListener('mousemove',function(e){
    cursor.style.left=e.clientX+'px';
    cursor.style.top=e.clientY+'px';
    // Update mask position for halo reveal
    if(overlay){
      overlay.style.setProperty('--mx',e.clientX+'px');
      overlay.style.setProperty('--my',e.clientY+'px');
    }
  });

  document.addEventListener('mousedown',function(){
    cursor.classList.add('click');
  });
  document.addEventListener('mouseup',function(){
    setTimeout(function(){cursor.classList.remove('click')},150);
  });
})();
