/* ═══════════════════════════════════════════════════════════════
   __APPNAME__ — 인플루언서·체험단 원고 검수 도구
   Source-Available Evaluation License · All rights reserved

   가이드 파일과 원고 파일을 그대로 넣으면,
   검수 결과를 원본 파일에 코멘트·셀로 기입해 돌려줍니다.
   워드·파워포인트·엑셀을 읽고, 플랫폼은 사용자가 직접 정의합니다.
   모든 처리는 이 브라우저 안에서 끝납니다. (AI 검수 제외)

   ─────────────────────────────────────────────────────────────
   [변경 이력]

   v1.0.2  2026-09-16  공개 저장소 정리: GitHub Pages/CI, 내부 파일명 정리.
   v1.0.0  2026-07-24  최초 배포.

     특정 캠페인에 매여 있던 검수 도구를 어느 캠페인·어느 업종에서나 쓸 수 있게 다시 만들었습니다.
     설정으로 풀 수 있는 것은 설정으로 빼고, 설정으로 풀 수 없는 것은 도구가 알아서 하도록 했습니다.

     읽고 쓰기
       · 워드 · 파워포인트 · 엑셀을 가이드와 원고 양쪽에서 읽고, 검수 결과를 원본 파일에 기입
       · 라이브러리 없이 브라우저 기능만으로 ZIP과 Office XML을 직접 다룸
       · 검수본을 만들 때 손대지 않은 사진·동영상은 압축된 그대로 옮김 (20MB 원고 0.4초)
       · 한글 문서·PDF는 읽지 못하며, 그 사실을 안내

     검수 기준
       · 플랫폼을 사용자가 직접 정의. 파일 형식과는 아무 관계 없음
       · 미션 프리셋을 플랫폼 × 회차 × 인플루언서 유형 3축으로
       · 표 머리말 사전을 사용자 설정으로. 고지 문구 표기는 기호 종류를 가리지 않고 인식
       · 사전은 비워서 배포. 업종마다 달라서 미리 채우면 오탐만 남

     사람 나누기
       · 표 머리말·이름 표기 여러 형태로 자동 인식
       · 실패하면 검수자가 직접 지정. AI가 구분해 내면 그 기준으로 다시 나눔
       · 나누지 못한 경우 그 사실을 검수 결과와 검수본에 명시

     사진
       · 파일에 실제로 들어 있는 사진을 기준으로 셈. 사진마다 파일 안의 고유 번호를 붙여 관리
       · 사진이 없는 촬영 기획안은 마지막 수단으로 계획 번호를 읽되 그 사실을 밝힘
       · 체크와 메모는 화면이 아니라 데이터에 보관. 다시 그려도 커서 자리까지 유지

     기계와 AI
       · 규칙으로 판정되는 것은 기계가, 판단이 필요한 것은 AI가
       · AI가 기계 결과를 덮어쓰지 않고 합침. 틀린 것만 빼고 나머지는 유지
       · 가이드는 자르지 않고 통째로 전달. 한계를 넘으면 몇 자가 빠졌는지 알림

     설정과 안전장치
       · 캠페인 설정 전체 자동 저장 + 설정 파일 내보내기·불러오기 + 새 캠페인 시작
       · 브라우저 저장 실패와 손상된 설정을 조용히 넘기지 않고 알림
       · API 키를 이 기기에 남기지 않는 선택지 제공
       · 검수 결과에서 잘못 잡힌 지적을 직접 빼고 되살릴 수 있음

     그 밖에
       · 회귀 테스트 45항목 (test/run.js)

   ※ 버전 규칙 — 앞자리: 큰 개편 / 가운데: 기능 추가 / 끝: 오류 수정
   ※ 수정하실 때 이 목록에 한 줄씩 남겨 주세요.
   ─────────────────────────────────────────────────────────────
   [파일 구성]  src/ 폴더에서 나눠 작업하고 build.sh 로 합칩니다.
     head.html      문서 머리말
     body.html      화면 구조
     style.css      디자인
     core.js        공통 도구 · 브라우저 저장소         ← 이 파일
     zip.js         ZIP 압축 해제와 재작성
     parser.js      워드 · PPT · 엑셀 · 가이드 읽기
     rules.js       기본 검수 항목 · 사전 · 검수 엔진
     ai.js          AI 통신과 프롬프트
     settings.js    설정 화면 · 가이드에서 뽑아내기
     review.js      검수 실행 · 검수본 · 이력
     rail.js        설정 색인 스크롤 감지
     footer.html    푸터

   ※ 자바스크립트 여섯 개는 build.sh 가 위 순서대로 이어 붙여 하나의 스크립트가 됩니다.
     파일이 나뉘어 있어도 서로의 함수와 값을 그대로 씁니다.
     순서를 바꾸면 시작할 때 아직 없는 값을 쓰게 되므로 바꾸지 마십시오.
   ═══════════════════════════════════════════════════════════════ */

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let storeWarned=false;
const mem={};
/* 브라우저에 저장할 때 쓰는 이름은 모두 v4_ 로 시작합니다.
   이전 판에서 쓰던 v3_ 값은 기준이 크게 달라져 그대로 쓸 수 없으므로 버립니다.
   나중에 저장 구조가 또 바뀌면 v5_ 로 한꺼번에 올리면 됩니다. 섞어 쓰면 어느 게 최신인지 알 수 없게 됩니다. */
const S={get(k){try{const v=localStorage.getItem(k);return v===null?(k in mem?mem[k]:null):v}catch(e){return k in mem?mem[k]:null}},
         set(k,v){mem[k]=v;
           try{localStorage.setItem(k,v);storeWarned=false}
           catch(e){
             /* 브라우저 저장 공간이 꽉 차면 조용히 실패한다.
                그대로 두면 「저장한 줄 알았는데 다음 날 옛날 값으로 돌아가 있는」 상황이 된다.
                한 번은 반드시 알린다. */
             if(!storeWarned){storeWarned=true;
               setTimeout(()=>alert('설정을 이 브라우저에 저장하지 못했습니다.\n\n'
                 +'저장 공간이 꽉 찼거나 브라우저가 저장을 막고 있습니다.\n'
                 +'창을 닫으면 지금 설정이 사라질 수 있으니, 설정 탭에서 「설정 파일로 저장」을 눌러 두세요.'),0)}
           }}};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
/* Office 파일은 한글을 &#50476; 같은 숫자 참조로 저장하기도 한다.
   이걸 안 풀면 표 머리말을 못 읽어 열 역할 판정이 통째로 실패한다. */
const dec=s=>String(s)
  .replace(/&#x([0-9a-fA-F]+);/g,(m,h)=>String.fromCodePoint(parseInt(h,16)))
  .replace(/&#(\d+);/g,(m,d)=>String.fromCodePoint(+d))
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const TD=new TextDecoder('utf-8'),TE=new TextEncoder();
const lines=s=>(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
const commas=s=>(s||'').split(',').map(x=>x.trim()).filter(Boolean);
const tagsOf=s=>[...new Set((s||'').match(/#[^\s#,\n]+/g)||[])];
const HAN=/[가-힣]/,LAT=/[A-Za-z]/;
/* 가이드는 통째로 넘겨야 한다. 예전에는 말없이 잘라서, 뒷부분에만 있는 내용을
   AI가 「가이드에 없다」고 판단하는 일이 생겼다. 지금 모델들은 이 정도는 충분히 받는다.
   그래도 한계는 있으므로 넘치면 화면에 몇 자가 빠졌는지 알려 준다. */
const GUIDEMAX=200000, REFMAX=20000;
function guideForAI(){
  const t=guideText||'';
  return t.length<=GUIDEMAX?t
    :t.slice(0,GUIDEMAX)+`\n\n[여기서 잘렸습니다 — 가이드 전체 ${t.length.toLocaleString()}자 중 ${GUIDEMAX.toLocaleString()}자만 전달됩니다]`;
}
const reEsc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/* 고지 문구를 원고에 적는 모양 — 사용자가 설정에서 고른다.
   아무 기호도 안 쓰는 회사가 많아서 '쓰지 않음'이면 null 을 돌려주고,
   기호에 기대던 검사는 다른 방법으로 우회하거나 건너뛴다. */
/* 고지 문구 표기는 회사마다, 같은 회사 안에서도 사람마다 다르다.
   예전에는 사용자가 기호를 하나 정하게 했는데, 정한 것과 다르게 쓰면 못 찾고
   「안 쓴다」고 하면 아예 못 찾았다. 설정으로 풀 문제가 아니라서
   흔히 쓰는 괄호와 기호를 전부 보는 방식으로 바꿨다.
   기능명 표기가 아예 없어도 핵심 검사(기능을 언급하면 문구가 따라오는가)는
   등록해 두신 사전으로 판정하므로 그대로 동작한다. */
const BRACKETS=[['[',']'],['(',')'],['「','」'],['『','』'],['【','】'],['〔','〕'],['〈','〉'],['<','>']];
const MARKRE=/^\s*[*※•·‧▪∙◦＊◆▶□■+\-–—]\s*\S/;
/* 고지 문구에 흔히 들어가는 말투 — 기호 없이 문장으로만 적는 경우를 잡는다 */
const NOTICERE=/개인차|개인의|다를 수 있|상이할|차이가 있을|기준입니다|조건에 따라|따라 다|보장하지|해당하지|아닐 수|의미하지|참고용|자사 (?:시험|기준)|시험 조건/;
const isMarkLine=l=>MARKRE.test(l);
function headName(l){                       // 「[기능명]」 형태를 괄호 종류 상관없이 읽는다
  const s2=String(l).trim();
  for(const[o,c]of BRACKETS){
    if(s2.length>=4&&s2.length<=32&&s2.startsWith(o)&&s2.endsWith(c)){
      const n=s2.slice(o.length,s2.length-c.length).trim();
      if(n&&n.length>=2&&!/[.。!?]$/.test(n))return n;
    }
  }
  return null;
}

function findTerm(text,term){
  if(!term)return -1;let i=-1;
  while((i=text.indexOf(term,i+1))>=0){
    const prev=i>0?text[i-1]:'';
    if(!prev)return i;
    if(HAN.test(term[0])&&HAN.test(prev))continue;
    if(LAT.test(term[0])&&LAT.test(prev))continue;
    return i;
  }return -1;
}
const hasTerm=(t,x)=>findTerm(t,x)>=0;
const stripTags=t=>t.replace(/#[^\s#]+/g,' ');
const norm=t=>t.replace(/\s+/g,'');
