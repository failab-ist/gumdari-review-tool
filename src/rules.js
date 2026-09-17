/* ══════════════════════════════════════════════════════
   rules.js  —  기본 검수 항목 · 사전 · 상태 · 규칙 기반 검수 엔진
   ※ src/ 의 자바스크립트 파일들은 build.sh 가 순서대로 이어 붙여
      하나의 스크립트가 됩니다. 파일이 나뉘어 있어도 서로의
      함수와 값을 그대로 씁니다. 순서는 바꾸지 마십시오.
   ══════════════════════════════════════════════════════ */

/* ══ A층 ══ */
const DICT={
rival:``,
hype:`세계 최초
국내 최초
국내 유일
업계 1위
판매 1위
압도적
완벽한
완벽하게
부작용 없는
무해한
끝판왕`};
const IMGBASE=['타사 제품·로고가 함께 찍히지 않았는지','제품이 왜곡·잘리지 않았는지','초점·선명도에 이상이 없는지','구도상 제품이 드러나는지'];
const BASE=[
 {k:'rival',on:1,tier:1,who:'기계',t:'타사 제품·브랜드 언급',d:'원고에 경쟁사나 타 브랜드 이름이 있는지 봅니다. 찾을 이름은 캠페인 설정의 사전에 적어 두세요. 사진 속 노출은 사람이 봐야 합니다.',dict:'rival'},
 {k:'ad',on:1,tier:2,who:'기계',t:'광고 고지',d:'정하신 문구가 본문 상단에 있는지만 확인합니다. 표기 방식이 맞는지는 아래 AI 항목이 봅니다.'},
 {k:'lead',on:1,tier:2,who:'기계',t:'상단 필수 문구',d:'브랜드 강조 요청이 있을 때 씁니다. 문구를 넣지 않으시면 검사하지 않습니다.'},
 {k:'banSub',on:1,tier:2,who:'기계',t:'금지 고지 문구',d:'제외하기로 한 문구가 그대로 들어갔는지 봅니다.'},
 {k:'fnDup',on:1,tier:2,who:'기계',t:'고지 문구 중복',d:'같은 고지 문구가 두 번 이상 나오면 잡습니다.'},
 {k:'hype',on:1,tier:2,who:'기계',t:'최상급·과장 표현',d:'법무 리스크가 될 수 있는 표현을 넓게 잡습니다. 맥락상 문제없는 건 AI가 걸러 줍니다.',dict:'hype'},
 {k:'spell',on:1,tier:2,who:'AI',t:'오탈자·맞춤법',d:'띄어쓰기 포함. 브라우저만으로는 불가능해 AI가 맡습니다.'},
 {k:'risk',on:1,tier:2,who:'AI',t:'법무·사회적 리스크',d:'타사 비교나 사회적으로 문제될 소지가 있는 표현을 봅니다.'},
 {k:'topic',on:1,tier:2,who:'AI',t:'회차 주제 부합',d:'키워드를 넣었는지가 아니라 의도대로 소구했는지 봅니다.'},
 {k:'fact',on:1,tier:2,who:'AI',t:'기능 설명 오류',d:'기능명을 잘못 붙였거나 조건을 빠뜨린 설명을 찾습니다.'},
 {k:'subAcc',on:1,tier:2,who:'AI',t:'고지 문구 정확성',d:'고지 문구 내용이 기능과 맞는지, 최신 문구인지 봅니다.'},
 {k:'adForm',on:1,tier:2,who:'AI',t:'광고 고지 표기 방식',d:'그 플랫폼 관행에 맞는 방식으로 고지했는지 봅니다. 해시태그로 쓸지 문장으로 쓸지는 플랫폼마다 다릅니다.'},
 {k:'voice',on:1,tier:3,who:'AI',t:'말투 · 메이커보이스',d:'브랜드가 쓴 것처럼 읽히는 문장을 찾습니다. 판단이 갈릴 수 있어 권고로만 나옵니다.'}
];
let base={},dicts={};
function loadBase(){
  /* v3 → v4. 예전에 저장된 사전이 새 기본값을 가려서 「바꿨는데 안 바뀐다」는 문제가 있었다.
     키를 올려서 옛 값을 자연스럽게 버린다. */
  try{base=JSON.parse(S.get('v4_base')||'{}')}catch(e){base={}}
  try{dicts=JSON.parse(S.get('v4_dicts')||'{}')}catch(e){dicts={}}
  BASE.forEach(b=>{if(!(b.k in base))base[b.k]=!!b.on});
  Object.keys(DICT).forEach(k=>{if(!(k in dicts))dicts[k]=DICT[k]});
}
/* 사전은 캠페인마다 채우는 값이라 캠페인 설정에 두었다. A층에는 켜고 끄는 토글만 남는다 */
const DICTKEYS=['rival','hype'];
function syncDicts(){DICTKEYS.forEach(k=>{const el=$('#'+k+'Dict');if(el)dicts[k]=el.value});saveBase();saveAll()}
function fillDicts(){DICTKEYS.forEach(k=>{const el=$('#'+k+'Dict');if(el)el.value=dicts[k]!==undefined?dicts[k]:(DICT[k]||'')})}
function saveBase(){S.set('v4_base',JSON.stringify(base));S.set('v4_dicts',JSON.stringify(dicts))}
function drawBase(){
  $('#baseBox').innerHTML=BASE.map(b=>`<div class="opt">
    <div class="sw ${base[b.k]?'on':''}" data-k="${b.k}"></div>
    <div class="tx"><b>${b.t} <span class="chip tb${b.tier}" style="font-size:9px;padding:1px 5px">T${b.tier}</span></b><span>${b.d}</span>

    </div><span class="who ${b.who==='AI'?'ai':''}">${b.who}</span></div>`).join('');
  $$('#baseBox .sw').forEach(el=>el.onclick=()=>{base[el.dataset.k]=!base[el.dataset.k];saveBase();drawBase();drawAI()});
}

/* ══ 제품명 변형 ══ */
function variants(canon,extra){
  const c=(canon||'').trim();if(!c)return[];
  const v=new Set(),up=c.toUpperCase(),lo=c.toLowerCase();
  if(up!==c)v.add(up); if(lo!==c)v.add(lo);
  if(/\s/.test(c))v.add(c.replace(/\s+/g,''));
  else if(HAN.test(c)&&c.length>=4&&c.length<=8)for(let i=2;i<=c.length-2;i++)v.add(c.slice(0,i)+' '+c.slice(i));
  (c.match(/[A-Za-z]{3,}/g)||[]).forEach(w=>{for(let i=0;i<w.length-1;i++){
    const sw=w.slice(0,i)+w[i+1]+w[i]+w.slice(i+2);
    if(sw!==w){v.add(c.replace(w,sw));v.add(c.replace(w,sw).toUpperCase())}}});
  commas(extra).forEach(x=>v.add(x));
  v.delete(c);return[...v].filter(Boolean);
}

/* ══ 상태 ══ */
/* 서비스 이름 — 바꾸실 때는 이 두 줄만 고치시면 화면 전체가 따라옵니다 */
const APPNAME='검대리';
const APPVER='v1.0.2';
let products=[],hgroups=[],funcs=[],rules=[],missions=[],hist=[],guideText='',GUIDE=null;
/* 플랫폼 — 사용자가 직접 정의한다. 파일 형식과는 완전히 무관하다.
   파일 형식으로 플랫폼을 추측하지 않는다. 회사마다 쓰는 형식이 달라서 맞을 확률이 낮고,
   틀린 추천은 아예 없느니만 못하다. 검수할 때 사용자가 직접 고른다. */
const PLATDEF=[
  {name:'블로그',      alias:'블로그, 커뮤니티, 네이버',        minChar:3000, minImg:15, minVid:0, adText:'', adRange:400},
  {name:'인스타그램',  alias:'인스타, instagram, 피드, 릴스',   minChar:800,  minImg:6,  minVid:1, adText:'', adRange:200},
  {name:'영상 기획안', alias:'유튜브, 틱톡, 쇼츠, youtube, tiktok, 영상', minChar:500, minImg:0, minVid:1, adText:'', adRange:300},
];
let platforms=[],CURPLAT=null;
const EXTS=['docx','pptx','xlsx'];
let aiMode='key',aiCfg={prov:'anthropic',model:'',url:'',key:''};
const PROV={
 anthropic:{model:'claude-sonnet-4-6',url:'https://api.anthropic.com/v1/messages',
  h:k=>({'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}),
  b:(m,p)=>({model:m,max_tokens:4000,messages:[{role:'user',content:p}]}),pick:d=>(d.content||[]).map(c=>c.text||'').join('')},
 openai:{model:'gpt-4o',url:'https://api.openai.com/v1/chat/completions',
  h:k=>({'content-type':'application/json',authorization:'Bearer '+k}),
  b:(m,p)=>({model:m,messages:[{role:'user',content:p}]}),pick:d=>d.choices[0].message.content},
 gemini:{model:'gemini-2.0-flash',url:'',h:()=>({'content-type':'application/json'}),
  b:(m,p)=>({contents:[{parts:[{text:p}]}]}),pick:d=>d.candidates[0].content.parts.map(x=>x.text).join('')},
 custom:{model:'',url:'',h:k=>({'content-type':'application/json',authorization:'Bearer '+k}),
  b:(m,p)=>({model:m,messages:[{role:'user',content:p}]}),pick:d=>d.choices?d.choices[0].message.content:JSON.stringify(d)}
};

/* ══ 이미지 목록 — 1) 표의 번호 라벨 2) 슬라이드 순서 3) 등장 순서 ══ */
let SHOTS=[];
/* 사진 목록은 「파일에 실제로 박혀 있는 사진」만 센다.
   예전에는 표에 적힌 번호 라벨을 먼저 읽었는데, 그러면 라벨에 적힌 수(예: 14장)에서 멈춰
   실제로 들어 있는 수십 장을 놓쳤다. 촬영 계획만 적히고 사진이 없는 원고는
   애초에 눈으로 볼 사진이 없으므로 목록도 비운다.
   라벨은 이제 개수를 정하지 않고 「이름」으로만 빌려 쓴다. */
function shotLabels(doc){
  const by={};
  (doc.blocks||[]).filter(b=>b.role==='idx'&&/\d/.test(b.text)
      &&/이미지|영상|동영상|컷|img|image|video/i.test(b.text))
    .forEach(b=>{
      const t=b.text.replace(/\s+/g,' ').trim();
      const parts=t.split(/(?=\d{1,2}\s*번)/).map(x=>x.trim()).filter(x=>/\d/.test(x)&&x.length>=2);
      const k=b.slide||b.person||'';
      (by[k]=by[k]||[]).push(...(parts.length>1?parts:[t]));
    });
  return by;
}
function buildShots(doc){
  const out=[];
  if(doc.type==='pptx'){
    const lb=shotLabels(doc);
    const ns=Object.keys(doc.slidePics||{}).sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
    let seq=0;
    ns.forEach(n=>{
      const cnt=doc.slidePics[n]||0;if(!cnt)return;
      const sn=+n.match(/\d+/)[0], names=lb[n]||[], rids=(doc.slideRids||{})[n]||[];
      for(let i=0;i<cnt;i++){
        seq++;
        out.push({label:names[i]||`슬라이드 ${sn} · 사진 ${i+1}`,
          person:(doc.slidePerson||{})[n]||null,slide:n,seq,
          uid:`${n}#${rids[i]||i}`});     // 순번이 밀려도 메모가 따라다니게 하는 열쇠
      }
    });
    if(out.length)return{shots:out,how:'파일에 들어 있는 사진을 슬라이드 순서로'};
    /* 사진이 한 장도 없는 촬영 기획안이라면, 표에 적힌 번호라도 읽어 목록을 만든다.
       예전 문제는 라벨을 「먼저」 본 것이지 라벨 자체가 아니었다. 여기서는 마지막 수단이다. */
    Object.keys(lb).forEach(k=>lb[k].forEach((nm,i)=>out.push({
      label:nm,person:(doc.slidePerson||{})[k]||null,slide:k,seq:++seq,uid:`plan:${k}#${i}`})));
    if(out.length)return{shots:out,how:'파일에 사진이 없어 계획서에 적힌 번호를 읽어',planOnly:true};
    return{shots:[],how:'',none:true};
  }
  /* 워드·엑셀은 파일에 박힌 사진을 등장 순서대로 센다.
     imgParas 로 몇 번째 문단의 사진인지 함께 들고 있어야 코멘트 위치가 맞는다 */
  for(let i=1;i<=doc.images;i++)out.push({label:`사진 ${String(i).padStart(2,'0')}`,person:null,seq:i,uid:'seq:'+i,
    para:doc.imgParas?doc.imgParas[i-1]:undefined});
  return out.length?{shots:out,how:'파일에 들어 있는 사진을 등장 순서로'}:{shots:[],how:'',none:true};
}
/* 예전에는 체크와 메모가 화면에만 있었다. AI 검수를 돌리면 결과 화면을 다시 그리는데,
   그때 사용자가 적어 둔 내용이 아무 말 없이 전부 사라졌다. 지금은 SHOTS 에 바로 담는다. */
function imgIssues(){
  const out=[];
  SHOTS.forEach((sh,i)=>{
    const checks=sh.checks||[],memo=(sh.memo||'').trim();
    if(checks.length||memo)out.push({i,checks,memo,shot:sh});
  });
  return out;
}

/* ══ 검수 엔진 ══ */
const TYPES={must:'포함 필수',ban:'포함 금지',replace:'치환 권장',cond:'조건부 필수'};
function ctx(text,term){const i=findTerm(text,term);if(i<0)return'';
  return'「'+text.slice(Math.max(0,i-14),i+term.length+14).replace(/\n/g,' ').trim()+'」'}
function it(tier,label,status,detail,src,fix){return{tier,label,status,detail,src:src||'기계',fix:fix||''}}
const live=items=>items.filter(i=>!i.off);
/* 고지 문구를 하나도 등록하지 않았으면 이 캠페인은 고지 문구를 안 쓰는 것이다.
   사용자가 토글을 직접 끄지 않아도 관련 검사가 걸리지 않게 한다. */
const hasNotice=()=>funcs.some(f=>(f.a||'').trim()&&(f.b||'').trim());
/* 사람 구분에 실패해 여러 사람 원고가 한 덩어리로 묶인 상태.
   이때 고지 문구 중복 검사는 남의 원고와 겹친 것을 중복으로 오인한다.
   그래서 위반으로 단정하지 않고 확인 요청으로 낮춘다. */
let LUMPED=false;

function machineCheck(doc,body){
  const out=[],full=doc.raw;
  const P=CURPLAT||platforms[0]||PLATDEF[0];
  const qc=+P.minChar||0,qi=+P.minImg||0,qv=+P.minVid||0;
  if(qc)out.push(it(2,'글자 수',body.length>=qc?'pass':'fail',`${body.length.toLocaleString()}자 / 기준 ${qc.toLocaleString()}자`));
  if(qi)out.push(it(2,'이미지 수',doc.images>=qi?'pass':'fail',`${doc.images}장 / 기준 ${qi}장`));
  if(qv)out.push(it(2,'영상 수',doc.videos>=qv?'pass':'fail',`${doc.videos}개 / 기준 ${qv}개`));
  if(base.rival){
    const hits=lines(dicts.rival).filter(w=>hasTerm(full,w));
    out.push(it(1,'타사 제품·브랜드 언급',hits.length?'fail':'pass',
      hits.length?`${hits.join(', ')} 발견 ${ctx(full,hits[0])}`:'텍스트상 해당 없음'));
  }
  if(base.ad){
    /* 기계는 「정한 문구가 상단에 있는가」만 본다. 확정적이고 인터넷이 필요 없다.
       해시태그로 쓸지 문장으로 쓸지 같은 표기 방식은 플랫폼마다 관행이 달라 AI(adForm)가 판단한다. */
    const rg=+P.adRange||400,head=body.slice(0,rg),want=(P.adText||'').trim();
    const bare=x=>x.replace(/[\s*\[\]()·・#]/g,'');   // 기호·공백은 무시하고 본다
    const ok=want?bare(head).includes(bare(want)):/광고|협찬|지원\s?받아|제공\s?받아/.test(head);
    out.push(it(2,'광고 고지',ok?'pass':'fail',
      ok?`본문 상단 ${rg}자 안에서 확인`:`본문 상단 ${rg}자 안에서 ${want?`「${want}」를 `:'고지를 '}찾지 못했습니다`));
  }
  if(base.lead){
    const want=$('#leadText').value.trim();
    if(want){
      const rg=+$('#leadRange').value||400,head=body.slice(0,rg);
      const ok=norm(head).includes(norm(want));
      out.push(it(2,'상단 필수 문구',ok?'pass':'fail',ok?`앞 ${rg}자 안에서 확인`:`앞 ${rg}자 안에 「${want}」가 없습니다`));
    }
  }
  if(base.banSub){
    const bans=lines($('#banSub').value);
    if(bans.length){
      const nf=norm(full);
      const hit=bans.find(b=>{const key=norm(b).slice(0,15);return key.length>=6&&nf.includes(key)});
      out.push(it(2,'금지 고지 문구',hit?'fail':'pass',
        hit?`제외 대상 문구가 들어갔습니다 — 「${hit.slice(0,34)}…」`:'해당 없음','기계',hit?'해당 문구 삭제':''));
    }
  }
  if(base.hype){
    const hits=lines(dicts.hype).filter(w=>hasTerm(full,w));
    out.push(it(2,'최상급·과장 표현',hits.length?'warn':'pass',
      hits.length?`${hits.join(', ')} — 법무 확인 필요 ${ctx(full,hits[0])}`:'해당 없음'));
  }
  if(base.fnDup&&hasNotice()){
    const dup=[],seen={};
    /* ㉠ 기호로 시작하는 줄이 두 번 이상 나오는 경우 */
    full.split('\n').map(s=>s.trim()).filter(s=>isMarkLine(s)&&s.length>12)
      .forEach(l=>{seen[l]=(seen[l]||0)+1;if(seen[l]===2)dup.push(l.slice(0,26))});
    /* ㉡ 기호를 안 쓰더라도, 등록해 두신 문구가 원고에 두 번 이상 나오는 경우 */
    const nf=norm(full);
    funcs.forEach(f=>{const b=(f.b||'').trim();if(b.length<12)return;
      const key=norm(b).slice(0,20);let c=0,i=0;
      while((i=nf.indexOf(key,i))>=0){c++;i+=key.length}
      if(c>1&&!dup.some(d=>norm(d).includes(key.slice(0,12))))dup.push(b.slice(0,26))});
    out.push(it(2,'고지 문구 중복',dup.length?(LUMPED?'warn':'fail'):'pass',
      !dup.length?'중복 없음':LUMPED
        ?`${dup.length}건 — 「${dup[0]}…」 · 사람 구분을 못 해 전체를 한 번에 검사했습니다. 다른 사람 원고와 겹친 것일 수 있으니 확인해 주세요`
        :`${dup.length}건 — 「${dup[0]}…」`));
  }
  const noTag=stripTags(full);
  products.forEach(p=>{
    if(!(p.canon||'').trim())return;
    const hit=variants(p.canon,p.extra).find(v=>noTag.includes(v));
    out.push(it(+p.tier||1,`제품명 — ${p.canon}`,hit?'fail':'pass',
      hit?`잘못된 표기 「${hit}」 발견 ${ctx(noTag,hit)}`:noTag.includes(p.canon)?'정식 표기 확인':'해당 제품명 미등장',
      '기계',hit?`${hit} → ${p.canon}`:''));
  });
  const req=tagsOf($('#hReq').value);
  if(req.length){
    const miss=req.filter(t=>!full.includes(t));
    out.push(it(2,'필수 해시태그',miss.length?'fail':'pass',
      miss.length?`누락 ${miss.length}개 — ${miss.join(' ')}`:`${req.length}개 전부 확인`,
      '기계',miss.length?`다음 태그 추가: ${miss.join(' ')}`:''));
  }
  hgroups.forEach((g,i)=>{
    const tags=tagsOf(g.tags);if(!tags.length)return;
    const got=tags.filter(t=>full.includes(t));
    out.push(it(2,`해시태그 택1 그룹 ${i+1}`,got.length>=(+g.min||1)?'pass':'fail',
      `${got.length}개 포함 / 최소 ${g.min||1}개 — ${tags.join(' ')}`));
  });
  funcs.forEach(f=>{
    if(!(f.a||'').trim())return;
    if(!full.includes(f.a))return out.push(it(+f.tier||2,`고지 문구 — ${f.a}`,'pass','기능 미언급, 검사 제외'));
    const ok=f.b&&norm(full).includes(norm(f.b.trim()).slice(0,15));
    out.push(it(+f.tier||2,`고지 문구 — ${f.a}`,ok?'pass':'fail',ok?'동반 문구 확인':'기능은 언급됐는데 고지 문구가 없습니다',
      '기계',ok?'':`${f.a} 고지 문구 삽입`));
  });
  /* 여기 적힌 말이 원고에 있는지만 본다. 기능명이든 캠페인 문구든 상관없다 */
  commas($('#mKeys').value).forEach(k=>{
    out.push(it(2,`필수 키워드 — ${k}`,full.includes(k)?'pass':'fail',full.includes(k)?'언급 확인':'원고에 없습니다'));
  });
  rules.forEach(r=>{
    const a=(r.a||'').trim(),b=(r.b||'').trim();if(!a)return;
    if(r.type==='must')out.push(it(r.tier,`포함 필수 — ${a}`,full.includes(a)?'pass':'fail',full.includes(a)?'확인':'원고에 없습니다'));
    if(r.type==='ban')out.push(it(r.tier,`포함 금지 — ${a}`,full.includes(a)?'fail':'pass',full.includes(a)?`발견 ${ctx(full,a)}`:'해당 없음'));
    if(r.type==='replace')out.push(it(r.tier,`표기 — ${a} → ${b}`,full.includes(a)?'fail':'pass',
      full.includes(a)?`잘못된 표기 ${ctx(full,a)}`:'해당 없음','기계',full.includes(a)?`${a} → ${b}`:''));
    if(r.type==='cond'){
      if(!full.includes(a))out.push(it(r.tier,`조건부 — ${a}`,'pass','트리거 미등장'));
      else out.push(it(r.tier,`조건부 — ${a}`,b&&full.includes(b)?'pass':'fail',b&&full.includes(b)?'확인':`${a} 언급됐으나 동반 문구가 없습니다`));
    }
  });
  return out;
}
function verdict(items){
  const L=live(items);
  if(L.some(i=>i.tier===1&&i.status==='fail'))return{v:'게재 불가',cls:'s-no',why:'티어 1 항목이 걸렸습니다. 이 상태로는 게재할 수 없습니다.'};
  if(L.some(i=>i.tier===2&&i.status==='fail'))return{v:'수정 후\n재검토',cls:'s-fix',why:'티어 2에 미충족이 있습니다. 수정 요청 후 다시 확인해 주세요.'};
  if(L.some(i=>i.status==='warn'))return{v:'조건부\n승인',cls:'s-fix',why:'확인이 필요한 항목이 있습니다. 판단하신 뒤 진행해 주세요.'};
  return{v:'승인',cls:'s-ok',why:'티어 1·2 전부 통과했습니다. 티어 3은 권고 수준입니다.'};
}
