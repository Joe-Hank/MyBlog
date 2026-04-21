// Contact form: mailto + rate limiting
(function(){
  const form=document.querySelector('.contact-form');
  if(!form)return;

  const RATE_LIMIT=2;
  const RESET_HOUR=2; // 2am

  function canSend(){
    var sends=JSON.parse(localStorage.getItem('contactSends')||'[]');
    var now=new Date();
    // Calculate last 2am reset time
    var resetTime=new Date(now);
    resetTime.setHours(RESET_HOUR,0,0,0);
    if(now<resetTime) resetTime.setDate(resetTime.getDate()-1);
    // Filter sends after last reset
    var recentSends=sends.filter(function(t){return new Date(t)>resetTime});
    return recentSends.length<RATE_LIMIT;
  }

  function recordSend(){
    var sends=JSON.parse(localStorage.getItem('contactSends')||'[]');
    sends.push(new Date().toISOString());
    localStorage.setItem('contactSends',JSON.stringify(sends));
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();

    if(!canSend()){
      alert('发送频率限制：24小时内最多发送2次，凌晨2点重置。');
      return;
    }

    var email=form.querySelector('[name="email"]').value;
    var message=form.querySelector('[name="message"]').value;

    if(!email||!message){
      alert('请填写邮箱和留言内容');
      return;
    }

    var subject=encodeURIComponent('个人博客留言');
    var body=encodeURIComponent('来自'+email+'，'+message);
    var mailtoUrl='mailto:wenhuawasi@gmail.com?subject='+subject+'&body='+body;

    recordSend();
    window.location.href=mailtoUrl;
  });
})();
