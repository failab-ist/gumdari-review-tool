/* ══════════════════════════════════════════════════════
   settings.js  —  설정 화면 · 목록 UI · 가이드에서 설정 뽑아내기
   ※ src/ 의 자바스크립트 파일들은 build.sh 가 순서대로 이어 붙여
      하나의 스크립트가 됩니다. 파일이 나뉘어 있어도 서로의
      함수와 값을 그대로 씁니다. 순서는 바꾸지 마십시오.
   ══════════════════════════════════════════════════════ */

/* ══ 탭 ══ */
$$('nav button').forEach(b=>b.onclick=()=>{
  $$('nav button').forEach(x=>x.classList.toggle('on',x===b));
  $$('.panel').forEach(p=>p.classList.toggle('on',p.id==='p-'+b.dataset.p));
  if(b.dataset.p==='his')drawHist();
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ══ 목록 UI ══ */
function drawProducts(){
  const box=$('#pnBox');
  if(!products.length)return box.innerHTML='<div class="empty">등록된 제품명이 없습니다. 가이드의 제품명 규정을 옮겨 두세요.</div>';
  box.innerHTML='<table class="g"><tr><th>정식 표기</th><th>추가로 금지할 표기 (쉼표 구분)</th><th style="width:88px">티어</th><th style="width:34px"></th></tr>'+
    products.map((p,i)=>`<tr>
      <td><input type="text" value="${esc(p.canon||'')}" data-i="${i}" data-k="canon" placeholder="예) 래온셀 배리어 크림"></td>
      <td><input type="text" value="${esc(p.extra||'')}" data-i="${i}" data-k="extra" placeholder="예) 래온쉘, 래온셀크림"></td>
      <td><select data-i="${i}" data-k="tier">${[1,2,3].map(t=>`<option value="${t}" ${(+p.tier||1)===t?'selected':''}>T${t}</option>`).join('')}</select></td>
      <td><button class="x" data-del="${i}">✕</button></td></tr>
      <tr><td colspan="4" class="vlist">${p.canon?'자동 탐지 — '+variants(p.canon,p.extra).slice(0,7).map(v=>`<b>${esc(v)}</b>`).join(' · ')+(variants(p.canon,p.extra).length>7?' 외':''):''}</td></tr>`).join('')+'</table>';
  box.querySelectorAll('input,select').forEach(el=>el.oninput=e=>{
    products[+e.target.dataset.i][e.target.dataset.k]=e.target.value;
    if(e.target.dataset.k!=='tier'){clearTimeout(window._pt);window._pt=setTimeout(()=>keepCaret(drawProducts),700)}});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{products.splice(+b.dataset.del,1);drawProducts()});
}
$('#pnAdd').onclick=()=>{products.push({canon:'',extra:'',tier:1});drawProducts()};
function drawGroups(){
  const box=$('#hgBox');
  if(!hgroups.length)return box.innerHTML='<div class="empty">해당하는 경우가 없으면 비워 두셔도 됩니다.</div>';
  box.innerHTML='<table class="g"><tr><th>태그 목록</th><th style="width:104px">최소 개수</th><th style="width:34px"></th></tr>'+
    hgroups.map((g,i)=>`<tr>
      <td><input type="text" value="${esc(g.tags||'')}" data-i="${i}" data-k="tags" placeholder="예) #속건조 #환절기스킨케어"></td>
      <td><input type="number" value="${g.min||1}" data-i="${i}" data-k="min" min="1"></td>
      <td><button class="x" data-del="${i}">✕</button></td></tr>`).join('')+'</table>';
  box.querySelectorAll('input').forEach(el=>el.oninput=e=>hgroups[+e.target.dataset.i][e.target.dataset.k]=e.target.value);
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{hgroups.splice(+b.dataset.del,1);drawGroups()});
}
$('#hgAdd').onclick=()=>{hgroups.push({tags:'',min:1});drawGroups()};
function drawFuncs(){
  const box=$('#fnBox');
  if(!funcs.length)return box.innerHTML='<div class="empty">고지 문구가 따라와야 하는 기능을 등록해 주세요.</div>';
  box.innerHTML='<table class="g"><tr><th>기능명</th><th>따라와야 할 문구 (전문 그대로)</th><th style="width:34px"></th></tr>'+
    funcs.map((f,i)=>`<tr>
      <td><input type="text" value="${esc(f.a||'')}" data-i="${i}" data-k="a" placeholder="예) 딥배리어"></td>
      <td><textarea data-i="${i}" data-k="b" placeholder="예) 개인의 상태와 사용 환경에 따라 체감 효과가 다를 수 있습니다." style="min-height:44px;font-size:12px">${esc(f.b||'')}</textarea></td>
      <td><button class="x" data-del="${i}">✕</button></td></tr>`).join('')+'</table>';
  box.querySelectorAll('input,textarea').forEach(el=>el.oninput=e=>funcs[+e.target.dataset.i][e.target.dataset.k]=e.target.value);
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{funcs.splice(+b.dataset.del,1);drawFuncs()});
}
$('#fnAdd').onclick=()=>{funcs.push({a:'',b:'',tier:2});drawFuncs()};
/* ══ 미션 프리셋 ══
   가이드 하나에 플랫폼이 여럿이고, 플랫폼마다 회차 수가 다르고,
   인플루언서 유형에 따라 담을 내용이 또 갈리는 통합 가이드가 흔하다.
   축이 셋이라 화면을 셋으로 나누면 감당이 안 되므로 한 표에 다 담고,
   검수할 때 플랫폼과 유형으로 좁혀서 고르게 한다.
   플랫폼·유형을 비워 두면 「전체 공통」으로 취급하므로,
   축을 안 쓰는 단순한 캠페인은 예전과 똑같이 동작한다. */
function drawMissions(){
  const box=$('#rdBox');
  const plOpts=i=>'<option value="">전체 공통</option>'+platforms.map(p=>
    `<option value="${esc(p.name)}"${missions[i].plat===p.name?' selected':''}>${esc(p.name||'(이름 없음)')}</option>`).join('');
  box.innerHTML=!missions.length?'<div class="empty">가이드에 회차나 주제가 정해져 있으면 등록해 두세요. 없으면 비워 두셔도 됩니다.</div>'
   :'<table class="g"><tr><th style="width:118px">플랫폼</th><th style="width:96px">유형</th>'
    +'<th style="width:88px">회차</th><th>주제</th><th style="width:132px">필수 키워드</th><th style="width:34px"></th></tr>'+
    missions.map((r,i)=>`<tr>
      <td><select data-i="${i}" data-k="plat">${plOpts(i)}</select></td>
      <td><input type="text" value="${esc(r.type||'')}" data-i="${i}" data-k="type" placeholder="전체"></td>
      <td><input type="text" value="${esc(r.name||'')}" data-i="${i}" data-k="name" placeholder="예) 1주차"></td>
      <td><input type="text" value="${esc(r.topic||'')}" data-i="${i}" data-k="topic" placeholder="예) 첫인상과 제형 소개"></td>
      <td><input type="text" value="${esc(r.keys||'')}" data-i="${i}" data-k="keys" placeholder="쉼표로 구분"></td>
      <td><button class="x" data-del="${i}">✕</button></td></tr>`).join('')+'</table>';
  box.querySelectorAll('input,select').forEach(el=>{
    const h=e=>{missions[+e.target.dataset.i][e.target.dataset.k]=e.target.value;syncPick();saveAll()};
    el.oninput=h;el.onchange=h});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{missions.splice(+b.dataset.del,1);drawMissions();saveAll()});
  syncPick();
}
/* 지금 고른 플랫폼·유형에 해당하는 미션만 남긴다. 비어 있는 축은 전체 공통이라 항상 통과시킨다 */
function missionMatches(m){
  const pl=(CURPLAT&&CURPLAT.name)||'',ty=($('#mType')&&$('#mType').value.trim())||'';
  if(m.plat&&pl&&m.plat!==pl)return false;
  if(m.type&&ty&&m.type.replace(/\s/g,'')!==ty.replace(/\s/g,''))return false;
  return true;
}
function syncPick(){
  const sel=$('#rdPick');if(!sel)return;
  const cur=sel.value;
  const opts=missions.map((m,i)=>({m,i})).filter(x=>missionMatches(x.m));
  sel.innerHTML='<option value="">직접 입력</option>'+opts.map(({m,i})=>{
    const tag=[m.plat,m.type].filter(Boolean).join(' · ');
    return `<option value="${i}">${esc(m.name||'미션 '+(i+1))}${tag?` — ${esc(tag)}`:''}</option>`}).join('');
  sel.value=cur;
  const n=$('#rdCount');
  if(n)n.textContent=!missions.length?'':
    opts.length===missions.length?`등록된 미션 ${missions.length}개`
    :`전체 ${missions.length}개 중 지금 조건에 맞는 ${opts.length}개만 보여 드립니다`;
}
$('#rdAdd').onclick=()=>{missions.push({plat:'',type:'',name:'',topic:'',keys:''});drawMissions();saveAll()};
$('#rdPick').onchange=e=>{const r=missions[+e.target.value];if(!r)return;
  $('#mTopic').value=r.topic||'';$('#mKeys').value=r.keys||''};
/* ══ 플랫폼 목록 ══
   플랫폼은 「어떤 기준으로 검사할지」만 정하고,
   파일 형식은 「어떤 파서로 읽을지」만 정한다. 둘은 서로를 모른다.
   그래서 블로그 원고를 엑셀로 써도, 영상 기획안을 워드로 써도 돌아간다. */
function loadPlatforms(){
  try{platforms=JSON.parse(S.get('v4_plat')||'null')||[]}catch(e){platforms=[]}
  if(!platforms.length)platforms=JSON.parse(JSON.stringify(PLATDEF));
}
function savePlatforms(){S.set('v4_plat',JSON.stringify(platforms));saveAll()}
function drawPlatforms(){
  const box=$('#plBox');if(!box)return;
  box.innerHTML='<table class="g"><tr>'
    +'<th style="width:150px">플랫폼 · 별칭</th><th style="width:76px">최소 글자</th>'
    +'<th style="width:66px">이미지</th><th style="width:66px">영상</th>'
    +'<th>광고 고지 문구 · 확인 범위</th><th style="width:34px"></th></tr>'
    +platforms.map((p,i)=>`<tr>
      <td><input type="text" value="${esc(p.name||'')}" data-i="${i}" data-k="name" placeholder="예) 블로그">
        <input type="text" value="${esc(p.alias||'')}" data-i="${i}" data-k="alias" placeholder="별칭 (쉼표)" style="margin-top:5px;font-size:11px"></td>
      <td><input type="number" value="${esc(p.minChar||'')}" data-i="${i}" data-k="minChar" placeholder="0"></td>
      <td><input type="number" value="${esc(p.minImg||'')}" data-i="${i}" data-k="minImg" placeholder="0"></td>
      <td><input type="number" value="${esc(p.minVid||'')}" data-i="${i}" data-k="minVid" placeholder="0"></td>
      <td><input type="text" value="${esc(p.adText||'')}" data-i="${i}" data-k="adText" placeholder="가이드의 고지 문구를 그대로">
        <input type="number" value="${esc(p.adRange||'')}" data-i="${i}" data-k="adRange" placeholder="본문 앞 몇 자까지 볼지 (기본 400)" style="margin-top:5px;font-size:11px"></td>
      <td><button class="x" data-del="${i}">✕</button></td></tr>`).join('')
    +'</table>';
  box.querySelectorAll('input,select').forEach(el=>el.oninput=e=>{
    platforms[+e.target.dataset.i][e.target.dataset.k]=e.target.value;savePlatforms();fillPlatSelect()});
  box.querySelectorAll('select').forEach(el=>el.onchange=e=>{
    platforms[+e.target.dataset.i][e.target.dataset.k]=e.target.value;savePlatforms()});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(platforms.length<=1)return alert('플랫폼은 최소 하나가 필요합니다.');
    platforms.splice(+b.dataset.del,1);savePlatforms();drawPlatforms()});
}
$('#plAdd').onclick=()=>{platforms.push({name:'',alias:'',minChar:'',minImg:'',minVid:'',adText:'',adRange:400});savePlatforms();drawPlatforms()};

/* 파일 형식으로 플랫폼을 추측하지 않는다.
   회사마다 쓰는 형식이 제각각이라 틀릴 확률이 높고, 틀린 추천은 없느니만 못하다.
   고르지 않으면 검수로 넘어가지 못하게 막는다. */
function fillPlatSelect(){
  const sel2=$('#plSel');if(!sel2)return;
  const keep=CURPLAT?CURPLAT.name:'';            // 플랫폼 목록을 고쳐도 고른 값은 지킨다
  sel2.innerHTML='<option value="">— 고르세요 —</option>'
    +platforms.map((p,i)=>`<option value="${i}">${esc(p.name||'플랫폼 '+(i+1))}</option>`).join('');
  const ix=platforms.findIndex(p=>p.name===keep);
  sel2.value=ix<0?'':String(ix);
  CURPLAT=ix<0?null:platforms[ix];
  sel2.onchange=()=>{CURPLAT=sel2.value===''?null:platforms[+sel2.value];syncPick();syncRunGate()};
  syncRunGate();
}
/* 플랫폼을 안 고르면 글자 수·광고 고지 기준이 없어서 검수가 성립하지 않는다 */
function syncRunGate(){
  const b=$('#run');if(!b)return;
  b.disabled=false;                       // 눌리지 않는 버튼은 고장으로 보인다. 누르면 이유를 말해 준다
  const w=$('#runWhy');
  if(w)w.innerHTML=CURPLAT?'':'<div class="note" style="margin-bottom:14px">'
    +'<b>검수 기준 플랫폼을 먼저 골라 주세요.</b> 검수 탭 맨 위 <b>01 검수 기준</b>에서 고르시면 검수를 시작할 수 있습니다.<br>'
    +'글자 수 · 이미지 수 · 광고 고지 기준이 플랫폼마다 달라서, 고르지 않으면 무엇과 비교할지 정해지지 않습니다.</div>';
  $('#runHint').textContent='';
}

function drawRules(){
  const box=$('#rBox');
  if(!rules.length)return box.innerHTML='<div class="empty">따로 없으면 비워 두셔도 됩니다.</div>';
  box.innerHTML='<table class="g">'+rules.map((r,i)=>{
    const two=r.type==='replace'||r.type==='cond';
    return `<tr><td style="width:84px;padding-top:11px;font-size:12px;font-weight:700">${TYPES[r.type]}</td>
      <td style="width:42px;padding-top:11px"><span class="chip tb${r.tier}">T${r.tier}</span></td>
      <td><div style="display:grid;grid-template-columns:${two?'1fr 1fr':'1fr'};gap:6px">
        <input type="text" value="${esc(r.a||'')}" data-i="${i}" data-k="a" placeholder="${two?'예) 조건 또는 잘못된 표기':'예) 문구'}">
        ${two?`<input type="text" value="${esc(r.b||'')}" data-i="${i}" data-k="b" placeholder="예) 필수 동반 또는 바른 표기">`:''}
      </div></td><td style="width:34px"><button class="x" data-del="${i}">✕</button></td></tr>`}).join('')+'</table>';
  box.querySelectorAll('input').forEach(el=>el.oninput=e=>rules[+e.target.dataset.i][e.target.dataset.k]=e.target.value);
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{rules.splice(+b.dataset.del,1);drawRules()});
}
$('#rAdd').onclick=()=>{rules.push({type:$('#rType').value,tier:+$('#rTier').value,a:'',b:''});drawRules()};

/* ══ 프로필 · 자동 저장 ══
   예전에는 A층만 저장하고 캠페인 설정은 화면에만 들고 있었다.
   브라우저를 닫으면 절반은 남고 절반은 사라져서 오히려 더 헷갈렸다.
   지금은 설정 전체를 이 브라우저에 자동으로 저장한다.
   프로필 파일(.json)은 백업과 팀 공유용으로 성격이 분명해졌다. */
const FIELDS=['cName','cWho','hReq','leadText','leadRange','banSub','imgChecks','refText','properNames',
  'hdrMention','hdrSub','hdrReview','hdrIdx','hdrPerson'];
function profile(){const o={products,hgroups,funcs,rules,missions,platforms,base,dicts};
  FIELDS.forEach(f=>{const el=$('#'+f);if(el)o[f]=el.value});return o}

function saveAll(){try{S.set('v4_setup',JSON.stringify(profile()))}catch(e){}}
function loadAll(){
  const raw=S.get('v4_setup')||'';
  let p=null;
  try{p=raw?JSON.parse(raw):null}
  catch(e){
    /* 예전에는 조용히 넘어가서, 설정이 통째로 사라졌는데 이유를 알 길이 없었다.
       깨진 값은 지우되 무슨 일이 있었는지는 반드시 알려 드린다. */
    S.set('v4_setup','');
    setTimeout(()=>alert('이 브라우저에 저장해 둔 캠페인 설정이 손상되어 읽지 못했습니다.\n\n'
      +'처음 상태로 시작합니다. 설정 파일(.json)을 내보내 두셨다면 「설정 파일 불러오기」로 되살리실 수 있습니다.'),0);
    return false;
  }
  if(!p)return false;
  applyProfile(p);return true;
}
function applyProfile(p){
  FIELDS.forEach(f=>{const el=$('#'+f);if(el&&p[f]!==undefined)el.value=p[f]});
  products=p.products||[];hgroups=p.hgroups||[];funcs=p.funcs||[];rules=p.rules||[];
  missions=p.missions||p.rounds||[];              // 옛 프로필의 rounds 도 받아 준다
  if(p.platforms&&p.platforms.length)platforms=p.platforms;
  if(p.base)base=Object.assign(base,p.base);
  if(p.dicts)dicts=Object.assign(dicts,p.dicts);
}
function redrawAll(){saveBase();drawBase();drawAI();drawProducts();drawGroups();drawFuncs();drawRules();
  drawMissions();drawPlatforms();fillDicts();fillPlatSelect();saveAll()}

$('#pfSave').onclick=()=>dl(new Blob([JSON.stringify(profile(),null,2)],{type:'application/json'}),
  ($('#cName').value||'캠페인')+'_'+APPNAME+'설정.json');
$('#pfLoad').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json';
  i.onchange=async()=>{try{applyProfile(JSON.parse(await i.files[0].text()));
    redrawAll();alert('설정을 불러왔습니다.');
  }catch(e){alert('설정 파일을 읽지 못했습니다. 이 도구에서 내보낸 .json 파일이 맞는지 확인해 주세요.')}};i.click()};
$('#pfReset').onclick=()=>{
  if(!confirm('지금 설정을 전부 지우고 처음 상태로 되돌립니다.\n\n되돌릴 수 없습니다. 필요하시면 먼저 「설정 파일로 저장」을 눌러 주세요.'))return;
  S.set('v4_setup','');S.set('v4_base','');S.set('v4_dicts','');S.set('v4_plat','');
  location.reload();
};

/* ══ 가이드 자동 추출 ══ */
let SUGG=[];
function subtitleBlocks(t){        // 표가 없는 가이드에서 쓰는 보조 수단
  const L=t.split('\n').map(x=>x.trim());
  const out=[];let cur=null;
  L.forEach(l=>{
    const h=headName(l);
    if(h){cur={name:h,body:[],hit:0};out.push(cur);return}
    if(!cur)return;                            // 기능명 머리말이 먼저 나와야 짝을 지을 수 있다
    if(l.length>8&&isMarkLine(l)){cur.body.push(l);cur.hit++;return}
    if(l.length>10&&NOTICERE.test(l)){cur.body.push(l);cur.hit++;return}  // 기호 없이 문장으로만 적은 경우
    if(!l)return;
    if(cur.hit)cur=null;                       // 관계없는 줄이 나오면 묶음을 닫는다
  });
  return out.filter(b=>b.hit).map(b=>({name:b.name,body:b.body.join('\n')}));
}
const hasHdr=(row,...k)=>row.some(c=>k.some(x=>c.replace(/\s/g,'').includes(x)));
const splitSlash=v=>v.split(/[\/\n]/).map(x=>x.trim()).filter(x=>x.length>=2&&x.length<=24);

function extractGuide(){
  const R=[],G=GUIDE,t=G?G.text:guideText;
  const tables=G?G.tables:[],units=G?G.units:[{texts:t.split('\n'),tables:[]}];
  const L=t.split('\n').map(x=>x.trim());
  const flat=t.replace(/\s+/g,' ');

  /* 1) 필수 고지 문구 — 「기능 | 고지 문구」 표. 머리말 단어는 설정에서 온다 */
  const SUBW=hdrWords('sub');
  const subHit=c=>{const x=c.replace(/\s/g,'');return SUBW.some(w=>w&&x.includes(w))};
  /* 기계는 「짝지어져 있다」는 것만 알 뿐 그게 기능↔고지 문구인지는 모른다.
     운영 안내문이나 진행 조건이 그대로 딸려 들어오는 일이 많아 걸러 낸다.
     그래도 남는 오탐은 AI가 사전 자체를 다시 만들어 덮어쓴다. */
  const BADNAME=/(?:시|때|경우|중|후|전|이상|이하|까지|부터)$|합니다|하세요|됩니다|입니다|바랍니다|주세요|이동|클릭|링크|업로드|제출|마감|일정|기한|혜택|선정|모집|지급|안내|문의/;
  const okName=n=>{const x=String(n||'').trim();
    return x.replace(/\s/g,'').length>=2&&x.length<=20&&!BADNAME.test(x)&&!/[.,·、。!?]$/.test(x)};
  const okBody=b=>{const x=String(b||'').trim();return x.length>=15&&(isMarkLine(x)||NOTICERE.test(x))};
  const fnPairs=[];
  tables.forEach(rows=>{
    if(!rows.length||!rows[0].some(subHit))return;
    const hi=rows[0].findIndex(subHit);
    /* 이름 열은 기능·제품을 가리키는 머리말이어야 한다. 아무 열이나 짝지으면 엉뚱한 쌍이 생긴다 */
    const ki=rows[0].findIndex((c,ix)=>ix!==hi&&/기능|제품|항목|용어|명칭|대상|성분|기술/.test(String(c)));
    if(ki<0)return;
    rows.slice(1).forEach(r=>{
      const name=(r[ki]||'').trim(),body=(r[hi]||'').trim();
      if(okName(name)&&okBody(body)&&!subHit(name))fnPairs.push({name,body});
    });
  });
  if(!fnPairs.length)subtitleBlocks(t).forEach(b=>{if(okName(b.name)&&okBody(b.body))fnPairs.push(b)});
  /* 가이드는 같은 문구를 여러 장에 반복해 싣는 일이 많다. 같은 쌍은 한 번만 남긴다 */
  {const seen2={},uniq=[];
   fnPairs.forEach(f=>{const k=(f.name+'|'+f.body).replace(/\s/g,'');
     if(seen2[k])return;seen2[k]=1;uniq.push(f)});
   fnPairs.length=0;uniq.forEach(f=>fnPairs.push(f));}
  if(fnPairs.length)R.push({k:'필수 고지 문구 사전',v:fnPairs.map(f=>`${f.name} → ${f.body.split('\n')[0].slice(0,46)}…`).join('\n'),
    f:'_funcs',data:fnPairs,note:`${fnPairs.length}건. 기계는 「무엇과 무엇이 붙어 있는가」만 압니다. 적용 전에 반드시 대조하시고, 「AI로 보완하기」를 함께 쓰시면 정확해집니다`});

  /* 2) 정식 표기 — 「올바른 표기」 표 */
  const proper=[],brand=[];
  tables.forEach(rows=>{
    if(!rows.length||!hasHdr(rows[0],'올바른표기','표기법'))return;
    const ci=rows[0].findIndex(c=>c.replace(/\s/g,'').includes('올바른표기'));
    if(ci<0)return;
    rows.slice(1).forEach(r=>{
      const kind=(r[0]||'').trim(),val=(r[ci]||'').trim();if(!val)return;
      const items=splitSlash(val);
      if(/브랜드|제품/.test(kind))items.forEach(x=>brand.push(x));
      else items.forEach(x=>proper.push(x));
    });
  });
  const canon=[...new Set([...t.matchAll(/([^\s()\/,]+(?:\s[^\s()\/,]+)?)\s*\(\s*O\s*\)/g)].map(m=>m[1].trim()))];
  const bans=[...new Set([...t.matchAll(/([^\s()\/,]+(?:\s[^\s()\/,]+)?)\s*\(\s*X\s*\)/g)].map(m=>m[1].trim()))];
  const pcand=[...new Set([...brand,...canon])];
  if(pcand.length)R.push({k:'제품명 후보',v:pcand.join(', '),f:'_products',note:'정식 표기가 맞는지 반드시 확인해 주세요'});
  if(bans.length)R.push({k:'금지 표기 후보',v:bans.join(', '),f:'_bans',note:'제품명 사전의 “추가로 금지할 표기”에 들어갑니다'});
  const pnames=[...new Set([...proper,...fnPairs.map(f=>f.name)].flatMap(splitSlash))].filter(x=>!/[:：]/.test(x));
  if(pnames.length)R.push({k:'정식 명칭 후보',v:pnames.join('\n'),f:'properNames',
    note:'AI가 이 표기를 맞춤법 오류로 잡지 않게 막아 줍니다'});

  /* 3) 플랫폼별 수량 · 광고 고지 — 어느 플랫폼 이야기인지 보고 나눈다
        설정에 등록된 플랫폼 이름과 별칭으로 찾으므로, 행을 추가하면 자동으로 따라온다 */
  const PLAT=platforms.map((p,ix)=>{
    const words=[p.name,...commas(p.alias)].filter(Boolean).map(reEsc);
    return[words.length?new RegExp(words.join('|'),'i'):null,ix];
  }).filter(x=>x[0]);
  const seen={};
  units.forEach(u=>{
    const all=[...u.texts,...(u.tables||[]).flatMap(rs=>rs.flat())];
    const joined=all.join(' ').replace(/\s+/g,' ');
    let plat=null;
    all.forEach(x=>{if(x.length<40)PLAT.forEach(([re,ix])=>{if(re.test(x)&&plat===null)plat=ix})});
    if(plat===null)return;
    const f={c:'minChar_'+plat,i:'minImg_'+plat,v:'minVid_'+plat,ad:'adText_'+plat,ko:platforms[plat].name};
    const mc=joined.match(/([\d,]{3,})\s*자[^0-9]{0,14}?이상/);
    const mi=joined.match(/([\d]{1,3})\s*(?:장|컷)\s*\(?개?\)?\s*이상/);
    const mv=joined.match(/(?:동영상|영상)\s*(?:클립\s*)?([\d]{1,2})\s*개/);
    const ad=(joined.match(/(이 (?:포스팅|게시물|콘텐츠)[^.]{5,130}?(?:지원|제공)\s?받아[^.]{0,20}작성되었습니다)/)||
              joined.match(/(#?\s*광고)(?=\s|$)/)||[])[1];
    if(mc&&!seen[f.c]){seen[f.c]=1;R.push({k:`최소 글자 수 · ${f.ko}`,v:mc[1].replace(/,/g,''),f:f.c})}
    if(mi&&!seen[f.i]){seen[f.i]=1;R.push({k:`최소 이미지 수 · ${f.ko}`,v:mi[1],f:f.i})}
    if(mv&&!seen[f.v]){seen[f.v]=1;R.push({k:`최소 영상 수 · ${f.ko}`,v:mv[1],f:f.v})}
    if(ad&&!seen[f.ad]){seen[f.ad]=1;
      R.push({k:`광고 고지 · ${f.ko}`,v:ad.trim(),f:f.ad,note:'가이드에 적힌 그대로 넣었습니다. 표기 방식이 맞는지는 AI가 따로 봅니다'});
    }
  });

  /* 5) 필수 해시태그 — 여러 곳에 나온 태그의 교집합 */
  const groups=[];
  const collect=x=>{const g=tagsOf(x);if(g.length>=3)groups.push(g)};
  units.forEach(u=>{u.texts.forEach(collect);(u.tables||[]).forEach(rs=>rs.forEach(r=>r.forEach(collect)))});
  let common=[];
  if(groups.length>=2){
    const cnt={};groups.forEach(g=>[...new Set(g)].forEach(x=>cnt[x]=(cnt[x]||0)+1));
    const need=Math.max(2,Math.ceil(groups.length*0.5));
    common=Object.keys(cnt).filter(x=>cnt[x]>=need);
  }
  if(!common.length&&groups.length)common=groups[0];
  if(common.length)R.push({k:'필수 해시태그',v:common.join(' '),f:'hReq',
    note:groups.length>=2?`${groups.length}곳에 나온 태그 중 겹치는 것만 골랐습니다`:''});

  /* 6) 회차 프리셋 — 주차 · 회차 · 차 미션 · Week · Day 를 모두 본다
        회차를 나누지 않는 단발성 캠페인이면 아무것도 안 잡히고 그냥 넘어간다 */
  const RDHEAD=/^\s*(?:\d\s*(?:주차|회차|차\s?미션|차)|(?:week|day|ep|episode)\s*\.?\s*\d)/i;
  const rds=[];
  units.forEach(u=>{
    const all=[...u.texts,...(u.tables||[]).flatMap(rs=>rs.flat())];
    const head=all.find(x=>RDHEAD.test(x));
    if(!head)return;
    const name=((head.match(/(\d\s*(?:주차|회차|차))/)||head.match(/((?:week|day|ep|episode)\s*\.?\s*\d)/i)||[,''])[1]||'')
      .replace(/\s/g,'')+(/미션/.test(head)?' 미션':'');
    const feat=all.find(x=>/\(p\.\s*\d+/.test(x))||'';
    const keys=splitSlash(feat.replace(/\(p\.[^)]*\)/g,'').replace(/,/g,'/')).join(', ');
    const cand=all.filter(x=>x.length>=14&&x.length<=110&&!/^[#*※]/.test(x)&&!/예시\)/.test(x)&&!/\(p\./.test(x));
    const topic=cand.sort((a,b)=>b.length-a.length)[0]||'';
    rds.push({name,topic:topic.replace(/\s+/g,' ').trim(),keys});
  });
  L.forEach((l,i)=>{const m=l.match(/^-?\s*(\d)\s*(주차|회차)\s*[:：]\s*(.+)$/);
    if(m&&!rds.some(r=>r.name.startsWith(m[1]))){const nx=L[i+1]||'',ex2=/^>/.test(nx)?nx.replace(/^>\s*/,''):'';
      rds.push({plat:'',type:'',name:m[1]+m[2],topic:(m[3]+(ex2&&ex2.length<160?' — '+ex2:'')).trim(),keys:''})}});
  const byName={};
  rds.forEach(r=>{const o=byName[r.name];
    if(!o||(r.keys&&!o.keys)||(r.keys===o.keys&&r.topic.length>o.topic.length))byName[r.name]=r});
  const rd2=Object.values(byName).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  rds.length=0;rd2.forEach(r=>rds.push(r));
  if(rds.length)R.push({k:'미션 프리셋',v:rds.map(r=>`${[r.plat,r.type].filter(Boolean).join(' · ')||'전체 공통'} | ${r.name}: ${r.topic}${r.keys?`  [${r.keys}]`:''}`).join('\n'),f:'_rounds',data:rds});

  /* 7) 이미지 확인 항목 */
  /* 표 한 칸 안에서 줄을 바꿔 여러 항목을 적는 가이드가 많다.
     예전에는 줄 단위로만 봐서 「타사 가전(LG」「쿠쿠 등)」처럼 한 문장이 토막 났다.
     여는 괄호가 닫히지 않았거나 줄이 접속사로 끝나면 다음 줄과 도로 이어 붙인다. */
  /* 표 한 칸 안에서 줄을 바꿔 적으면 「타사 가전(LG」「쿠쿠 등)」처럼 한 문장이 토막 난다.
     오직 두 경우만 앞줄에 도로 붙인다 — ① 앞줄의 여는 괄호가 아직 안 닫혔거나
     ② 이 줄이 닫는 괄호로 시작할 때. 그 밖에는 건드리지 않아 멀쩡한 줄이 뭉치지 않게 한다. */
  const joinWrapped=arr=>{
    const out=[];
    for(const raw of arr){
      const l=raw.trim();if(!l)continue;
      const prev=out.length?out[out.length-1]:'';
      const opened=(prev.match(/[(（[]/g)||[]).length>(prev.match(/[)）\]]/g)||[]).length;
      const startsClose=/^[)）\]]/.test(l)||/^(?:등|및)[\s)）\]]/.test(l);
      if(out.length&&(opened||startsClose))out[out.length-1]=(prev+(opened?'':' ')+l).replace(/\s+/g,' ');
      else out.push(l);
    }
    return out;
  };
  /* 가이드는 「타사 가전 / 모바일 기기 / 경쟁사 제품 노출 불가」를 한 칸 안에서 줄을 나눠 적는다.
     줄 단위로만 보면 이게 세 항목으로 쪼개진다. 그래서 표 셀은 통째로 한 덩어리로 보고,
     셀 안 줄바꿈은 공백으로 이어 붙인다. 표가 없으면 예전처럼 줄 단위로 본다. */
  const cellChunks=[];
  tables.forEach(rows=>rows.forEach(r=>r.forEach(cell=>{
    const one=String(cell||'').split('\n').map(x=>x.trim()).filter(Boolean).join(' ').trim();
    if(one)cellChunks.push(one);
  })));
  const imgSource=cellChunks.length?cellChunks.concat(joinWrapped(L)):joinWrapped(L);
  const imgHit=l=>/촬영|사진|이미지|영상|컷|화면|노출|초상|저작권|지식재산|로고/.test(l) &&
      /왜곡|초점|흔들|색감|화질|기울|잘리|가려|보정|필터|수평|로고|라벨|노출|불가|침해|초상|저작권|지식재산/.test(l) &&
      !/예시|후기|드리고/.test(l);
  const imgs=[...new Set(imgSource.filter(l=>imgHit(l)&&l.length>=8&&l.length<=140)
    .map(l=>l.replace(/^[-*※•①-⑨\s]+/,'').replace(/해주세요\.?$|부탁드립니다\.?$/,'').replace(/\s+/g,' ').trim()))]
    .filter(x=>x.length>=6).slice(0,10);
  if(imgs.length)R.push({k:'이미지 확인 항목',v:imgs.join('\n'),f:'imgChecks',note:'문장을 짧게 다듬어 쓰시면 좋습니다'});
  return R;
}
function dupWarn(){
  const ad=SUGG.find(x=>x.f==='adText'),ld=SUGG.find(x=>x.f==='leadText');
  if(ad&&ld&&(ad.v.includes(ld.v)||ld.v.includes(ad.v)))
    return '<div class="warn">광고 고지와 상단 필수 문구의 내용이 겹칩니다. <b>하나만 골라 주세요.</b></div>';
  return '';
}
function mergeMissions(list){
  (list||[]).forEach(r=>{
    if(!r)return;
    const key=x=>String(x||'').replace(/\s/g,'');
    if(!key(r.name)&&!key(r.topic))return;
    /* 같은 미션인지는 세 축이 다 같아야 판정한다.
       플랫폼이 다르면 「1주차」가 여러 개 있는 게 정상이다 */
    const i=missions.findIndex(o=>key(o.name)===key(r.name)&&key(o.plat)===key(r.plat)&&key(o.type)===key(r.type));
    if(i<0){missions.push({plat:(r.plat||'').trim(),type:(r.type||'').trim(),
      name:(r.name||'').trim(),topic:(r.topic||'').trim(),keys:(r.keys||'').trim()});return}
    const o=missions[i];
    if((r.topic||'').length>(o.topic||'').length)o.topic=r.topic.trim();
    if((r.keys||'').length>(o.keys||'').length)o.keys=r.keys.trim();
  });
}
function drawSugg(){
  if(!SUGG.length)return $('#gxBox').innerHTML='<div class="empty">추출된 항목이 없습니다. 가이드 양식에 따라 잡히지 않을 수 있으니 직접 입력해 주세요.</div>';
  $('#gxBox').innerHTML=dupWarn()+SUGG.map((x,i)=>`<div class="sugg"><input type="checkbox" data-i="${i}" checked>
    <div style="flex:1"><div class="k">${esc(x.k)}<em>${esc(x.src||'기계')}</em></div>
    <div class="v">${esc(x.v).replace(/\n/g,'<br>')}</div>
    ${x.note?`<div class="hint">${esc(x.note)}</div>`:''}</div></div>`).join('')+
    '<div class="btnrow" style="margin-top:12px"><button class="btn sm" id="gxApply">체크한 항목 적용</button></div>';
  $('#gxApply').onclick=()=>{
    const on=[...$('#gxBox').querySelectorAll('input:checked')].map(x=>SUGG[+x.dataset.i]);
    on.forEach(x=>{
      if(x.f==='_products')commas(x.v).forEach(c=>{if(!products.some(pp=>pp.canon===c))products.push({canon:c,extra:'',tier:1})});
      else if(x.f==='_bans'){if(products.length)products[0].extra=[products[0].extra,x.v].filter(Boolean).join(', ')}
      else if(x.f==='_rounds')mergeMissions(x.data);
      else if(x.f==='_funcs')(x.data||[]).forEach(b=>{if(!funcs.some(f=>f.a===b.name))
        funcs.push({a:b.name,b:b.body.trim(),tier:2})});
      else if(/^(minChar|minImg|minVid|adText)_\d+$/.test(x.f)){
        /* 플랫폼별 값이다. #minChar_0 같은 입력칸은 없으므로 플랫폼 배열에 직접 넣는다.
           예전에는 여기서 갈 곳을 못 찾아 조용히 사라졌다 — 가이드에서 읽은 광고 고지가 안 박히던 원인. */
        const m=x.f.match(/^(\w+?)_(\d+)$/),key=m[1],ix=+m[2];
        if(platforms[ix])platforms[ix][key]=x.v;
      }
      else{const el=$('#'+x.f);if(el)el.value=x.v}
    });
    redrawAll();
    alert(`${on.length}개 항목을 적용했습니다. 값이 맞는지 확인해 주세요.`);
  };
}
$('#gxRun').onclick=()=>{SUGG=extractGuide();drawSugg()};
const GXPROMPT=()=>`아래 가이드에서 실제로 적혀 있는 내용만 뽑아 JSON으로만 답하십시오.

[뽑을 것]
products : 제품의 정식 표기. 가이드에 표기법이 명시된 것만.
proper   : 붙여 써야 하는 기능명이나 브랜드 용어. 가이드에 나온 표기 그대로.
dropNotices : 아래 [기계가 뽑은 고지 문구 쌍] 중 <b>잘못 짝지어진 것</b>의 name 만 배열로 돌려주십시오.
           기능·성분·기술 이름이 아닌 것이 name 자리에 온 쌍, 고지 문구가 아닌 운영 안내가 body 로 온 쌍이 대상입니다.
           맞는 쌍은 절대 넣지 마십시오. 여기 넣은 것만 제외되고 나머지는 그대로 유지됩니다.
notices  : 기계가 <b>놓친</b> 고지 문구 쌍만 [{"name":"기능명","body":"따라와야 할 문구 전문"}] 형태로.
           이미 기계가 올바르게 뽑은 것은 다시 넣지 마십시오.
           ★ name 은 반드시 제품의 기능·성분·기술 이름이어야 합니다.
             「추가 콘텐츠 업로드 시」「클릭 시」처럼 조건·시점·행동을 가리키는 말이나
             체험단 운영 안내(혜택·일정·제출 방법)는 절대 넣지 마십시오.
           ★ body 는 그 기능을 언급했을 때 반드시 따라붙어야 하는 고지·유의 문구여야 합니다.
             운영 공지나 진행 안내는 고지 문구가 아닙니다.
           ★ 짝이 명확하지 않으면 넣지 말고 빈 배열로 두십시오. 틀린 쌍은 없느니만 못합니다.
rounds   : 콘텐츠별 미션. 아래 세 축을 각각 채우십시오. 해당 없으면 빈 문자열로 두십시오.
           plat  = 이 미션이 적용되는 플랫폼. 가이드에 적힌 이름 그대로. 플랫폼 구분이 없으면 "".
           type  = 인플루언서 유형(예: 펫, 커플, 1인가구, 뷰티). 유형별로 담을 내용이 갈릴 때만. 없으면 "".
           name  = 회차 표기 그대로("1주차" "2회차"). 회차를 나누지 않는 단발성이면 "".
           topic = 가이드 문장 요약.
           keys  = 가이드가 「필수 키워드」「반드시 포함」처럼 <b>원고에 그대로 들어가야 한다고 못 박은 말</b>만 쉼표로.
                   그냥 그 회차에서 다루는 기능 이름은 넣지 마십시오. 없으면 빈 문자열로 두십시오.
           ★ 한 가이드에 여러 플랫폼이 섞여 있고 플랫폼마다 회차 수가 다른 경우가 많습니다.
             유튜브는 단발성인데 블로그·인스타는 3회차인 식입니다. 플랫폼별로 각각 만들어 주십시오.
           ★ 유형별로 내용이 갈리면 같은 회차라도 유형 수만큼 행을 나눠 주십시오.
imgChecks: 사진·영상 촬영 시 지키라고 적힌 주의사항. 가이드 문장을 짧게 다듬어서.
target   : 이 캠페인의 타깃. 가이드에 적혀 있을 때만.

[규칙]
- 가이드에 없는 내용은 절대 만들어내지 마십시오.
- 아래 형식의 설명 문구를 그대로 값에 넣지 마십시오. 실제 가이드에서 읽은 값만 넣으십시오.
- 해당 내용이 가이드에 없으면 빈 배열 [] 또는 빈 문자열 "" 로 두십시오.

[형식]
{"products":[],"proper":[],"dropNotices":[],"notices":[{"name":"","body":""}],"rounds":[{"plat":"","type":"","name":"","topic":"","keys":""}],"topic":"","imgChecks":[],"target":""}

[가이드]
${guideForAI()}`;
const ECHO=['제품 정식 표기','붙여 써야 하는 기능명','기능명·브랜드 용어','주제 요약','핵심 기능명','쉼표구분',
  '사진·영상에서 사람이 확인해야 할 항목','타깃 설명','콘텐츠 초반에 강조','1주차','가이드 원문과 대조',
  '회차 구분이 없을 때','캠페인 콘텐츠 전체에 요구되는 주제','기능명','따라와야 할 문구 전문',
  '잘못 짝지어진','기계가 놓친'];
const echoed=v=>{const t=String(v||'').trim();
  return !t||t.length<2||ECHO.some(e=>t===e||t.includes(e))};
function applyGX(o){
  /* 「가이드에서 읽기」를 누르지 않고 AI만 돌리면 기계가 뽑은 값이 통째로 빠졌다.
     순서를 기억해야 하는 건 도구의 잘못이므로, 여기서 알아서 먼저 돌려 둔다. */
  if(!SUGG.length&&guideText){SUGG=extractGuide()}
  /* AI가 형식 설명을 그대로 베껴 답하는 경우가 있어, 가이드 원문에 없는 값은 버린다 */
  const inGuide=v=>norm(guideText).includes(norm(String(v).slice(0,14)));
  const clean=a=>(a||[]).map(x=>String(x).trim()).filter(x=>!echoed(x)&&inGuide(x));
  o.products=clean(o.products);o.proper=clean(o.proper);o.imgChecks=(o.imgChecks||[]).filter(x=>!echoed(x));
  o.rounds=(o.rounds||[]).filter(r=>r&&!echoed(r.name)&&!echoed(r.topic)&&((r.name||'').trim()||(r.topic||'').trim()));
  if(echoed(o.target))o.target='';
  const add=[];
  o.notices=(o.notices||[]).filter(x=>x&&String(x.name||'').trim()&&String(x.body||'').trim()
    &&!echoed(x.name)&&!echoed(x.body)&&inGuide(x.body));
  o.dropNotices=(o.dropNotices||[]).map(x=>String(x||'').trim()).filter(Boolean);
  if(!o.products.length&&!o.proper.length&&!o.rounds.length&&!o.imgChecks.length&&!o.target
     &&!o.notices.length&&!o.dropNotices.length){
    $('#gxBox').innerHTML='<div class="warn">AI 답변에서 쓸 만한 값을 찾지 못했습니다. 형식 설명을 그대로 답했거나 가이드에 없는 내용이라 걸러냈습니다. 다시 시도하시거나 직접 입력해 주세요.</div>';
    return;
  }
  if(o.products&&o.products.length)add.push({k:'제품명 정식 표기',v:o.products.join(', '),f:'_products',src:'AI',note:'가이드 원문과 대조해 주세요'});
  if(o.proper&&o.proper.length)add.push({k:'정식 명칭',v:o.proper.join('\n'),f:'properNames',src:'AI'});
  /* 기계가 뽑은 쌍을 통째로 버리지 않는다. AI가 「이건 아니다」라고 짚은 것만 빼고,
     AI가 새로 찾은 것을 더한다. 맞게 뽑힌 것을 AI 답변 한 번에 날려 버리면 손해가 크다. */
  const drop=(o.dropNotices||[]).map(x=>String(x).replace(/\s/g,''));
  const old=SUGG.find(x=>x.f==='_funcs');
  const kept=(old&&old.data||[]).filter(f=>!drop.includes(String(f.name).replace(/\s/g,'')));
  const dropped=(old&&old.data||[]).length-kept.length;
  const merged=kept.concat(o.notices
    .map(x=>({name:String(x.name).trim(),body:String(x.body).trim()}))
    .filter(x=>!kept.some(k=>k.name.replace(/\s/g,'')===x.name.replace(/\s/g,''))));
  if(merged.length&&(o.notices.length||dropped)){
    SUGG=SUGG.filter(x=>x.f!=='_funcs');
    add.push({k:'필수 고지 문구 사전',v:merged.map(x=>`${x.name} → ${String(x.body).split('\n')[0].slice(0,46)}…`).join('\n'),
      f:'_funcs',data:merged,src:'AI',
      note:`${merged.length}건`+(dropped?` · AI가 잘못 짝지어진 ${dropped}건을 뺐습니다`:'')
        +(o.notices.length?` · AI가 ${o.notices.length}건을 새로 찾았습니다`:'')});
  }
  if(o.rounds&&o.rounds.length)add.push({k:'미션 프리셋',v:o.rounds.map(r=>`${[r.plat,r.type].filter(Boolean).join(' · ')||'전체 공통'} | ${r.name||'(단발성)'}: ${r.topic}`).join('\n'),f:'_rounds',data:o.rounds,src:'AI'});
  if(!(o.rounds||[]).length&&o.topic&&!echoed(o.topic))
    add.push({k:'콘텐츠 주제',v:o.topic,f:'mTopic',src:'AI',note:'회차 구분이 없는 캠페인으로 읽었습니다'});
  if(o.imgChecks&&o.imgChecks.length)add.push({k:'이미지 확인 항목',v:o.imgChecks.join('\n'),f:'imgChecks',src:'AI'});
  if(o.target)add.push({k:'타깃 설명',v:o.target,f:'mTarget',src:'AI'});
  /* 예전에는 AI 답이 기계가 찾은 값을 통째로 덮어썼다.
     기계가 잘 찾은 것까지 한 번에 날아가서 손해가 컸다. 지금은 양쪽을 합친다. */
  add.forEach(a=>{
    const j=SUGG.findIndex(y=>y.f===a.f);
    if(j<0)return SUGG.push(a);
    const o2=SUGG[j];
    o2.src='기계 + AI';
    if(a.data&&o2.data){                       // 쌍 목록은 이름 기준으로 합친다
      const key=x=>String(x.name||x.k||'').replace(/\s/g,'');
      const seen3={};o2.data.forEach(x=>seen3[key(x)]=1);
      a.data.forEach(x=>{if(!seen3[key(x)]){seen3[key(x)]=1;o2.data.push(x)}});
      o2.v=o2.data.map(x=>x.name?`${x.name} → ${String(x.body||'').split('\n')[0].slice(0,46)}…`:String(x)).join('\n');
    }else if(a.data){o2.data=a.data;o2.v=a.v}
    else{                                      // 줄 목록은 줄 단위로 합친다
      const sep=/\n/.test(o2.v||'')||/\n/.test(a.v||'')?'\n':', ';
      const parts=String(o2.v||'').split(/\n|,\s*/).concat(String(a.v||'').split(/\n|,\s*/))
        .map(x=>x.trim()).filter(Boolean);
      const seen4={},keep=[];
      parts.forEach(x=>{const k=x.replace(/\s/g,'');if(seen4[k])return;seen4[k]=1;keep.push(x)});
      o2.v=keep.join(sep);
    }
    const added=(a.note||'').match(/\d+/);
    o2.note='기계가 찾은 것에 AI가 찾은 것을 더했습니다'+(a.note?` · ${a.note}`:'');
  });
  drawSugg();
}
$('#gxCopy').onclick=()=>{
  navigator.clipboard.writeText(GXPROMPT()).then(
    ()=>alert('복사했습니다. 쓰시는 AI에 붙여넣으신 뒤, 답변을 아래 칸에 붙여넣어 주세요.'),()=>alert('복사에 실패했습니다.'));
  $('#gxBox').innerHTML=`<div class="warn">복사한 프롬프트에는 <b>가이드 전문이 담깁니다.</b> 회사에서 승인한 AI인지 확인하신 뒤 사용해 주세요.</div>
    <label class="f">1) 복사한 프롬프트를 AI에 넣고 &nbsp; 2) 받은 답변을 여기에 붙여넣어 주세요</label>
    <textarea id="gxPaste" placeholder="AI가 준 JSON을 그대로 붙여넣어 주세요" style="min-height:90px"></textarea>
    <div class="btnrow" style="margin-top:8px"><button class="btn sm" id="gxMerge">답변 읽어 제안 만들기</button></div>`;
  $('#gxMerge').onclick=()=>{try{const c=$('#gxPaste').value.replace(/```json|```/g,'');
    applyGX(JSON.parse(c.slice(c.indexOf('{'),c.lastIndexOf('}')+1)))}catch(e){alert('읽지 못했습니다 — '+e.message)}};
};
$('#gxAI').onclick=async()=>{
  const b=$('#gxAI');b.disabled=true;b.textContent='읽는 중…';
  try{const c=String(await callAI(GXPROMPT())).replace(/```json|```/g,'');
    applyGX(JSON.parse(c.slice(c.indexOf('{'),c.lastIndexOf('}')+1)));
  }catch(e){alert('AI 보완에 실패했습니다 — '+e.message)}
  b.disabled=false;b.textContent='AI로 보완하기';
};
function syncGX(){
  const has=!!guideText,ok=has&&!!aiCfg.key;
  $('#gxRun').disabled=!has;$('#gxCopy').disabled=!has;$('#gxAI').disabled=!ok;
  $('#gxWhy').textContent=!has?'가이드 파일을 먼저 올려 주세요.'
    :!aiCfg.key?'“AI로 보완하기”는 AI 설정 탭에 키를 넣으셔야 켜집니다. 키가 없으시면 프롬프트를 복사해 쓰세요.':'';
}
$('#mGuide').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const z=await unzip(await f.arrayBuffer());
    GUIDE=await parseGuide(z,extOf(f.name)==='docx'?'docx':extOf(f.name)==='xlsx'?'xlsx':'pptx');
    guideText=GUIDE.text;
    $('#mGuideOut').innerHTML=`<span style="color:var(--ok)">읽었습니다 — ${guideText.length.toLocaleString()}자 · 표 ${GUIDE.tables.length}개</span>`
      +(guideText.length>GUIDEMAX?`<br><b style="color:var(--red)">${GUIDEMAX.toLocaleString()}자를 넘어 뒷부분은 AI에 전달되지 않습니다. 가이드를 나눠 올리시거나 필요한 부분만 남겨 주세요.</b>`:'');
  }catch(err){$('#mGuideOut').innerHTML=`<span style="color:var(--red)">읽기 실패 — ${esc(err.message)}</span>`}
  syncGX();
};

/* ══ AI 설정 ══ */
function drawAI(){
  $('#aiTasks').innerHTML=BASE.filter(b=>b.who==='AI').map(b=>`<div class="opt">
    <div class="sw ${base[b.k]?'on':''}" data-k="${b.k}"></div>
    <div class="tx"><b>${b.t} <span class="chip tb${b.tier}" style="font-size:9px;padding:1px 5px">T${b.tier}</span></b><span>${b.d}</span></div></div>`).join('');
  $$('#aiTasks .sw').forEach(el=>el.onclick=()=>{base[el.dataset.k]=!base[el.dataset.k];saveBase();drawAI();drawBase()});
}
$$('#aiMode button').forEach(b=>b.onclick=()=>{
  aiMode=b.dataset.m;$$('#aiMode button').forEach(x=>x.classList.toggle('on',x===b));
  $('#aiKeyBox').style.display=aiMode==='key'?'':'none';
  $('#copyWarn').style.display=aiMode==='copy'?'':'none';
  S.set('v4_aimode',aiMode);syncGX();
});
function syncProv(){$('#aiModel').placeholder=PROV[aiCfg.prov].model||'모델 이름';
  $('#aiUrlRow').style.display=aiCfg.prov==='custom'?'':'none'}
function saveAi(){
  const noSave=$('#aiNoSave')&&$('#aiNoSave').checked;
  /* 키를 남기지 않기로 하셨으면 키만 뺀 나머지를 저장한다. 키는 이번 창에서만 살아 있는다 */
  S.set('v4_ai',JSON.stringify(noSave?Object.assign({},aiCfg,{key:''}):aiCfg));
  S.set('v4_aiNoSave',noSave?'1':'');
}
['aiProv','aiModel','aiUrl','aiKey'].forEach(id=>{
  $('#'+id).oninput=$('#'+id).onchange=()=>{
    aiCfg={prov:$('#aiProv').value,model:$('#aiModel').value,url:$('#aiUrl').value,key:$('#aiKey').value};
    syncProv();saveAi();syncGX()};
});
if($('#aiNoSave'))$('#aiNoSave').onchange=()=>{
  saveAi();
  if($('#aiNoSave').checked)alert('창을 닫으면 키가 지워집니다.\n\n다시 여실 때 키를 넣어 주세요.');
};
