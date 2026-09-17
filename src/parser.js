/* ══════════════════════════════════════════════════════
   parser.js  —  워드 · 파워포인트 · 엑셀 · 가이드 파일 읽기
   ※ src/ 의 자바스크립트 파일들은 build.sh 가 순서대로 이어 붙여
      하나의 스크립트가 됩니다. 파일이 나뉘어 있어도 서로의
      함수와 값을 그대로 씁니다. 순서는 바꾸지 마십시오.
   ══════════════════════════════════════════════════════ */

/* ══════ 문서 파싱 ══════ */
/* Office 문서의 태그는 상황에 따라 속성이 붙습니다.
   예를 들어 파워포인트는 배경으로 채운 도형을 <p:sp useBgFill="1"> 로 적습니다.
   <p:sp> 처럼 꺾쇠까지 딱 맞춰 찾으면 이런 도형을 통째로 놓칩니다.
   그래서 여는 태그는 항상 <태그[ >] 형태로 찾아 속성이 있든 없든 걸리게 합니다. */
async function parseDocx(z){
  const xml=await readEntry(z,'word/document.xml');
  const paras=xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[];
  const lines=[];let imgs=0;const imgParas=[];
  paras.forEach((p,pi)=>{
    const t=dec((p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join(''));
    /* 한 문단에 그림이 둘 이상 들어가는 일이 흔하다.
       예전에는 문단 하나를 그림 하나로 세서, 그 뒤부터 이미지 번호와 문단이 통째로 밀렸다. */
    const nImg=(p.match(/<a:blip\b|<w:pict\b/g)||[]).length||(/<w:drawing/.test(p)?1:0);
    for(let k=0;k<nImg;k++){imgs++;imgParas.push(pi)}
    if(t.trim())lines.push(t);
  });
  const media=Object.keys(z).filter(k=>/^word\/media\//.test(k));
  const vids=media.filter(k=>/\.(mp4|mov|avi|wmv|gif)$/i.test(k)).length;
  const text=lines.join('\n');
  return{type:'docx',blocks:[{id:0,kind:'본문 전체',text,meta:`문단 ${lines.length}개`}],
    /* 세어 낸 그림 수를 그대로 쓴다. media 폴더 쪽이 더 크더라도(머리말·꼬리말 그림 등)
       문단 색인과 어긋나므로 기준으로 삼지 않는다 */
    images:imgs||Math.max(0,media.length-vids),videos:vids,raw:text,imgParas};
}
function shapeText(chunk){
  const ps=chunk.match(/<a:p[ >][\s\S]*?<\/a:p>|<a:p\/>/g)||[];
  /* <a:t> 에도 xml:space 같은 속성이 붙는 경우가 있어 여는 태그를 통째로 걷어낸다 */
  return dec((ps.length?ps:[chunk]).map(p=>(p.match(/<a:t[ >][\s\S]*?<\/a:t>/g)||[])
    .map(x=>x.replace(/^<a:t[^>]*>/,'').replace(/<\/a:t>$/,'')).join('')).join('\n'))
    .replace(/\n{3,}/g,'\n\n').trim();
}
/* 표 머리말 사전 — 어느 열이 무슨 내용인지 알아내는 단어들.
   회사마다 부르는 이름이 달라서 설정에서 직접 정하게 했다. */
const HDRDEF={
  mention:'멘션, 캡션, 본문 내용, 원고 내용, 대본, 나레이션',
  sub:'역자막, 유의 문구, 필수 고지 문구, 고지 문구, 자막',
  review:'수정 요청, 피드백, 검수 내용',
  idx:'이미지 순서, 이미지, 씬, 컷, 화면 구성',
  person:'인플루언서, 크리에이터, 계정, 작성자, 담당자, 채널명',
};
/* 사람 표시 — 회사마다 쓰는 방식이 달라 여러 형태를 본다
   「계정명님」 · 「@핸들」 · 「[1] 이름」 · 「1. 이름」 · 「크리에이터: 이름」 */
const WHORE=[/^([^\s\/\n]{2,32})\s*님$/, /^@([A-Za-z0-9._\-]{2,32})$/,
  /^\[\s*\d{1,2}\s*\]\s*([^\s\/\n]{2,32})$/, /^\d{1,2}\s*[.)]\s*([^\s\/\n]{2,32})$/,
  /^(?:크리에이터|인플루언서|작성자|계정)\s*[:：]\s*([^\s\/\n]{2,32})$/];
function whoOf(t){
  const h=String(t||'').trim().split('\n')[0].trim();
  for(const re of WHORE){const m=h.match(re);if(m)return m[1]}
  return null;
}
const HDRFIX=[[/필수\s*해시\s*태그|해시태그/,'tag'],[/제목|타이틀/,'title'],[/지원\s*문구|광고\s*고지/,'ad']];
function hdrWords(k){
  const el=$('#hdr'+k[0].toUpperCase()+k.slice(1));
  return commas((el&&el.value)||HDRDEF[k]).map(x=>x.replace(/\s/g,'')).filter(Boolean);
}
function roleOf(t){
  const x=t.replace(/\s/g,'');
  for(const k of ['mention','sub','review','idx','person'])
    for(const w of hdrWords(k))if(w&&x.includes(w))return k;
  for(const[re,r]of HDRFIX)if(re.test(x))return r;
  return null;
}

async function parsePptx(z){
  const names=Object.keys(z).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
  const blocks=[];let images=0,videos=0,id=0;
  const order=[],pmap={},slidePerson={},slidePics={},slideRids={};let cur=null,hitRole=false;
  for(const n of names){
    const sn=+n.match(/\d+/)[0],xml=await readEntry(z,n);
    /* 사진마다 파일 안의 고유 번호(rId)를 함께 들고 있는다.
       순번만 쓰면 슬라이드 중간에 사진 하나만 끼워 넣어도 뒤쪽 번호가 전부 밀려서,
       적어 둔 검수 메모가 엉뚱한 사진에 붙는다. */
    const picTags=xml.match(/<p:pic[ >][\s\S]*?<\/p:pic>/g)||[];
    const pics=picTags.length;
    slideRids[n]=picTags.map((t,i)=>(t.match(/r:embed="([^"]+)"/)||t.match(/r:link="([^"]+)"/)||[,''])[1]||('n'+i));
    const vids=(xml.match(/<a:videoFile|<p:videoFile/g)||[]).length;
    images+=pics;videos+=vids;slidePics[n]=pics;

    const shapes=(xml.match(/<p:sp[ >][\s\S]*?<\/p:sp>/g)||[]).filter(sp=>!/<a:tbl/.test(sp)).map(shapeText).filter(t=>t.length>0);
    let who=null;
    shapes.forEach(t=>{if(!who)who=whoOf(t)});
    if(!who&&shapes.length===1){
      const head=shapes[0].split('\n')[0].trim();
      if(/^[A-Za-z0-9._\-]{3,32}$/.test(head)&&shapes[0].split('\n').length>=2)who=head;
    }
    if(who){cur=who;if(!order.includes(who))order.push(who)}
    slidePerson[n]=cur;

    const push=(text,role,kind)=>{
      if(text.length<2)return;
      blocks.push({id:id++,kind,text,meta:`${text.length}자`,role,person:cur,slide:n,
        skip:role==='review'||role==='idx'||role==='hdr'});
    };
    /* 표 — 셀을 읽는 순서대로 훑으며 머리말이 나오면 그 뒤 셀에 역할을 물려준다 */
    const KO={mention:'본문',sub:'고지 문구',review:'검수란',idx:'이미지 순서',tag:'해시태그',title:'제목',ad:'광고 고지'};
    (xml.match(/<a:tbl[ >][\s\S]*?<\/a:tbl>/g)||[]).forEach(tb=>{
      const colRole=[];
      (tb.match(/<a:tr[ >][\s\S]*?<\/a:tr>/g)||[]).forEach(tr=>{
        const cells=(tr.match(/<a:tc[ >][\s\S]*?<\/a:tc>/g)||[]).map(shapeText);
        const hdr=cells.map(t=>t&&t.length<=16?roleOf(t):null);
        const nHdr=hdr.filter(Boolean).length,nCell=cells.filter(t=>t&&t.length>0).length;
        if(nHdr)hitRole=true;
        if(nHdr&&nHdr===nCell){                        // 머리말만 있는 행 → 열마다 역할을 기억
          hdr.forEach((r,ix)=>{if(r)colRole[ix]=r});
          if(nHdr===1){const only=hdr.find(Boolean);for(let k=0;k<10;k++)if(!colRole[k])colRole[k]=only}
          cells.forEach(t=>{if(t)push(t,'hdr',`슬라이드 ${sn} · 머리말`)});
          return;
        }
        const rowRole=nHdr?hdr.find(Boolean):null;      // 머리말 + 내용이 한 행에 섞인 경우
        cells.forEach((t,ix)=>{
          if(!t)return;
          if(hdr[ix]){push(t,'hdr',`슬라이드 ${sn} · 머리말`);return}
          const role=rowRole||colRole[ix]||'etc';
          push(t,role,`슬라이드 ${sn} · ${KO[role]||'표'}`);
        });
      });
    });
    shapes.forEach(t=>push(t,'etc',`슬라이드 ${sn} · 텍스트`));
    if(cur){pmap[cur]=pmap[cur]||{name:cur,images:0,videos:0};pmap[cur].images+=pics;pmap[cur].videos+=vids}
  }
  const media=Object.keys(z).filter(k=>/^ppt\/media\//.test(k));
  if(!videos)videos=media.filter(k=>/\.(mp4|mov|avi|wmv)$/i.test(k)).length;
  const people=order.map(o=>pmap[o]).filter(Boolean);
  people.forEach(pp=>pp.blocks=blocks.filter(b=>b.person===pp.name));
  const rawOf=bs=>bs.filter(b=>b.role!=='review'&&b.role!=='idx'&&b.role!=='hdr').map(b=>b.text).join('\n');
  people.forEach(pp=>pp.raw=rawOf(pp.blocks));
  return{type:'pptx',blocks,images,videos,raw:rawOf(blocks),people,slidePerson,slidePics,slideRids,roleFound:hitRole};
}

/* ══ 엑셀 ══
   docx·pptx 와 같은 ZIP + XML 구조라 앞의 ZIP 코드를 그대로 쓴다.
   엑셀은 셀이 곧 표라서 「어느 열이 무슨 내용인지」 판정이 오히려 가장 정확하다.
   다만 쓰기는 다르다. 셀 코멘트는 그리기 객체(vml)까지 손대야 해서 파일이 깨지기 쉽다.
   그래서 「검수 의견」 열을 오른쪽에 덧붙이고, 요약은 새 시트로 넣는다. */
const colIdx=ref=>{const m=String(ref).match(/^([A-Z]+)/);if(!m)return 0;
  let n=0;for(const ch of m[1])n=n*26+(ch.charCodeAt(0)-64);return n-1};
const colRef=i=>{let s='',n=i+1;while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s};
const xesc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

async function xlsxStrings(z){
  const xml=await readEntry(z,'xl/sharedStrings.xml');if(!xml)return[];
  return(xml.match(/<si>[\s\S]*?<\/si>/g)||[]).map(si=>
    dec((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join('')));
}
async function xlsxSheets(z){
  const wb=await readEntry(z,'xl/workbook.xml'),rels=await readEntry(z,'xl/_rels/workbook.xml.rels')||'';
  const rmap={};
  (rels.match(/<Relationship[^>]*>/g)||[]).forEach(r=>{
    const id=(r.match(/Id="([^"]+)"/)||[])[1],tg=(r.match(/Target="([^"]+)"/)||[])[1];
    if(id&&tg)rmap[id]=tg.replace(/^\/?xl\//,'').replace(/^\.\//,'');
  });
  const out=[];
  (wb?(wb.match(/<sheet [^>]*\/?>/g)||[]):[]).forEach(s=>{
    const nm=dec((s.match(/name="([^"]*)"/)||[,''])[1]),rid=(s.match(/r:id="([^"]+)"/)||[])[1];
    out.push({name:nm||('시트'+(out.length+1)),path:'xl/'+(rmap[rid]||`worksheets/sheet${out.length+1}.xml`)});
  });
  if(!out.length)Object.keys(z).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]))
    .forEach((k,i)=>out.push({name:'시트'+(i+1),path:k}));
  return out;
}
async function xlsxGrid(z,path,sst){
  const xml=await readEntry(z,path);if(!xml)return[];
  return(xml.match(/<row[ >][\s\S]*?<\/row>|<row[^>]*\/>/g)||[]).map(r=>{
    const tmp={};let last=-1;
    (r.match(/<c[ >][\s\S]*?<\/c>|<c[^>]*\/>/g)||[]).forEach(c=>{
      const ref=(c.match(/r="([A-Z]+\d+)"/)||[])[1],t=(c.match(/\st="([^"]+)"/)||[])[1]||'n';
      let v='';
      if(t==='inlineStr'){const is=(c.match(/<is>([\s\S]*?)<\/is>/)||[,''])[1];
        v=dec((is.match(/<t[^>]*>([\s\S]*?)<\/t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join(''));}
      else{const raw=(c.match(/<v>([\s\S]*?)<\/v>/)||[,''])[1];v=t==='s'?(sst[+raw]||''):dec(raw)}
      /* 중간이 비는 배열을 만들면 자바스크립트 엔진이 느린 방식으로 바꿔 버린다.
         일단 자리 번호로 모아 두었다가, 행이 끝나면 빈칸 없는 배열로 한 번에 만든다. */
      const at=ref?colIdx(ref):Object.keys(tmp).length;
      tmp[at]=v.trim();if(at>last)last=at;
    });
    const cells=new Array(last+1);
    for(let i=0;i<=last;i++)cells[i]=tmp[i]!==undefined?tmp[i]:'';
    return cells;
  });
}
async function parseXlsx(z){
  const sst=await xlsxStrings(z),sheets=await xlsxSheets(z);
  const blocks=[];let id=0,hitRole=false;
  const order=[],pmap={},cellMap=[];let cur=null;
  const KO={mention:'본문',sub:'고지 문구',review:'검수란',idx:'이미지 순서',
            tag:'해시태그',title:'제목',ad:'광고 고지',person:'작성자'};
  for(const sh of sheets){
    const grid=await xlsxGrid(z,sh.path,sst);
    const colRole=[];let widest=0;
    grid.forEach((row,ri)=>{
      const hdr=row.map(t=>t&&t.length<=20?roleOf(t):null);
      const nHdr=hdr.filter(Boolean).length,nCell=row.filter(t=>t).length;
      widest=Math.max(widest,row.length);
      if(nHdr)hitRole=true;
      if(nHdr&&nHdr>=Math.max(1,Math.ceil(nCell*0.6))){        // 머리말 행 → 열 역할을 기억
        hdr.forEach((r,ix)=>{if(r)colRole[ix]=r});
        return;
      }
      /* 이 행에 작성자 열이 있으면 그 값이 이후 행의 주인이 된다 */
      const pi=colRole.findIndex(r=>r==='person');
      if(pi>=0&&row[pi]){cur=row[pi].trim();if(!order.includes(cur))order.push(cur)}
      else{for(const t of row){const w=whoOf(t);if(w){cur=w;if(!order.includes(w))order.push(w);break}}}
      row.forEach((t,ix)=>{
        if(!t||t.length<2)return;
        const role=colRole[ix]||'etc';
        blocks.push({id:id++,kind:`${sh.name} · ${KO[role]||'셀'}`,text:t,meta:`${t.length}자`,
          role,person:cur,sheet:sh.path,row:ri,col:ix,
          skip:role==='review'||role==='idx'||role==='hdr'||role==='person'});
      });
    });
    cellMap.push({sheet:sh.path,name:sh.name,cols:widest,rows:grid.length,
      reviewCol:colRole.findIndex(r=>r==='review')});
  }
  const media=Object.keys(z).filter(k=>/^xl\/media\//.test(k));
  const videos=media.filter(k=>/\.(mp4|mov|avi|wmv)$/i.test(k)).length;
  order.forEach(o=>pmap[o]={name:o,images:0,videos:0});
  const people=order.map(o=>pmap[o]).filter(Boolean);
  people.forEach(pp=>pp.blocks=blocks.filter(b=>b.person===pp.name));
  const rawOf=bs=>bs.filter(b=>!b.skip&&b.role!=='hdr').map(b=>b.text).join('\n');
  people.forEach(pp=>pp.raw=rawOf(pp.blocks));
  return{type:'xlsx',blocks,images:Math.max(0,media.length-videos),videos,
    raw:rawOf(blocks),people,roleFound:hitRole,sheets:cellMap};
}

/* 검수본 — 「검수 의견」 열을 오른쪽에 붙이고 요약 시트를 하나 더 넣는다.
   문자열은 inlineStr 로 쓴다. sharedStrings 를 건드리지 않아 원본이 깨질 위험이 없다. */
async function annotateXlsx(){
  const files=[];
  const summary=summaryLines(null,null,'');
  for(const name of Object.keys(ZIP)){
    if(name==='[Content_Types].xml'||name==='xl/workbook.xml'||name==='xl/_rels/workbook.xml.rels'){continue}
    files.push({name,copy:ZIP[name]});
  }
  /* 시트마다 검수 의견 열 추가 */
  for(const sh of (DOC.sheets||[])){
    const ix=files.findIndex(f=>f.name===sh.sheet);if(ix<0)continue;
    /* 여기는 우리가 고칠 시트이므로 압축을 풀어 읽는다. 나머지 파일은 그대로 옮겨진다 */
    let xml=await readEntry(ZIP,sh.sheet);if(!xml)continue;
    const grp=LAST.groups;
    const rowNote={};
    grp.forEach(g=>{
      const lines2=summaryLines(g.items,g.v,g.name);
      const b=(g.doc===DOC?DOC.blocks:g.doc.blocks).find(x=>x.sheet===sh.sheet);
      if(b)rowNote[b.row]=lines2.join('\n');
    });
    const cno=sh.cols||1;
    xml=xml.replace(/<row([^>]*)r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g,(m,a,rn,b2,inner)=>{
      const note=rowNote[+rn-1];if(!note)return m;
      const ref=colRef(cno)+rn;
      return `<row${a}r="${rn}"${b2}>${inner}<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xesc(note)}</t></is></c></row>`;
    });
    files[ix]={name:sh.sheet,data:TE.encode(xml)};
  }
  /* 요약 시트 추가 */
  const newPath='xl/worksheets/review_summary.xml';
  const rows=summary.map((t,i)=>
    `<row r="${i+1}"><c r="A${i+1}" t="inlineStr"><is><t xml:space="preserve">${xesc(t)}</t></is></c></row>`).join('');
  files.push({name:newPath,data:TE.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`+
    `<cols><col min="1" max="1" width="110" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>`)});

  let ct=await readEntry(ZIP,'[Content_Types].xml');
  ct=ct.replace('</Types>',`<Override PartName="/${newPath}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  files.push({name:'[Content_Types].xml',data:TE.encode(ct)});

  let rels=await readEntry(ZIP,'xl/_rels/workbook.xml.rels')
    ||'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const rid='rIdReviewSummary';
  rels=rels.replace('</Relationships>',
    `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/review_summary.xml"/></Relationships>`);
  files.push({name:'xl/_rels/workbook.xml.rels',data:TE.encode(rels)});

  let wb=await readEntry(ZIP,'xl/workbook.xml');
  const ids=(wb.match(/sheetId="(\d+)"/g)||[]).map(x=>+x.match(/\d+/)[0]);
  const nid=(ids.length?Math.max(...ids):0)+1;
  wb=wb.replace('</sheets>',`<sheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`
    +` name="검수 결과" sheetId="${nid}" r:id="${rid}"/></sheets>`);
  files.push({name:'xl/workbook.xml',data:TE.encode(wb)});
  return makeZip(files);
}

function guessBody(blocks){
  const men=blocks.filter(b=>b.role==='mention');
  if(men.length)return men.map(b=>b.id);
  if(blocks.length<=1)return blocks.map(b=>b.id);
  let best=null,bs=-1;
  blocks.forEach(b=>{if(b.skip)return;let s=b.text.length;
    if(/#[^\s#]/.test(b.text))s*=2.2;
    if(/광고|협찬|지원받아/.test(b.text))s*=1.4;
    if(hdrWords('sub').some(w=>w&&b.text.includes(w))||/출처|시험\s*조건/.test(b.text))s*=.25;
    if(s>bs){bs=s;best=b.id}});
  return best===null?[]:[best];
}

/* ══ 가이드 전용 파서 — 표 구조를 살려서 읽는다 ══ */
async function parseGuide(z,type){
  const tables=[],units=[];
  if(type==='xlsx'){
    /* 엑셀은 셀이 곧 표라서 역할 판정이 가장 정확하다. 시트 하나를 슬라이드 하나로 본다 */
    const sst=await xlsxStrings(z);
    for(const sh of await xlsxSheets(z)){
      const grid=await xlsxGrid(z,sh.path,sst);
      const rows=grid.filter(r=>r.some(c=>c));
      if(!rows.length)continue;
      tables.push(rows);
      units.push({texts:[sh.name].concat(rows.flat().filter(Boolean)),tables:[rows]});
    }
    return{tables,units,text:units.flatMap(u=>u.texts).join('\n')};
  }
  if(type==='pptx'){
    const names=Object.keys(z).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k))
      .sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
    for(const n of names){
      const xml=await readEntry(z,n),u={texts:[],tables:[]};
      (xml.match(/<a:tbl[ >][\s\S]*?<\/a:tbl>/g)||[]).forEach(tb=>{
        const rows=(tb.match(/<a:tr[ >][\s\S]*?<\/a:tr>/g)||[])
          .map(tr=>(tr.match(/<a:tc[ >][\s\S]*?<\/a:tc>/g)||[]).map(shapeText));
        if(rows.length){tables.push(rows);u.tables.push(rows)}
      });
      (xml.match(/<p:sp[ >][\s\S]*?<\/p:sp>/g)||[]).forEach(sp=>{
        if(/<a:tbl/.test(sp))return;
        const t=shapeText(sp);if(t.length>1)u.texts.push(t);
      });
      units.push(u);
    }
  }else{
    const xml=await readEntry(z,'word/document.xml');
    (xml.match(/<w:tbl[ >][\s\S]*?<\/w:tbl>/g)||[]).forEach(tb=>{
      const rows=(tb.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g)||[]).map(tr=>
        (tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g)||[]).map(tc=>
          dec((tc.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join('')).trim()));
      if(rows.length)tables.push(rows);
    });
    const paras=(xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[]).map(pp=>
      dec((pp.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join('')).trim()).filter(Boolean);
    units.push({texts:paras,tables});
  }
  const text=units.map(u=>u.texts.join('\n')+'\n'+u.tables.map(t=>t.map(r=>r.join(' :: ')).join('\n')).join('\n')).join('\n');
  return{tables,units,text};
}
