/* ══════════════════════════════════════════════════════
   ai.js  —  AI 통신 · 검수 프롬프트 만들기 · 응답 합치기
   ※ src/ 의 자바스크립트 파일들은 build.sh 가 순서대로 이어 붙여
      하나의 스크립트가 됩니다. 파일이 나뉘어 있어도 서로의
      함수와 값을 그대로 씁니다. 순서는 바꾸지 마십시오.
   ══════════════════════════════════════════════════════ */

/* ══ AI ══ */
function aiTaskList(){return BASE.filter(b=>b.who==='AI'&&base[b.k])}
function properList(){
  const set=new Set();
  products.forEach(p=>{if((p.canon||'').trim())set.add(p.canon.trim())});
  funcs.forEach(f=>{if((f.a||'').trim())set.add(f.a.trim())});
  lines($('#properNames').value).forEach(x=>set.add(x));
  return [...set];
}
function buildPrompt(doc){
  const tasks=aiTaskList().map(t=>t.k);
  const multi=!!(LAST&&LAST.groups&&LAST.groups.length>1);
  const mech=(LAST?LAST.items:[]).filter(i=>i.status!=='pass');
  const ref=$('#refText').value.trim(),proper=properList();
  const P=[];
  P.push('당신은 인플루언서·체험단 원고를 검수하는 실무자입니다. 아래 원고를 검수하고 JSON으로만 답하십시오.');
  P.push(`\n[캠페인] ${$('#cName').value||'(미입력)'}`);
  P.push(`[타깃] ${$('#mTarget').value||'특별한 제한 없음'}`);
  if($('#mTopic').value.trim())P.push(`\n[이번 회차 주제]\n${$('#mTopic').value}`);
  P.push(`\n[플랫폼] ${(CURPLAT&&CURPLAT.name)||'(미지정)'}`);
  if($('#mType')&&$('#mType').value.trim())P.push(`[인플루언서 유형] ${$('#mType').value.trim()}`);
  if($('#mNote').value.trim())P.push(`\n[이번 회차 추가 요청]\n${$('#mNote').value}`);
  P.push(`\n[필수 키워드] ${$('#mKeys').value||'없음'}`);
  if(proper.length)P.push(`\n[브랜드 정식 명칭 — 아래 표기는 그대로가 맞습니다. 띄어쓰기나 맞춤법 오류로 지적하지 마십시오]\n${proper.join(' / ')}`);
  if(ref)P.push(`\n[사실 확인용 참고 자료 — 이 범위 안의 내용은 정확한 것으로 간주하십시오]\n${ref.slice(0,REFMAX)}`);
  if(guideText)P.push(`\n[가이드 원문]\n${guideForAI()}`);
  P.push('\n[검수 항목]');
  if(tasks.includes('spell'))P.push(`- 오탈자·맞춤법: 가장 중요한 항목입니다. 원고를 한 문장씩 훑으며 다음을 모두 찾으십시오.
  · 띄어쓰기 (의존명사 '것/걸/수/때', 보조용언, 단위명사)
  · 조사·어미 오류, 시제 불일치
  · 외래어 표기법
  · 맞춤법 (되/돼, 안/않, 든지/던지, 로서/로써)
  발견한 것은 빠짐없이 각각 별도 항목으로 보고하고, fix에 반드시 고친 문장을 넣으십시오.
  단, 위 [브랜드 정식 명칭]에 있는 표기는 건드리지 마십시오.`);
  if(tasks.includes('risk'))P.push(`- 법무·사회적 리스크: 실제로 광고 심의나 소비자 항의로 이어질 수준만 지적하십시오.
  해당됨: 타 브랜드·타 제품과의 직간접 비교, 효능 단정, 검증 안 된 수치, 특정 집단 비하
  해당 안 됨: 개인의 생활 경험 서술, 일상적인 상황 묘사, 본인 주변 이야기, 주관적 감상
  애매하면 지적하지 마십시오.`);
  if(tasks.includes('topic')&&$('#mTopic').value.trim())P.push(`- 회차 주제 부합: 주제에서 명백히 벗어났을 때만 지적하십시오.
  타깃 설명을 좁게 해석하지 마십시오. 예시나 곁가지 문장 하나를 문제 삼지 마십시오.
  주제와 무관하지는 않으나 깊이가 얕은 정도라면 tier 3으로 하십시오.`);
  if(tasks.includes('fact'))P.push(`- 기능 설명 오류: 기능명을 잘못 붙였거나, 조건·제약을 빠뜨려 오해를 부를 설명을 찾으십시오.
  참고 자료나 가이드에 근거가 있는 내용은 지적하지 마십시오.`);
  if(tasks.includes('subAcc')&&hasNotice())P.push(`- 고지 문구 정확성: 원고에 들어간 필수 고지 문구가 해당 기능을 정확히 설명하는지, 조건이 빠지지 않았는지 보십시오.
  가이드의 문구와 다르게 적혔다면 지적하십시오.`);
  if(tasks.includes('adForm'))P.push(`- 광고 고지 표기 방식: 이 콘텐츠는 「${(CURPLAT&&CURPLAT.name)||'해당 플랫폼'}」에 올라갑니다.
  광고·협찬 고지가 그 플랫폼의 관행과 규정에 맞는 방식으로 표기되었는지 보십시오.
  해시태그로 쓸지 문장으로 쓸지, 어디에 배치할지는 플랫폼마다 다릅니다. 고지 문구가 아예 없거나,
  더보기에 가려질 위치에 있거나, 그 플랫폼에서 인정되지 않는 방식이라면 지적하십시오.
  고지 내용 자체가 상단에 있는지는 기계가 이미 확인했으니 다시 지적하지 마십시오.`);
  if(tasks.includes('voice'))P.push(`- 말투 · 메이커보이스 (tier 3, 권고): 체험단 원고는 실제 사용자의 후기여야 합니다.
  각 문단에 대해 판단하십시오. 이 문장을 브랜드 공식 계정이 그대로 올려도 어색하지 않다면 메이커보이스입니다.
  ★ 고칠 때는 반드시 그 작성자가 원래 쓰던 말투를 그대로 두십시오. 이것이 가장 중요합니다.
    · 먼저 그 사람이 서술체(~다), 해요체(~해요), 반말(~함/~음), 구어체 중 무엇으로 쓰는지 보고 그 어미를 유지하십시오.
    · 그 사람이 안 쓰던 감탄사(~네요, ~있죠, ~더라고요), 물결표(~), 이모지, 과장된 추임새를 새로 넣지 마십시오.
    · 예: 원문이 「세척력이 참 깔끔하다」이면 → 「직접 써 보니 세척력이 깔끔하더라」처럼 서술체를 지키고,
      「깔끔한 거 있죠~?」처럼 원작자가 안 쓰던 블로거 말투로 바꾸지 마십시오.
    · 목표는 광고 티만 걷어내는 것이지, 글쓴이를 다른 사람으로 바꾸는 것이 아닙니다. 최소한만 고치십시오.
  반대로 그 사람이 실제로 겪지 않으면 쓸 수 없는 내용 — 구체적인 상황, 시점, 사소한 불만, 예상과 달랐던 점 — 이 들어 있다면 지적하지 마십시오.
  제품이 문장의 주인공이고 사람이 배경으로 밀려난 곳을 찾으십시오.
  확신이 서는 것만 지적하십시오. ${multi?'사람당':'원고당'} 최대 10건까지 보고하십시오.
  fix에는 같은 내용을 사용자 화법으로 옮긴 문장을 넣으십시오.`);
  P.push(`\n[기계 검수가 이미 잡은 것]\n${mech.length?mech.map(i=>`- ${i.label}: ${i.detail}`).join('\n'):'없음'}`);
  P.push('위 항목은 다시 지적하지 마십시오. 다만 그중 맥락상 명백한 오탐이 있다면 dismiss 배열에 그 label을 그대로 넣어 주십시오.');
  P.push(`\n[티어]\n1 = 게재 불가 (타 브랜드 노출, 제품명 중대 오류)\n2 = 수정 필요 (맞춤법, 명백한 주제 이탈, 리스크 표현, 기능 설명 오류, 고지 누락)\n3 = 권고`);
  P.push(`\n[출력 — 다른 말 없이 이 JSON 하나만]
{"people":["원고에 나오는 모든 작성자"],"issues":[{"person":"","tier":2,"label":"항목명","status":"fail","detail":"무엇이 왜 문제인지","quote":"원고 원문 그대로 20자 이내","fix":"고친 문장"}],"dismiss":["오탐인 기계 항목 label"]}
- people: 원고에 나오는 작성자를 문제가 없는 사람까지 빠짐없이 적습니다. 7명분이면 7명 모두입니다.
  문제 있는 사람만 적으면 나머지가 검수 결과에서 사라집니다. 한 명분이면 빈 배열로 둡니다.
- person: 원고가 여러 명분이면 그 사람의 이름을 정확히 적습니다. 한 명분이면 빈 문자열로 둡니다.
- status는 fail 또는 warn만 씁니다.
- quote는 반드시 원고에 그대로 있는 문자열이어야 합니다.
- fix는 가능한 항목 모두에 채웁니다. 삭제가 답이면 "해당 문장 삭제"라고 씁니다.
- 문제가 없으면 {"issues":[],"dismiss":[]}`);
  if(multi){
    P.push(`\n[원고 — ${LAST.groups.length}명분입니다. 사람마다 따로 검수하고, 각 지적에 person 값을 반드시 넣으십시오]`);
    LAST.groups.forEach(g=>P.push(`\n===== ${g.name} =====\n${g.doc.raw}`));
  }else P.push(`\n[원고]\n${doc.raw}`);
  return P.join('\n');
}
async function callAI(prompt){
  const p=PROV[aiCfg.prov],model=aiCfg.model||p.model;
  let url=aiCfg.url||p.url;
  if(aiCfg.prov==='gemini')url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(aiCfg.key)}`;
  const r=await fetch(url,{method:'POST',headers:p.h(aiCfg.key),body:JSON.stringify(p.b(model,prompt))});
  if(!r.ok)throw new Error(`${r.status} — ${(await r.text()).slice(0,180)}`);
  return p.pick(await r.json());
}
function parseAI(txt){
  const c=String(txt).replace(/```json|```/g,'').trim();
  let obj=null;
  const o=c.indexOf('{'),oe=c.lastIndexOf('}'),a=c.indexOf('['),ae=c.lastIndexOf(']');
  if(o>=0&&oe>o){try{obj=JSON.parse(c.slice(o,oe+1))}catch(e){}}
  if(!obj&&a>=0&&ae>a){try{obj={issues:JSON.parse(c.slice(a,ae+1)),dismiss:[]}}catch(e){}}
  if(!obj)throw new Error('JSON을 찾지 못했습니다');
  const issues=(obj.issues||[]).map(x=>{
    const o=it(+x.tier||2,String(x.label||'AI 지적'),x.status==='warn'?'warn':'fail',
      (x.detail||'')+(x.quote?` 「${x.quote}」`:''),'AI',x.fix||'');
    o.person=(x.person||'').trim();return o;
  });
  return{issues,dismiss:obj.dismiss||[],people:obj.people||[]};
}
