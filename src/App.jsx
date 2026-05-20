import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import appData from "../data.json";

const OFFICIAL = {
  2000:4.0, 2001:5.3, 2002:2.7, 2003:2.3, 2004:4.8,
  2005:6.5, 2006:5.5, 2007:2.9, 2008:8.3, 2009:4.2,
  2010:3.8, 2011:4.7, 2012:3.0, 2013:2.6, 2014:3.6,
  2015:1.4, 2016:1.3, 2017:2.9, 2018:5.2, 2019:2.5,
  2020:2.4, 2021:3.9, 2022:5.8, 2023:6.0, 2024:3.2, 2025:1.7,
};
// BSP annual average USD/PHP % change: positive=depreciation, negative=appreciation (source: bsp.gov.ph pesodollar.xlsx)
const PESO_DEP = {
  2000:11.55, 2001:13.33, 2002:1.18,  2003:4.8,   2004:3.28,
  2005:-1.73, 2006:-7.35, 2007:-11.19,2008:-3.76, 2009:6.64,
  2010:-5.6,  2011:-4.15, 2012:-2.57, 2013:0.51,  2014:4.39,
  2015:2.43,  2016:4.19,  2017:5.78,  2018:4.29,  2019:-1.67,
  2020:-4.38, 2021:-0.75, 2022:9.59,  2023:2.07,  2024:2.9,  2025:0.37,
};
// NFA vs commercial rice gap × ~12% NFA outlet sampling share × 8.9% rice CPI weight
// Pre-2019: NFA ₱10–27/kg vs commercial ₱19–46/kg. 2019 Rice Tariffication Law → NFA exits retail → 0.
const RICE_ADJ = {
  2000:0.5, 2001:0.2, 2002:0.2, 2003:0.2, 2004:0.3,
  2005:0.3, 2006:0.3, 2007:0.3, 2008:0.5, 2009:0.2,
  2010:0.2, 2011:0.2, 2012:0.2, 2013:0.2, 2014:0.3,
  2015:0.3, 2016:0.3, 2017:0.3, 2018:0.4, 2019:0.0,
  2020:0.0, 2021:0.0, 2022:0.0, 2023:0.0, 2024:0.0, 2025:0.0,
};
const riceAdj  = y => RICE_ADJ[y] ?? 0;
// 35% import share of household consumption × 65% passthrough rate = 0.2275
const pesoAdj  = y => +(PESO_DEP[y] * 0.2275).toFixed(2);
const realRate = y => +(OFFICIAL[y] + riceAdj(y) + pesoAdj(y)).toFixed(1);

const PHFlag = ({ size=28 }) => (
  <svg width={size*1.8} height={size} viewBox="0 0 180 90" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:2, flexShrink:0 }}>
    <rect width="180" height="45" fill="#0038a8"/>
    <rect y="45" width="180" height="45" fill="#ce1126"/>
    <polygon points="0,0 90,45 0,90" fill="#ffffff"/>
    <g transform="translate(30,45)">
      {[0,45,90,135,180,225,270,315].map((a,i)=>(
        <line key={i} x1="0" y1="0"
          x2={Math.cos(a*Math.PI/180)*16} y2={Math.sin(a*Math.PI/180)*16}
          stroke="#fcd116" strokeWidth="2"/>
      ))}
      <circle r="7" fill="#fcd116"/>
    </g>
    {[[10,15],[10,75],[50,45]].map(([sx,sy],i)=>(
      <polygon key={i}
        points={[0,1,2,3,4].map(j=>{
          const a=(j*144-90)*Math.PI/180;
          const r=j%2===0?5:2;
          return `${sx+Math.cos(a)*r},${sy+Math.sin(a)*r}`;
        }).join(" ")}
        fill="#fcd116"/>
    ))}
  </svg>
);

const MONTHLY = appData.monthly.map(r => ({ ...r, real: +(r.off + 0 + r.pd * 0.2275).toFixed(1) }));

const YEARS = Object.keys(OFFICIAL).map(Number);
const MONTHS_2026 = MONTHLY;

const CHART = [
  ...Object.keys(OFFICIAL).map(y => ({
    label: y, off: OFFICIAL[+y], real: realRate(+y),
    gap: +(realRate(+y) - OFFICIAL[+y]).toFixed(1),
  })),
  ...MONTHLY.map(r => ({
    label: r.m.slice(0,3)+"'26", off: r.off, real: r.real,
    gap: +(r.real - r.off).toFixed(1),
  })),
];

function calcSavings(amt, yr, mo, rate) {
  const frac = (12 - mo) / 12;
  let bank=amt, rPSA=amt, rReal=amt;
  const rows = [{ year: yr, bank:amt, rPSA:amt, rReal:amt }];
  if (OFFICIAL[yr] && frac > 0) {
    bank  *= (1 + (rate/100) * frac);
    rPSA  /= (1 + (OFFICIAL[yr]/100) * frac);
    rReal /= (1 + (realRate(yr)/100) * frac);
  }
  for (let y=yr+1; y<=2025; y++) {
    if (!OFFICIAL[y]) continue;
    bank  *= (1 + rate/100);
    rPSA  /= (1 + OFFICIAL[y]/100);
    rReal /= (1 + realRate(y)/100);
    rows.push({ year:y, bank:Math.round(bank), rPSA:Math.round(rPSA), rReal:Math.round(rReal) });
  }
  const L = rows[rows.length-1];
  return {
    rows, L,
    interest: Math.round(L.bank - amt),
    psaLoss:  Math.round(amt - L.rPSA),
    realLoss: Math.round(amt - L.rReal),
    hidden:   Math.round(L.bank - L.rReal),
    yrs:      +(( (2025 - yr) + (12-mo)/12 ).toFixed(1)),
  };
}

const peso = v => "₱" + Math.abs(v).toLocaleString("en-PH");

const SOURCES = {
  psa: "https://psa.gov.ph/price-indices/cpi-ir",
  da:  "https://psa.gov.ph/statistics/price-situationer/selected-agri-commodities",
  bsp: "https://www.bsp.gov.ph/sitepages/statistics/exchangerate.aspx",
};

const TH = { bg:"#ffffff", surface:"#f4f4f5", border:"#e4e4e7", text:"#09090b", heading:"#18181b", muted:"#71717a", faint:"#d4d4d8", red:"#dc2626", blue:"#1d4ed8", gold:"#b45309", green:"#15803d", tip:"#ffffff", tabB:"#71717a" };
const DK = { bg:"#09090b", surface:"#18181b", border:"#27272a", text:"#ffffff", heading:"#ffffff", muted:"#d1d5db", faint:"#52525b", red:"#ef4444", blue:"#60a5fa", gold:"#fbbf24", green:"#4ade80", tip:"#18181b", tabB:"#71717a" };

function drawFlag(ctx, x, y, w, h) {
  ctx.fillStyle="#0038a8"; ctx.fillRect(x,y,w,h/2);
  ctx.fillStyle="#ce1126"; ctx.fillRect(x,y+h/2,w,h/2);
  ctx.fillStyle="#ffffff";
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w*0.55,y+h/2); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#fcd116";
  ctx.beginPath(); ctx.arc(x+w*0.19,y+h/2,h*0.18,0,Math.PI*2); ctx.fill();
}

function drawNumberCard(canvas, off, real, month) {
  if (!canvas) return;
  canvas.width=1200; canvas.height=630;
  const ctx=canvas.getContext("2d");
  const gap=(real-off).toFixed(1);
  ctx.fillStyle="#f7f7f4"; ctx.fillRect(0,0,1200,630);
  ctx.fillStyle="#fff7ed"; ctx.fillRect(602,0,598,630);
  const g=ctx.createLinearGradient(0,0,1200,0);
  g.addColorStop(0,"#1d4ed8"); g.addColorStop(1,"#dc2626");
  ctx.fillStyle=g; ctx.fillRect(0,0,1200,5);
  drawFlag(ctx,44,26,64,42);
  ctx.fillStyle="#0d0d0d"; ctx.font="bold 46px system-ui";
  ctx.fillText("PHILIPPINE REAL INFLATION",122,62);
  ctx.fillStyle="#9ca3af"; ctx.font="28px system-ui";
  ctx.fillText(month.toUpperCase(),122,94);
  ctx.textAlign="right"; ctx.fillStyle="#9ca3af"; ctx.font="26px system-ui";
  ctx.fillText("phri.netlify.app",1156,62);
  ctx.textAlign="left";
  ctx.fillStyle="#e5e5e0"; ctx.fillRect(598,108,3,482);
  ctx.fillStyle="#0d0d0d"; ctx.font="bold 30px system-ui";
  ctx.fillText("OFFICIAL",50,168);
  const offW=ctx.measureText("OFFICIAL").width;
  ctx.fillStyle="#9ca3af"; ctx.font="22px system-ui";
  ctx.fillText("PSA",50+offW+10,168);
  ctx.fillStyle="#6b7280"; ctx.font="bold 200px system-ui";
  let szL=200;
  while(ctx.measureText(off+"%").width>510&&szL>60){szL-=4;ctx.font=`bold ${szL}px system-ui`;}
  ctx.fillText(off+"%",50,168+szL+4);
  ctx.fillStyle="#b45309"; ctx.font="bold 30px system-ui";
  ctx.fillText("REAL INFLATION",652,168);
  ctx.fillStyle="#b45309"; ctx.font="bold 200px system-ui";
  let szR=200;
  while(ctx.measureText(real+"%").width>510&&szR>60){szR-=4;ctx.font=`bold ${szR}px system-ui`;}
  ctx.fillText(real+"%",652,168+szR+4);
  ctx.fillStyle="#dc2626"; ctx.font="bold 34px system-ui";
  ctx.fillText("(+"+gap+"pp higher than official)",652,168+szR+58);
  ctx.fillStyle="#e5e5e0"; ctx.fillRect(0,578,1200,2);
  ctx.fillStyle="#9ca3af"; ctx.font="24px system-ui";
  ctx.fillText("PSA Official  +  market rice  +  peso depreciation passthrough",50,614);
}

function ChartTip({ active, payload, label, c }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:c.tip, border:`1px solid ${c.border}`, borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      <div style={{ color:c.heading, marginBottom:4, fontWeight:600 }}>{label}</div>
      {payload.map(p=>(
        <div key={p.dataKey} style={{ color:p.color }}>
          {p.dataKey==="off"?"Official":p.dataKey==="real"?"Real":"Gap"}: <b>{p.value}%</b>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('dark') === '1');
  const [tab, setTab] = useState(() => localStorage.getItem('tab') || 'now');
  const [selYear, setSelYear] = useState(2026);
  const [selMonth, setSelMonth] = useState(3);
  const [showPicker, setShowPicker] = useState(false);
  const [entries, setEntries] = useState([{ id:1, amt:100000, yr:2020, mo:1, rate:0.5 }]);

  const updateEntry = (id,field,val) => setEntries(prev=>prev.map(e=>e.id===id?{...e,[field]:val}:e));
  const addEntry = () => setEntries(prev => {
    const last = prev[prev.length-1];
    return [...prev, { id:Date.now(), amt:100000, yr:last.yr, mo:last.mo, rate:last.rate }];
  });
  const removeEntry = (id) => setEntries(prev => prev.length>1 ? prev.filter(e=>e.id!==id) : prev);

  const savResults = entries.map(e => ({ ...e, ...calcSavings(e.amt, e.yr, e.mo, e.rate) }));
  const totals = savResults.reduce((acc,s) => ({
    bank:     acc.bank     + s.L.bank,
    rPSA:     acc.rPSA     + s.L.rPSA,
    rReal:    acc.rReal    + s.L.rReal,
    interest: acc.interest + s.interest,
    psaLoss:  acc.psaLoss  + s.psaLoss,
    realLoss: acc.realLoss + s.realLoss,
    hidden:   acc.hidden   + s.hidden,
  }), { bank:0, rPSA:0, rReal:0, interest:0, psaLoss:0, realLoss:0, hidden:0 });

  const sav = savResults[0];
  const combinedRows = (() => {
    if (savResults.length === 1) return sav.rows;
    const yearSet = new Set();
    savResults.forEach(s => s.rows.forEach(r => yearSet.add(r.year)));
    return [...yearSet].sort().map(yr => ({
      year: yr,
      bank:  savResults.reduce((sum,s) => sum + (s.rows.find(r=>r.year===yr)?.bank  || 0), 0),
      rPSA:  savResults.reduce((sum,s) => sum + (s.rows.find(r=>r.year===yr)?.rPSA  || 0), 0),
      rReal: savResults.reduce((sum,s) => sum + (s.rows.find(r=>r.year===yr)?.rReal || 0), 0),
    }));
  })();

  const c = dark ? DK : TH;
  const cur = selYear === 2026
    ? { ...MONTHS_2026[selMonth], label: MONTHS_2026[selMonth].m, rice: 0 }
    : { label: String(selYear), off: OFFICIAL[selYear], real: realRate(selYear), pd: PESO_DEP[selYear]||0, rice: RICE_ADJ[selYear]||0 };
  const gap = (cur.real - cur.off).toFixed(1);

  const tip = useCallback(props => <ChartTip {...props} c={c} />, [dark]);

  return (
    <div style={{ minHeight:"100vh", background:c.bg, color:c.text, fontFamily:"system-ui,-apple-system,sans-serif", transition:"background 0.2s" }}>

      {/* HEADER */}
      <div style={{ borderBottom:`1px solid ${c.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <PHFlag size={28}/>
          <div>
            <div style={{ fontWeight:800, fontSize:17, letterSpacing:"-0.3px" }}>Philippine Real Inflation</div>
            <div style={{ fontSize:11, color:c.muted, marginTop:2 }}>What the government reports vs. what it actually is</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {[["now","Now"],["calc","Calculator"],["how","How"]].map(([t,l])=>(
            <button key={t} onClick={()=>{ setTab(t); localStorage.setItem('tab',t); }} style={{
              padding:"7px 20px", borderRadius:8,
              border:`2px solid ${tab===t?c.gold:c.tabB}`,
              background:tab===t?c.gold:"transparent",
              color:tab===t?"#fff":c.heading,
              fontWeight:700, cursor:"pointer", fontSize:13,
            }}>{l}</button>
          ))}
          <div onClick={()=>setDark(d=>{ const n=!d; localStorage.setItem('dark',n?'1':'0'); return n; })} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", userSelect:"none" }}>
            <span style={{ fontSize:11 }}>☀️</span>
            <div style={{ width:44, height:24, borderRadius:12, background:dark?c.blue:c.faint, position:"relative", transition:"background 0.2s", flexShrink:0 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:dark?23:3, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
            </div>
            <span style={{ fontSize:11 }}>🌙</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 20px 80px" }}>

        {/* NOW */}
        {tab==="now" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ position:"relative" }}>
              <button onClick={()=>setShowPicker(p=>!p)} style={{
                display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
                borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700,
                border:`2px solid ${c.heading}`, background:c.bg, color:c.heading,
                width:"100%", justifyContent:"space-between",
              }}>
                <span>{cur.label}</span>
                <span style={{ fontSize:11, color:c.muted }}>{showPicker?"▲ close":"▼ change"}</span>
              </button>
              {showPicker && (
                <div style={{
                  position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:10,
                  background:c.bg, border:`2px solid ${c.heading}`, borderRadius:10,
                  padding:"12px", boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
                }}>
                  <div style={{ fontSize:10, fontWeight:700, color:c.muted, letterSpacing:1, marginBottom:6 }}>2026</div>
                  <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                    {MONTHS_2026.map((m,i)=>(
                      <button key={i} onClick={()=>{ setSelYear(2026); setSelMonth(i); setShowPicker(false); }} style={{
                        padding:"5px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:700,
                        border:`1.5px solid ${selYear===2026&&selMonth===i?c.gold:c.border}`,
                        background:selYear===2026&&selMonth===i?c.gold:"transparent",
                        color:selYear===2026&&selMonth===i?"#fff":c.text,
                      }}>{m.m.split(" ")[0]}</button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:c.muted, letterSpacing:1, marginBottom:6 }}>YEAR <span style={{ fontWeight:400, letterSpacing:0, textTransform:"none" }}>(no monthly data)</span></div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {YEARS.map(y=>(
                      <button key={y} onClick={()=>{ setSelYear(y); setShowPicker(false); }} style={{
                        padding:"5px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:700,
                        border:`1.5px solid ${selYear===y&&selYear!==2026?c.gold:c.border}`,
                        background:selYear===y&&selYear!==2026?c.gold:"transparent",
                        color:selYear===y&&selYear!==2026?"#fff":c.text,
                        whiteSpace:"nowrap",
                      }}>{y}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ border:`2.5px solid ${c.heading}`, borderRadius:16, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
                <div style={{ background:c.surface, borderRight:`2px solid ${c.heading}`, padding:"24px 24px 20px" }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.muted, marginBottom:12 }}>OFFICIAL <span style={{ fontSize:10, color:c.faint }}>(gov)</span></div>
                  <div style={{ fontSize:80, fontWeight:900, color:c.muted, lineHeight:1, letterSpacing:"-3px" }}>
                    {cur.off}<span style={{ fontSize:32, letterSpacing:0 }}>%</span>
                  </div>
                  <div style={{ fontSize:11, color:c.muted, marginTop:10 }}>{cur.label}</div>
                </div>
                <div style={{ background:dark?"#1a0f00":"#fff7ed", padding:"24px 24px 20px" }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.gold, marginBottom:12 }}>REAL INFLATION</div>
                  <div style={{ fontSize:80, fontWeight:900, color:c.gold, lineHeight:1, letterSpacing:"-3px" }}>
                    {cur.real}<span style={{ fontSize:32, letterSpacing:0 }}>%</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:parseFloat(gap)>=0?c.red:c.blue, marginTop:12 }}>{parseFloat(gap)>=0?`(+${gap}pp higher)`:`(${gap}pp vs official)`}</div>
                </div>
              </div>
            </div>

            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:"20px 24px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.heading, marginBottom:16 }}>WHY IT'S HIGHER</div>
              {[
                { label:"PSA Official CPI (from gov)", val:cur.off, color:c.text, pre:"", src:SOURCES.psa },
                { label:"+ Market rice (strips NFA price)", val:cur.rice, color:c.green, pre:"+", src:SOURCES.da },
                { label:"+ Peso depreciation passthrough", val:+(cur.pd*0.2275).toFixed(2), color:c.green, pre:"+", src:SOURCES.bsp },
              ].map((row,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<2?`1px solid ${c.border}`:"none" }}>
                  <span style={{ fontSize:14, color:c.text, display:"flex", alignItems:"center", gap:8 }}>
                    {row.label}
                    <a href={row.src} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:c.blue, fontWeight:600, textDecoration:"underline" }}>source ↗</a>
                  </span>
                  <span style={{ fontSize:18, fontWeight:800, color:row.color, fontFamily:"monospace" }}>{row.val<0?'':row.pre}{row.val}%</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:14, borderTop:`2px solid ${c.border}` }}>
                <span style={{ fontSize:16, fontWeight:800 }}>Real Inflation</span>
                <span style={{ fontSize:32, fontWeight:900, color:c.gold, fontFamily:"monospace", letterSpacing:"-1px" }}>{cur.real}%</span>
              </div>
            </div>

            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:"20px 16px 14px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.heading, marginBottom:16, paddingLeft:8 }}>OFFICIAL vs REAL (2000–2026)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={CHART} margin={{ top:4, right:12, left:-16, bottom:4 }}>
                  <defs>
                    <linearGradient id="gradOff" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c.muted} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={c.muted} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c.gold} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={c.gold} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={({x,y,payload})=>{
                      const v = String(payload.value);
                      const isMonth = v.includes("'");
                      const showYear = ["2000","2005","2010","2015","2020","2025"].includes(v);
                      if (!isMonth && !showYear) return <g/>;
                      return <text x={x} y={y+10} fill={isMonth?c.gold:c.heading} fontSize={9} textAnchor="middle" fontWeight={isMonth?700:400}>{v}</text>;
                    }}
                  />
                  <YAxis tick={{ fill:c.heading, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>v+"%"}/>
                  <Tooltip content={tip}/>
                  <Area type="monotone" dataKey="off"  stroke={c.muted} strokeWidth={2} fill="url(#gradOff)"  dot={false}/>
                  <Area type="monotone" dataKey="real" stroke={c.gold}  strokeWidth={3} fill="url(#gradReal)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:20, paddingLeft:8, marginTop:4 }}>
                {[[c.muted,"Official"],[c.gold,"Real"]].map(([col,lbl])=>(
                  <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:col }}>
                    <div style={{ width:16, height:2, background:col }}/>{lbl}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CALCULATOR */}
        {tab==="calc" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${c.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.heading }}>YOUR SAVINGS</div>
              </div>
              {entries.map((e,idx)=>{
                const s = savResults[idx];
                const MTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                return (
                  <div key={e.id} style={{ borderBottom:`1px solid ${c.border}`, position:"relative" }}>
                    {idx > 0 && (
                      <button onClick={()=>removeEntry(e.id)} style={{
                        position:"absolute", top:0, right:0, background:"#dc2626", border:"none",
                        color:"#fff", cursor:"pointer", fontSize:14, fontWeight:900,
                        width:28, height:28, borderRadius:"0 0 0 8px", lineHeight:"28px", textAlign:"center", padding:0, zIndex:2,
                      }}>×</button>
                    )}
                    <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div style={{ gridColumn:"1/-1" }}>
                        <div style={{ fontSize:10, fontWeight:600, color:c.heading, marginBottom:4 }}>AMOUNT (₱)</div>
                        <input type="number" value={e.amt} min={1000} step={1000}
                          onChange={ev=>{ const v=parseFloat(ev.target.value); if(!isNaN(v)) updateEntry(e.id,"amt",v); }}
                          style={{ width:"100%", boxSizing:"border-box", background:c.bg, border:`1.5px solid ${c.heading}`, borderRadius:8, padding:"8px 12px", color:c.text, fontSize:15, fontFamily:"monospace", fontWeight:700, outline:"none" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:600, color:c.heading, marginBottom:4 }}>MONTH SAVED</div>
                        <select value={e.mo} onChange={ev=>updateEntry(e.id,"mo",parseInt(ev.target.value))}
                          style={{ width:"100%", background:c.bg, border:`1.5px solid ${c.heading}`, borderRadius:8, padding:"8px 10px", color:c.text, fontSize:13, fontFamily:"monospace", fontWeight:700, outline:"none", cursor:"pointer" }}>
                          {MTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:600, color:c.heading, marginBottom:4 }}>YEAR SAVED</div>
                        <input type="number" value={e.yr} min={2015} step={1} max={2024}
                          onChange={ev=>{ const v=parseInt(ev.target.value); if(!isNaN(v)) updateEntry(e.id,"yr",v); }}
                          style={{ width:"100%", boxSizing:"border-box", background:c.bg, border:`1.5px solid ${c.heading}`, borderRadius:8, padding:"8px 12px", color:c.text, fontSize:13, fontFamily:"monospace", fontWeight:700, outline:"none" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:600, color:c.heading, marginBottom:4 }}>BANK RATE %</div>
                        <input type="number" value={e.rate} min={0} step={0.1} max={20}
                          onChange={ev=>{ const v=parseFloat(ev.target.value); if(!isNaN(v)) updateEntry(e.id,"rate",v); }}
                          style={{ width:"100%", boxSizing:"border-box", background:c.bg, border:`1.5px solid ${c.heading}`, borderRadius:8, padding:"8px 12px", color:c.text, fontSize:13, fontFamily:"monospace", fontWeight:700, outline:"none" }}
                        />
                      </div>
                      <div style={{ fontSize:10, color:c.muted, gridColumn:"1/-1" }}>From {MTHS[e.mo-1]} {e.yr} — {s.yrs} years applied</div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", background:dark?"#0a0f1a":"#f9fafb", borderTop:`1px solid ${c.border}` }}>
                      {[
                        { label:"BANK BAL", val:peso(s.L.bank),  sub:`+${peso(s.interest)}`, subC:c.green },
                        { label:"PSA SAYS", val:peso(s.L.rPSA),  sub:`−${peso(s.psaLoss)}`,  subC:c.red   },
                        { label:"ACTUALLY", val:peso(s.L.rReal), sub:`−${peso(s.realLoss)}`,  subC:c.red   },
                      ].map((r,i)=>(
                        <div key={i} style={{ padding:"10px 14px", borderRight:i<2?`1px solid ${c.border}`:"none" }}>
                          <div style={{ fontSize:9, fontWeight:700, color:c.heading, letterSpacing:1, marginBottom:4 }}>{r.label}</div>
                          <div style={{ fontSize:14, fontWeight:900, color:c.text, fontFamily:"monospace" }}>{r.val}</div>
                          <div style={{ fontSize:10, color:r.subC, fontWeight:600 }}>{r.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ padding:"12px 16px" }}>
                <button onClick={addEntry} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:`1.5px dashed ${c.heading}`, borderRadius:8, padding:"8px 18px", color:c.heading, fontWeight:700, fontSize:13, cursor:"pointer", width:"100%" }}>
                  <span style={{ fontSize:18, lineHeight:1 }}>+</span> Add
                </button>
              </div>
              {entries.length > 1 && (
                <div style={{ background:dark?"#0f172a":"#eff6ff" }}>
                  <div style={{ padding:"10px 16px", fontSize:11, fontWeight:700, color:c.heading, letterSpacing:1, borderBottom:`1px solid ${c.border}` }}>TOTAL — {entries.length} ENTRIES</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr" }}>
                    {[
                      { label:"BANK BAL", val:totals.bank,  sub:`+${peso(totals.interest)}`, subC:c.green },
                      { label:"PSA SAYS", val:totals.rPSA,  sub:`−${peso(totals.psaLoss)}`,  subC:c.red   },
                      { label:"ACTUALLY", val:totals.rReal, sub:`−${peso(totals.realLoss)}`,  subC:c.red   },
                    ].map((t,i)=>(
                      <div key={i} style={{ padding:"12px 14px", borderRight:i<2?`1px solid ${c.border}`:"none" }}>
                        <div style={{ fontSize:9, fontWeight:700, color:c.heading, letterSpacing:1, marginBottom:4 }}>{t.label}</div>
                        <div style={{ fontSize:16, fontWeight:900, color:c.text, fontFamily:"monospace" }}>{peso(t.val)}</div>
                        <div style={{ fontSize:10, color:t.subC, fontWeight:600 }}>{t.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:12, padding:"12px 18px", fontSize:12, color:c.text, lineHeight:1.7 }}>
              <b>Why is "PSA Says" higher than "Actually"?</b> PSA's lower inflation shows less erosion. Real inflation is higher — your actual purchasing power is lower than the government claims.
            </div>

            <div style={{ background:dark?"#1a0505":"#fff1f1", border:`2px solid ${c.red}`, borderRadius:16, padding:"24px 28px", display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.red, marginBottom:8 }}>HIDDEN LOSS{entries.length>1?" (TOTAL)":""}</div>
                <div style={{ fontSize:52, fontWeight:900, color:c.red, fontFamily:"monospace", letterSpacing:"-2px", lineHeight:1 }}>−{peso(totals.hidden)}</div>
              </div>
              <div style={{ fontSize:13, color:c.text, lineHeight:1.8, flex:1, minWidth:180 }}>
                Extra lost — bank balance vs real purchasing power{entries.length>1?` across ${entries.length} entries`:``}.
              </div>
            </div>

            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:"20px 16px 14px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.heading, marginBottom:16, paddingLeft:8 }}>PURCHASING POWER OVER TIME</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={combinedRows} margin={{ top:4, right:12, left:-10, bottom:4 }}>
                  <XAxis dataKey="year" tick={{ fill:c.heading, fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:c.heading, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>"₱"+(v/1000).toFixed(0)+"k"}/>
                  <Tooltip
                    formatter={(v,n)=>[peso(v), n==="bank"?"Bank":n==="rPSA"?"PSA Says":"Actually"]}
                    contentStyle={{ background:c.tip, border:`1px solid ${c.border}`, borderRadius:8, fontSize:12 }}
                    labelStyle={{ color:c.heading }}
                  />
                  <Line type="monotone" dataKey="bank"  stroke={c.blue}  strokeWidth={2}   dot={false}/>
                  <Line type="monotone" dataKey="rPSA"  stroke={c.muted} strokeWidth={1.5} dot={false}/>
                  <Line type="monotone" dataKey="rReal" stroke={c.gold}  strokeWidth={3}   dot={false}/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:20, paddingLeft:8, marginTop:8 }}>
                {[[c.blue,"Bank"],[c.muted,"PSA Says"],[c.gold,"Actually"]].map(([col,lbl])=>(
                  <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:col }}>
                    <div style={{ width:14, height:2, background:col }}/>{lbl}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HOW */}
        {tab==="how" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:"24px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.heading, marginBottom:16 }}>THE FORMULA</div>
              <div style={{ background:c.bg, borderRadius:10, padding:"16px 20px", fontFamily:"monospace", fontSize:"clamp(11px, 3.2vw, 14px)", color:c.text, lineHeight:2.4, border:`2px solid ${c.gold}` }}>
                <div>Real Inflation = PSA Official</div>
                <div style={{ paddingLeft:"2em" }}>+ rice adj[year] (0–0.5pp, variable)</div>
                <div style={{ paddingLeft:"2em" }}>+ peso dep% × 35% × 65%</div>
              </div>
            </div>
            {[
              { title:"PSA Official CPI (from gov)", add:"Base", color:c.heading, src:SOURCES.psa,
                body:"The official Consumer Price Index published monthly by the Philippine Statistics Authority. We use this as our starting point.",
                flag:"Updated monthly, first Tuesday after reference month." },
              { title:"Market Rice Adjustment", add:"Variable", color:c.green, src:SOURCES.da,
                body:"PSA blended NFA subsidized rice prices with commercial prices when sampling. NFA sold at ₱10–27/kg while commercial rice ranged ₱19–46/kg. After the 2019 Rice Tariffication Law, NFA exited retail entirely — the distortion disappears post-2019.",
                why:"Year-specific: ~12% of PSA's sampled outlets were NFA outlets (est. from PIDS data on NFA retail share). Multiplied by the actual price gap each year × 8.9% rice CPI weight. 2000: 0.5pp. 2008 crisis: 0.5pp. 2014–2018: 0.3–0.4pp. 2019 onward: 0pp (NFA out of retail).",
                flag:"PSA Price Situationer — retail rice prices updated twice monthly, 80 provinces." },
              { title:"Peso Depreciation Passthrough", add:"Variable", color:c.green, src:SOURCES.bsp,
                body:"Philippines imports ~35% of household consumption — all fuel, most wheat, many goods. When the peso weakens, import costs hit wholesale immediately. CPI captures it months later. Formula: peso dep% × 35% import share × 65% passthrough rate.",
                why:"Why 65%? Philippine retailers and wet markets adjust prices fast when import costs rise. The 35% import share counts direct imports plus the import content of locally-produced goods (fuel for transport, fertilizer, packaging). CPI's measured passthrough understates this because it lags by weeks to months.",
                flag:"BSP publishes daily USD/PHP rates — Table 12, Philippine Peso per US Dollar." },
            ].map(item=>(
              <div key={item.title} style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:"22px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, gap:12, flexWrap:"wrap" }}>
                  <span style={{ fontSize:15, fontWeight:700 }}>{item.title}</span>
                  <span style={{ fontSize:12, fontFamily:"monospace", color:item.color, background:c.bg, padding:"4px 12px", borderRadius:999, border:`1px solid ${c.border}` }}>{item.add}</span>
                </div>
                <p style={{ fontSize:13, color:c.text, lineHeight:1.8, margin:"0 0 12px" }}>{item.body}</p>
                {item.why && (
                  <p style={{ fontSize:12, color:c.muted, lineHeight:1.7, margin:"0 0 12px", fontStyle:"italic" }}>{item.why}</p>
                )}
                <div style={{ fontSize:12, background:c.bg, borderRadius:8, padding:"10px 14px", border:`1px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                  <span style={{ color:c.text }}>↳ {item.flag}</span>
                  <a href={item.src} target="_blank" rel="noopener noreferrer" style={{ color:c.blue, fontWeight:700, fontSize:12, textDecoration:"underline", whiteSpace:"nowrap" }}>source ↗</a>
                </div>
              </div>
            ))}

            {/* DATA SOURCES TABLE */}
            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:"22px 24px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:c.heading, marginBottom:16 }}>DATA SOURCES</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${c.border}` }}>
                      {["Data","Source","URL"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"6px 10px", fontSize:10, fontWeight:700, letterSpacing:1, color:c.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["PSA Official CPI","Philippine Statistics Authority","psa.gov.ph",SOURCES.psa],
                      ["Peso depreciation","Bangko Sentral ng Pilipinas","bsp.gov.ph",SOURCES.bsp],
                      ["Rice prices","PSA Price Situationer","psa.gov.ph",SOURCES.da],
                      ["Historical CPI (2000–2014)","World Bank WDI via FRED","fred.stlouisfed.org","https://fred.stlouisfed.org/series/FPCPITOTLZGPHL"],
                    ].map(([data,src,url,href],i,arr)=>(
                      <tr key={data} style={{ borderBottom:i<arr.length-1?`1px solid ${c.border}`:"none" }}>
                        <td style={{ padding:"9px 10px", color:c.text, fontWeight:600 }}>{data}</td>
                        <td style={{ padding:"9px 10px", color:c.text }}>{src}</td>
                        <td style={{ padding:"9px 10px" }}>
                          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color:c.blue, fontWeight:700, textDecoration:"underline", fontSize:12 }}>{url} ↗</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize:12, color:c.muted, marginTop:14, lineHeight:1.7 }}>
                All data is public. All sources are government or multilateral. No proprietary data. These are starting estimates — fork the repo, challenge them, improve them.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop:`1px solid ${c.border}`, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={c.muted} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0 }}>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <a href="https://github.com/privanindivan/philippine-real-inflation" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily:"monospace", fontSize:12, color:c.blue, textDecoration:"underline", fontWeight:600 }}>
            github.com/privanindivan/philippine-real-inflation ↗
          </a>
        </div>
        <span style={{ fontSize:11, color:c.muted }}>Open source — fork it, improve it</span>
      </div>
    </div>
  );
}
