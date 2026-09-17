/* ══════════════════════════════════════════════════════
   review.js  —  검수 실행 · 검수본 파일 만들기 · 이력 · 시작
   ※ src/ 의 자바스크립트 파일들은 build.sh 가 순서대로 이어 붙여
      하나의 스크립트가 됩니다. 파일이 나뉘어 있어도 서로의
      함수와 값을 그대로 씁니다. 순서는 바꾸지 마십시오.
   ══════════════════════════════════════════════════════ */

/* ══ 검수 ══ */
let DOC=null,ZIP=null,FNAME='',sel=new Set(),t0=0,LAST=null,SPLIT=true;
const drop=$('#drop'),fin=$('#file');
drop.onclick=()=>fin.click();
drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
drop.ondragleave=()=>drop.classList.remove('over');
drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0])};
fin.onchange=e=>{if(e.target.files[0])load(e.target.files[0])};
const extOf=n=>(String(n).match(/\.([a-z0-9]+)$/i)||[,''])[1].toLowerCase();
async function load(f){
  /* 압축을 미리 풀지는 않지만, 원본 바이트는 ZIP 을 들고 있는 동안 계속 메모리에 남는다.
     읽기에 실패하더라도 앞 파일은 먼저 놓아 준다. 그러지 않으면 큰 파일을 연달아 여실 때
     두 개가 동시에 메모리에 올라가 탭이 죽을 수 있다. */
  ZIP=null;DOC=null;LAST=null;SHOTS=[];sel=new Set();
  $('#blockCard').style.display='none';
  $('#fileMsg').innerHTML='';$('#result').innerHTML='';
  const ext=extOf(f.name);
  if(ext==='hwp'||ext==='hwpx')
    return $('#fileMsg').innerHTML='<div class="note err" style="margin-top:14px">한글 문서는 아직 읽지 못합니다. <b>워드(.docx)로 저장해서</b> 다시 올려 주세요.</div>';
  if(ext==='pdf')
    return $('#fileMsg').innerHTML='<div class="note err" style="margin-top:14px">PDF는 읽지 못합니다. 원본 문서 파일(.docx · .pptx · .xlsx)로 올려 주세요.</div>';
  if(!EXTS.includes(ext))
    return $('#fileMsg').innerHTML='<div class="note err" style="margin-top:14px">.docx · .pptx · .xlsx만 읽습니다.</div>';
  /* 수십 MB 짜리 원고는 읽는 데 시간이 걸린다. 아무 표시가 없으면 멈춘 줄 알고 창을 닫으신다 */
  const MB=f.size/1048576;
  $('#fileMsg').innerHTML=`<div class="note">읽는 중입니다${MB>8?` — ${MB.toFixed(0)}MB 로 큰 편이라 잠시 걸립니다. 화면이 멈춘 것처럼 보여도 기다려 주세요.`:'…'}</div>`;
  await new Promise(r=>setTimeout(r,0));      // 안내가 먼저 그려지도록 한 번 넘긴다
  try{
    t0=Date.now();FNAME=f.name;ZIP=await unzip(await f.arrayBuffer());
    DOC=ext==='docx'?await parseDocx(ZIP):ext==='xlsx'?await parseXlsx(ZIP):await parsePptx(ZIP);
    /* 파일 형식은 어느 파서로 읽을지만 정한다. 검수 기준은 아래에서 사용자가 고른다 */
        $('#fileMsg').innerHTML=`<div class="note ok" style="margin-top:14px"><b>${esc(f.name)}</b> — 블록 ${DOC.blocks.length}개 · 이미지 ${DOC.images}장 · 영상 ${DOC.videos}개</div>`;
    SPLIT=true;sel=new Set(guessBody(DOC.blocks));drawBlocks();$('#blockCard').style.display='';
  }catch(e){$('#fileMsg').innerHTML=`<div class="note err" style="margin-top:14px">읽기 실패 — ${esc(e.message)}</div>`}
}
function drawBlocks(){
  const np=DOC.people?DOC.people.length:0;
  let head='';
  if(np>1)head=`<div class="note ok">${SPLIT?`${np}명으로 나눠 검수합니다`:'전체를 한 번에 검수합니다'} — ${DOC.people.map(p=>esc(p.name)).join(', ')}
    <button class="btn ghost sm" id="unsplit" style="margin-left:10px">${SPLIT?'한 번에 검수하기':'사람별로 나누기'}</button></div>`;
  else if(DOC.type!=='docx')head=`<div class="note">사람 구분을 찾지 못해 전체를 한 번에 검수합니다.${
    DOC.roleFound?' 표 머리말을 읽어 본문을 골랐습니다.':' 표 머리말을 찾지 못해 길이와 해시태그로 본문을 추측했습니다.'}
    <br><b>여러 명의 원고가 한 파일에 있다면</b> 아래 각 칸의 오른쪽 목록에서 작성자를 지정해 주세요. 지정하시면 사람별로 나눠 검수합니다.
    <br>지정하지 않으시면 고지 문구 중복 검사가 다른 사람 원고와 겹친 것을 잘못 잡을 수 있습니다.</div>`;
  const hb=$('#blockHead');if(hb)hb.innerHTML=head
    +`<div class="btnrow" style="margin:0 0 16px">
       <button class="btn ghost sm" id="selAll">전체 선택</button>
       <button class="btn ghost sm" id="selNone">전체 해제</button>
       <button class="btn ghost sm" id="selAuto">자동 선택으로</button>
       <span class="hint" style="margin:0">칸이 많을 때는 전부 넣고 AI에 맡기셔도 됩니다.</span></div>`;
  const names=[...new Set(DOC.blocks.map(b=>b.person).filter(Boolean))];
  const opt=b=>`<select class="pw" data-b="${b.id}" title="이 부분을 누가 쓴 원고인지 지정합니다">
    <option value="">사람 미지정</option>${names.map(n=>
      `<option value="${esc(n)}"${b.person===n?' selected':''}>${esc(n)}</option>`).join('')}
    <option value="__new">+ 새 사람 추가…</option></select>`;
  $('#blocks').innerHTML=DOC.blocks.map(b=>`<div class="chunk ${sel.has(b.id)?'sel':''} ${b.skip?'skip':''}" data-b="${b.id}">
    <div class="m"><span>${esc(b.kind)}</span><span>${esc(b.meta)}</span>${DOC.type==='docx'?'':opt(b)}</div>
    <div class="t">${esc(b.text.slice(0,140)).replace(/\n/g,' ')}…</div></div>`).join('');
  /* 칸 하나하나에 핸들러를 다는 대신 바깥 상자에 한 번만 건다.
     칸이 수십 개여도 핸들러는 두 개뿐이고, 다시 그려도 다시 달 필요가 없다.
     (아래 bindBlocks 에서 시작할 때 한 번만 건다) */
  const ub=$('#unsplit');if(ub)ub.onclick=()=>{SPLIT=!SPLIT;drawBlocks()};
  const sa=$('#selAll');if(sa)sa.onclick=()=>{sel=new Set(DOC.blocks.map(b=>b.id));drawBlocks()};
  const sn=$('#selNone');if(sn)sn.onclick=()=>{sel=new Set();drawBlocks()};
  const su=$('#selAuto');if(su)su.onclick=()=>{sel=new Set(guessBody(DOC.blocks));drawBlocks()};
  $('#runHint').textContent=SPLIT&&np>1?`사람별 자동 선택 · 총 ${sel.size}개 블록`
    :`본문 ${sel.size}개 선택 · ${bodyText().length.toLocaleString()}자`;
}
/* 시작할 때 한 번만 건다. drawBlocks 가 안을 다시 그려도 이 핸들러는 살아 있다 */
function bindBlocks(){
  const box=$('#blocks');if(!box||box.dataset.bound)return;
  box.dataset.bound='1';
  box.addEventListener('click',e=>{
    if(e.target.closest('.pw'))return;                 // 사람 지정은 선택 토글이 아니다
    const el=e.target.closest('.chunk');if(!el)return;
    const id=+el.dataset.b;sel.has(id)?sel.delete(id):sel.add(id);drawBlocks();
  });
  /* 자동 인식이 틀렸거나 아예 못 찾았을 때 사람이 직접 고친다.
     이걸 고치면 사람별 검수가 그대로 되살아난다. */
  box.addEventListener('change',e=>{
    const s2=e.target.closest('.pw');if(!s2)return;
    const b=DOC.blocks.find(x=>x.id===+s2.dataset.b);if(!b)return;
    let v=s2.value;
    if(v==='__new'){v=(prompt('이 부분을 쓴 사람의 이름이나 계정을 적어 주세요.')||'').trim();if(!v)return drawBlocks()}
    b.person=v;rebuildPeople();drawBlocks();
  });
}
const bodyText=()=>DOC?DOC.blocks.filter(b=>sel.has(b.id)).map(b=>b.text).join('\n'):'';
/* 블록의 사람 표시가 바뀌면 사람 목록과 각자의 원고를 다시 짠다 */
function rebuildPeople(){
  if(!DOC)return;
  const order=[];DOC.blocks.forEach(b=>{if(b.person&&!order.includes(b.person))order.push(b.person)});
  const old={};(DOC.people||[]).forEach(p=>old[p.name]=p);
  DOC.people=order.map(n=>{
    const bs=DOC.blocks.filter(b=>b.person===n);
    const p=old[n]||{name:n,images:0,videos:0};
    p.blocks=bs;p.raw=bs.filter(b=>!b.skip&&b.role!=='hdr').map(b=>b.text).join('\n');
    return p;
  });
  if(DOC.people.length>1)SPLIT=true;
}

const RANK={'승인':0,'조건부\n승인':1,'수정 후\n재검토':2,'게재 불가':3};
$('#run').onclick=async()=>{
  if(!CURPLAT){$('#plSel').scrollIntoView({behavior:'smooth',block:'center'});
    return alert('검수 기준 플랫폼을 먼저 골라 주세요.\n\n검수 탭 맨 위 「01 검수 기준」에 있습니다.')}
  /* 회차 정보는 필수가 아니다. 단발성 캠페인은 회차 자체가 없다.
     주제를 안 넣으셨으면 「회차 주제 부합」 AI 항목만 건너뛴다. (buildPrompt 에서 처리) */
  const groups=[];
  if(SPLIT&&DOC.people&&DOC.people.length>1){
    DOC.people.forEach(pp=>{
      const bs=pp.blocks.filter(b=>sel.has(b.id));
      const body=(bs.length?bs:pp.blocks.filter(b=>b.role==='mention')).map(b=>b.text).join('\n');
      const d={type:'pptx',raw:pp.raw,images:pp.images,videos:pp.videos};
      const items=machineCheck(d,body);
      groups.push({name:pp.name,items,v:verdict(items),body,doc:d});
    });
  }else{
    /* 슬라이드·시트가 여럿인데 사람을 못 나눴다면 여러 사람이 섞였을 수 있다 */
    const units=new Set(DOC.blocks.map(b=>b.slide||b.sheet).filter(Boolean));
    LUMPED=DOC.type!=='docx'&&units.size>1;
    const items=machineCheck(DOC,bodyText());
    LUMPED=false;
    groups.push({name:'',items,v:verdict(items),body:bodyText(),doc:DOC});
  }
  const worst=groups.slice().sort((a,b)=>RANK[b.v.v]-RANK[a.v.v])[0];
  LAST={groups,items:groups.flatMap(g=>g.items),v:worst.v,mins:(Date.now()-t0)/60000};
  render();$('#result').scrollIntoView({behavior:'smooth',block:'start'});
  if(aiTaskList().length){
    if(aiMode==='key'&&aiCfg.key){
      setAiBox('<span class="spin"></span>AI가 검수하고 있습니다…');
      try{mergeAI(parseAI(await callAI(buildPrompt(DOC))))}
      catch(e){setAiBox(`<div class="note err">AI 검수 실패 — ${esc(e.message)}<br>키와 모델 이름을 확인하시거나, 프롬프트 복사 방식으로 바꿔 주세요.</div>`)}
    }else renderCopyBox();
  }
  pushHist();
};
function mergeAI(r){
  LAST.groups.forEach(g=>{
    g.items.forEach(i=>{if(i.src==='기계'&&r.dismiss.some(d=>i.label.includes(d)||d.includes(i.label)))i.off=true});
  });
  const key=x=>String(x||'').replace(/\s/g,'').toLowerCase();
  /* 기계가 사람을 못 나눴어도 AI가 구분해 냈다면 그 기준으로 나눠 준다.
     기계 지적은 누구 것인지 알 수 없으므로 공통으로 남기고, AI 지적만 사람별로 붙인다. */
  /* AI는 문제 있는 사람만 적어 보내는 경향이 있다. 그러면 멀쩡한 사람이 결과에서 통째로 사라진다.
     그래서 명단(people)을 따로 받아 문제 없는 사람도 자리를 만들어 둔다. */
  const who=[...new Set(
    (r.people||[]).map(x=>String(x||'').trim())
      .concat(r.issues.map(i=>String(i.person||'').trim()))
      .filter(Boolean))];
  if(LAST.groups.length===1&&who.length>1){
    const b0=LAST.groups[0];
    b0.name='전체 공통 (작성자 미상)';
    b0.items.unshift(it(3,'작성자 구분 안내','warn',
      '아래 기계 지적은 파일에서 작성자를 나누지 못해 전체를 한 번에 검사한 결과입니다. '
      +'특정 한 사람의 문제가 아닐 수 있으니 누구에게 해당하는지 확인해 주세요.','기계'));
    who.forEach(n=>LAST.groups.push({name:n,items:[],v:verdict([]),body:b0.body,doc:b0.doc,aiOnly:true}));
    if(DOC)DOC.aiSplit=who;
  }
  r.issues.forEach(is=>{
    let g=null;
    if(is.person&&LAST.groups.length>1)
      g=LAST.groups.find(x=>key(x.name)===key(is.person))||LAST.groups.find(x=>key(x.name).includes(key(is.person)));
    (g||LAST.groups[0]).items.push(is);
  });
  regroupVerdicts();
  keepCaret(render);
  /* 멘션은 사람별로 갈렸는데 사진은 「전체 공통」에 남는 경우가 있다.
     슬라이드에 이월해 둔 이름(slidePerson)과 실제 갈라진 사람 이름을 맞춰 사진을 재배정한다.
     AI가 나눈 경우든 기계가 나눈 경우든 똑같이 돌린다. */
  const realNames=LAST.groups.map(g=>g.name).filter(n=>n&&!/미상|전체 공통/.test(n));
  if(DOC&&DOC.type==='pptx'&&realNames.length>1)reassignShots(DOC.aiSplit||realNames);
  if(DOC&&DOC.aiSplit)setAiBox(`<div class="note ok">AI가 ${DOC.aiSplit.length}명을 구분해 냈습니다 — `
    +`${DOC.aiSplit.map(esc).join(', ')}. AI 지적은 사람별로 나눠 표시했고, `
    +`기계 지적은 누구 것인지 알 수 없어 「전체 공통」에 남겼습니다.</div>`);
}
/* 항목을 빼거나 되살리면 사람별 판정과 대표 판정을 다시 계산해야 한다 */
function regroupVerdicts(){
  LAST.groups.forEach(g=>g.v=verdict(g.items));
  LAST.items=LAST.groups.flatMap(g=>g.items);
  LAST.v=LAST.groups.slice().sort((a,b)=>RANK[b.v.v]-RANK[a.v.v])[0].v;
}
function setAiBox(h){const b=$('#aiBox');if(b)b.innerHTML=h}
function renderCopyBox(){
  setAiBox(`${aiMode==='key'?'<div class="note">AI 설정 탭에 키를 넣으시면 자동으로 돌아갑니다. 지금은 아래 방식으로 쓰실 수 있습니다.</div>':''}
    <div class="warn"><b>전송되는 내용:</b> 원고 전문 · 가이드 전문 · 캠페인 설정 · 회차 정보.
      복사 후에는 도구가 관여할 수 없습니다. <b>회사에서 승인한 AI인지 확인하신 뒤 사용해 주세요.</b></div>
    <div class="btnrow" style="margin-bottom:12px"><button class="btn ghost sm" id="cpBtn">프롬프트 복사</button></div>
    <label class="f">AI 답변 붙여넣기</label>
    <textarea id="aiPaste" placeholder="AI가 준 JSON을 그대로 붙여넣어 주세요"></textarea>
    <div class="btnrow" style="margin-top:8px"><button class="btn sm" id="mergeBtn">결과 합치기</button></div>`);
  $('#cpBtn').onclick=()=>navigator.clipboard.writeText(buildPrompt(DOC))
    .then(()=>alert('복사했습니다. 쓰시는 AI에 붙여넣어 주세요.'),()=>alert('복사에 실패했습니다.'));
  $('#mergeBtn').onclick=()=>{try{mergeAI(parseAI($('#aiPaste').value))}catch(e){alert('붙여넣은 내용을 읽지 못했습니다 — '+e.message)}};
}
const today=()=>{const d=new Date();return`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`};

const ICON=i=>i.off?'제외':i.status==='pass'?'통과':i.status==='warn'?'확인':'위반';
const OFFN=i=>!i.off?'':(i.byUser?' · 검수자가 뺐습니다':' · AI 판단으로 제외했습니다');
/* 지적 하나를 뺄 때 결과 전체를 다시 그리면 화면이 통째로 깜빡인다.
   바뀐 항목과 숫자만 제자리에서 고쳐 준다. */
function paintItem(el){
  const g=LAST.groups[+el.dataset.g];if(!g)return;
  const i=g.items[+el.dataset.i];if(!i)return;
  el.className='item '+(i.off?'off':i.status);
  const ic=el.querySelector('.ic');if(ic)ic.textContent=ICON(i);
  const ub=el.querySelector('.undo');if(ub)ub.textContent=i.off?'되살리기':'이 지적 빼기';
  const on=el.querySelector('.offn');if(on)on.textContent=OFFN(i);
  const fx=el.querySelector('.fix');if(fx)fx.style.display=i.off?'none':'';
}
function repaintTotals(){
  regroupVerdicts();
  LAST.groups.forEach((g,ix)=>{
    const st=$('#st'+ix);if(st)st.outerHTML=statHTML(g.items,g.body.length,ix);
    const bd=$('#bd'+ix);
    if(bd){const col=g.v.cls==='s-no'?'var(--red)':g.v.cls==='s-fix'?'var(--amber)':'var(--green)';
      bd.style.background=col;bd.textContent=g.v.v.replace('\n',' ')}
  });
  const vs=$('#vStamp');
  if(vs){vs.className='stamp '+LAST.v.cls;
    vs.innerHTML=`<div class="lb">검수 완료</div><div class="vv">${LAST.v.v.replace('\n','<br>')}</div><div class="dt">${today()}</div>`}
}
function itemsHTML(items){
  let h='';
  [1,2,3].forEach(t=>{
    const list=items.filter(i=>i.tier===t);if(!list.length)return;
    const nm={1:'게재 불가 수준',2:'수정 필요',3:'권고'};
    list.sort((a,b)=>({fail:0,warn:1,pass:2})[a.status]-({fail:0,warn:1,pass:2})[b.status]);
    h+=`<div class="tier"><h3><span class="chip tb${t}">Tier ${t}</span> ${nm[t]}</h3>`+
      list.map(i=>{
        const gi=LAST.groups.findIndex(g=>g.items.includes(i)),ii=(LAST.groups[gi]||{items:[]}).items.indexOf(i);
        const can=i.status!=='pass';     // 통과 항목은 뺄 이유가 없다
        return `<div class="item ${i.off?'off':i.status}" data-g="${gi}" data-i="${ii}"><span class="ic">${ICON(i)}</span>
        <span class="bd"><b>${esc(i.label)}<span class="src ${i.src==='AI'?'ai':''}">${i.src}</span>${
          can?`<button class="undo">${i.off?'되살리기':'이 지적 빼기'}</button>`:''}</b>
        <span>${esc(i.detail)}<i class="offn" style="font-style:normal">${OFFN(i)}</i></span>
        ${i.fix?`<span class="fix"${i.off?' style="display:none"':''}><em>수정</em><i>${esc((i.detail.match(/「([^」]+)」/)||[,'현재'])[1])}</i> → <b>${esc(i.fix)}</b></span>`:''}</span></div>`}).join('')+'</div>';
  });
  return h;
}
function statHTML(items,chars,gi){
  const L=live(items);
  const f1=L.filter(i=>i.tier===1&&i.status==='fail').length;
  const f2=L.filter(i=>i.tier===2&&i.status==='fail').length;
  const wn=L.filter(i=>i.status==='warn').length;
  return `<div class="stat" id="st${gi||0}">
    <div><div class="k">Tier 1 위반</div><div class="v" style="color:${f1?'var(--red)':'var(--green)'}">${f1}</div></div>
    <div><div class="k">Tier 2 위반</div><div class="v" style="color:${f2?'var(--amber)':'var(--green)'}">${f2}</div></div>
    <div><div class="k">확인 필요</div><div class="v">${wn}</div></div>
    <div><div class="k">본문 글자수</div><div class="v">${chars.toLocaleString()}</div></div></div>`;
}
/* 결과 화면도 바깥 상자에 한 번만 건다 */
/* AI가 찾아낸 이름을 슬라이드 글에서 찾아 그 장의 사진을 그 사람 몫으로 옮긴다.
   체크와 메모는 SHOTS 에 담겨 있으므로 다시 나눠도 사라지지 않는다. */
async function reassignShots(names){
  if(!DOC||DOC.type!=='pptx'||!ZIP||!SHOTS.length)return;
  const key=x=>String(x||'').replace(/\s/g,'').toLowerCase();
  /* 슬라이드를 파일 순서대로 훑는다. 합본은 「표지(이름) → 그 사람 사진들」이 반복되는 구조라,
     이름이 안 적힌 사진 슬라이드는 바로 앞에서 확정된 사람에게 이어 붙이면 맞는다.
     AI가 멘션으로 사람은 갈랐는데 사진 슬라이드엔 이름이 없어 이미지만 「전체 공통」에 남던 문제를 잡는다. */
  const map={};
  const ns=Object.keys(DOC.slidePics||{}).sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
  let carry=null;
  for(const n of ns){
    /* ① 이 슬라이드 본문에 이름이 있으면 그 사람 */
    const txt=key(shapeText(await readEntry(ZIP,n)||''));
    let hit=names.find(nm=>txt.includes(key(nm)));
    /* ② 없으면 파싱 때 이월해 둔 작성자 */
    if(!hit&&DOC.slidePerson&&DOC.slidePerson[n])
      hit=names.find(nm=>key(nm)===key(DOC.slidePerson[n]));
    /* ③ 그래도 없으면 바로 앞에서 확정된 사람에게 이어 붙인다 */
    if(!hit&&carry)hit=carry;
    if(hit){map[n]=hit;carry=hit}
  }
  if(!Object.keys(map).length)return;
  DOC.slidePerson=Object.assign({},DOC.slidePerson,map);
  let changed=false;
  SHOTS.forEach(s=>{if(map[s.slide]&&s.person!==map[s.slide]){s.person=map[s.slide];changed=true}});
  if(changed)keepCaret(render);
}
function bindResult(){
  const box=$('#result');if(!box||box.dataset.bound)return;
  box.dataset.bound='1';
  /* 체크와 메모는 적는 즉시 SHOTS 에 담는다. 그래야 화면을 다시 그려도 남는다 */
  const grab=el=>{
    const c=el.closest('.chk');if(!c)return;
    const i=+c.dataset.s;if(isNaN(i)||!SHOTS[i])return;
    SHOTS[i].checks=[...c.querySelectorAll('input:checked')].map(x=>x.dataset.t);
    const ta=c.querySelector('textarea');SHOTS[i].memo=ta?ta.value:'';
  };
  box.addEventListener('change',e=>{if(e.target.closest('.chk'))grab(e.target)});
  box.addEventListener('input',e=>{if(e.target.closest('.chk'))grab(e.target)});
  box.addEventListener('click',e=>{
    const b=e.target.closest('.undo');if(!b)return;
    const el=b.closest('.item'),g=LAST.groups[+el.dataset.g];if(!g)return;
    const it2=g.items[+el.dataset.i];if(!it2)return;
    it2.off=!it2.off;it2.byUser=it2.off;
    paintItem(el);repaintTotals();      // 화면 전체를 다시 그리지 않는다
  });
}
/* 화면을 다시 그리면 글을 쓰던 칸이 통째로 새로 만들어져 커서가 튕겨 나간다.
   AI 검수가 끝나는 순간 메모를 쓰고 있으면 글자는 남아도 흐름이 끊긴다.
   어디에 커서가 있었는지 기억해 두었다가 그 자리로 돌려놓는다. */
function keepCaret(draw){
  const el=document.activeElement;
  /* 어느 칸에 커서가 있었는지 표시값으로 기억한다. 사진 목록이든 설정 표든 같은 방법으로 찾는다 */
  const box=el&&el.closest?el.closest('[data-s],[data-i]'):null;
  if(!box||!el.dataset)return draw();
  const host=el.closest('[id]'),hid=host?host.id:'';
  const keys=Object.keys(el.dataset).concat(Object.keys(box.dataset));
  const pick=k=>(el.dataset[k]!==undefined?el.dataset[k]:box.dataset[k]);
  const tag=el.tagName.toLowerCase();
  const pos=(typeof el.selectionStart==='number')?el.selectionStart:null;
  const attr=k=>`[data-${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="${pick(k)}"]`;
  draw();
  const q=(hid?'#'+hid+' ':'')+[...new Set(keys)].map(k=>attr(k)).join('');
  const back=$(q+' '+tag)||$(tag+q)||$(q);
  if(!back||!back.focus)return;
  const d=back.closest('details');if(d)d.open=true;      // 접혀 있으면 펴 준다
  try{back.focus();if(pos!=null&&back.setSelectionRange)back.setSelectionRange(pos,pos)}catch(e){}
}
function render(){
  const G=LAST.groups,multi=G.length>1,v=LAST.v;
  let h=`<div class="sheet"><div class="shead"><div class="snum">03</div><div class="stitle">
    <h2>검수 결과</h2><p><b>${esc((CURPLAT&&CURPLAT.name)||'원고')}</b> 기준으로 처리했습니다.${(()=>{
      if(!multi)return DOC.people&&DOC.people.length>1?' 한 번에 검수했습니다.':'';
      const unknown=G.filter(g=>/미상|전체 공통/.test(g.name)).length;
      const real=G.length-unknown;
      return unknown
        ? ` 작성자 ${real}명으로 나눠 검수했고, 누구 것인지 못 가른 지적은 「전체 공통」으로 따로 모았습니다 (묶음 ${G.length}개).`
        : ` 작성자 ${real}명으로 나눠 검수했습니다.`;
    })()}</p>
    </div></div><div class="sbody">
    <div class="warn">이 결과는 검수를 <b>보조</b>하기 위한 것입니다. 최종 판단과 책임은 검수자에게 있습니다.
      통과로 표시된 항목도 실제로는 문제가 있을 수 있으니 원고를 직접 확인해 주세요.</div>
    <div class="verdict"><div class="stamp ${v.cls}" id="vStamp"><div class="lb">검수 완료</div><div class="vv">${v.v.replace('\n','<br>')}</div><div class="dt">${today()}</div></div>
    <div class="vwhy"><h3>${esc(FNAME)}</h3><p>${multi?'가장 낮은 판정을 대표로 표시했습니다. 아래에서 사람별 결과를 확인해 주세요.':v.why}</p></div></div>`;
  if(multi){
    G.forEach((g,gi)=>{
      const col=g.v.cls==='s-no'?'var(--red)':g.v.cls==='s-fix'?'var(--amber)':'var(--green)';
      h+=`<div class="person"><h4>${esc(g.name)}<span class="badge" id="bd${gi}" style="background:${col}">${g.v.v.replace('\n',' ')}</span></h4>
        ${statHTML(g.items,g.body.length,gi)}${itemsHTML(g.items)}</div>`;
    });
  }else{
    h+=statHTML(G[0].items,G[0].body.length,0)+itemsHTML(G[0].items);
  }
  h+=`<div class="field"><div class="lbl">AI 검수</div><div id="aiBox"></div>
    <div class="warn" style="margin-top:12px">AI 판단은 틀릴 수 있습니다. 지적한 것과 <b>지적하지 않은 것 모두</b> 확인해 주세요.</div></div>`;
  /* 화면을 다시 그릴 때마다 목록을 새로 만든다. 그대로 두면 사용자가 적어 둔
     체크와 메모가 통째로 사라지므로, 같은 자리의 사진에 그대로 옮겨 담는다. */
  const SB=buildShots(DOC);
  {const prev=SHOTS||[];
   SB.shots.forEach((sh,i)=>{
     /* 파일 안의 고유 번호로 짝을 짓는다. 순번으로 짝지으면 사진이 하나만 끼어들어도
        메모가 옆 사진으로 옮겨 붙는다. 고유 번호가 없는 형식만 순번으로 물러선다. */
     const p2=(sh.uid&&prev.find(x=>x.uid===sh.uid))||prev[i];
     if(p2){sh.checks=p2.checks||[];sh.memo=p2.memo||''}
   });}
  SHOTS=SB.shots;
  if(SHOTS.length){
    const all=IMGBASE.concat(lines($('#imgChecks').value));
    const byP={};SHOTS.forEach((sh,i)=>{const k=sh.person||'';(byP[k]=byP[k]||[]).push(i)});
    const unknown=Object.keys(byP).length===1&&Object.keys(byP)[0]==='';
    h+=`<div class="field"><div class="lbl">눈으로 볼 것</div>
      <div class="warn">사진·영상 속 내용은 이 도구가 <b>전혀</b> 볼 수 없습니다. 반드시 사람이 직접 확인해 주세요.<br><br>
        <b>문제가 있는 항목에 체크해 주세요.</b> 예를 들어 타사 제품이 노출됐다면 「타사 제품·로고 없음」에 체크하시면 됩니다.
        체크하신 항목과 메모만 검수본 파일에 들어갑니다.</div>
      ${SB.planOnly?`<div class="note" style="margin-bottom:14px">이 파일에는 <b>사진이 들어 있지 않습니다.</b>
        원고에 적힌 촬영 계획 번호를 읽어 목록을 만들었습니다. 실제 사진이 담긴 원고를 받으시면 그 사진들로 다시 검수해 주세요.</div>`:''}
      ${unknown&&DOC.type!=='docx'?`<div class="note" style="margin-bottom:14px">사진이 <b>누구 것인지 구분하지 못했습니다.</b>
        파일에 들어 있는 순서대로 늘어놓았습니다. 위 「본문 지정」에서 작성자를 지정하시거나 AI 검수를 돌리시면 사람별로 나눠 드립니다.</div>`:''}
      <p class="hint" style="margin:0 0 14px">${SB.how} 만들었습니다 · 사진 ${SHOTS.length}장 · 항목 ${all.length}개</p>`;
    /* 7명 × 십수 장이면 목록이 백 개를 넘는다. 사람별로 접어 둔다 */
    const fold=SHOTS.length>24;
    Object.keys(byP).forEach(k=>{
      const inner='<div class="checklist">'+byP[k].map(i=>{
        const sh=SHOTS[i],ck=sh.checks||[];
        return `<div class="chk" data-s="${i}"><b>${esc(sh.label)}</b>`+
        all.map(c=>`<label><input type="checkbox" data-t="${esc(c)}"${ck.includes(c)?' checked':''}>${esc(c)}</label>`).join('')+
        `<textarea placeholder="추가로 요청할 내용" style="min-height:54px;margin-top:11px;font-size:13px">${esc(sh.memo||'')}</textarea></div>`;
      }).join('')+'</div>';
      const done=byP[k].filter(i=>(SHOTS[i].checks||[]).length||(SHOTS[i].memo||'').trim()).length;
      const ttl=`${esc(k||'작성자 미상')} — 사진 ${byP[k].length}장${done?` · 지적 ${done}건`:''}`;
      h+=fold?`<details class="dict" style="margin-top:16px"${done?' open':''}><summary>${ttl}</summary>${inner}</details>`
             :(k?`<h4 style="margin:20px 0 10px;font-size:15px;font-weight:700">${ttl}</h4>`:'')+inner;
    });
    h+='</div>';
  }
  h+=`<div class="field"><div class="btnrow"><button class="btn red" id="mkFile">검수본 파일 내려받기</button></div>
    <div class="hint" style="margin-top:9px">${DOC.type==='xlsx'?'각 시트 오른쪽에 검수 의견 열이 붙고, 「검수 결과」 시트가 하나 추가됩니다.'
      :DOC.type==='docx'?'문서 앞에 요약이 붙고, 위반 문구가 있는 문단에 코멘트가 달립니다.'
      :multi?'사람마다 각자의 수정 요청 칸에 결과가 들어갑니다.':'수정 요청 칸에 기입됩니다. 칸이 없으면 첫 슬라이드에 메모 상자가 생깁니다.'}</div></div>
    </div></div>`;
  $('#result').innerHTML=h;
  $('#mkFile').onclick=makeAnnotated;
  /* 기계도 AI도 틀리게 잡을 때가 있다. 검수자가 직접 빼면 판정과 검수본에서 함께 제외된다 */
  if(aiTaskList().length)renderCopyBox();
}

/* ══ 검수본 ══ */
function imgLines(who){
  return imgIssues().filter(x=>!who||x.shot.person===who).map(x=>{
    const parts=[...x.checks];if(x.memo)parts.push(x.memo);
    return `[이미지] ${x.shot.label} — ${parts.join(' / ')}`;
  });
}
function summaryLines(items,vd,who){
  const f=live(items||LAST.items).filter(i=>i.status!=='pass');
  const L=[`[검수 결과]${who?` ${who}`:''} ${(vd||LAST.v).v.replace('\n',' ')} — ${today()} / ${$('#cWho').value||'검대리'}`];
  if(!f.length)L.push('지적 사항 없습니다');
  else f.forEach(i=>L.push(`[티어${i.tier}${i.src==='AI'?'·AI':''}] ${i.label} — ${i.detail}${i.fix?`  ▶ 수정: ${i.fix}`:''}`));
  const im=imgLines(who);
  if(im.length){if(!f.length)L.length=1;L.push(...im)}
  return L;
}
async function makeAnnotated(){
  const b=$('#mkFile');b.disabled=true;b.textContent='만드는 중…';
  try{const blob=DOC.type==='docx'?await annotateDocx():DOC.type==='xlsx'?await annotateXlsx():await annotatePptx();
    dl(blob,`${FNAME.replace(/\.(docx|pptx)$/i,'')}_검수_${today().replace(/\./g,'')}.${DOC.type}`);
  }catch(e){alert('검수본 생성에 실패했습니다 — '+e.message)}
  b.disabled=false;b.textContent='검수본 파일 내려받기';
}

async function annotateDocx(){
  const files=[];
  let docXml=await readEntry(ZIP,'word/document.xml'),comXml=await readEntry(ZIP,'word/comments.xml');
  let ctXml=await readEntry(ZIP,'[Content_Types].xml'),relXml=await readEntry(ZIP,'word/_rels/document.xml.rels');
  const who=esc($('#cWho').value||'검대리'),now=new Date().toISOString().replace(/\.\d+Z$/,'Z');
  let nid=0;
  if(comXml){(comXml.match(/w:id="(\d+)"/g)||[]).forEach(m=>nid=Math.max(nid,+m.match(/\d+/)[0]+1))}
  else{
    comXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:comments>';
    if(!/comments\.xml/.test(ctXml))ctXml=ctXml.replace('</Types>','<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>');
    if(!/comments\.xml/.test(relXml))relXml=relXml.replace('</Relationships>','<Relationship Id="rIdCmt1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>');
  }
  const newComs=[],paras=docXml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[];
  imgIssues().forEach(x=>{
    const pi=x.shot.para;if(pi===undefined||!paras[pi])return;
    const id=nid++;const parts=[...x.checks];if(x.memo)parts.push(x.memo);
    newComs.push(`<w:comment w:id="${id}" w:author="${who}" w:initials="검" w:date="${now}"><w:p><w:r><w:t xml:space="preserve">[이미지] ${esc(x.shot.label)} — ${esc(parts.join(' / '))}</w:t></w:r></w:p></w:comment>`);
    const hit=paras[pi];
    docXml=docXml.replace(hit,hit.replace(/(<w:p[ >][^>]*>)/,`$1<w:commentRangeStart w:id="${id}"/>`)
      .replace(/<\/w:p>$/,`<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r></w:p>`));
  });
  live(LAST.items).filter(i=>i.status!=='pass'&&/「/.test(i.detail)).forEach(item=>{
    const q=(item.detail.match(/「([^」]{2,60})」/)||[])[1];if(!q)return;
    // 인용이 문단 경계를 넘을 수 있으니 조각으로 쪼개 하나씩 시도한다
    const keys=[q.trim().slice(0,12),...q.split(/[\n\s]+/).map(s=>s.trim()).filter(s=>s.length>=4)]
      .sort((a,b)=>b.length-a.length);
    const ptext=p=>dec((p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join(''));
    let hit=null;
    for(const k of keys){hit=paras.find(p=>ptext(p).includes(k));if(hit)break}
    if(!hit)return;
    const id=nid++;
    newComs.push(`<w:comment w:id="${id}" w:author="${who}" w:initials="검" w:date="${now}"><w:p><w:r><w:t xml:space="preserve">[티어${item.tier}] ${esc(item.label)} — ${esc(item.detail)}${item.fix?` ▶ 수정: ${esc(item.fix)}`:''}</w:t></w:r></w:p></w:comment>`);
    let m=hit.replace(/<w:r>(\s*)<w:t/g,'<w:r>$1<w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t')
             .replace(/(<w:r>\s*<w:rPr>)(?!<w:highlight)/g,'$1<w:highlight w:val="yellow"/>');
    const wrapped=m.replace(/(<w:p[ >][^>]*>)/,`$1<w:commentRangeStart w:id="${id}"/>`)
                   .replace(/<\/w:p>$/,`<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r></w:p>`);
    docXml=docXml.replace(hit,wrapped);
  });
  const head=summaryLines().map((t,i)=>`<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/>${i===0?'<w:sz w:val="24"/>':''}<w:color w:val="${i===0?'1F3B63':'B8342A'}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`).join('')
    +'<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="AAAAAA"/></w:pBdr></w:pPr></w:p>';
  docXml=docXml.replace(/(<w:body>)/,'$1'+head);
  comXml=comXml.replace('</w:comments>',newComs.join('')+'</w:comments>');
  for(const name of Object.keys(ZIP)){
    let data;
    if(name==='word/document.xml')data=TE.encode(docXml);
    else if(name==='word/comments.xml')data=TE.encode(comXml);
    else if(name==='[Content_Types].xml')data=TE.encode(ctXml);
    else if(name==='word/_rels/document.xml.rels')data=TE.encode(relXml);
    else{files.push({name,copy:ZIP[name]});continue}
    files.push({name,data});
  }
  if(!ZIP['word/comments.xml'])files.push({name:'word/comments.xml',data:TE.encode(comXml)});
  return makeZip(files);
}
function subCells(xml){
  const out=[];
  (xml.match(/<a:tbl[ >][\s\S]*?<\/a:tbl>/g)||[]).forEach(tb=>{
    (tb.match(/<a:tr[ >][\s\S]*?<\/a:tr>/g)||[]).forEach(tr=>{
      const cells=tr.match(/<a:tc[ >][\s\S]*?<\/a:tc>/g)||[];
      if(cells.some(c=>/수정\s*요청/.test(shapeText(c))))out.push(cells);
    });
  });
  return out;
}
function fillCell(xml,cells,ls){
  const empty=cells.slice(1).find(c=>shapeText(c).length<2)||cells[1];
  if(!empty)return null;
  const body=`<a:txBody><a:bodyPr/><a:lstStyle/>${ls.map(t=>`<a:p><a:r><a:rPr lang="ko-KR" sz="1000" dirty="0"><a:solidFill><a:srgbClr val="E03131"/></a:solidFill></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`).join('')}</a:txBody>`;
  return xml.replace(empty,empty.replace(/<a:txBody>[\s\S]*?<\/a:txBody>/,body));
}
/* 멘션 셀 끝에 검수 결과를 덧붙인다 — 이미지 수정 요청 칸은 사람 몫이라 건드리지 않는다 */
function appendToCell(xml,cellText,ls){
  const cells=xml.match(/<a:tc[ >][\s\S]*?<\/a:tc>/g)||[];
  const tc=cells.find(c=>shapeText(c)===cellText);
  if(!tc)return null;
  const bd=tc.match(/<a:txBody>[\s\S]*?<\/a:txBody>/);
  if(!bd)return null;
  const P=t=>`<a:p><a:r><a:rPr lang="ko-KR" sz="1000" b="1" dirty="0"><a:solidFill><a:srgbClr val="E03131"/></a:solidFill></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`;
  const add=['','────────── 검수 의견 ──────────',...ls].map(P).join('');
  return xml.replace(tc,tc.replace(bd[0],bd[0].replace('</a:txBody>',add+'</a:txBody>')));
}
function fillReview(xml,ls){
  for(const cells of subCells(xml)){
    const target=cells.slice(1).find(c=>shapeText(c).length<2)||cells[1];
    if(!target)continue;
    const bd=target.match(/<a:txBody>[\s\S]*?<\/a:txBody>/);if(!bd)continue;
    const P=t=>`<a:p><a:r><a:rPr lang="ko-KR" sz="1000" b="1" dirty="0"><a:solidFill><a:srgbClr val="D64545"/></a:solidFill></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`;
    return xml.replace(target,target.replace(bd[0],bd[0].replace('</a:txBody>',ls.map(P).join('')+'</a:txBody>')));
  }
  return null;
}
/* 파워포인트는 한 슬라이드 안에서 도형 번호가 겹치면 파일이 열리지 않는다.
   예전에는 임의의 번호를 찍었는데, 확률은 낮아도 겹치면 원고가 통째로 못 쓰게 된다.
   그 슬라이드에 이미 쓰인 번호를 훑어 그다음 번호를 준다. */
function nextShapeId(xml){
  let mx=1;
  (String(xml).match(/id="(\d+)"/g)||[]).forEach(m=>{const v=+m.match(/\d+/)[0];if(v>mx)mx=v});
  return mx+1;
}
/* 표에 넣을 자리가 없을 때 슬라이드 위에 메모 상자를 얹는다 */
function appendBox(xml,ls){
  if(!/<\/p:spTree>/.test(xml))return null;
  const body=ls.map(t=>`<a:p><a:r><a:rPr lang="ko-KR" sz="1100" dirty="0"><a:solidFill><a:srgbClr val="B8342A"/></a:solidFill></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`).join('');
  return xml.replace('</p:spTree>',`<p:sp><p:nvSpPr><p:cNvPr id="${nextShapeId(xml)}" name="검수 메모"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="304800" y="304800"/><a:ext cx="5200000" cy="2600000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="FFF7F6"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="B8342A"/></a:solidFill></a:ln></p:spPr>
<p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>${body}</p:txBody></p:sp></p:spTree>`);
}
async function annotatePptx(){
  const men=DOC.blocks.filter(b=>b.role==='mention');
  const imgBySlide={};
  imgIssues().forEach(x=>{
    const sl=x.shot.slide;if(!sl)return;
    const parts=[...x.checks];if(x.memo)parts.push(x.memo);
    (imgBySlide[sl]=imgBySlide[sl]||[]).push(`[${x.shot.label}] ${parts.join(' / ')}`);
  });
  if(men.length){
    const files=[],edited={},done={};
    const ns=Object.keys(ZIP).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
    for(const n of ns){
      let xml=await readEntry(ZIP,n);
      if(imgBySlide[n]){const r=fillReview(xml,imgBySlide[n]);if(r)xml=r}
      const mine=men.filter(b=>b.slide===n);
      for(const b of mine){
        const key=b.person||'__solo';
        if(done[key])continue;
        /* 작성자를 못 나눈 칸은 첫 그룹(전체 공통)에 붙인다.
           예전에는 짝을 못 찾으면 건너뛰어서 아무것도 안 적히는 일이 있었다 */
        const g=(b.person&&LAST.groups.length>1
          ? LAST.groups.find(x=>x.name===b.person)
          : LAST.groups[0])||LAST.groups[0];
        if(!g)continue;
        const r=appendToCell(xml,b.text,summaryLines(g.items,g.v,g.name));
        if(r){xml=r;done[key]=1}
      }
      edited[n]=xml;
    }
    if(Object.keys(done).length){
      for(const name of Object.keys(ZIP))files.push(edited[name]?{name,data:TE.encode(edited[name])}:{name,copy:ZIP[name]});
      return makeZip(files);
    }
  }
  if(LAST.groups.length>1){
    const files=[],edited={},done={};
    const ns=Object.keys(ZIP).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
    for(const n of ns){
      let xml=await readEntry(ZIP,n);
      const who=DOC.slidePerson?DOC.slidePerson[n]:null;
      if(who&&!done[who]){
        const g=LAST.groups.find(x=>x.name===who);
        if(g)for(const cells of subCells(xml)){const r=fillCell(xml,cells,summaryLines(g.items,g.v,g.name));if(r){xml=r;done[who]=1;break}}
      }
      edited[n]=xml;
    }
    /* AI가 나눈 사람은 원고 칸에 이름표가 없다. 슬라이드 글에서 이름을 찾아 그 장에 적는다.
       예전에는 이 경우가 통째로 빠져서, AI가 사람을 구분해도 검수본에는 아무것도 안 남았다. */
    const aiG=LAST.groups.filter(g=>g.aiOnly&&!done[g.name]);
    if(aiG.length){
      for(const n2 of ns){
        const xml0=edited[n2]!==undefined?edited[n2]:await readEntry(ZIP,n2);
        let xml=xml0;
        for(const g of aiG){
          if(done[g.name])continue;
          const nm=String(g.name).replace(/\s/g,'').toLowerCase();
          if(!norm(shapeText(xml)).toLowerCase().includes(nm))continue;
          for(const cells of subCells(xml)){
            const r2=fillCell(xml,cells,summaryLines(g.items,g.v,g.name));
            if(r2){xml=r2;done[g.name]=1;break}
          }
          if(!done[g.name]){
            const r3=appendBox(xml,summaryLines(g.items,g.v,g.name));
            if(r3){xml=r3;done[g.name]=1}
          }
        }
        if(xml!==xml0)edited[n2]=xml;
      }
    }
    /* 한 칸도 못 채웠으면 여기서 끝내면 안 된다.
       예전에는 무조건 돌려줘서 검수 내용이 하나도 없는 파일이 나갔다. */
    if(Object.keys(done).length){
      for(const name of Object.keys(ZIP))files.push(edited[name]?{name,data:TE.encode(edited[name])}:{name,copy:ZIP[name]});
      return makeZip(files);
    }
  }
  const files=[],lines=summaryLines(),edited={};
  const names=Object.keys(ZIP).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
  let placed=false;
  for(const n of names){
    let xml=await readEntry(ZIP,n);
    if(!placed){
      const rows=xml.match(/<a:tr[ >][\s\S]*?<\/a:tr>/g)||[];
      const target=rows.find(r=>/수정\s*요청/.test(shapeText(r)));
      if(target){
        const cells=target.match(/<a:tc[ >][\s\S]*?<\/a:tc>/g)||[];
        const empty=cells.slice(1).find(c=>shapeText(c).length<2)||cells[1];
        if(empty){
          const body=`<a:txBody><a:bodyPr/><a:lstStyle/>${lines.map(t=>`<a:p><a:r><a:rPr lang="ko-KR" sz="1000" dirty="0"><a:solidFill><a:srgbClr val="B8342A"/></a:solidFill></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`).join('')}</a:txBody>`;
          xml=xml.replace(empty,empty.replace(/<a:txBody>[\s\S]*?<\/a:txBody>/,body));
          placed=true;
        }
      }
    }
    edited[n]=xml;
  }
  if(!placed&&names.length){
    const n=names[0];
    edited[n]=edited[n].replace('</p:spTree>',`<p:sp><p:nvSpPr><p:cNvPr id="${nextShapeId(edited[n])}" name="검수 메모"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="304800" y="304800"/><a:ext cx="5200000" cy="2600000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="FFF7F6"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="B8342A"/></a:solidFill></a:ln></p:spPr>
<p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>${lines.map(t=>`<a:p><a:r><a:rPr lang="ko-KR" sz="1100" dirty="0"><a:solidFill><a:srgbClr val="B8342A"/></a:solidFill></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree>`);
  }
  for(const name of Object.keys(ZIP))files.push(edited[name]?{name,data:TE.encode(edited[name])}:{name,copy:ZIP[name]});
  return makeZip(files);
}

/* ══ 이력 ══ */
try{hist=JSON.parse(S.get('v4_hist')||'[]')}catch(e){hist=[]}
function pushHist(){
  const LV=live(LAST.items);
  hist.unshift({at:new Date().toLocaleString('ko-KR',{hour12:false}),file:FNAME,camp:$('#cName').value||'',
    plat:(CURPLAT&&CURPLAT.name)||'',
    t1:LV.filter(i=>i.tier===1&&i.status==='fail').length,t2:LV.filter(i=>i.tier===2&&i.status==='fail').length,
    ai:LV.filter(i=>i.src==='AI').length,v:LAST.v.v.replace('\n',' '),min:LAST.mins.toFixed(1)});
  S.set('v4_hist',JSON.stringify(hist.slice(0,500)));
}
function drawHist(){
  if(!hist.length)return $('#histBox').innerHTML='<div class="empty">아직 없습니다. 검수를 한 번 실행하시면 여기에 쌓입니다.</div>';
  const tot=hist.length,avg=(hist.reduce((s,h)=>s+ +h.min,0)/tot).toFixed(1);
  $('#histBox').innerHTML=`<div class="stat plain" style="margin-bottom:18px">
    <div><div class="k">누적 검수</div><div class="v">${tot}</div></div>
    <div><div class="k">평균 소요</div><div class="v">${avg}<span style="font-size:13px;font-family:var(--sans)">분</span></div></div>
    <div><div class="k">수정 요청률</div><div class="v">${Math.round(hist.filter(h=>h.v!=='승인').length/tot*100)}<span style="font-size:13px;font-family:var(--sans)">%</span></div></div></div>
  <table class="hist"><tr><th>검수일시</th><th>파일</th><th>플랫폼</th><th>T1</th><th>T2</th><th>AI</th><th>판정</th><th>소요</th></tr>
  ${hist.map(h=>`<tr><td class="n">${h.at}</td><td>${esc(h.file)}</td><td>${h.plat}</td>
  <td class="n" style="color:${h.t1?'var(--red)':''}">${h.t1}</td><td class="n" style="color:${h.t2?'var(--amber)':''}">${h.t2}</td>
  <td class="n">${h.ai||0}</td><td>${h.v}</td><td class="n">${h.min}분</td></tr>`).join('')}</table>`;
}
$('#csvOut').onclick=()=>{
  if(!hist.length)return alert('내보낼 이력이 없습니다.');
  const head=['검수일시','파일명','캠페인','플랫폼','티어1','티어2','AI지적','판정','소요분'];
  const csv='\uFEFF'+[head,...hist.map(h=>[h.at,h.file,h.camp,h.plat,h.t1,h.t2,h.ai||0,h.v,h.min])]
    .map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  dl(new Blob([csv],{type:'text/csv'}),`검수이력_${today().replace(/\./g,'')}.csv`);
};
$('#csvClear').onclick=()=>{if(confirm('이력을 전부 지웁니다. 되돌릴 수 없습니다.')){hist=[];S.set('v4_hist','[]');drawHist()}};
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}

/* ══ 설정 색인 ══ */
function buildRail(){
  const sheets=[...$('#p-set').querySelectorAll('.sheet')];
  $('#rail').innerHTML=sheets.map((sh,i)=>{
    const id='sec'+i;sh.id=id;
    const n=sh.querySelector('.snum').textContent.trim();
    const t=sh.querySelector('.stitle h2').textContent.replace('필수','').trim();
    return `<a href="#${id}"><span>${n}</span>${esc(t)}</a>`}).join('');
}

/* ══ 시작 ══ */
/* 이름과 버전은 rules.js 의 APPNAME · APPVER 한 곳에서만 정합니다.
   화면에 박힌 글자는 스크립트가 못 돌 때를 위한 예비값입니다. */
$$('[data-app]').forEach(el=>el.textContent=APPNAME);
$$('[data-ver]').forEach(el=>el.textContent=APPVER);
bindBlocks();bindResult();buildRail();loadBase();loadPlatforms();drawBase();drawProducts();drawGroups();drawFuncs();drawRules();drawMissions();drawPlatforms();drawAI();fillDicts();fillPlatSelect();
DICTKEYS.forEach(k=>{const el=$('#'+k+'Dict');if(el)el.oninput=syncDicts});
if($('#mType'))$('#mType').oninput=syncPick;
/* 캠페인 설정 입력칸은 값이 바뀔 때마다 자동 저장한다 */
FIELDS.forEach(f=>{const el=$('#'+f);if(el)el.addEventListener('input',saveAll)});
if(loadAll())redrawAll();
try{aiCfg=Object.assign(aiCfg,JSON.parse(S.get('v4_ai')||'{}'))}
catch(e){
  /* 저장된 값이 깨졌으면 기본값으로 시작하되, 왜 키가 사라졌는지는 알려 드린다 */
  S.set('v4_ai','');
  setTimeout(()=>alert('저장해 두신 AI 설정을 읽지 못해 처음 상태로 시작합니다.\n\nAI 설정 탭에서 키를 다시 넣어 주세요.'),0);
}
if($('#aiNoSave'))$('#aiNoSave').checked=S.get('v4_aiNoSave')==='1';
$('#aiProv').value=aiCfg.prov;$('#aiModel').value=aiCfg.model||'';$('#aiUrl').value=aiCfg.url||'';$('#aiKey').value=aiCfg.key||'';
syncProv();
aiMode=S.get('v4_aimode')||'key';
$$('#aiMode button').forEach(x=>x.classList.toggle('on',x.dataset.m===aiMode));
$('#aiKeyBox').style.display=aiMode==='key'?'':'none';
$('#copyWarn').style.display=aiMode==='copy'?'':'none';
syncGX();
