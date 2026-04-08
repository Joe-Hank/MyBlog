// Portfolio filter tabs
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const type=t.dataset.type;
    document.querySelectorAll('.pf-item').forEach(it=>{
      const isVideo=it.querySelector('.pf-thumb').classList.contains('video');
      const show=type==='all'||(type==='video'&&isVideo)||(type==='image'&&!isVideo);
      it.style.display=show?'':'none';
    });
  });
});

// Hamburger (mobile side menu) — simple toggle
const hamburger=document.querySelector('.hamburger');
if(hamburger){
  hamburger.addEventListener('click',()=>{
    const links=document.querySelector('.nav-links');
    const open=links.style.display==='flex';
    links.style.display=open?'none':'flex';
    links.style.flexDirection='column';
    links.style.position='absolute';
    links.style.top='62px';
    links.style.right='20px';
    links.style.background='rgba(10,10,10,.95)';
    links.style.padding='20px 28px';
    links.style.border='1px solid #1f262d';
    links.style.borderRadius='12px';
    links.style.boxShadow='0 0 24px rgba(0,255,122,.25)';
  });
}
