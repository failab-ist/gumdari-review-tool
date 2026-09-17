/* 색인 현재 위치 표시 */
(function(){
  const rail=document.getElementById('rail');if(!rail)return;
  const links=[...rail.querySelectorAll('a')];if(!links.length)return;
  const secs=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if(!secs.length)return;
  const io=new IntersectionObserver(es=>{
    es.forEach(e=>{
      if(!e.isIntersecting)return;
      const i=secs.indexOf(e.target);
      links.forEach((a,n)=>a.classList.toggle('cur',n===i));
    });
  },{rootMargin:'-84px 0px -70% 0px',threshold:0});
  secs.forEach(s=>io.observe(s));
})();
