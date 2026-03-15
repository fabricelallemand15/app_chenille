import { useState, useEffect, useRef } from "react";

const DEFAULT_PYRAMID = [[3],[7,4],[2,4,6],[9,5,9,3]];
function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

// ── Steps builders ────────────────────────────────────────────────────────────
function buildNaiveSteps(P) {
  const n=P.length, steps=[];
  function rec(i,j) {
    steps.push({type:"call",i,j});
    if(i===n-1){steps.push({type:"return",i,j,val:P[i][j]});return P[i][j];}
    const l=rec(i+1,j), r=rec(i+1,j+1);
    const val=P[i][j]+Math.max(l,r);
    steps.push({type:"return",i,j,val});
    return val;
  }
  rec(0,0);
  return steps;
}

function buildBottomUpSteps(P) {
  const n=P.length, steps=[];
  const C=P.map(r=>r.map(()=>null));
  for(let j=0;j<n;j++){
    C[n-1][j]=P[n-1][j];
    steps.push({phase:"base",i:n-1,j,C:deepCopy(C),desc:`Cas de base : C[${n-1}][${j}] = ${P[n-1][j]}`});
  }
  for(let i=n-2;i>=0;i--){
    for(let j=0;j<=i;j++){
      const l=C[i+1][j],r=C[i+1][j+1];
      C[i][j]=P[i][j]+Math.max(l,r);
      steps.push({phase:"fill",i,j,C:deepCopy(C),leftChild:{i:i+1,j},rightChild:{i:i+1,j:j+1},
        desc:`C[${i}][${j}] = ${P[i][j]} + max(${l}, ${r}) = ${C[i][j]}`});
    }
  }
  // backtracking steps
  steps.push({phase:"bt_intro",C:deepCopy(C),desc:"✅ Tableau C complet. Valeur optimale : C[0][0] = "+C[0][0]+". On remonte le chemin par backtracking."});
  const path=[];let jj=0;
  for(let i=0;i<n-1;i++){
    path.push({i,j:jj});
    const goRight=C[i+1][jj+1]>C[i+1][jj];
    const chosen=goRight?{i:i+1,j:jj+1}:{i:i+1,j:jj};
    const other=goRight?{i:i+1,j:jj}:{i:i+1,j:jj+1};
    steps.push({phase:"bt_step",C:deepCopy(C),path:[...path],cur:{i,j:jj},chosen,other,
      desc:`(${i},${jj}) : C[${chosen.i}][${chosen.j}]=${C[chosen.i][chosen.j]} ≥ C[${other.i}][${other.j}]=${C[other.i][other.j]} → on va en (${chosen.i},${chosen.j})`});
    jj=chosen.j;
  }
  path.push({i:n-1,j:jj});
  steps.push({phase:"bt_done",C:deepCopy(C),path:[...path],
    desc:`Chemin optimal : ${path.map(p=>`(${p.i},${p.j})→${P[p.i][p.j]}`).join(" → ")} = ${C[0][0]}`});
  return steps;
}

function buildTopDownSteps(P) {
  const n=P.length,steps=[],memo={};
  function rec(i,j){
    const key=`${i},${j}`;
    if(key in memo){steps.push({type:"hit",i,j,val:memo[key],memo:{...memo},desc:`🟢 Mémo hit C[${i}][${j}] = ${memo[key]}`});return memo[key];}
    steps.push({type:"call",i,j,memo:{...memo},desc:`Appel chenille(${i},${j})`});
    let val;
    if(i===n-1){val=P[i][j];}
    else{const l=rec(i+1,j),r=rec(i+1,j+1);val=P[i][j]+Math.max(l,r);}
    memo[key]=val;
    steps.push({type:"store",i,j,val,memo:{...memo},desc:`Stockage C[${i}][${j}] = ${val}`});
    return val;
  }
  rec(0,0);
  // backtracking steps (same logic as bottom-up, using memo)
  steps.push({type:"bt_intro",memo:{...memo},desc:`✅ Mémo complet. Valeur optimale : C[0][0] = ${memo["0,0"]}. On remonte le chemin par backtracking sur le dictionnaire mémo.`});
  const path=[];let jj=0;
  for(let i=0;i<n-1;i++){
    path.push({i,j:jj});
    const vl=memo[`${i+1},${jj}`], vr=memo[`${i+1},${jj+1}`];
    const goRight=vr>vl;
    const chosen=goRight?{i:i+1,j:jj+1}:{i:i+1,j:jj};
    const other=goRight?{i:i+1,j:jj}:{i:i+1,j:jj+1};
    steps.push({type:"bt_step",memo:{...memo},path:[...path],chosen,other,
      desc:`(${i},${jj}) : mémo[${chosen.i},${chosen.j}]=${memo[`${chosen.i},${chosen.j}`]} ≥ mémo[${other.i},${other.j}]=${memo[`${other.i},${other.j}`]} → on va en (${chosen.i},${chosen.j})`});
    jj=chosen.j;
  }
  path.push({i:n-1,j:jj});
  steps.push({type:"bt_done",memo:{...memo},path:[...path],
    desc:`Chemin optimal : ${path.map(p=>`(${p.i},${p.j})→${P[p.i][p.j]}`).join(" → ")} = ${memo["0,0"]}`});
  return steps;
}

// ── Pyramid SVG ───────────────────────────────────────────────────────────────
function PyramidSVG({P,highlights={},optPath=[],cTable=null}) {
  const n=P.length,W=420,cellW=54,cellH=52,totalH=n*cellH+30;
  return (
    <svg width={W} height={totalH} style={{display:"block",margin:"0 auto"}}>
      {P.map((row,i)=>row.map((val,j)=>{
        const cx=W/2+(j-i/2)*cellW, cy=28+i*cellH, key=`${i},${j}`;
        const hl=highlights[key], onOpt=optPath.some(p=>p.i===i&&p.j===j);
        let fill="#f8fafc",stroke="#cbd5e1",sw=1.5,tc="#1e293b";
        if(hl==="active"){fill="#dbeafe";stroke="#3b82f6";sw=2.5;}
        if(hl==="hit"){fill="#dcfce7";stroke="#22c55e";sw=2.5;}
        if(hl==="store"){fill="#fef3c7";stroke="#f59e0b";sw=2.5;}
        if(hl==="base"){fill="#ede9fe";stroke="#7c3aed";sw=2;}
        if(hl==="left"||hl==="right"){fill="#fce7f3";stroke="#ec4899";sw=2;}
        if(hl==="chosen"){fill="#d1fae5";stroke="#10b981";sw=3;}
        if(hl==="other"){fill="#fee2e2";stroke="#ef4444";sw=2;}
        if(onOpt){fill="#7c3aed";stroke="#6d28d9";sw=2.5;tc="white";}
        let lines=null;
        if(i<n-1){
          const cx2l=W/2+(j-(i+1)/2)*cellW,cy2=28+(i+1)*cellH,cx2r=W/2+((j+1)-(i+1)/2)*cellW;
          lines=<><line x1={cx} y1={cy+16} x2={cx2l} y2={cy2-16} stroke="#e2e8f0" strokeWidth="1.5"/><line x1={cx} y1={cy+16} x2={cx2r} y2={cy2-16} stroke="#e2e8f0" strokeWidth="1.5"/></>;
        }
        const cVal=cTable?(cTable[i]&&cTable[i][j]!==null?cTable[i][j]:null):null;
        return (
          <g key={key}>
            {lines}
            <circle cx={cx} cy={cy} r={20} fill={fill} stroke={stroke} strokeWidth={sw}/>
            <text x={cx} y={cy+(cVal!==null?-3:1)} textAnchor="middle" dominantBaseline="middle" fill={tc} fontSize="14" fontWeight="bold">{val}</text>
            {cVal!==null&&<text x={cx} y={cy+11} textAnchor="middle" dominantBaseline="middle" fill="#7c3aed" fontSize="10" fontWeight="bold">{cVal}</text>}
          </g>
        );
      }))}
    </svg>
  );
}

// ── Edit Pyramid ──────────────────────────────────────────────────────────────
function EditPyramid({P,setP}) {
  const [rows,setRows]=useState(P.length);
  const [vals,setVals]=useState(P.map(r=>[...r]));
  const changeRows=n=>{
    n=Math.max(2,Math.min(6,n));setRows(n);
    setVals(v=>{const nv=[];for(let i=0;i<n;i++){const a=Array(i+1).fill(0);a.forEach((_,j)=>a[j]=v[i]?.[j]??Math.floor(Math.random()*9)+1);nv.push(a);}return nv;});
  };
  const changeVal=(i,j,v)=>{const n=parseInt(v);if(isNaN(n))return;setVals(p=>{const c=p.map(r=>[...r]);c[i][j]=Math.max(0,Math.min(99,n));return c;});};
  return (
    <div style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:10,padding:"14px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
        <span style={{color:"#64748b",fontSize:13}}>Niveaux :</span>
        {[2,3,4,5,6].map(n=>(
          <button key={n} onClick={()=>changeRows(n)} style={{padding:"3px 10px",borderRadius:6,border:"none",cursor:"pointer",
            background:rows===n?"#7c3aed":"#e2e8f0",color:rows===n?"white":"#475569",fontWeight:rows===n?"bold":"normal"}}>{n}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,marginBottom:10}}>
        {vals.map((row,i)=>(
          <div key={i} style={{display:"flex",gap:6}}>
            {row.map((v,j)=>(
              <input key={j} type="number" value={v} min={0} max={99} onChange={e=>changeVal(i,j,e.target.value)}
                style={{width:44,textAlign:"center",background:"white",border:"1px solid #cbd5e1",borderRadius:6,color:"#1e293b",fontSize:14,padding:"4px"}}/>
            ))}
          </div>
        ))}
      </div>
      <button onClick={()=>setP(vals.map(r=>[...r]))} style={{background:"#7c3aed",color:"white",border:"none",borderRadius:8,padding:"7px 20px",cursor:"pointer",fontWeight:"bold",fontSize:13}}>✅ Appliquer</button>
    </div>
  );
}

// ── Naive Tab ─────────────────────────────────────────────────────────────────
function NaiveTab({P}) {
  const steps=buildNaiveSteps(P);
  const [idx,setIdx]=useState(0);
  const step=steps[idx];
  const hl={};
  if(step){if(step.type==="call")hl[`${step.i},${step.j}`]="active";if(step.type==="return")hl[`${step.i},${step.j}`]="store";}
  const calls=steps.filter(s=>s.type==="call");
  const seen={},dups=[];
  calls.forEach(s=>{const k=`${s.i},${s.j}`;seen[k]=(seen[k]||0)+1;if(seen[k]>1&&!dups.includes(k))dups.push(k);});
  const dupCount=calls.filter(s=>dups.includes(`${s.i},${s.j}`)).length-dups.length;
  return (
    <div>
      <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#991b1b"}}>
        ⚠️ <strong>{calls.length}</strong> appels récursifs au total, dont <strong style={{color:"#dc2626"}}>{dupCount}</strong> redondants (mêmes cases recalculées plusieurs fois).
      </div>
      <PyramidSVG P={P} highlights={hl}/>
      <div style={{textAlign:"center",marginTop:8,color:"#64748b",fontSize:13,minHeight:22}}>
        {step&&(step.type==="call"?`📞 Appel sur (${step.i},${step.j})`:`↩️ Retour : C[${step.i}][${step.j}] = ${step.val}`)}
      </div>
      <StepControls idx={idx} setIdx={setIdx} total={steps.length}/>
    </div>
  );
}

// ── BottomUp Tab ──────────────────────────────────────────────────────────────
function BottomUpTab({P}) {
  const steps=buildBottomUpSteps(P);
  const [idx,setIdx]=useState(0);
  const step=steps[Math.min(idx,steps.length-1)];
  const hl={}, optPath=[];
  if(step){
    if(step.phase==="base")hl[`${step.i},${step.j}`]="base";
    if(step.phase==="fill"){hl[`${step.i},${step.j}`]="active";hl[`${step.leftChild.i},${step.leftChild.j}`]="left";hl[`${step.rightChild.i},${step.rightChild.j}`]="right";}
    if(step.phase==="bt_step"){
      step.path.forEach(p=>hl[`${p.i},${p.j}`]="active");
      hl[`${step.chosen.i},${step.chosen.j}`]="chosen";
      hl[`${step.other.i},${step.other.j}`]="other";
    }
    if(step.phase==="bt_done"){step.path.forEach(p=>optPath.push(p));}
  }
  const isBT=step&&["bt_intro","bt_step","bt_done"].includes(step.phase);
  return (
    <div>
      <div style={{background:isBT?"#f0fdf4":"#eff6ff",border:`1px solid ${isBT?"#86efac":"#bfdbfe"}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:isBT?"#14532d":"#1e40af"}}>
        {isBT
          ? "🔍 Phase de backtracking : on remonte le tableau C pour trouver le chemin optimal."
          : "🔼 On remplit le tableau C de bas en haut. C[i][j] = P[i][j] + max(C[i+1][j], C[i+1][j+1])"}
      </div>
      <PyramidSVG P={P} highlights={hl} optPath={optPath} cTable={step?.C}/>
      <div style={{textAlign:"center",marginTop:8,fontSize:13,color:"#475569",minHeight:22,padding:"0 8px"}}>{step?.desc}</div>
      {!isBT&&<div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
        <LegendDot color="#ede9fe" border="#7c3aed" label="Cas de base"/>
        <LegendDot color="#dbeafe" border="#3b82f6" label="Calculé"/>
        <LegendDot color="#fce7f3" border="#ec4899" label="Enfants utilisés"/>
      </div>}
      {isBT&&<div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
        <LegendDot color="#dbeafe" border="#3b82f6" label="Chemin parcouru"/>
        <LegendDot color="#d1fae5" border="#10b981" label="Enfant choisi"/>
        <LegendDot color="#fee2e2" border="#ef4444" label="Enfant écarté"/>
        <LegendDot color="#7c3aed" border="#6d28d9" label="Chemin optimal" textColor="white"/>
      </div>}
      <StepControls idx={idx} setIdx={setIdx} total={steps.length}/>
    </div>
  );
}

// ── TopDown Tab ───────────────────────────────────────────────────────────────
function TopDownTab({P}) {
  const steps=buildTopDownSteps(P);
  const [idx,setIdx]=useState(0);
  const step=steps[Math.min(idx,steps.length-1)];
  const hl={}, optPath=[];
  if(step){
    if(step.type==="call")hl[`${step.i},${step.j}`]="active";
    if(step.type==="hit")hl[`${step.i},${step.j}`]="hit";
    if(step.type==="store")hl[`${step.i},${step.j}`]="store";
    if(step.type==="bt_step"){
      step.path.forEach(p=>hl[`${p.i},${p.j}`]="active");
      hl[`${step.chosen.i},${step.chosen.j}`]="chosen";
      hl[`${step.other.i},${step.other.j}`]="other";
    }
    if(step.type==="bt_done") step.path.forEach(p=>optPath.push(p));
  }
  const isBT=step&&["bt_intro","bt_step","bt_done"].includes(step.type);
  const hitCount=steps.slice(0,idx+1).filter(s=>s.type==="hit").length;
  const calcCount=steps.slice(0,idx+1).filter(s=>s.type==="store").length;
  const memoKeys=step?Object.keys(step.memo):[];
  return (
    <div>
      <div style={{background:isBT?"#f0fdf4":"#f0fdf4",border:`1px solid ${isBT?"#86efac":"#86efac"}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#14532d"}}>
        {isBT
          ? "🔍 Backtracking sur le dictionnaire mémo : même principe qu'en bottom-up."
          : "🔽 Récursion avec mémoïsation. Les cases déjà calculées sont réutilisées directement sans recalcul."}
      </div>
      <PyramidSVG P={P} highlights={hl} optPath={optPath} cTable={isBT?Object.fromEntries(Object.entries(step.memo).map(([k,v])=>{const[i,j]=k.split(",").map(Number);return[k,v];})) : null}/>
      <div style={{textAlign:"center",marginTop:8,fontSize:13,color:"#475569",minHeight:22}}>{step?.desc}</div>
      {!isBT&&<div style={{display:"flex",justifyContent:"center",gap:20,marginTop:4,fontSize:12}}>
        <span style={{color:"#3b82f6"}}>Calculés : <strong>{calcCount}</strong></span>
        <span style={{color:"#22c55e"}}>Mémo hits : <strong>{hitCount}</strong></span>
      </div>}
      {!isBT&&memoKeys.length>0&&(
        <div style={{background:"#fafafa",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:12,flexWrap:"wrap",display:"flex",gap:6,alignItems:"center"}}>
          <span style={{color:"#7c3aed",fontWeight:"bold"}}>Mémo :</span>
          {memoKeys.map(k=>(
            <span key={k} style={{background:"#ede9fe",color:"#5b21b6",borderRadius:5,padding:"2px 7px"}}>C[{k.replace(",","][")}]={step.memo[k]}</span>
          ))}
        </div>
      )}
      {!isBT&&<div style={{display:"flex",justifyContent:"center",gap:14,marginTop:8,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
        <LegendDot color="#dbeafe" border="#3b82f6" label="Appel en cours"/>
        <LegendDot color="#dcfce7" border="#22c55e" label="Mémo hit"/>
        <LegendDot color="#fef3c7" border="#f59e0b" label="Stocké"/>
      </div>}
      {isBT&&<div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
        <LegendDot color="#dbeafe" border="#3b82f6" label="Chemin parcouru"/>
        <LegendDot color="#d1fae5" border="#10b981" label="Enfant choisi"/>
        <LegendDot color="#fee2e2" border="#ef4444" label="Enfant écarté"/>
        <LegendDot color="#7c3aed" border="#6d28d9" label="Chemin optimal" textColor="white"/>
      </div>}
      <StepControls idx={idx} setIdx={setIdx} total={steps.length}/>
    </div>
  );
}

// ── Compare Tab ───────────────────────────────────────────────────────────────
function CompareTab({P}) {
  const n=P.length;
  const naiveCalls=buildNaiveSteps(P).filter(s=>s.type==="call").length;
  const cells=n*(n+1)/2;
  const tdCalc=buildTopDownSteps(P).filter(s=>s.type==="store").length;
  const tdHits=buildTopDownSteps(P).filter(s=>s.type==="hit").length;
  const rows=[
    {label:"Naïf (récursif)",nb:naiveCalls,redondant:"Oui",cpx:"O(2ⁿ)",memo:"—",bg:"#fef2f2",bc:"#fca5a5",tc:"#991b1b"},
    {label:"Bottom-up",nb:cells,redondant:"Non",cpx:"O(n²)",memo:"Tableau C",bg:"#eff6ff",bc:"#bfdbfe",tc:"#1e40af"},
    {label:"Top-down (mémo)",nb:`${tdCalc} + ${tdHits} hits`,redondant:"Non",cpx:"O(n²)",memo:"Dictionnaire",bg:"#f0fdf4",bc:"#86efac",tc:"#14532d"},
  ];
  return (
    <div style={{padding:"4px 0"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f8fafc"}}>
              {["Approche","Nb calculs","Redondance","Complexité","Mémoïsation"].map(h=>(
                <th key={h} style={{padding:"10px 12px",color:"#475569",textAlign:"left",borderBottom:"2px solid #e2e8f0"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.label} style={{background:r.bg,borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"10px 12px",color:r.tc,fontWeight:"bold",borderLeft:`3px solid ${r.bc}`}}>{r.label}</td>
                <td style={{padding:"10px 12px",color:"#1e293b"}}>{r.nb}</td>
                <td style={{padding:"10px 12px",color:r.redondant==="Oui"?"#dc2626":"#16a34a",fontWeight:"bold"}}>{r.redondant}</td>
                <td style={{padding:"10px 12px",color:"#7c3aed",fontFamily:"monospace",fontWeight:"bold"}}>{r.cpx}</td>
                <td style={{padding:"10px 12px",color:"#475569"}}>{r.memo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:14,background:"#fafafa",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#475569",lineHeight:1.8}}>
        <div style={{color:"#1e293b",fontWeight:"bold",marginBottom:6}}>📐 Pyramide de {n} niveaux :</div>
        <div>• Naïf : <span style={{color:"#dc2626",fontWeight:"bold"}}>{naiveCalls}</span> appels (exponentiel)</div>
        <div>• Bottom-up : <span style={{color:"#2563eb",fontWeight:"bold"}}>{cells}</span> cases calculées (n×(n+1)/2)</div>
        <div>• Top-down : <span style={{color:"#16a34a",fontWeight:"bold"}}>{tdCalc}</span> calculs effectifs + <span style={{color:"#16a34a",fontWeight:"bold"}}>{tdHits}</span> réutilisations</div>
        <div style={{marginTop:8,background:"#fefce8",border:"1px solid #fde68a",borderRadius:7,padding:"8px 12px",color:"#92400e"}}>
          💡 La prog. dynamique passe d'une complexité <strong>exponentielle → polynomiale</strong> en mémorisant les résultats intermédiaires.
        </div>
      </div>

        {/* Footer */}
        <div style={{marginTop:16,background:"white",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#64748b",lineHeight:1.8}}>
          <div style={{color:"#1e293b"}}>
            © 2026 <strong>Fabrice LALLEMAND</strong> avec l'aide de{" "}
            <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{color:"#7c3aed",textDecoration:"none"}}>Claude.ai</a>.
            {" "}Code source sous licence{" "}
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer" style={{color:"#7c3aed",textDecoration:"none"}}>MIT</a>
            {" — "}
            <a href="https://github.com/fabricelallemand/chenille-vorace" target="_blank" rel="noreferrer" style={{color:"#7c3aed",textDecoration:"none"}}>🖥 Code source sur GitHub</a>.
          </div>
          <div style={{fontSize:11,color:"#94a3b8"}}>Utilisation, modification et distribution libres — attribution requise</div>
        </div>

    </div>
  );
}

// ── Legend dot ────────────────────────────────────────────────────────────────
function LegendDot({color,border,label,textColor="#475569"}) {
  return (
    <span style={{display:"flex",alignItems:"center",gap:4}}>
      <span style={{width:12,height:12,borderRadius:"50%",background:color,border:`2px solid ${border}`,display:"inline-block"}}></span>
      <span style={{color:textColor}}>{label}</span>
    </span>
  );
}

// ── Step Controls ─────────────────────────────────────────────────────────────
function StepControls({idx,setIdx,total}) {
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(800);
  const timer=useRef(null);
  useEffect(()=>{
    if(playing){timer.current=setInterval(()=>{setIdx(i=>{if(i>=total-1){setPlaying(false);clearInterval(timer.current);return i;}return i+1;});},speed);}
    else clearInterval(timer.current);
    return()=>clearInterval(timer.current);
  },[playing,speed,total]);
  useEffect(()=>{setIdx(0);setPlaying(false);},[total]);
  const btn=(label,action,disabled,accent)=>(
    <button onClick={action} disabled={disabled}
      style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${accent?"#7c3aed":"#e2e8f0"}`,cursor:disabled?"not-allowed":"pointer",
        background:disabled?"#f8fafc":accent?"#7c3aed":"white",color:disabled?"#cbd5e1":accent?"white":"#475569",fontSize:13,fontWeight:"bold"}}>
      {label}
    </button>
  );
  return (
    <div style={{marginTop:14}}>
      <div style={{textAlign:"center",color:"#94a3b8",fontSize:12,marginBottom:8}}>Étape {idx+1} / {total}</div>
      <div style={{display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap"}}>
        {btn("⏮",()=>{setIdx(0);setPlaying(false);},idx===0,false)}
        {btn("◀",()=>setIdx(i=>Math.max(0,i-1)),idx===0,false)}
        {btn(playing?"⏸ Pause":"▶ Auto",()=>setPlaying(p=>!p),false,true)}
        {btn("▶",()=>setIdx(i=>Math.min(total-1,i+1)),idx===total-1,false)}
        {btn("⏭",()=>{setIdx(total-1);setPlaying(false);},idx===total-1,false)}
      </div>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:10}}>
        <span style={{color:"#94a3b8",fontSize:12}}>Vitesse :</span>
        {[[1400,"🐢"],[800,"🚶"],[400,"🏃"],[150,"⚡"]].map(([ms,label])=>(
          <button key={ms} onClick={()=>setSpeed(ms)}
            style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${speed===ms?"#7c3aed":"#e2e8f0"}`,cursor:"pointer",fontSize:12,
              background:speed===ms?"#7c3aed":"white",color:speed===ms?"white":"#94a3b8"}}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const TABS=[{id:"naive",label:"🔴 Naïf"},{id:"bottomup",label:"🔵 Bottom-up"},{id:"topdown",label:"🟢 Top-down"},{id:"compare",label:"📊 Comparaison"}];

export default function App() {
  const [P,setP]=useState(DEFAULT_PYRAMID);
  const [tab,setTab]=useState("naive");
  const [showEdit,setShowEdit]=useState(false);
  const [key,setKey]=useState(0);
  const apply=newP=>{setP(newP);setKey(k=>k+1);setShowEdit(false);};
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",color:"#1e293b",fontFamily:"system-ui,sans-serif",padding:"16px"}}>
      <div style={{maxWidth:520,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:22,fontWeight:"bold",color:"#1e293b"}}>🐛 La Chenille Vorace</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Visualiseur de programmation dynamique</div>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:14,background:"#e2e8f0",borderRadius:10,padding:4}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,padding:"7px 4px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:"bold",
                background:tab===t.id?"#7c3aed":"transparent",color:tab===t.id?"white":"#64748b",transition:"all .2s"}}>
              {t.label}
            </button>
          ))}
        </div>
        {tab!=="compare"&&(
          <div style={{marginBottom:10}}>
            <button onClick={()=>setShowEdit(s=>!s)}
              style={{background:"white",border:"1px solid #e2e8f0",borderRadius:7,color:"#64748b",fontSize:12,padding:"5px 14px",cursor:"pointer"}}>
              {showEdit?"▲ Masquer":"✏️ Modifier la pyramide"}
            </button>
          </div>
        )}
        {showEdit&&<EditPyramid P={P} setP={apply}/>}
        <div style={{background:"white",borderRadius:12,padding:"14px",border:"1px solid #e2e8f0",boxShadow:"0 1px 3px #0001"}} key={key+tab}>
          {tab==="naive"&&<NaiveTab P={P}/>}
          {tab==="bottomup"&&<BottomUpTab P={P}/>}
          {tab==="topdown"&&<TopDownTab P={P}/>}
          {tab==="compare"&&<CompareTab P={P}/>}
        </div>

        {/* Footer licence */}
        <div style={{marginTop:16,background:"white",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#64748b",lineHeight:1.8}}>
          <div style={{color:"#1e293b"}}>
            © 2026 <strong>Fabrice LALLEMAND</strong> avec l'aide de{" "}
            <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{color:"#7c3aed",textDecoration:"none"}}>Claude.ai</a>.{" "}
            Code source sous licence{" "}
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer" style={{color:"#7c3aed",textDecoration:"none"}}>MIT</a>
            {" — "}
            <a href="https://github.com/fabricelallemand/chenille-vorace" target="_blank" rel="noreferrer" style={{color:"#7c3aed",textDecoration:"none"}}>🖥 Code source sur GitHub</a>.
          </div>
          <div style={{fontSize:11,color:"#94a3b8"}}>Utilisation, modification et distribution libres — attribution requise</div>
        </div>

      </div>
    </div>
  );
}
