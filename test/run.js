/* ══════════════════════════════════════════════════════
   회귀 테스트 — 고친 것이 다시 깨지지 않았는지 확인합니다

   실행
     bash build.sh && node test/run.js

   준비물
     node 18 이상 · npm install jsdom (이 폴더 또는 상위에서 한 번만)

   이 파일은 완성된 HTML을 진짜 브라우저처럼 띄우고, sample/ 의 파일을
   실제로 읽어 검수까지 돌립니다. 눈으로 클릭해 확인하던 것을 대신합니다.
   기능을 고치셨으면 여기에 항목을 하나 추가해 주세요.
   ══════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readdirSync(ROOT).find(f => /^검대리_v[\d.]+\.html$/.test(f));
if (!HTML) { console.error('배포 파일이 없습니다. 먼저 bash build.sh 를 실행해 주세요.'); process.exit(1); }

const sample = f => new Uint8Array(fs.readFileSync(path.join(ROOT, 'sample', f))).buffer;

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '통과' : '실패'}  ${name}` + (ok ? '' : `\n         받음 ${JSON.stringify(got)}\n         기대 ${JSON.stringify(want)}`));
};

/* CDN 스크립트를 뺀 채 띄웁니다 — 인터넷이 끊긴 상황을 그대로 재현합니다 */
function boot() {
  const html = fs.readFileSync(path.join(ROOT, HTML), 'utf8')
    .replace(/<script src="https:\/\/code\.iconify[^>]*><\/script>/, '');
  const errs = [];
  const vc = new VirtualConsole().on('jsdomError', e => {
    if (!/IntersectionObserver/.test(e.message)) errs.push(e.message);   // jsdom 에 없는 기능일 뿐입니다
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://local.test/',
    virtualConsole: vc,
    /* 브라우저에 있는 압축·통신 기능을 node 것으로 채워 줍니다 */
    beforeParse(w) {
      w.DecompressionStream = DecompressionStream; w.CompressionStream = CompressionStream;
      w.Response = Response; w.Blob = Blob;
      /* 브라우저엔 원래 있는 것들. jsdom 버전에 따라 빠져 있어 채워 준다 */
      w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder;
    }
  });
  dom.window.alert = m => errs.push('알림: ' + m);
  return { W: dom.window, errs };
}

(async () => {
  const { W, errs } = boot();
  await new Promise(r => setTimeout(r, 1200));
  W.__docx = sample('샘플원고_블로그.docx');
  W.__pptx = sample('샘플원고_인스타.pptx');
  W.__xlsx = sample('샘플원고_영상기획안.xlsx');
  W.__gdocx = sample('샘플_가이드.docx');

  console.log(`\n${HTML}\n`);

  console.log('화면이 제대로 떴는가');
  const q = s => W.document.querySelector(s);
  check('플랫폼 3행', [...W.document.querySelectorAll('#plBox input[data-k=name]')].map(x => x.value),
    ['블로그', '인스타그램', '영상 기획안']);
  check('검수 탭 차례', [...W.document.querySelectorAll('#p-rev .stitle h2')].map(x => x.textContent),
    ['검수 기준', '원고 올리기', '본문 지정']);
  check('사전 입력칸', !!q('#rivalDict') && !!q('#hypeDict'), true);
  check('타 브랜드 사전은 비어 있어야 함', W.eval("(dicts.rival||'').trim()"), '');

  console.log('\n파일을 읽는가');
  const r1 = JSON.parse(await W.eval(`(async()=>{
    const o={};
    for(const[k,buf,fn] of [['워드',window.__docx,'parseDocx'],['PPT',window.__pptx,'parsePptx'],['엑셀',window.__xlsx,'parseXlsx']]){
      ZIP=await unzip(buf); DOC=await window[fn](ZIP); FNAME='t';
      $('#plSel').value='0'; $('#plSel').dispatchEvent(new Event('change'));
      sel=new Set(guessBody(DOC.blocks)); drawBlocks();
      o[k]={블록:DOC.blocks.length, 검수:machineCheck(DOC,bodyText()).length, 사람:(DOC.people||[]).length};
    }
    const gz=await unzip(window.__gdocx); GUIDE=await parseGuide(gz,'docx'); guideText=GUIDE.text;
    o.가이드={표:GUIDE.tables.length, 제안:extractGuide().length};
    return JSON.stringify(o)})()`));
  check('워드', r1.워드, { 블록: 1, 검수: 5, 사람: 0 });
  check('파워포인트 — 3인 합본을 사람별로 나눔', r1.PPT, { 블록: 33, 검수: 5, 사람: 3 });
  check('엑셀', r1.엑셀, { 블록: 48, 검수: 5, 사람: 0 });
  check('가이드에서 설정을 뽑아냄', r1.가이드.제안 >= 8, true);

  console.log('\n고쳤던 문제가 다시 나지 않는가');
  /* 고지 문구를 어떤 기호로 적어도 찾아내야 합니다 */
  check('표기 기호를 가리지 않고 고지 문구를 찾음',
    W.eval(`subtitleBlocks(['[딥배리어]','* 개인의 상태에 따라 체감 효과가 다를 수 있습니다.','',
      '「시카리페어」','진정은 일반적인 사용감을 의미하며 개인차가 있습니다.','',
      '(트리플히알론)','※ 수분 지속 시간은 시험 조건에 따라 다를 수 있습니다.'
      ].join(String.fromCharCode(10))).map(x=>x.name)`),
    ['딥배리어', '시카리페어', '트리플히알론']);
  /* 운영 안내문이 기능명 자리에 끼어들면 안 됩니다 */
  check('운영 안내문은 고지 문구로 잡지 않음',
    W.eval(`subtitleBlocks(['추가 콘텐츠 업로드 시',
      '※ 우수 체험단 추가 혜택은 별도 인원 제한 없이 선정됩니다.','',
      '클릭 시 제품 상세페이지로 이동합니다',
      '* 진동 데이터를 수집하여 학습한 일반화된 단계입니다.'
      ].join(String.fromCharCode(10))).length`), 0);
  /* 가이드를 말없이 자르면 안 됩니다 */
  check('가이드 4만 자를 그대로 전달', W.eval("guideText='가'.repeat(40000); guideForAI().length"), 40000);
  check('한계를 넘으면 잘렸다고 알림', W.eval("guideText='가'.repeat(250000); guideForAI()").includes('잘렸습니다'), true);
  /* AI 가 기계 결과를 덮어쓰면 안 됩니다 */
  check('AI 제안이 기계 제안을 덮지 않고 합침', W.eval(`
    guideText='정식명칭A 정식명칭B 정식명칭C';
    SUGG=[{k:'정식 명칭 후보',f:'properNames',v:'정식명칭A'+String.fromCharCode(10)+'정식명칭B',src:'기계'}];
    applyGX({products:[],proper:['정식명칭C'],rounds:[],imgChecks:[],target:'',notices:[],dropNotices:[]});
    (SUGG.find(x=>x.f==='properNames')||{}).v.split(String.fromCharCode(10))`),
    ['정식명칭A', '정식명칭B', '정식명칭C']);
  /* AI 가 문제 있는 사람만 보내도 전원이 결과에 남아야 합니다 */
  check('문제 없는 사람도 결과에 자리를 만듦', W.eval(`
    DOC={type:'pptx',raw:'x',blocks:[],images:0,videos:0,people:[]};
    const its=[{tier:2,label:'글자 수',status:'fail',detail:'d',src:'기계',fix:''}];
    LAST={groups:[{name:'',items:its,v:verdict(its),body:'x',doc:DOC}],items:its,v:verdict(its),mins:0};
    mergeAI({dismiss:[],people:['a','b','c','d','e','f','g'],
      issues:[{tier:2,label:'오탈자',status:'fail',detail:'x',src:'AI',fix:'',person:'a'}]});
    LAST.groups.length`), 8);
  check('작성자를 못 나눴다는 사실을 결과에 밝힘', W.eval("LAST.groups[0].items[0].label"), '작성자 구분 안내');

  console.log('\n사진 목록');
  const r2 = JSON.parse(await W.eval(`(async()=>{
    ZIP=await unzip(window.__pptx); DOC=await parsePptx(ZIP); FNAME='i.pptx';
    $('#plSel').value='1'; $('#plSel').dispatchEvent(new Event('change'));
    sel=new Set(guessBody(DOC.blocks));
    DOC.slidePics={'ppt/slides/slide3.xml':14,'ppt/slides/slide5.xml':12,'ppt/slides/slide7.xml':9};
    DOC.slideRids={'ppt/slides/slide3.xml':[],'ppt/slides/slide5.xml':[],'ppt/slides/slide7.xml':[]};
    const SB=buildShots(DOC);
    const o={총:SB.shots.length,
      사람별:SB.shots.reduce((m,s)=>(m[s.person||'미상']=(m[s.person||'미상']||0)+1,m),{}),
      사진없음:buildShots({...DOC,slidePics:{},slideRids:{},blocks:[]}).none===true};
    SHOTS=SB.shots;
    const its=machineCheck(DOC,bodyText());
    LAST={groups:[{name:'',items:its,v:verdict(its),body:bodyText(),doc:DOC}],items:its,v:verdict(its),mins:0};
    render();
    const c=document.querySelector('#result .chk');
    c.querySelector('input').checked=true;
    c.querySelector('input').dispatchEvent(new Event('change',{bubbles:true}));
    c.querySelector('textarea').value='타사 로고 보임';
    c.querySelector('textarea').dispatchEvent(new Event('input',{bubbles:true}));
    o.입력후=imgIssues().length;
    render();                                   // AI 검수가 끝나면 이렇게 다시 그립니다
    o.재생성후=imgIssues().length;
    o.메모유지=document.querySelector('#result .chk textarea').value;
    o.접힘=document.querySelectorAll('#result details.dict').length;
    return JSON.stringify(o)})()`));
  check('파일에 든 사진을 전부 셈', r2.총, 35);
  check('사람별로 나눔', r2.사람별, { 'dayli_seo': 14, 'min_skincare': 12, 'hyunwoo.log': 9 });
  check('사진이 없으면 목록도 비움', r2.사진없음, true);
  check('사진이 많으면 작성자별로 접음', r2.접힘, 3);
  check('화면을 다시 그려도 체크가 남음', [r2.입력후, r2.재생성후], [1, 1]);
  check('화면을 다시 그려도 메모가 남음', r2.메모유지, '타사 로고 보임');

  console.log('\n설정이 남는가');
  /* 설정은 브라우저에 자동 저장됩니다. 창을 닫았다 열어도 그대로여야 합니다 */
  check('설정을 저장함', W.eval(`
    $('#cName').value='테스트캠페인'; $('#cName').dispatchEvent(new Event('input'));
    products.push({canon:'래온셀 크림',extra:'',tier:1});
    missions.push({plat:'블로그',type:'펫',name:'1주차',topic:'T',keys:'K'});
    platforms[0].minChar=5555; savePlatforms(); redrawAll();
    JSON.parse(localStorage.getItem('v4_setup')||'{}').cName`), '테스트캠페인');
  /* 설정 파일로 내보냈다가 다시 불러와도 같아야 합니다 */
  check('설정 파일 내보내기·불러오기', W.eval(`
    const saved=JSON.stringify(profile());
    products=[];missions=[];platforms[0].minChar=0;$('#cName').value='';
    applyProfile(JSON.parse(saved)); redrawAll();
    [$('#cName').value, products.length, missions.length, platforms[0].minChar]`),
    ['테스트캠페인', 1, 1, 5555]);
  check('작성자 열 머리말을 고칠 수 있음', !!q('#hdrPerson'), true);
  check('이름·버전이 상수와 이어져 있음',
    [q('[data-app]').textContent, q('[data-ver]').textContent], W.eval('[APPNAME,APPVER]'));

  console.log('\n읽을 수 없는 형식');
  check('한글 문서는 안내로 돌려보냄',
    (await W.eval(`(async()=>{await load(new File([new Uint8Array([1,2])],'a.hwp'));
      return $('#fileMsg').textContent})()`)).includes('한글 문서'), true);
  check('가이드 엑셀도 읽음', (JSON.parse(await W.eval(`(async()=>{
    const z=await unzip(window.__xlsx); const g=await parseGuide(z,'xlsx');
    return JSON.stringify({표:g.tables.length, 글자:g.text.length})})()`))).표 >= 2, true);

  console.log('\n엣지 케이스');
  /* 파워포인트는 도형 번호가 겹치면 파일이 열리지 않습니다 */
  check('메모 상자 번호가 기존 도형과 겹치지 않음',
    W.eval(`nextShapeId('<p:cNvPr id="7"/><p:cNvPr id="9001"/><p:cNvPr id="12"/>')`), 9002);
  /* 메모를 쓰는 중에 AI 응답이 와도 커서가 튕기면 안 됩니다 */
  check('다시 그려도 쓰던 자리에 커서가 남음', await W.eval(`(async()=>{
    /* 사진 목록이 있는 상태를 다시 만듭니다 */
    ZIP=await unzip(window.__pptx); DOC=await parsePptx(ZIP); FNAME='i.pptx';
    $('#plSel').value='1'; $('#plSel').dispatchEvent(new Event('change'));
    sel=new Set(guessBody(DOC.blocks));
    DOC.slidePics={'ppt/slides/slide3.xml':3}; DOC.slideRids={'ppt/slides/slide3.xml':[]};
    SHOTS=[];
    const its=machineCheck(DOC,bodyText());
    LAST={groups:[{name:'',items:its,v:verdict(its),body:bodyText(),doc:DOC}],items:its,v:verdict(its),mins:0};
    render();
    const ta=document.querySelector('#result .chk textarea');
    if(!ta)return '메모칸 없음';
    const d=ta.closest('details'); if(d)d.open=true;
    ta.focus(); ta.value='메모 쓰는 중'; ta.dispatchEvent(new Event('input',{bubbles:true}));
    ta.setSelectionRange(3,3);
    const key=ta.closest('.chk').dataset.s;
    keepCaret(render);
    const now=document.activeElement;
    return now && now.tagName==='TEXTAREA' && now.closest('.chk').dataset.s===key;
  })()`), true);

  /* Office 는 상황에 따라 태그에 속성을 붙입니다. 배경으로 채운 도형은 <p:sp useBgFill="1"> 로 적힙니다 */
  check('속성이 붙은 태그도 읽음', W.eval(`
    const A='<p:sp><p:txBody><a:p><a:r><a:t>가</a:t></a:r></a:p></p:txBody></p:sp>';
    const B='<p:sp useBgFill="1"><p:txBody><a:p><a:r><a:t xml:space="preserve">나</a:t></a:r></a:p></p:txBody></p:sp>';
    ((A+B).match(/<p:sp[ >][\\s\\S]*?<\\/p:sp>/g)||[]).map(shapeText)`), ['가','나']);
  /* 설정 파일을 팀에 공유해도 API 키는 따라가면 안 됩니다 */
  check('설정 파일에 API 키가 들어가지 않음', W.eval(`
    aiCfg.key='sk-테스트키-절대-새면-안-됨';
    JSON.stringify(profile()).includes('절대-새면-안-됨')`), false);

  /* 회사 보안 규정상 키를 기기에 남길 수 없는 경우를 위한 선택지 */
  check('키를 저장하지 않기를 켜면 저장소에 키가 남지 않음', W.eval(`
    aiCfg.key='sk-남으면-안-됨';
    $('#aiNoSave').checked=true; saveAi();
    (localStorage.getItem('v4_ai')||'').includes('남으면-안-됨')`), false);
  check('꺼 두면 평소대로 저장됨', W.eval(`
    $('#aiNoSave').checked=false; saveAi();
    (localStorage.getItem('v4_ai')||'').includes('남으면-안-됨')`), true);

  /* 저장된 설정이 깨졌을 때 조용히 넘어가면 사용자는 이유를 알 수 없습니다 */
  check('손상된 설정을 알리고 지움', await W.eval(`(async()=>{
    localStorage.setItem('v4_setup','{망가진 값');
    let told=false; const old=window.alert; window.alert=m=>{told=/손상/.test(m)};
    const started=loadAll();
    await new Promise(r=>setTimeout(r,10));
    window.alert=old;
    return [started, told, localStorage.getItem('v4_setup')]
  })()`), [false, true, '']);
  /* 큰 파일을 연달아 열 때 앞 파일이 메모리에 남아 있으면 안 됩니다 */
  check('새 파일을 읽기 전에 앞 파일을 놓아 줌', await W.eval(`(async()=>{
    ZIP={더미:1}; DOC={더미:1}; LAST={더미:1}; SHOTS=[1,2,3];
    await load(new File([new Uint8Array([1,2])],'a.hwp'));   // 읽기 전에 비우는지만 봅니다
    return [ZIP,DOC,LAST,SHOTS.length]
  })()`), [null,null,null,0]);

  /* 손대지 않은 사진·동영상은 압축을 풀었다 다시 담지 않고 그대로 옮겨야 합니다 */
  check('검수본이 손대지 않은 파일을 그대로 옮김', W.eval(`
    typeof makeZip==='function' &&
    /f\\.copy/.test(makeZip.toString()) &&
    /crc,usize/.test(unzip.toString().replace(/\\s/g,''))`), true);
  /* 엑셀에서 중간이 빈 행도 빈칸 없는 배열로 돌려줘야 합니다 */
  check('중간이 빈 엑셀 행을 촘촘한 배열로 읽음', await W.eval(`(async()=>{
    const z=await unzip(window.__xlsx);
    const g=await xlsxGrid(z,(await xlsxSheets(z))[0].path,await xlsxStrings(z));
    const row=g.find(r=>r.length>2)||[];
    return row.every(c=>c!==undefined)
  })()`), true);
  /* 설정 표에서 글자를 치다 다시 그려도 커서가 남아야 합니다 */
  check('설정 표에서도 커서가 남음', W.eval(`
    products=[{canon:'래온셀 크림',extra:'',tier:1}]; drawProducts();
    const inp=document.querySelector('#pnBox input[data-k="canon"]');
    inp.focus(); inp.setSelectionRange(2,2);
    keepCaret(drawProducts);
    const now=document.activeElement;
    now && now.dataset && now.dataset.k==='canon'`), true);

  /* 표 한 칸에서 줄바꿈된 항목이 토막 나면 안 됩니다 (타사 가전(LG / 쿠쿠 등) → 한 줄) */
  check('줄바꿈된 이미지 항목을 도로 이어 붙임', W.eval(`
    guideText=['타사 가전(LG','쿠쿠 등) 제품 노출 절대 불가'].join(String.fromCharCode(10));
    GUIDE={tables:[],units:[],text:guideText};
    (extractGuide().find(x=>x.f==='imgChecks')||{v:''}).v.split(String.fromCharCode(10)).some(l=>l.includes('LG')&&l.includes('쿠쿠'))`), true);
  /* 가이드에서 읽은 광고 고지가 플랫폼 설정에 실제로 박혀야 합니다 */
  check('플랫폼별 광고 고지가 설정에 반영됨', W.eval(`
    platforms=[{name:'블로그',alias:'',minChar:'',minImg:'',minVid:'',adText:'',adRange:400}];
    const x={f:'adText_0',v:'제품을 제공받아 작성되었습니다'};
    const m=x.f.match(/^(\\w+?)_(\\d+)$/); if(platforms[+m[2]])platforms[+m[2]][m[1]]=x.v;
    platforms[0].adText`), '제품을 제공받아 작성되었습니다');
  /* 공개판은 검대리, 검수자 기본 이름도 검대리 */
  check('공개판 이름이 검대리', [W.eval('APPNAME'), q('#cWho').value], ['검대리','검대리']);

  /* AI가 멘션으로 사람을 갈랐지만 사진 슬라이드엔 이름이 없는 경우 —
     사진이 앞 표지의 사람에게 이어붙어 사람별로 갈려야 합니다 */
  check('이름 없는 사진 슬라이드를 앞사람에게 이어붙임', JSON.parse(await W.eval(`(async()=>{
    ZIP=await unzip(window.__pptx); DOC=await parsePptx(ZIP); FNAME='i.pptx';
    $('#plSel').value='1'; $('#plSel').dispatchEvent(new Event('change'));
    sel=new Set(guessBody(DOC.blocks));
    DOC.slidePics={'ppt/slides/slide3.xml':5,'ppt/slides/slide5.xml':4,'ppt/slides/slide7.xml':3};
    DOC.slideRids={}; Object.keys(DOC.slidePics).forEach(k=>DOC.slideRids[k]=[]);
    DOC.slidePerson={'ppt/slides/slide2.xml':'seo','ppt/slides/slide4.xml':'min','ppt/slides/slide6.xml':'woo'};
    SHOTS=buildShots(DOC).shots;
    const its=machineCheck(DOC,bodyText());
    LAST={groups:[{name:'',items:its,v:verdict(its),body:bodyText(),doc:DOC}],items:its,v:verdict(its),mins:0};
    await reassignShots(['seo','min','woo']);
    return JSON.stringify(SHOTS.filter(s=>!s.person).length)
  })()`)), 0);

  /* 가이드가 한 표 셀 안에서 줄을 나눠 적은 이미지 주의사항은 한 항목으로 합쳐야 합니다 */
  check('한 셀 안 여러 줄을 한 항목으로 묶음', W.eval(`
    GUIDE={tables:[[['이미지 주의','타사 가전'+String.fromCharCode(10)+'모바일 기기'+String.fromCharCode(10)+'경쟁사 제품 노출 절대 불가 (블러 혹은 크롭 처리 필수)']]],units:[],text:'x'};
    guideText='x';
    const v=(extractGuide().find(x=>x.f==='imgChecks')||{v:''}).v;
    v.split(String.fromCharCode(10)).length===1 && v.includes('타사 가전') && v.includes('경쟁사')`), true);

  console.log('\n검수본 파일');
  const r3 = JSON.parse(await W.eval(`(async()=>{
    const o={};
    ZIP=await unzip(window.__pptx); DOC=await parsePptx(ZIP); FNAME='i.pptx';
    $('#plSel').value='1'; $('#plSel').dispatchEvent(new Event('change'));
    sel=new Set(guessBody(DOC.blocks)); SHOTS=[];
    const gs=DOC.people.map(pp=>{
      const d={...DOC,blocks:pp.blocks,raw:pp.raw};
      const body=pp.blocks.filter(b=>sel.has(b.id)).map(b=>b.text).join(String.fromCharCode(10));
      const items=machineCheck(d,body);
      return{name:pp.name,items,v:verdict(items),body,doc:d};
    });
    LAST={groups:gs,items:gs.flatMap(g=>g.items),v:gs[0].v,mins:0};
    o.PPT=(await (await annotatePptx()).arrayBuffer()).byteLength>0;

    ZIP=await unzip(window.__xlsx); DOC=await parseXlsx(ZIP); FNAME='x.xlsx';
    $('#plSel').value='2'; $('#plSel').dispatchEvent(new Event('change'));
    sel=new Set(guessBody(DOC.blocks)); SHOTS=[];
    const it2=machineCheck(DOC,bodyText());
    LAST={groups:[{name:'',items:it2,v:verdict(it2),body:bodyText(),doc:DOC}],items:it2,v:verdict(it2),mins:0};
    o.엑셀=(await (await annotateXlsx()).arrayBuffer()).byteLength>0;
    return JSON.stringify(o)})()`));
  check('파워포인트 검수본을 만듦', r3.PPT, true);
  check('엑셀 검수본을 만듦', r3.엑셀, true);

  console.log(`\n${pass}개 통과 · ${fail}개 실패`);
  if (errs.length) console.log('\n브라우저 오류\n  ' + errs.join('\n  '));
  process.exit(fail || errs.length ? 1 : 0);
})();
