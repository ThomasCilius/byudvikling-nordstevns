/* ===================== Strøby Egede Trafikatlas ===================== */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString('da-DK');
const pct=x=>Math.round(x*100)+' %';
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------- key points (lat, lon) ---------- */
const PT={
  prambro:[55.4214,12.2250], jKoge:[55.4203,12.2232], j1:[55.4162,12.2434], j2:[55.4094,12.2484], j3:[55.4057,12.2545], j4:[55.4005,12.2622],
  bakke:[55.4116,12.2458], school:[55.4011,12.2636], hal:[55.4032,12.2640], elle:[55.4097,12.2509], ege:[55.4154,12.2560], center:[55.4164,12.2424], egehaven:[55.4065,12.2547],
  nicol:[55.4062,12.2586], stroby:[55.3833,12.2829], strobyN:[55.3887,12.2768], lendrumN:[55.4097,12.2720], lendrumMid:[55.4046,12.2692],
  bypassE:[55.3992,12.2638], bypassRiver:SUIT.struktur.statsvej.bridge, bypassW:SUIT.struktur.statsvej.bypass[SUIT.struktur.statsvej.bypass.length-1], valloby:[55.4003,12.2322], herfolge:[55.4138,12.1412], e47:[55.3889,12.0949],
  kogeSt:[55.4580,12.1865], egojeSt:[55.4243,12.1900], ladeplads:[55.4007,12.2998], kystMid:[55.4135,12.2560]
};

/* ---------- geometry helpers ---------- */
const chains=BASE.chains;
function nearestIdx(ch,p){let bi=0,bd=1e9;for(let i=0;i<ch.length;i++){const d=Math.hypot(ch[i][0]-p[0],(ch[i][1]-p[1])*0.568);if(d<bd){bd=d;bi=i;}}return bi;}
function sub(name,k,a,b){const ch=chains[name][k];let i=nearestIdx(ch,a),j=nearestIdx(ch,b);if(i>j){[i,j]=[j,i];const s=ch.slice(i,j+1);return s.reverse();}return ch.slice(i,j+1);}
function lenKm(line){let L=0;for(let i=1;i<line.length;i++){const dy=(line[i][0]-line[i-1][0])*111.32,dx=(line[i][1]-line[i-1][1])*111.32*Math.cos(line[i][0]*Math.PI/180);L+=Math.hypot(dx,dy);}return L;}
function along(line,f){const tot=lenKm(line);let acc=0;for(let i=1;i<line.length;i++){const dy=(line[i][0]-line[i-1][0])*111.32,dx=(line[i][1]-line[i-1][1])*111.32*Math.cos(line[i][0]*Math.PI/180);const s=Math.hypot(dx,dy);if(acc+s>=tot*f){const t=(tot*f-acc)/s;return {p:[line[i-1][0]+t*(line[i][0]-line[i-1][0]),line[i-1][1]+t*(line[i][1]-line[i-1][1])],brg:Math.atan2(dx,dy)*180/Math.PI};}acc+=s;}const n=line.length;return {p:line[n-1],brg:0};}

/* ---------- model network ---------- */
const stevns=chains['Stevnsvej'][0];
const LINKS={
  stevnsS:{name:'Stevnsvej syd (Strøby → Lendrumvej)',geo:sub('Stevnsvej',0,PT.strobyN,PT.j4),cap:950,cls:'main',speed:{today:60,k5:50,k75:50,k10:50}},
  stevnsMid:{name:'Stevnsvej gennem byen (Lendrumvej → Centret)',geo:sub('Stevnsvej',0,PT.j4,PT.j1),cap:950,cls:'main',speed:{today:50,k5:50,k75:40,k10:40}},
  stevnsN:{name:'Stevnsvej nord (Centret → Prambroen)',geo:sub('Stevnsvej',0,PT.j1,PT.prambro),cap:950,cls:'main',speed:{today:50,k5:50,k75:50,k10:50}},
  prambro:{name:'Prambroen (broen over Tryggevælde Å)',geo:sub('Stevnsvej',0,PT.prambro,PT.jKoge),cap:950,cls:'main',speed:{today:50,k5:50,k75:50,k10:50}},
  strandKoge:{name:'Strandvejen gennem Køge (Køge Kommune)',geo:chains['Strandvejen'][0],cap:800,cls:'main',speed:{today:50,k5:50,k75:50,k10:50}},
  kystW:{name:'Kystvejen vest (Centret → Lendrumvej)',geo:sub('Kystvejen',0,PT.j1,PT.lendrumN),cap:450,cls:'tert',speed:{today:40,k5:40,k75:40,k10:40}},
  kystE:{name:'Kystvejen øst (→ Strøby Ladeplads)',geo:sub('Kystvejen',0,PT.lendrumN,PT.ladeplads),cap:450,cls:'tert',speed:{today:40,k5:40,k75:40,k10:40}},
  kogevej:{name:'Køgevej (omfartsvej → Prambroen)',geo:sub('Køgevej',0,PT.jKoge,PT.bypassW),cap:1200,cls:'main',speed:{today:80,k5:80,k75:80,k10:80}},
  lendrum:{name:'Lendrumvej (Stevnsvej ↔ Kystvejen)',geo:sub('Lendrumvej',0,PT.j4,PT.lendrumMid).concat([[55.4069,12.2706],PT.lendrumN]),cap:700,cls:'tert',speed:{today:50,k5:50,k75:40,k10:50}},
  bypass:{name:'Omfartsvej syd om Strøby Egede (ny, kommunal)',geo:SUIT.struktur.statsvej.bypass,cap:1300,cls:'new',speed:{k75:80,k10:80}},
  byband:{name:'Bybåndet (Idrætstorvet → Sydøstplateauet → Strøby Nord)',geo:[],cap:900,cls:'new',speed:{k75:50,k10:50}},
  strandStroby:{name:'Strandvejen (Strøby Ladeplads → Strøby)',geo:chains['Strandvejen'][1],cap:600,cls:'tert',speed:{today:60,k5:60,k75:50,k10:50}},
  statsvej:{name:'Ny statsvej - Alternativ N (illustrativ, syd om Valløby) → E47 ved Herfølge',geo:SUIT.struktur.statsvej.line,cap:1500,cls:'newdash',speed:{k75:90,k10:90}}
};
LINKS.stevnsS.geo=LINKS.stevnsS.geo; // keep
/* dir = outbound direction along geometry: +1 means geometry order = outbound (toward Køge) */
LINKS.byband.dir=-1;LINKS.strandStroby.dir=1;LINKS.stevnsS.dir=1;LINKS.stevnsMid.dir=1;LINKS.stevnsN.dir=1;LINKS.prambro.dir=1;LINKS.strandKoge.dir=-1;LINKS.kystW.dir=1;LINKS.kystE.dir=1;LINKS.kogevej.dir=-1;LINKS.lendrum.dir=-1;LINKS.bypass.dir=1;LINKS.statsvej.dir=1;

/* ---------- scenarios ---------- */
const SCEN={
  today:{P:4900,label:'I dag',bypass:false,statsvej:false,east:false,shift:0},
  k5:{P:5000,label:'5.000 indbyggere',bypass:false,statsvej:false,east:false,shift:0},
  k75:{P:7500,label:'7.500 indbyggere',bypass:true,statsvej:true,east:true,shift:0,south:0.78,kystluk:true},
  k10:{P:10000,label:'10.000 indbyggere',bypass:true,statsvej:true,east:true,shift:0,south:0.80,kystluk:true,ring:true}
};
const PRESETS={
  thomas:{h:3.2,a25:0.72,c:0.80,occ:1.1,pk:0.40,other:0.12,rpop:12500,rwork:0.50,rshare:0.52,south:0.75},
  work:{h:3.2,a25:0.50,c:0.80,occ:1.1,pk:0.40,other:0.12,rpop:12500,rwork:0.50,rshare:0.60,south:0.75},
  calib:{h:3.2,a25:0.72,c:0.30,occ:1.1,pk:0.40,other:0.12,rpop:12500,rwork:0.50,rshare:0.68,south:0.75}
};
let svOn=true;
let A=Object.assign({},PRESETS.thomas);
let preset='thomas';
const SLIDERS=[
  {k:'h',l:'Personer pr. bolig',min:2,max:4,step:0.1,f:v=>v.toFixed(1)},
  {k:'a25',l:'Andel af indbyggere i pendler-aldersgruppen',min:0.45,max:0.8,step:0.01,f:pct},
  {k:'c',l:'Andel af dem, der pendler i bil (mod Køge/København)',min:0.1,max:1,step:0.02,f:pct},
  {k:'occ',l:'Personer pr. bil',min:1,max:1.6,step:0.05,f:v=>v.toFixed(2)},
  {k:'pk',l:'Andel af pendlerne i den travleste time',min:0.25,max:0.55,step:0.01,f:pct},
  {k:'rpop',l:'Resten af Stevns: indbyggere øst for ådalen (Strøby, Store Heddinge, Rødvig, Klippinge m.fl.)',min:8000,max:18000,step:250,f:v=>fmt(v)+' indb.'},
  {k:'rwork',l:'Resten af Stevns: andel i erhvervsaktiv alder (25-64 år)',min:0.40,max:0.60,step:0.01,f:pct},
  {k:'rshare',l:'Resten af Stevns: andel af de 25-64-årige, der kører over Prambroen dagligt (pendling, ærinder, erhverv)',min:0.10,max:1.0,step:0.02,f:pct},
  {k:'south',l:'Andel af ny vækst, der lægges syd/øst for byen',min:0.4,max:0.95,step:0.05,f:pct},
  {k:'shift',l:'Overflytning til cykel, bus og tog (scenariets tiltag)',min:0,max:0.35,step:0.01,f:pct}
];
let shiftOverride=null; // slider for shift overrides the scenario default

function model(sk,par){
  const S=SCEN[sk]; const P=S.P; const base=4900;
  const shift=(shiftOverride==null?S.shift:shiftOverride);
  const H=P/par.h, commuters=P*par.a25*par.c, carsDay=commuters/par.occ;
  const peakOut=carsDay*par.pk*(1-shift);
  const otherOut=H*par.other*0.5;
  const growth=Math.max(0,P-base); const south=(preset==='custom'||par.south!==PRESETS.thomas.south)?par.south:(S.south||par.south);
  let zN=0.40*base+(1-south)*0.6*growth, zK=0.25*base+(1-south)*0.4*growth, zS=0.35*base+south*growth;
  const tot=zN+zK+zS; zN/=tot; zK/=tot; zS/=tot;
  const E=peakOut+otherOut, EN=E*zN, EK=E*zK, ES=E*zS;
  const Tadt=par.rpop*par.rwork*par.rshare*2;   // biler pr. døgn over Prambroen fra resten af Stevns (frem og tilbage)
  const Tout=Tadt*0.10*0.65, Tst=Tout*0.85, Tky=Tout*0.15;
  const useSv=S.statsvej&&svOn;
  const f={};
  const eastDiv=S.east?0.40*EK:0;              // Lendrumvej åbnet: Brinken/Skrænten/kystbyen kører mod syd           // østlig fordelingsvej: kysttrafik via Lendrumvej → omfartsvej
  const closed=!!S.kystluk;                       // Kystvejen lukket for gennemkørsel ved udsigten (tovejs lokalvej)
  const TkyW=closed?0:Tky, TkyS=closed?Tky:0;     // Ladeplads-trafik via Kystvejen vest eller via Strandvejen/Strøby
  if(!S.bypass){
    f.stevnsS=ES+Tst+TkyS; f.kystE=TkyW+0.3*EK; f.kystW=TkyW+EK; f.lendrum=0.1*EK; f.strandStroby=0.3*Tky+TkyS; f.byband=0;
    f.stevnsMid=ES+Tst+TkyS+0.5*EN; f.stevnsN=E+Tout; f.prambro=f.stevnsN; f.kogevej=0; f.bypass=0; f.statsvej=0; f.strandKoge=f.stevnsN;
  }else{
    const viaBp=0.85*(Tst+TkyS)+0.70*ES+eastDiv;
    f.bypass=viaBp; f.stevnsS=0.30*ES+0.15*(Tst+TkyS); f.kystE=TkyW+0.3*EK; f.kystW=TkyW+EK-eastDiv; f.lendrum=eastDiv+0.1*EK; f.strandStroby=0.3*Tky+TkyS+(closed?0.3*EK:0); f.byband=0.55*0.70*ES;
    if(S.ring){const pl=0.25*0.70*ES; f.byband-=pl; f.stevnsS+=pl;}   // Plateauporten/Strøbyporten: en fjerdedel af plateauet kører direkte på Stevnsvej syd
    f.stevnsMid=0.30*ES+0.15*(Tst+TkyS)+0.5*EN; f.stevnsN=EN+(EK+TkyW-eastDiv)+0.30*ES+0.15*(Tst+TkyS); f.prambro=f.stevnsN;
    if(useSv){f.statsvej=viaBp*0.75; f.kogevej=viaBp*0.25;}else{f.statsvej=0; f.kogevej=viaBp;}
    f.strandKoge=f.stevnsN+f.kogevej;
  }
  const adtE=carsDay*2*(1-shift)+H*2.4*0.6;
  const delay=vc=>vc<0.7?1:vc<0.85?2:vc<1?4+(vc-0.85)/0.15*6:10+30*(vc-1);
  const dN=Math.max(delay(f.stevnsN/LINKS.stevnsN.cap),delay(f.strandKoge/LINKS.strandKoge.cap))+1;
  const dS=S.bypass?(useSv?Math.max(delay(f.bypass/LINKS.bypass.cap),delay(f.statsvej/LINKS.statsvej.cap)):Math.max(delay(f.bypass/LINKS.bypass.cap),delay(f.kogevej/LINKS.kogevej.cap),delay(f.strandKoge/LINKS.strandKoge.cap))):Math.max(delay(f.stevnsMid/LINKS.stevnsMid.cap),dN);
  return {P,H,commuters,carsDay,peakOut,E,Tout,Tadt,adt:adtE+Tadt,flows:f,shift,zN,zK,zS,useSv,dN,dS};
}
function los(vc){return vc<0.6?1:vc<0.8?2:vc<=1.0?3:4;}
const LOSN={1:'Frit flow',2:'Tæt trafik',3:'Ved kapacitetsgrænsen',4:'Overbelastet - køen vokser'};

/* ---------- measures (tiltag) ---------- */
const coastLine=BASE.coast_chain.filter(p=>p[1]>12.226&&p[1]<12.300);
const loop=[PT.center,PT.j1,[55.4166,12.2450],[55.4160,12.2500],[55.4150,12.2545],PT.ege,[55.4140,12.2600],[55.4120,12.2660],PT.lendrumN,[55.4069,12.2706],PT.lendrumMid,PT.hal,PT.school,PT.j4,[55.4025,12.2600],PT.nicol,PT.egehaven,PT.j3,[55.4080,12.2510],PT.elle,PT.j2,PT.bakke,[55.4140,12.2440],PT.center];
const superc=sub('Stevnsvej',0,PT.j1,PT.jKoge).concat(chains['Strandvejen'][0].slice().reverse()).concat([[55.4560,12.1870],PT.kogeSt]);
const ETA=SUIT.etaper; const ETAPE={}; ETA.forEach(e=>ETAPE[e.id]=e);
const STRU=SUIT.struktur, ERHV=SUIT.erhverv, BUILT=SUIT.built||{}, GREEN=SUIT.green||[];
LINKS.byband.geo=STRU.byband;
const BUILT_IDS={today:[],k5:['3B11','3B12'],k75:['3B11','3B12','E0','E1','E2','N1','N2'],k10:['3B11','3B12','E0','E1','E2','N1','N2','E3','E5','S1V','E8']};
const REST=SUIT.rammer.filter(r=>r.nr==='3 B11'||r.nr==='3 B12');
const MEAS=[
 {id:'wave',s:['today','k5'],w:'upg',sym:'signal',t:'Grøn bølge og busprioritet i signalanlæggene',e:'Koordinér Lendrumvej-Hybenrosevej-(Valnøddevej)-Kystvejen i spidsretningen. +10-15 % kapacitet uden anlæg.',geo:{line:LINKS.stevnsMid.geo,cls:'upg'},at:PT.j3,
  d:'Trafikplanen oplyser, at de tre signalanlæg på Stevnsvej er trafikstyrede med radar/kamera. Næste skridt er samordning (grøn bølge) mod Køge kl. 6-9 og mod byen kl. 15-18 samt busprioritet for 108/109/251/254. Det er det billigste kapacitetstiltag, der findes, og det bør ligge før alle anlæg.'},
 {id:'rk1',s:['today','k5'],w:'upg',sym:'rundk',t:'Rundkørsel Stevnsvej/Kystvejen/Centret',e:'Sort plet (4 uheld 2019-23, 2 personskadeuheld). Rundkørsel fjerner venstresvings-konflikten og giver 15-25 % mere krydskapacitet.',at:PT.j1,
  d:'Krydset er udpeget som sort plet i Trafikplan 2025-2029 (detailanalyse besluttet). Med 4.400 biler/døgn fra Kystvejen og over 13.000 på Stevnsvej er det byens vigtigste knudepunkt. En tosporet-tilfart rundkørsel med cykelsti i eget tracé og hævede krydsninger løser både uheld og kapacitet. Alternativ: bevar signalet, men giv Kystvejen en separat højresvingsbane mod Køge (morgenbevægelsen).'},
 {id:'sc1',s:['today','k5','k75','k10'],w:'cycle',sym:'cycle',t:'Supercykelsti Strøby Egede - Køge Station (7 km)',e:'Den dobbeltrettede sti langs Stevnsvej opgraderes (bredde, belysning, prioritet i kryds) og forbindes til Køges net. E-cykel: 20-25 min.',geo:{line:superc,cls:'cycle'},at:PT.prambro,
  d:'10 % af pendlerne på cykel eller bus svarer i 7.500-scenariet til 120-170 biler færre pr. spidstime - mere end en ekstra svingbane giver. Stien findes i dag som dobbeltrettet cykelsti langs Stevnsvej; det, der mangler, er Køge-siden (Strandvejen) og kvaliteten. Kræver aftale med Køge Kommune og kan søges i statens cykelpulje.'},
 {id:'pr',s:['today','k5','k75','k10'],w:'upg',sym:'pr',t:'Pendlerplads og bus-knudepunkt ved Prambroen/Køgevej',e:'Samkørsel og park & ride dér, hvor Kystvejen-, Køgevej- og Stevnsvej-trafikken mødes, med stop for bus 108/109/251/254.',at:PT.jKoge,
  d:'Alle biler fra Øststevns passerer punktet. En pendlerplads med 60-100 pladser, cykelparkering og et rigtigt busstop gør samkørsel og bus til et reelt valg, før man sidder i køen på Strandvejen. Grunden vest for åen ligger uden for Natura 2000-afgrænsningen (skal verificeres).'},
 {id:'sp50',s:['today','k5'],w:'down',sym:'sp50',t:'Stevnsvej 60 → 50 km/t fra Lendrumvej til bytavlen',e:'Ønsket i Trafikplanen; harmoniserer hastigheden forbi skole og idrætscenter og gør signalet ved Lendrumvej sikrere.',geo:{line:LINKS.stevnsS.geo.slice(-6),cls:'down'},at:[55.3990,12.2645]},
 {id:'bakke',s:['today','k5'],w:'upg',sym:'haevet',t:'Sikker krydsning ved Bakkegårdsvej: hævet flade i den grønne bølge',e:'Høringen bad om en tunnel. Inde i bygaden (40-50 km/t) er en hævet, signalreguleret krydsning i den grønne bølge tryg nok - tunnellerne prioriteres, hvor bilerne er flest (Prambroen, Centret, Sydporten) og ved skole og institutioner.',at:PT.bakke},
 {id:'valn',s:['today','k5'],w:'upg',sym:'signal',t:'Signalanlæg Valnøddevej (planlagt) - det sidste på Stevnsvej',e:'Trafikplanen planlægger et 4. signal. Sæt som princip, at videre udstykning samles på én fordelingsvej og ét kryds.',at:PT.j2},
 {id:'kyst',s:['today','k5','k75','k10'],w:'warn',sym:'sp40',t:'Kystvejen: fasthold 40 km/t og læg ikke mere trafik på',e:'6 m vejudlæg, 4.400 biler/døgn, opkørte rabatter. Kan ikke udvides uden ekspropriation. Ny trafik (marina, konvertering af sommerhuse) skal ledes til Stevnsvej-siden.',geo:{line:LINKS.kystW.geo,cls:'warn'},at:PT.kystMid},
 {id:'princip',s:['k5'],w:'area',sym:'area',t:'Udstykningsprincip fra næste lokalplan',e:'Mindst to vejadgange pr. område, intern fordelingsvej og højst ét nyt kryds på Stevnsvej (rundkørsel). Ikke "ét signalanlæg pr. udstykning". Restrummeligheden i dag: Nicolinelund 3.1 og 3.2, 11 ha.',geo:{rest:true},at:[55.4083,12.2615],
  d:'Hybenrosevej-modellen (nyt signalanlæg 2024 for at få Strandroseparken, Nimgården og Nicolinelund ud på Stevnsvej) virker ved 5.000, men hvert nyt signal koster 5-10 % kapacitet på Stevnsvej. Fra 5.000 og op skal nye områder hænge sammen indbyrdes og med Lendrumvej, så de kan kobles på omfartsvejen senere.'},
 {id:'reserv',s:['k5'],w:'new',sym:'reserve',t:'Arealreservation: omfartsvej + statsvej + østlig fordelingsvej',e:'Vejdirektoratets to principielle linjeføringer er tilbage i Kommuneplan 2025. Tilføj kommunens egne korridorer, så ingen lokalplan bygger dem til.',geo:{line:LINKS.bypass.geo.concat(LINKS.statsvej.geo.slice(1)),cls:'reserve'},at:PT.bypassRiver},
 {id:'bp',s:['k75','k10'],w:'new',sym:'newroad',t:'Omfartsvej syd om byen (kommunal, 80 km/t)',e:'Fra Stevnsvej ved Strøbyskolen over Ådalen til Køgevej. Tager gennemkørende trafik og 70 % af den sydlige bydel uden om byen.',geo:{line:LINKS.bypass.geo,cls:'new'},at:PT.bypassRiver,
  d:'Samme princip som det projekt, der fik 12,7 mio. kr. i budget 2010 og blev afvist af Natur- og Miljøklagenævnet i april 2013 på grund af rigkær i Ådalen (KB 30-05-2024, pkt 549). Krydsningen skal derfor projekteres som landskabsbro på piller - ikke dæmning - og miljøvurderes sammen med statsvejen. Linjeføringen her er illustrativ.'},
 {id:'sv',s:['k75','k10'],w:'new',sym:'newdash',t:'Statsvejen: én kontinuerlig linje fra Sydporten til E47 - nordvendt mod København',e:'Omfartsvej og statsvej er samme vej: Sydporten → landskabsbro over ådalen → tilslutning Valløby (Køgevej) → syd om Vedskølle → tilslutning Herfølge (Vordingborgvej) → E47 afkørsel 34 med fuld tilslutning, så pendleren kører direkte på i nordgående retning. Mindst 400-600 m til alle landsbyer; vejen føres i afgravning over markerne med landbrugs- og faunapassager.',geo:{line:LINKS.statsvej.geo,cls:'newdash'},at:[55.3928,12.2100],
  d:'Vejdirektoratets screening (marts 2023) regner med 9.000-12.000 køretøjer/døgn midt på den nye vej og 15-20 % aflastning af Strandvejen i Køge. Alle screenede linjeføringer krydser Natura 2000-området Tryggevælde Ådal. Linjeføringen på kortet er en skitse af det nordlige alternativ: 10 km, syd om Valløby (485 m til byzonen), syd om Vedskølle (620 m), syd om Tessebølle (400 m) og nord om Sædder (530 m) - ingen landsby får vejen tættere på end 400 m. Den faktiske linje fastlægges i miljøkonsekvensvurderingen.'},
 {id:'bygade',s:['k75','k10'],w:'down',sym:'byport',t:'Stevnsvej bliver bygade: byporte og 40 km/t gennem byen',e:'Når omfartsvejen åbner, nedklassificeres strækningen Lendrumvej-Centret: byporte, hævede flader, krydsninger og cykelsti i niveau. Byen får sin hovedgade tilbage.',geo:{line:LINKS.stevnsMid.geo,cls:'down'},at:[55.4075,12.2515]},
 {id:'knude',s:['k75','k10'],w:'upg',sym:'rundk',t:'Lendrumvej-knuden: rundkørsel med sikret stikrydsning',e:'Skole + Strøbyhallen + daginstitution + omfartsvejens tilslutning i samme kryds. Skoletrafik adskilles fra gennemkørende; hævet eller niveaufri krydsning for de bløde.',at:PT.j4,
  d:'Det bliver byens nye hovedindgang: morgenspids fra syd og aftenspids (17-21) til hallen og skolen. En rundkørsel med bypass-ben mod omfartsvejen, fodgænger-/cykelkrydsninger på hævede flader og en separat sløjfe for afsætning ved skolen (kiss & ride) skal designes, før medborgerhuset åbner - ikke efter.'},
 {id:'marina',s:['k75','k10'],w:'upg',sym:'marina',t:'Marina ved Bådklubben Ege (600 både): adgang og parkering',e:'Sommerlørdag: ca. 300 bilture hver vej, spids 80-120 biler/t, P-behov ca. 300 pladser. Adgang fra Stevnsvej via Kystvejens vestligste 600 m - ikke gennem sommerhusområdet.',geo:{line:sub('Kystvejen',0,PT.j1,[55.4150,12.2530]),cls:'upg'},at:PT.ege,
  d:'Marinatrafik ligger uden for hverdagens morgenspids, men rammer Kystvejen, der ikke kan bære mere. Løsning: P-anlæg på landsiden af Kystvejen tæt på Centret, tydelig vejvisning fra Stevnsvej, cykel-/gangadgang ad promenaden, og bådtrailer-rampe med egen adgang. Belægningstal er antagelser (35 % af bådene i brug på en god dag, 1,5 biler pr. tur) - de skal efterprøves i marinaens forundersøgelse.'},
 {id:'hal',s:['k75','k10'],w:'upg',sym:'hall',t:'Udbygget Strøbyhallen (Idrætstorvet) ved skolen',e:'Aftenspids 17-21: 200-300 bilankomster pr. aften, P deles med skolen. Kræver at Lendrumvej-knuden virker om aftenen og at sløjfen giver cykel-/gangadgang. Kulturhuset i Ellehallen ligger 1,1 km mod nordvest på Ellevej og har sin egen adgang fra Stevnsvej.',at:PT.hal},
 {id:'prom',s:['k75','k10'],w:'cycle',sym:'prom',t:'Kystpromenade (kystprojektet)',e:'Den hårde mole + promenade giver en ny cykel-/gangforbindelse langs vandet fra Vallø Strand til Strøby Ladeplads og tager de bløde trafikanter af Kystvejen.',geo:{line:coastLine,cls:'prom'},at:[55.4185,12.2400]},
 {id:'loop',s:['k75','k10'],w:'cycle',sym:'loop',t:'Sammenbindingssløjfen (5 km cykel- og gangring)',e:'Centret - marina - kysten - Lendrumvej - Strøbyhallen - Strøbyskolen - Nicolinelund - Egehaven - Ellehallen - Centret. Binder byens nye mødesteder sammen uden bil.',geo:{line:loop,cls:'loop'},at:[55.4120,12.2660],
  d:'"At binde sammen" bliver konkret her: en skiltet ring med belysning, hævede krydsninger og stier gennem de nye områder. Sløjfen er den fysiske rygrad i fortællingen om Strøby Egede som levende kystby - marina, medborgerhus, hal, skole og center i én bevægelse. Linjeføringen er illustrativ.'},
 {id:'areas75',s:['k75'],w:'area',sym:'area',t:'Boligetaper E0-E2: Stolpegården, Lendrumvej-kilen og Idrætstorvets bydel (ca. 58 ha, ca. 735 boliger)',e:'Først hullet på Stolpegårdens jorder (matr. 8iq), så Lendrumvej-kilen og bydelen syd for skolen. Sammen med de 11 ha restrummelighed giver det ca. 7.650 indbyggere. Se afsnittet "Boliger og erhverv".',geo:{etaper:['E0','E1','E2']},at:[55.4060,12.2680]},
 {id:'areas10',s:['k10'],w:'area',sym:'area',t:'Boliger ved 10.000: Ådalskanten, Sydøstplateauet, Kystbyen ned mod vandet og Strøby Nord',e:'E3 vest for Stevnsvej, E5 på plateauet, konvertering af sommerhusområdets vestlige 34 ha til helårs (S1-Vest) og afrundingen ved Strøby Nord. E6 og E7 holdes som reserver (E7 plantes som Sydskoven). Giver ca. 9.900 indbyggere; skole nr. 2 reserveres i E5.',geo:{etaper:['E3','E5','S1V','E8']},at:[55.4000,12.2900]},
 {id:'east',s:['k10'],w:'new',sym:'newroad',t:'Østlig fordelingsvej: Lendrumvej opgraderes Kystvejen ↔ omfartsvej',e:'Giver kystbyen og de østlige områder en udvej til omfartsvejen uden om Centret. Tager ca. 40 % af Kystvejen-trafikken i spidsen.',geo:{line:LINKS.lendrum.geo.concat([[55.3995,12.2630],PT.bypassE]),cls:'new'},at:PT.lendrumMid},
 {id:'bus',s:['k10'],w:'upg',sym:'bus',t:'Bus hver 10. minut Strøby Egede - Køge St. med prioritet hele vejen',e:'Ved 10.000 er 20 % overflytning en forudsætning, ikke et ønske. Busbaner/prioritet på Strandvejen kræver aftale med Køge og Movia.',geo:{line:LINKS.stevnsN.geo.concat(LINKS.prambro.geo).concat(chains['Strandvejen'][0].slice().reverse()),cls:'bus'},at:[55.4340,12.2060]},
 {id:'sc2',s:['k10'],w:'cycle',sym:'cycle',t:'Supercykelsti, gren 2: Billesborgvej → Egøje Station (Østbanen)',e:'3,5 km fra Prambroen til Egøje St. giver togadgang mod Køge/Roskilde uden at køre ind gennem Køge.',geo:{line:sub('Billesborgvej',1,[55.4285,12.2139],PT.egojeSt).concat([PT.egojeSt]),cls:'cycle'},at:[55.4260,12.2000]},
 {id:'bp21',s:['k10'],w:'upg',sym:'newroad',t:'Omfartsvej i 2+1-profil og rundkørsler dimensioneret til 1.300+ biler/t',e:'Ved 10.000 nærmer omfartsvejen sig kapacitet i stresstesten. Reservér bredde til 2+1 og to-sporede tilfarter fra start.',geo:{line:LINKS.bypass.geo,cls:'upg'},at:[55.3980,12.2560]},
 {id:'hub',s:['k10'],w:'upg',sym:'bus',t:'Mobilitetshub ved Strøby Egede Center',e:'Bus, delebiler, ladestandere, cykelparkering og pakkeboks samlet dér, hvor byen alligevel handler.',at:PT.center},
 {id:'passager',s:['k75','k10'],w:'new',sym:'bridge',t:'Statsvejen i afgravning: overførte veje og landbrugs-/faunapassager',e:'Vejen sænkes 4-6 m ned i terrænet over markerne. De 7 eksisterende veje, den krydser, føres over på broer, og mellem dem lægges landbrugs- og faunapassager for hver ca. 900 m, så landmænd, maskiner og dyr kan krydse uden at møde trafikken. Afgravningen dæmper samtidig støj og skjuler vejen i landskabet.',at:[55.3938,12.1990],
  d:'Sådan bygges nye statsveje i åbent land i dag (fx Kalundborgmotorvejen): afgravning hvor terrænet tillader det, dæmning kun over ådalen (her bro). Passagerne dimensioneres til landbrugsmaskiner (min. 4,5 m fri højde/bredde) og kombineres med faunahegn. Kortet viser overføringer (broer) og passager som symboler - placeringen fastlægges med lodsejerne i miljøkonsekvensvurderingen.'},
 {id:'tilslut',s:['k75','k10'],w:'upg',sym:'rundk',t:'Tilslutninger: Sydporten, Valløby, Vedskølle/Vallø, Herfølge og E47',e:'Fem tilslutninger på 11 km: Sydporten (Strøby Egede), Køgevej (Valløby), Grubberholmsvej (Vedskølle og Vallø), Vordingborgvej (Herfølge) og E47 afkørsel 34 med ramper i begge retninger. Landsbyerne får vejen som udkørsel - ikke som gennemkørsel.',at:[55.3950,12.1808]},
 {id:'ring',s:['k10'],w:'upg',sym:'rundk',t:'Ringen: plateauet direkte på Stevnsvej med to nye rundkørsler',e:'Plateauvejen (570 m) fra Bybåndet ved E5 til Plateauporten på Stevnsvej syd, og Strøbyporten hvor Bybåndet, Strandvejen og Stevnsvej mødes ved Strøby Nord. E5, E6 og Strøby Nord får to veje ud - Bybåndet til Sydporten eller Stevnsvej syd - og Lendrumvej-knuden ved skolen aflastes.',geo:{line:STRU.ring.plateauvej,cls:'new'},at:STRU.ring.plateauporten,
  d:'Uden ringen samles al trafik fra E2, E5, E6 og Strøby Nord i rundkørslen ved skolen. Med ringen (Bybåndet - Plateauporten - Stevnsvej syd - Sydporten - Lendrumvej-knuden - Bybåndet) fordeles den, og Stevnsvej syd bliver en fordelingsvej med rundkørsler ved hver bydel i stedet for kryds. Stevnsvej syd bevarer 50-60 km/t uden for byporten; cyklister krydser aldrig i niveau (tunneller ved begge rundkørsler).'},
 {id:'tunneller',s:['k75','k10'],w:'cycle',sym:'tunnel',t:'Børnevenlig by: 13 cykeltunneller, hvor bilerne er flest eller ved skole og institution',e:'Tunnel/underføring ved Prambroen, Centret, Sydporten, Plateauporten, Strøbyporten og Køgevej (mange biler) samt ved Strøbyskolen, Hybenrosevej/Egehaven og skole nr. 2 i E5 (knudepunkter). De øvrige 13 krydsninger inde i byen og på Kystvejen er hævede flader eller signal i niveau.',at:[55.4162,12.2434],
  d:'Reglen: niveaufri krydsning, hvor en fordelingsvej har mange biler, eller hvor stien fører til skole, hal, daginstitution eller plejecenter; inde i bygaden (40 km/t) og på lokalveje er hævede flader i den grønne bølge tryg nok. Krydsningerne er fundet geometrisk (cykelnet × hovedveje, > 30°) og klassificeret efter afstand til de travle rundkørsler og institutionerne. En tunnel koster typisk 8-15 mio. kr. i åbent land og mere i by; de bygges sammen med vejene, ikke bagefter.'},
 {id:'kogelink',s:['k75','k10'],w:'upg',sym:'rundk',t:'Køgevej-linket: fra Valløby-tilslutningen nord til Prambroen',e:'Omfartsvejen møder Køgevej i en rundkørsel mellem ådalen og Valløby, 485 m fra landsbyens huse. 2,3 km Køgevej opgraderes (80 km/t, cykelsti), og krydset Prambroen/Strandvejen bygges om til rundkørsel - pendlerruten mod København, indtil statsvejen står færdig.',geo:{line:LINKS.kogevej.geo,cls:'upg'},at:[55.4100,12.2300],
  d:'Slå "Statsvej bygget" fra i panelet og se, hvad ruten alene kan: al omfartsvejstrafik samles på Køgevej og skal stadig gennem Køge. Køgevej-linket er derfor etape 1, statsvejen etape 2 - men det er den samme rundkørsel ved Valløby, der bruges til begge.'},
 {id:'sydport',s:['k75','k10'],w:'upg',sym:'pr',t:'Sydporten: rundkørsel, pendlerplads og busstop ved omfartsvej/Stevnsvej syd',e:'Her mødes omfartsvej, Stevnsvej syd, Bybåndet og erhvervsbåndet. Pendlerplads (samkørsel, ladestandere) og bus mod Køge, så den sydlige halvdel af byen aldrig kører gennem byen.',at:[55.3992,12.2638]},
 {id:'hjerte',s:['k75','k10'],w:'down',sym:'byport',t:'Hjertezonen: 30 km/t og hævede flader om Idrætstorvet og skolen',e:'Skole, Strøbyhallen, daginstitution og Bybåndets start i samme zone. Biler er gæster: 30 km/t, hævede krydsninger, kiss & ride væk fra stikrydsningerne.',at:[55.4030,12.2640]},
 {id:'erhv1',s:['k75'],w:'new',sym:'erhv',t:'Erhvervsbåndet ved omfartsvejen: N1 kontor (4 ha) + N2 e-handel/lager (6 ha)',e:'Videnstunge arbejdspladser tæt på skolen og Idrætstorvet, logistik direkte på omfartsvejen. Bygningerne er støjskærm for E3/E7 - og modstrøms-pendling fylder den tomme retning.',geo:{erhv:['N1','N2']},at:[55.3975,12.2615]},
 {id:'erhv2',s:['k10'],w:'new',sym:'erhv',t:'Erhverv ved 10.000: Statsvejsporten (option, 9 ha) + kontor i Idrætstorvet og bymidten',e:'Logistik flyttes helt uden for byen til Køgevej/statsvejen; kontorer og klinikker bygges ind i Idrætstorvets og Centrets blandede bebyggelse (ramme 3 C2).',geo:{erhv:['N3']},at:[55.3963,12.2408]},
 {id:'kultur',s:['k75','k10'],w:'upg',sym:'kultur',t:'Kulturhuset i Ellehallen (Ellevej): sal, café, bibliotek og tankesport',e:'Ellehallen = kulturhus og medborgerhus med sal til 200 (teater, biograf, koncert), café og tankesport; biblioteket (Kystvejen 7A i dag) kan flytte med. Ligger på Ellevej 2 midt i boligkvartererne, 160 m fra Stevnsvej - 900 m fra Centret, 800 m fra Stolpegården, 200 m fra Ådalskanten (E3), 1,2 km fra skolen. Strøbyhallen ved skolen udbygges med café (Idrætstorvet).',at:PT.elle,
  d:'Visionsplanen for Strøby Idrætscenter (KB 20-11-2025, pkt 814; 17,5 mio. kr. i overslagsårene) afgør i 2026, om Ellehallen bevares eller udstykkes. Kulturhuset giver den et program, der bærer: sal, bibliotek, café og foreningsliv - og den ligger, hvor byen bor: Nimgården, Ellevej, Nicolinelund og Stolpegården inden for 10 minutters gang.'},
 {id:'havnehus',s:['k75','k10'],w:'upg',sym:'rest',t:'Havnehuset: restaurant og café ved Bådklubben Ege',e:'Restaurant med udsigt over bugten, sejlerskole og kultur på aktivitetsbroen. Adgang fra Stevnsvej via Kystvejens vestligste 600 m; P på landsiden; promenaden bringer gæsterne til fods.',at:[55.4150,12.2545]},
 {id:'lendrumopen',s:['k75','k10'],w:'new',sym:'newroad',t:'Lendrumvej åbnes: Brinken, Skrænten og kystbyen får en udkørsel mod syd',e:'De 250 m af Lendrumvej, der i dag er cykelsti (mellem Stolpegårdsvej-området og Skrænten), bliver vej med sti ved siden af. Så kan Brinken, Skrænten og hele Ved Kystvejen-området køre mod syd til Lendrumvej-knuden og Sydporten i stedet for vestpå ad Kystvejen.',geo:{line:[[55.4053,12.2679],[55.4069,12.2706]],cls:'new'},at:[55.4061,12.2692],
  d:'Det er svaret på "en anden mulighed end Kystvejen": i dag er Lendrumvej afbrudt af en cykelsti midt på, så alt fra Brinken/Skrænten skal ud ad Kystvejen til det sorte kryds. Åbningen + lukningen af Kystvejen ved udsigten vender strømmen mod syd. Lendrumvej skal have fordelingsvejsprofil (cykelsti, 40 km/t forbi skolen) og bump/indsnævringer, så den ikke bliver smutvej for andre.'},
 {id:'kystluk',s:['k75','k10'],w:'down',sym:'luk',t:'Kystvejen lukkes for gennemkørsel ved udsigten - tovejs lokalvej, ikke ensrettet',e:'Bussluse/cykelpassage mellem udsigten og Strandvejen. Strøby Ladeplads kører ad Strandvejen til Strøby og videre ad Stevnsvej syd (7.500) eller Bybåndet (10.000) til Sydporten. Kystvejen forbliver tovejs på begge sider: 40 km/t, promenadens gæster, sommerhusområdet.',geo:{line:LINKS.strandStroby.geo,cls:'upg'},at:[55.4045,12.2905],
  d:'Det tager den eneste gennemkørende trafik af den 6 m smalle Kystvejen og fjerner presset på det sorte kryds ved Centret fra øst. Prisen er 2-3 km omvej for Ladeplads-beboere mod Køge, og Strandvejen (2-1 vej, i dag 60/50 km/t) skal have fortov og 50 km/t hele vejen. Strøby Bygade er sort strækning - ved 10.000 skal trafikken derfor ad Bybåndet fra Strøby Nord, ikke gennem Strøby.'},
 {id:'prom1',s:['k75','k10'],w:'cycle',sym:'prom',t:'Strandpromenaden etape 1 + aktivitetsbroen: fra badebroerne ved Stevnsvej til marinaen',e:'1,3 km promenade oven på kystsikringens mole fra Solgårdsparken/badebroerne til Havnehuset og marinaen (600 både), og aktivitetsbroen mod øst som det rekreative bindeled - "øen" i en lav-impact-udgave på pæle, fordi den kunstige ø faldt på fredningsforslaget for Køge Bugt.',geo:{line:STRU.promenade1,cls:'prom'},at:[55.4185,12.2425]},
 {id:'skel',s:['k75','k10'],w:'down',sym:'cross',t:'Trafikskel: ny trafik kører aldrig gennem gamle kvarterer',e:'Hver etape har sin egen tilslutning til en fordelingsvej (Lendrumvej, Bybåndet, Ådalsvej, Sydporten). Mellem nye og eksisterende kvarterer er der kun stier - ingen vejforbindelser, der kan blive smutveje. Nicolinelunds veje og eng forbliver deres: engen bruges som eng, ikke som E0s park.',at:[55.4085,12.2690]},
 {id:'kiler',s:['k75','k10'],w:'cycle',sym:'park',t:'Kystkiler: grønne bånd fra plateauet til stranden',e:'K1 fra Lendrumvej-kilen, K2 og K3 fra Sydøstplateauet: sti, træer og "strandport" for enden. Alle nye boliger får kysten inden for 10-15 min gang - uden at bygge ved vandet.',at:[55.4100,12.2715]},
 {id:'ladeplads',s:['k10'],w:'cycle',sym:'marina',t:'Strøby Ladeplads: østligt kystknudepunkt med havn, strand og Vejs Ende',e:'Garderhøjens Havn, badestrand, strandrestaurant/badehotel og det 27 ha rekreative område "Vejs Ende" (ramme 3 R3) bliver plateauets kyst - 1-1,5 km fra E5/E6 ad kystkilerne.',at:[55.4000,12.3179]},
 {id:'byskov',s:['k10'],w:'cycle',sym:'park',t:'Strøby Egede Byskov: 20 ha bynær skovrejsning øst for E6',e:'Motionsskov, læ og drikkevandsbeskyttelse på det høje plateau - uden for kirkeomgivelser og bevaringsværdigt landskab. Kan søges via statens/kommunens skovrejsningsordninger.',at:[55.3922,12.2940]},
 {id:'stroby',s:['k10'],w:'new',sym:'shop',t:'Strøby kobles på: Bybåndet ender ved den nye Brugsen (Strøby Nord)',e:'Vej, cykelsti og bus fra Idrætstorvet til Strøbys nordkant, hvor Trafikplanen flytter Dagli’Brugsen ud. Fælles skole, butik og sti - Kirkekilen holder de to byer adskilte. Strøby Bygade (sort strækning) aflastes.',geo:{line:STRU.byband,cls:'new'},at:[55.3878,12.2790]},
 {id:'valloby',s:['k75','k10'],w:'cycle',sym:'cycle',t:'Valløby kobles på: Ådalsstien over landskabsbroen',e:'Cykel-/gangsti fra Strøbyskolen over ådalen til Valløby (1,5 km) som del af naturparken. Ingen boliger i ådalen - koblingen er vej (omfartsvej), sti og udsigt.',geo:{line:STRU.aadalssti,cls:'loop'},at:[55.3996,12.2405]},
 {id:'koge',s:['k75','k10'],w:'warn',sym:'warn',t:'Kapacitetsaftale med Køge om Strandvejen/Søndre Viaduktvej',e:'Køge-strækningen er ikke Stevns\' vej, men den afgør pendlernes rejsetid. Statsvejens 15-20 % aflastning rækker ikke ved 10.000.',geo:{line:chains['Strandvejen'][0],cls:'warn'},at:[55.4400,12.1980]}
];

/* ---------- story text per scenario ---------- */
const STORY={
 today:`<h2>Analyse · i dag</h2>
 <h3>Én vej ind, én vej ud - og én bro</h3>
 <p>Stevnsvej gennem Strøby Egede er kommunens mest trafikerede vej med <b>over 13.000 biler i døgnet</b>, fordi den er vejen ind og ud for al trafik til Øststevns (Trafikplan 2025-2029, afsnit 6.1). Trafikplanen beskriver selv <b>kø morgen og eftermiddag fra Kystvejen til Prambroen</b>. Kystvejen leverer 4.400 biler/døgn på et vejudlæg på kun 6 m, og krydset Stevnsvej/Kystvejen er udpeget som sort plet.</p>
 <p>Byen har tre signalanlæg på Stevnsvej (Kystvejen/Centret, Hybenrosevej fra 2024 og Lendrumvej) og et fjerde på vej ved Valnøddevej. Hvert nyt signal koster kapacitet på hovedvejen. Prambroen er byens eneste bro over Tryggevælde Å - kommunen har kun to vejbroer over åen i alt.</p>
 <h3>Hvad modellen siger</h3>
 <p id="story-model"></p>
 <h3>Optimal i dag: "no regret"-pakken</h3>
 <p>Det, der giver mest kapacitet pr. krone uden at foregribe omfartsvejen: grøn bølge og busprioritet, rundkørsel i det sorte kryds, supercykelsti til Køge Station, pendlerplads ved Prambroen og 50 km/t helt ud til bytavlen. Alle seks tiltag ligger på listen nedenfor og kan vises på kortet.</p>`,
 k5:`<h2>Analyse · 5.000 indbyggere</h2>
 <h3>5.000 er ikke et scenarie - det er nu</h3>
 <p>Fra ca. 4.900 til 5.000 er kun 2 % mere trafik. Kapacitetsmæssigt ændrer intet sig, og "no regret"-pakken fra i dag er stadig svaret. Det, der skifter ved 5.000, er <b>principperne</b>: det er sidste udkald for at låse, hvordan al videre udstykning kobles på vejnettet, og for at reservere arealer til omfartsvej, statsvej og en østlig fordelingsvej.</p>
 <p id=\"story-model\"></p>
 <p>Kortet viser Nicolinelund etape 3.1 og 3.2 udbygget (11 ha, ca. 130 boliger) - det er restrummeligheden, der bringer byen til 5.000 uden nye arealudlæg.</p>
 <h3>Hvad der skal besluttes ved dette trin</h3>
 <p>1) Ingen flere signalanlæg på Stevnsvej efter Valnøddevej - nye områder samles på en fordelingsvej. 2) Mindst to vejadgange pr. nyt boligområde. 3) Korridorer for omfartsvej og statsvej indskrives som arealreservation i lokalplanlægningen, og Lendrumvej udlægges som fremtidig fordelingsvej. 4) Cykel og bus prioriteres før næste udstykning, fordi det er den billigste kapacitet.</p>`,
 k75:`<h2>Analyse · 7.500 indbyggere</h2>
 <h3>Byen fordobler sin trafik - og får to udveje</h3>
 <p>7.500 indbyggere er ca. 2.340 husstande, 53 % flere end i dag. Uden omfartsvej ville Stevnsvej gennem byen ligge på 2,2 gange kapaciteten i stresstesten (1,3 gange i det kalibrerede sæt) - byen ville reelt lukke i myldretiden. Med omfartsvejen syd om byen forlader den gennemkørende trafik og 70 % af den sydlige bydel byen ved Strøbyskolen.</p>
 <p id="story-model"></p>
 <h3>Det afgørende: omfartsvej og statsvej er ét projekt</h3>
 <p>En kommunal omfartsvej alene flytter køen fra Stevnsvej til Køgevej og Prambroen - alle skal stadig over den samme bro og gennem Køge. Statsvejen (Alternativ N), der fører trafikken videre vest om til E47 ved Herfølge, er ikke længere et separat, senere projekt: omfartsvejen omfatter i dag hele forbindelsen, og anlægget er sat til at gå i gang i 2029.</p>
 <h3>Hvad der skifter i byen</h3>
 <p>Stevnsvej nedklassificeres til bygade med byporte og 40 km/t. Lendrumvej-krydset bliver byens hovedindgang med skole, Strøbyhallen og omfartsvej i samme punkt; kulturhuset i Ellehallen ligger 1,2 km mod nordvest midt i boligkvartererne. Marinaen (600 både) og kystprojektet lægger ny fritidstrafik på kysten - den må ikke gå gennem Kystvejen. Sammenbindingssløjfen binder de nye mødesteder sammen for cykel og gang.</p>
 <h3>Hvor boligerne ligger</h3>
 <p>Etape E1-E4 (55 ha, ca. 670 boliger) ligger på begge sider af Stevnsvej: Lendrumvej-kilen og arealet syd for skolen mod nordøst, Ådalskanten mod sydvest. Alle kobles på Lendrumvej, omfartsvejen eller de eksisterende signaler - ingen nye kryds på Stevnsvej. Erhvervsbåndet N1/N2 ved omfartsvejen, kulturhuset i Ellehallen og Idrætstorvet ved Strøbyhallen giver byen arbejdspladser og byliv. Se afsnittene <i>Boliger og erhverv</i> og <i>Sammenhæng, natur og byliv</i>.</p>`,
 k10:`<h2>Analyse · 10.000 indbyggere</h2>
 <h3>Fordobling: en ny by, ikke en større landsby</h3>
 <p>10.000 indbyggere er ca. 3.125 husstande - dobbelt så mange som i dag - og byen bliver større end Store Heddinge. Selv med omfartsvej og statsvej ligger Stevnsvej nord og Prambroen over kapacitet i stresstesten, fordi den nordlige og kystnære halvdel af byen stadig kun har én vej ud. I det kalibrerede sæt holder omfartsvejsnettet, men Køge-strækningen når kapacitetsgrænsen.</p>
 <p id="story-model"></p>
 <h3>Tre ting skifter</h3>
 <p><b>1) En østlig fordelingsvej</b> (Lendrumvej opgraderet fra Kystvejen til omfartsvejen), så kystbyen har en udvej uden om Centret. <b>2) Overflytning bliver et krav</b>: 20 % på cykel, bus og tog svarer til 400-500 biler færre i spidstimen; det kræver bus hver 10. minut med prioritet, supercykelsti i to grene og en mobilitetshub. <b>3) Køge-strækningen</b> bliver den bindende flaskehals, som Stevns ikke selv råder over - kapacitetsaftalen med Køge og Vejdirektoratet skal forhandles, før de sidste 2.500 indbyggere planlægges.</p>
 <h3>Byfunktioner følger med</h3>
 <p>Skole nr. 2 eller en markant udvidet Strøbyskole, dagtilbud, flere butikker og et egentligt bycenter. Placeres de i de nye områder øst og syd, forkortes de lokale ture, og sløjfen får dem inden for cykelafstand.</p>
 <h3>Hvor boligerne ligger</h3>
 <p>Kortet viser byen fuldt udbygget: E0-E3, E5, Kystbyen og Strøby Nord som byområde med veje og huse, Bybåndet hele vejen til Strøby Nord, Byskoven og Sydskoven plantet. Ådalskanten (E3) giver byen sin side vest for Stevnsvej, E5 (28 ha, ca. 300 boliger) forlænger E2 ud på Sydøstplateauet ad Bybåndet, og Kystbyen (S1-Vest, 34 ha, ca. 210 boliger) binder plateauet og sommerhusbyen sammen ned mod vandet; E6 og E7 holdes som reserver, og Byskoven, Kirkekilen og Strøbylille-vidden rammer bydelen ind. Skole nr. 2 reserveres i E5. Se afsnittene <i>Boliger og erhverv</i> og <i>Sammenhæng, natur og byliv</i>.</p>`
};

/* ---------- attention list ---------- */
const ATTN=[
 ['Reservér korridorerne nu','Omfartsvej, statsvej (Vejdirektoratets to principielle linjeføringer er tilbage i Kommuneplan 2025) og en østlig fordelingsvej. Ingen lokalplan må bygge dem til.'],
 ['Ådalen er Natura 2000 - rigkær stoppede omfartsvejen i 2013','12,7 mio. kr. i budget 2010, afvist af Natur- og Miljøklagenævnet april 2013, projektet lukket i 2024. En ny krydsning skal være landskabsbro fra dag ét og miljøvurderes sammen med statsvejen.'],
 ['Udstykningsprincip: fordelingsvej, to adgange, ét kryds','Ikke "ét signalanlæg pr. udstykning". Nye områder hænger sammen indbyrdes og med Lendrumvej, så de kan kobles på omfartsvejen.'],
 ['Ét projekt: omfartsvej og statsvej åbner sammen','Omfartsvejen omfatter i dag hele forbindelsen til E47 (statsvejen er ikke et separat, senere projekt). Anlæg sat til at gå i gang i 2029 - forudsætningen for 7.500.'],
 ['Prambroen er byens eneste bro','Kun to vejbroer over Tryggevælde Å i hele kommunen. Omfartsvejens bro er også beredskab og redundans.'],
 ['Cykel og bus er kapacitet','10 % overflytning ≈ 120-170 biler færre pr. spidstime ved 7.500. Supercykelsti og busprioritet før udstykning nr. 2.'],
 ['Kystvejen kan ikke vokse','6 m vejudlæg. Marina, kystprojekt og konvertering af sommerhuse må ikke lægge trafik på den. Adgang og parkering fra Stevnsvej-siden.'],
 ['Lendrumvej-knuden designes før Idrætstorvet åbner','Skole, Strøbyhallen og omfartsvej i samme kryds: rundkørsel, sikret stikrydsning og kiss & ride. Kulturhuset i Ellehallen ligger 1,2 km væk og belaster ikke knuden.'],
 ['Køge-strækningen er ikke jeres','Strandvejen/Søndre Viaduktvej afgør rejsetiden. Statsvejen giver 15-20 % aflastning (VD-screening 2023) - ikke nok ved 10.000. Fælles kapacitetsaftale med Køge og VD.'],
 ['Planloven sætter loftet - ikke markerne','Kommuneplan 2025 giver plads til 1,4 ha ny byzone i hele kommunen; 7.500 kræver 55 ha. Omfordeling fra Store Heddinge/Rødvig eller ny behovsopgørelse med vækststrategi er den første beslutning.'],
 ['Byg på det høje land - kote 2,80 er grænsen','Kysten og ådalskanten ligger under kote 3 m; stormfloden i oktober 2023 viste hvorfor. E1, E2, E5 og E6 ligger 6-9 m oppe. Efterprøv med Danmarks Højdemodel før hver lokalplan.'],
 ['Mod København er der kun én motorvej','E47/E20 nås enten gennem Køge (Strandvejen) eller vest om ved Herfølge (statsvejen). Nordlige linjeføringer gennem Vallø-fredningen er screenet fra. Omfartsvejen møder Køgevej mellem ådalen og Valløby - så rundkørslen dér er den samme, uanset om statsvejen kommer først eller sidst.'],
 ['Byerne kobles - men vokser ikke sammen','Bybåndet, skolestien og Brugsen i Strøby Nord binder Strøby Egede og Strøby sammen; Kirkekilen holder dem adskilte. Valløby kobles med vej og sti over ådalen, ikke med boliger.'],
 ['Erhverv ved vejen, kultur i midten','Lastbiler og lager ved omfartsvejen (N2/N3), kontorer ved Idrætstorvet og i Centret, kultur i Ellehallen. Modstrøms-pendling ind til byen er gratis kapacitet - byen skal have arbejdspladser, ikke kun soveværelser.'],
 ['Stolpegården er første etape - og 2023-betingelserne er tjeklisten','KB afviste kommuneplantillægget 23-03-2023 (pkt 305, 17-2): kapacitet på daginstitution, skole og haller; styr på adgangsveje; cykelsti til skolen; LP 182/184 færdige. Kulturhuset, Lendrumvej-åbningen og skoleudvidelsen i E2 er svaret på alle fire.'],
 ['Ny trafik gennem gamle kvarterer er den klassiske fejl','Hver etape får sin egen tilslutning til fordelingsvejen; stier - ikke veje - mellem ny og gammel by. Lendrumvej åbnes, Kystvejen lukkes for gennemkørsel (men forbliver tovejs).'],
 ['Sommerhusområdet kan kun konverteres via staten','Overførsel til byzone sker gennem landsplandirektivet for sommerhusområder - kommunen ansøger i næste runde, som "Ved Kystvejen" i 2019. Kystsikring først, kote 3 og BBR-optælling af helårsbeboelse er forudsætninger.'],
 ['Mål og følg med tællesnit','Prambroen, Kystvejen og Lendrumvej som faste tællesnit og en belastningsgrad på 85 % i spidstimen som udløser for næste etape - så vejen følger byen.']
];

/* ---------- symbols (inline SVG) ---------- */
const SYM={
 signal:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><rect x="7" y="2" width="10" height="20" rx="2" fill="#1B1F1E" stroke="#fff" stroke-width="1.2"/><circle cx="12" cy="6.5" r="2" fill="#E3372F"/><circle cx="12" cy="12" r="2" fill="#F2C233"/><circle cx="12" cy="17.5" r="2" fill="#3CB35A"/></svg>`,
 rundk:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" stroke-width="6"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="${c||'#D9731A'}" stroke-width="3.5"/></svg>`,
 cross:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><rect x="2" y="9" width="20" height="6" fill="#fff" stroke="#1B1F1E"/><rect x="5" y="9" width="3" height="6" fill="#1B1F1E"/><rect x="11" y="9" width="3" height="6" fill="#1B1F1E"/><rect x="17" y="9" width="3" height="6" fill="#1B1F1E"/></svg>`,
 pr:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><rect x="2" y="2" width="20" height="20" rx="3" fill="#1F44B8" stroke="#fff" stroke-width="1.5"/><text x="12" y="17" text-anchor="middle" font-family="Archivo Narrow,Arial" font-weight="700" font-size="14" fill="#fff">P</text></svg>`,
 bus:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="3" width="18" height="16" rx="3" fill="#D9731A" stroke="#fff" stroke-width="1.5"/><rect x="6" y="6" width="12" height="6" fill="#fff"/><circle cx="8" cy="20" r="2" fill="#1B1F1E"/><circle cx="16" cy="20" r="2" fill="#1B1F1E"/></svg>`,
 marina:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#2C7FA6" stroke="#fff" stroke-width="1.5"/><path d="M12 5v13M7 13c0 3 2.5 5 5 5s5-2 5-5M9 8h6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
 hall:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 20V10l9-6 9 6v10z" fill="#D9731A" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><rect x="9" y="13" width="6" height="7" fill="#fff"/></svg>`,
 cycle:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="6" cy="16" r="4" fill="none" stroke="#0F8577" stroke-width="2.2"/><circle cx="18" cy="16" r="4" fill="none" stroke="#0F8577" stroke-width="2.2"/><path d="M6 16l4-8h5l3 8M10 8h4" stroke="#0F8577" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
 prom:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M2 14c3-3 5 3 8 0s5 3 8 0 4 0 4 0" stroke="#2C7FA6" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M2 19c3-3 5 3 8 0s5 3 8 0 4 0 4 0" stroke="#2C7FA6" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
 loop:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 4a8 8 0 1 1-6 2.7" stroke="#0F8577" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="3 2.5"/><path d="M6 3v4h4" stroke="#0F8577" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
 area:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 6l8-3 10 5-2 12-13 1z" fill="#C98B1F" fill-opacity=".35" stroke="#C98B1F" stroke-width="1.8" stroke-dasharray="3 2"/></svg>`,
 newroad:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 18C8 6 16 6 21 18" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M3 18C8 6 16 6 21 18" stroke="#1F44B8" stroke-width="4.5" fill="none" stroke-linecap="round"/></svg>`,
 newdash:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 18C8 6 16 6 21 18" stroke="#1F44B8" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="5 4"/></svg>`,
 reserve:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 18C8 6 16 6 21 18" stroke="#7A817E" stroke-width="8" fill="none" stroke-opacity=".35" stroke-linecap="round"/><path d="M3 18C8 6 16 6 21 18" stroke="#1F44B8" stroke-width="1.5" fill="none" stroke-dasharray="2 3"/></svg>`,
 byport:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><rect x="4" y="6" width="3" height="14" fill="#3E7F3B"/><rect x="17" y="6" width="3" height="14" fill="#3E7F3B"/><rect x="2" y="4" width="20" height="3" fill="#3E7F3B"/><circle cx="12" cy="13" r="4" fill="#fff" stroke="#C22F27" stroke-width="1.8"/><text x="12" y="15.3" text-anchor="middle" font-family="Archivo Narrow,Arial" font-weight="700" font-size="6.5" fill="#111">40</text></svg>`,
 sp50:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#C22F27" stroke-width="3"/><text x="12" y="16" text-anchor="middle" font-family="Archivo Narrow,Arial" font-weight="700" font-size="10" fill="#111">50</text></svg>`,
 sp40:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#C22F27" stroke-width="3"/><text x="12" y="16" text-anchor="middle" font-family="Archivo Narrow,Arial" font-weight="700" font-size="10" fill="#111">40</text></svg>`,
 warn:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2l11 20H1z" fill="#C22F27" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><rect x="11" y="9" width="2" height="7" fill="#fff"/><rect x="11" y="17.5" width="2" height="2" fill="#fff"/></svg>`,
 black:(c)=>`<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 1l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 14.6 6.6 17.5l1.2-6L3.3 7.3l6.1-.7z" fill="#C22F27" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
 school:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#1B1F1E" stroke="#fff" stroke-width="1.5"/><path d="M5 10l7-3 7 3-7 3z" fill="#fff"/><path d="M8 12v3c0 1 8 1 8 0v-3" stroke="#fff" stroke-width="1.5" fill="none"/></svg>`,
 shop:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#1B1F1E" stroke="#fff" stroke-width="1.5"/><path d="M7 9h10l-1 8H8zM9 9V7a3 3 0 0 1 6 0v2" stroke="#fff" stroke-width="1.6" fill="none"/></svg>`,
 care:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#1B1F1E" stroke="#fff" stroke-width="1.5"/><path d="M12 17s-5-3.2-5-6.5A2.7 2.7 0 0 1 12 9a2.7 2.7 0 0 1 5 1.5C17 13.8 12 17 12 17z" fill="#fff"/></svg>`,
 bridge:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><path d="M2 15h20M4 15V9M20 15V9M4 9c4-5 12-5 16 0" stroke="#1B1F1E" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M8 15v-3M12 15v-4M16 15v-3" stroke="#1B1F1E" stroke-width="2" /></svg>`,
 kultur:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="#B5266B" stroke="#fff" stroke-width="1.5"/><path d="M6 8c0 6 2.5 9 6 9s6-3 6-9c-2 1-4 1-6 0-2 1-4 1-6 0z" fill="#fff"/><circle cx="9.5" cy="11" r="1" fill="#B5266B"/><circle cx="14.5" cy="11" r="1" fill="#B5266B"/><path d="M9.5 14c1.5 1 3.5 1 5 0" stroke="#B5266B" stroke-width="1" fill="none"/></svg>`,
 rest:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="#D9731A" stroke="#fff" stroke-width="1.5"/><path d="M8 5v14M8 5c-1.5 0-2 1-2 3v3h4V8c0-2-.5-3-2-3zM15 5v14M15 5c1.8 0 2.5 2 2.5 4s-1 3-2.5 3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`,
 park:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="#2F6B3A" stroke="#fff" stroke-width="1.5"/><path d="M12 4l5 7h-3l4 5h-5v4h-2v-4H6l4-5H7z" fill="#fff"/></svg>`,
 erhv:(c)=>`<svg viewBox="0 0 24 24" width="24" height="24"><rect x="2" y="7" width="20" height="14" rx="2" fill="#4A5FB3" stroke="#fff" stroke-width="1.5"/><rect x="8" y="3" width="8" height="4" rx="1" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M2 13h20" stroke="#fff" stroke-width="1.5"/></svg>`,
 passage:(c)=>`<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#2F6B3A" stroke="#fff" stroke-width="1.5"/><path d="M6 17v-4a6 6 0 0 1 12 0v4" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M4 17h16" stroke="#fff" stroke-width="2"/></svg>`,
 tunnel:(c)=>`<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#0F8577" stroke="#fff" stroke-width="1.5"/><path d="M6 17v-3a6 6 0 0 1 12 0v3" stroke="#fff" stroke-width="2.4" fill="none"/><path d="M4 17h16" stroke="#fff" stroke-width="2"/><circle cx="12" cy="13" r="1.6" fill="#fff"/></svg>`,
 haevet:(c)=>`<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0F8577" stroke="#fff" stroke-width="1.5"/><path d="M5 15h14M7 11h10M9 7h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
 luk:(c)=>`<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="11" fill="#C22F27" stroke="#fff" stroke-width="1.5"/><rect x="5" y="10" width="14" height="4" rx="1" fill="#fff"/></svg>`,
 station:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><rect x="2" y="2" width="20" height="20" rx="4" fill="#1B1F1E" stroke="#fff" stroke-width="1.5"/><rect x="7" y="6" width="10" height="9" rx="2" fill="#fff"/><circle cx="9" cy="17" r="1.5" fill="#fff"/><circle cx="15" cy="17" r="1.5" fill="#fff"/></svg>`,
 shelter:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#2F6B3A" stroke="#fff" stroke-width="1.5"/><path d="M5 17l7-9 7 9z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 17c-1-2 0-3 1-4 1 1 2 2 1 4z" fill="#fff"/></svg>`,
 fyr:(c)=>`<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#2F6B3A" stroke="#fff" stroke-width="1.5"/><path d="M10 19h4l-.7-9h-2.6z" fill="#fff"/><path d="M9.3 10h5.4l-.5-3h-4.4z" fill="#fff"/><rect x="10.3" y="5" width="3.4" height="2.2" fill="#fff"/><path d="M7 8l-1.5-1.5M17 8l1.5-1.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>`
};

/* ---------- map ---------- */
const map=L.map('map',{zoomControl:true,attributionControl:true,minZoom:10,maxZoom:18,zoomSnap:0.25,preferCanvas:false});
map.attributionControl.setPrefix('').addAttribution('Vejgeometri © OpenStreetMap-bidragydere (ODbL) · Analyse: Analyse og skitser: Thomas Cilius, sept. 2026 - debatoplæg, ikke en vedtaget plan');
L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
const _R={};
function R(p){if(!_R[p])_R[p]=(p==='base'?L.canvas({padding:0.5,pane:p}):L.svg({padding:0.5,pane:p}));return _R[p];}
const panes={};
['base','areas','net','flow','sym','lbl'].forEach((n,i)=>{panes[n]=map.createPane(n);panes[n].style.zIndex=400+i*10;});
panes.lbl.style.pointerEvents='none';

/* base polygons */
const fillFor={sea:'--sea',urban:'--urban',industrial:'--road-minor',wood:'--wood',green:'--green',wetland:'--wet',water:'--water',beach:'#F0E7C8'};
const baseLayer=L.layerGroup().addTo(map), baseMid=L.layerGroup(), baseHi=L.layerGroup(), regLbl=L.layerGroup();
const FIXED=new Set(['Strøby Egede','Strøby','Valløby','Køge','Herfølge','Strøby Ladeplads','Vallø Strand','Nicolinelund','Vedskølle']);
function paintBase(){
  baseLayer.clearLayers();baseMid.clearLayers();baseHi.clearLayers();regLbl.clearLayers();
  const col=k=>fillFor[k].startsWith('--')?css(fillFor[k]):fillFor[k];
  const poly=(k,grp,extra)=>(BASE.polys[k]||[]).forEach(p=>{if(p.open||p.c.length<4)return;L.polygon(p.c,Object.assign({renderer:R('base'),stroke:false,fillColor:col(k),fillOpacity:1,interactive:false},extra||{})).addTo(grp);});
  poly('sea',baseLayer);poly('urban',baseLayer);poly('industrial',baseLayer,{fillColor:css('--road-minor')});poly('wood',baseLayer);poly('wetland',baseLayer);poly('water',baseLayer);
  poly('green',baseMid);poly('beach',baseMid);
  L.geoJSON(SUIT.constraints.natura,{renderer:R('areas'),style:{color:css('--nat'),weight:1.2,dashArray:'4 4',fillColor:css('--nat'),fillOpacity:.10,className:'natura'}}).bindTooltip('Tryggevælde Ådal - Natura 2000-habitatområde (Danmarks Miljøportal). Rigkær stoppede omfartsvejen i 2013.',{sticky:true}).addTo(baseLayer);
  BASE.lines.river.forEach(r=>L.polyline(r.c,{renderer:R('base'),color:css('--water'),weight:3,interactive:false}).addTo(baseMid));
  BASE.lines.coast.forEach(r=>L.polyline(r.c,{renderer:R('base'),color:css('--prom'),weight:1,opacity:.5,interactive:false}).addTo(baseLayer));
  (BASE.boundaries||[]).forEach(b=>L.polyline(b.c,{renderer:R('base'),color:'#8A2E6B',weight:1.6,dashArray:'6 4',opacity:.75,interactive:false}).addTo(baseLayer));
  const rc=css('--road-case'),rf=css('--road-fill'),rm=css('--road-minor');
  const draw=(cls,w,c,grp,opt)=>(BASE.lines[cls]||[]).forEach(r=>L.polyline(r.c,Object.assign({renderer:R('base'),color:c,weight:w,interactive:false,lineCap:'round',lineJoin:'round'},opt||{})).addTo(grp));
  draw('rail',2.2,css('--ink-2'),baseLayer);draw('rail',1.2,'#F2EFE6',baseLayer,{dashArray:'6 6'});
  draw('service',1.2,rm,baseHi);draw('minor',2.2,rm,baseMid);
  draw('tertiary',4.5,rc,baseMid);draw('main',6,rc,baseLayer);draw('motorway',8,rc,baseLayer);
  draw('tertiary',2.8,rf,baseMid);draw('main',3.8,rf,baseLayer);draw('motorway',5.5,'#F3D77A',baseLayer);
  draw('foot',1,css('--ink-3'),baseHi,{dashArray:'2 4',opacity:.5});
  draw('cycle',1.6,css('--cycle'),baseHi,{dashArray:'5 5',opacity:.9});
  (BASE.places||[]).forEach(p=>{if(FIXED.has(p.n))return;const cls=p.k==='town'||p.k==='city'?'place':p.k==='village'?'place vil':'sub';L.marker(p.p,{pane:'lbl',interactive:false,icon:L.divIcon({className:'',html:`<div class="lbl ${cls}" style="transform:translate(-50%,-50%)">${p.n}</div>`,iconSize:[0,0]})}).addTo(regLbl);});
  (BASE.stations||[]).forEach(st=>{L.marker(st.p,{pane:'sym',icon:L.divIcon({className:'sym stn',html:SYM.station(),iconSize:[16,16],iconAnchor:[8,8]})}).bindTooltip(`${st.n} st.`).addTo(regLbl);});
  [['STEVNS KOMMUNE',[55.3200,12.3300]],['KØGE KOMMUNE',[55.4750,12.0500]]].forEach(([n,p])=>L.marker(p,{pane:'lbl',interactive:false,icon:L.divIcon({className:'',html:`<div class="lbl kom" style="transform:translate(-50%,-50%)">${n}</div>`,iconSize:[0,0]})}).addTo(regLbl));
  regLbl.addTo(map);
  baseVisibility();
}
function baseVisibility(){const z=map.getZoom();const want=[[baseMid,z>=12.5],[baseHi,z>=13.5]];want.forEach(([g,on])=>{if(on&&!map.hasLayer(g))g.addTo(map);if(!on&&map.hasLayer(g))map.removeLayer(g);});}
map.on('zoomend',baseVisibility);
paintBase();

/* labels */
const lblLayer=L.layerGroup().addTo(map);
function label(p,txt,cls,off,interactive=false){return L.marker(p,{pane:'lbl',interactive,icon:L.divIcon({className:'',html:`<div class="lbl ${cls||''}" style="transform:translate(${off?off[0]:-50}%,${off?off[1]:-50}%)">${txt}</div>`,iconSize:[0,0]})}).addTo(lblLayer);}
[['Strøby Egede',[55.4145,12.2470],'place'],['Strøby',[55.3833,12.2829],'place'],['Valløby',[55.4003,12.2322],'place'],['Køge',[55.4565,12.1819],'place'],['Herfølge',[55.4138,12.1412],'place'],['Strøby Ladeplads',[55.4007,12.2998],'place'],['Vallø Strand',[55.4224,12.2277],'place'],['Nicolinelund',[55.4062,12.2586],'place'],['Vedskølle',[55.4062,12.1773],'place'],
 ['Køge Bugt',[55.4300,12.2650],'water'],['Tryggevælde Å',[55.4075,12.2455],'water'],['Tryggevælde Ådal',[55.3920,12.2480],'water'],
 ['Stevnsvej · rute 261',[55.4125,12.2440],'road'],['Kystvejen',[55.4110,12.2650],'road'],['Køgevej · rute 209',[55.4120,12.2290],'road'],['Strandvejen',[55.4380,12.2020],'road'],['Lendrumvej',[55.4060,12.2705],'road'],['Hybenrosevej',[55.4080,12.2580],'road'],['Valnøddevej',[55.4105,12.2515],'road'],['Bakkegårdsvej',[55.4108,12.2425],'road'],['E47 · Sydmotorvejen',[55.4300,12.1150],'road'],
].forEach(l=>label(l[1],l[0],l[2]));
const POI=[[PT.school,'Strøbyskolen','school'],[PT.elle,'Ellehallen (Ellevej 2) · kulturhus/medborgerhus fra 7.500','hall'],[[55.4032,12.2640],'Strøbyhallen · idræt, udbygget med café fra 7.500','hall'],[PT.ege,'Bådklubben Ege','marina'],[PT.center,'Strøby Egede Center','shop'],[PT.egehaven,'Egehaven (plejecenter)','care'],[PT.prambro,'Prambroen','bridge'],[PT.kogeSt,'Køge Station','station'],[PT.egojeSt,'Egøje St.','station'],[PT.e47,'E47 afkørsel 34 Herfølge','station']];
POI.forEach(p=>{const ic={school:'school',hall:'hall',marina:'marina',shop:'shop',care:'care',bridge:'bridge',station:'station'}[p[2]];const marker=L.marker(p[0],{pane:'sym',title:p[1],icon:L.divIcon({className:'sym',html:SYM[ic](),iconSize:[22,22],iconAnchor:[11,11]})}).bindTooltip(p[1]).addTo(lblLayer);if(p[2]==='marina')marker.on('click',()=>openMarinaVision());const poiLabel=label([p[0][0]-0.00028,p[0][1]],p[1].split(' · ')[0],'poi',[-50,0],p[2]==='marina');if(p[2]==='marina'&&poiLabel)poiLabel.on('click',()=>openMarinaVision());});

/* zoom-class for label density */
function zoomClass(){const z=map.getZoom();const c=map.getContainer();c.classList.toggle('z-xlo',z<12);c.classList.toggle('z-lo',z<13);c.classList.toggle('z-mid',z>=13&&z<14.25);}
map.on('zoomend',zoomClass);

/* ---------- dynamic layers ---------- */
const netLayer=L.layerGroup().addTo(map), flowLayer=L.layerGroup().addTo(map), symLayer=L.layerGroup().addTo(map), areaLayer=L.layerGroup().addTo(map);
let scen='today', mode='load', pm=false, res=null, resOther=null, linkPaths={};

const VIEWS={town:{c:[55.4095,12.2560],z:14.5},south:{c:[55.4010,12.2520],z:14.25},region:{c:[55.4100,12.1750],z:12.25},kommuner:{c:[55.3850,12.2000],z:10.75}};
function setView(v){const w=map.getContainer().clientWidth;const V=VIEWS[v];map.flyTo(V.c,V.z-(w<600?0.75:0),{duration:.8});$$('.mapbar button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));}

function losColor(l){return css('--los'+l);}
function speedColor(s){return css(s<=30?'--sp30':s<=40?'--sp40':s<=50?'--sp50':s<=60?'--sp60':s<=80?'--sp80':s<=90?'--sp90':'--sp110');}

function popupLink(id,L_){
  const f=res.flows[id],vc=f/L_.cap,l=los(vc);const fo=resOther?resOther.flows[id]:null;
  const cap=L_.cap;const sp=L_.speed[scen];
  return `<h4>${L_.name}</h4><span class="tag" style="background:${losColor(l)};color:${l==2?'#1B1F1E':'#fff'}">${LOSN[l]}</span>
  <div class="kv"><span>Biler/t i spidsretning</span><b>${fmt(f)}</b><span>Praktisk kapacitet</span><b>${fmt(cap)}</b><span>Belastningsgrad</span><b>${pct(vc)}</b>${fo!=null?`<span>${preset==='calib'?'Stresstest':'Kalibreret'} viser</span><b>${fmt(fo)} biler/t (${pct(fo/cap)})</b>`:''}${sp?`<span>Fartgrænse (${SCEN[scen].label.toLowerCase()})</span><b>${sp} km/t</b>`:''}</div>
  ${vc>1?`<p style="margin:8px 0 0;color:${losColor(4)}"><b>Overskud: ${fmt(f-cap)} biler/t</b> kan ikke afvikles i timen - køen vokser med ca. ${fmt((f-cap)*7/1000*10)/10} km pr. time.</p>`:''}`;
}

function drawLinks(){
  netLayer.clearLayers();flowLayer.clearLayers();linkPaths={};
  const S=SCEN[scen];
  Object.entries(LINKS).forEach(([id,L_])=>{
    const isNew=(id==='bypass'||id==='statsvej');
    if(isNew&&!S.bypass){return;}
    if(id==='byband'){if(!S.bypass)return; L_.geo=scen==='k75'?STRU.byband.slice(0,4):STRU.byband;}
    if(id==='statsvej'&&!(S.statsvej&&svOn))return;
    const f=res.flows[id]||0,vc=f/L_.cap,l=los(vc);
    let style;
    if(mode==='load'){
      const w=Math.max(3,Math.min(14,3+f/140));
      style={color:losColor(l),weight:w,opacity:.95,dashArray:id==='statsvej'?'10 8':null};
      L.polyline(L_.geo,{renderer:R('flow'),color:'#fff',weight:w+3,opacity:.9,interactive:false}).addTo(flowLayer);
    }else if(mode==='speed'){
      const sp=L_.speed[scen];
      style={color:speedColor(sp),weight:7,opacity:.95,dashArray:id==='statsvej'?'10 8':null};
      L.polyline(L_.geo,{renderer:R('flow'),color:'#fff',weight:10,opacity:.9,interactive:false}).addTo(flowLayer);
    }else{ /* net + plan */
      const cls=L_.cls;
      const dn=(scen==='k75'||scen==='k10')&&id==='stevnsMid';
      const up=(scen==='k10'&&id==='lendrum');
      style=cls==='new'?{color:css('--new'),weight:7}:cls==='newdash'?{color:css('--new'),weight:6,dashArray:'10 8'}:dn?{color:css('--down'),weight:8,dashArray:'2 6',lineCap:'round'}:up?{color:css('--new'),weight:6}:{color:css('--road-case'),weight:cls==='main'?7:5};
      style.opacity=.95;
      L.polyline(L_.geo,{renderer:R('flow'),color:'#fff',weight:style.weight+3,opacity:.9,interactive:false}).addTo(flowLayer);
      if(cls!=='new'&&cls!=='newdash'&&!dn&&!up){L.polyline(L_.geo,{renderer:R('flow'),color:css('--road-fill'),weight:style.weight-2.5,opacity:1,interactive:false}).addTo(flowLayer);style.opacity=0.001;style.weight=style.weight+4;}
    }
    const pl=L.polyline(L_.geo,Object.assign({renderer:R('flow'),lineCap:'round',lineJoin:'round'},style)).addTo(flowLayer);
    pl.bindPopup(()=>popupLink(id,L_),{maxWidth:320});
    pl.on('mouseover',()=>pl.getElement()&&pl.getElement().classList.add('hl'));pl.on('mouseout',()=>pl.getElement()&&pl.getElement().classList.remove('hl'));
    linkPaths[id]=pl;
    // arrows (load mode)
    if(mode==='load'&&f>40){
      const n=Math.max(1,Math.min(4,Math.round(lenKm(L_.geo)/0.9)));
      for(let i=1;i<=n;i++){const a=along(L_.geo,i/(n+1));let brg=a.brg;if(L_.dir<0)brg+=180;if(pm)brg+=180;const sz=8+Math.min(10,f/150);
        L.marker(a.p,{pane:'sym',interactive:false,icon:L.divIcon({className:'',html:`<div class="arrow" style="transform:rotate(${brg}deg);border-left-width:${sz*0.5}px;border-right-width:${sz*0.5}px;border-bottom-width:${sz*1.1}px;border-bottom-color:${l>=3?'#fff':'#fff'}"></div>`,iconSize:[0,0]})}).addTo(flowLayer);}
    }
    if(mode==='speed'&&L_.speed[scen]){const sp=L_.speed[scen];const a=along(L_.geo,0.5);const rec=(id==='stevnsS'&&scen==='today')?' rec':'';
      L.marker(a.p,{pane:'sym',icon:L.divIcon({className:'',html:`<div class="roundel${rec}" title="${sp} km/t">${sp}</div>`,iconSize:[22,22],iconAnchor:[11,11]})}).bindTooltip(`${L_.name}: ${sp} km/t${rec?' (Trafikplanen ønsker 50; i dag 60)':''}`).addTo(flowLayer);}
  });
}

function drawMeasures(){
  symLayer.clearLayers();areaLayer.clearLayers();
  const list=MEAS.filter(m=>m.s.includes(scen));
  list.forEach(m=>{
    if(m.geo){
      const st={cycle:{color:css('--cycle'),weight:5,opacity:.95},loop:{color:css('--cycle'),weight:4,dashArray:'2 8',lineCap:'round',opacity:.95},prom:{color:css('--prom'),weight:4,dashArray:'1 7',lineCap:'round',opacity:.95},upg:{color:css('--upg'),weight:12,opacity:.35},warn:{color:css('--los4'),weight:12,opacity:.28},down:{color:css('--down'),weight:12,opacity:.3},new:{color:css('--new'),weight:12,opacity:.18},newdash:{color:css('--new'),weight:12,opacity:.14},reserve:{color:css('--ink-3'),weight:16,opacity:.28},bus:{color:css('--upg'),weight:3,dashArray:'12 6',opacity:.95},area:null}[m.geo.cls];
      if(mode!=='net'&&mode!=='plan'&&['upg','warn','down','new','newdash','reserve'].includes(m.geo.cls)){/* halos only in net/plan mode to keep load view clean */}
      else if(m.geo.line&&st){const pl=L.polyline(m.geo.line,Object.assign({renderer:R('net')},st)).addTo(areaLayer);pl.bindPopup(popupMeasure(m),{maxWidth:340});}
      if(m.geo.etaper)m.geo.etaper.forEach(id=>drawEtape(ETAPE[id],true));
      if(m.geo.erhv&&mode!=='plan')m.geo.erhv.filter(id=>!(BUILT_IDS[scen]||[]).includes(id)).forEach(id=>{const n=ERHV.find(x=>x.id===id);L.geoJSON(n.geom,{renderer:R('areas'),style:{color:css('--erhv'),weight:2,fillColor:css('--erhv'),fillOpacity:.30}}).bindPopup(()=>erhvPopup(n),{maxWidth:360}).addTo(areaLayer);lblAt([n.label[1],n.label[0]],`${n.id} · ${Math.round(n.ha)} ha`,'str erhv').addTo(areaLayer);});
      if(m.geo.rest)REST.forEach(r=>L.geoJSON(r.geom,{renderer:R('areas'),style:{color:css('--area'),weight:2,dashArray:'6 4',fillColor:css('--area'),fillOpacity:.25}}).bindPopup(`<h4>${r.nr} ${r.navn}</h4><p style="margin:4px 0 0">Kommuneplanramme til boliger, ${r.ha} ha, ${r.zone==='Landzone'?'landzone (overføres ved lokalplan)':'byzone'}. Del af Strøby Egedes restrummelighed på 11,0 ha (Kommuneplan 2025).</p>`).addTo(areaLayer));
    }
    const mk=L.marker(m.at,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM[m.sym](),iconSize:[24,24],iconAnchor:[12,12]})}).bindPopup(popupMeasure(m),{maxWidth:340}).addTo(symLayer);
    if(m.id==='marina'||m.id==='havnehus')mk.on('click',()=>{map.closePopup();openMarinaVision(m.id==='havnehus'?1:0);});
    m._mk=mk;
  });
  if(scen==='k10'){drawEtape(ETAPE['E6'],false);drawEtape(ETAPE['E7'],false);}
  if(scen==='k75'){['E3','E5','S1V','E8'].forEach(id=>drawEtape(ETAPE[id],false));}
  if(scen==='today'||scen==='k5'){L.marker(PT.j1,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.black(),iconSize:[26,26],iconAnchor:[13,26]})}).bindTooltip('Sort plet: Stevnsvej/Kystvejen - 4 uheld 2019-23, heraf 2 personskadeuheld (Trafikplan 2025-2029, tabel 1)').addTo(symLayer);}
  if(scen==='k75'||scen==='k10'){[PT.prambro,[55.4000,12.2632]].forEach(p=>L.marker([p[0]+0.0006,p[1]],{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.byport(),iconSize:[24,24],iconAnchor:[12,12]})}).bindTooltip('Byport: overgang til bygade 40 km/t').addTo(symLayer));
    L.marker(PT.bypassRiver,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.bridge(),iconSize:[24,24],iconAnchor:[12,12]})}).bindTooltip('Landskabsbro over Tryggevælde Ådal (Natura 2000) - forudsætning efter 2013-afgørelsen').addTo(symLayer);}
}
function popupMeasure(m){return `<h4>${m.t}</h4><p style="margin:4px 0 0">${m.e}</p>${m.d?`<p style="margin:8px 0 0;color:var(--ink-2)">${m.d}</p>`:''}${m.id==='marina'||m.id==='havnehus'?marinaVisionButton():''}`;}


/* ---------- boligetaper, rammer og bindinger ---------- */
function etapePopup(e){const st=e.stage==='k75'?'7.500-etape':'10.000-etape';return `<h4>${e.id} · ${e.name}</h4><span class="tag" style="background:${css(e.stage==='k75'?'--area':'--area2')}">${st}</span><span class="tag" style="background:${css('--ink-3')}">${e.side}</span>
<div class="kv"><span>Areal</span><b>${e.ha.toLocaleString('da-DK')} ha${e.reserve?` (heraf ${e.reserve} ha til institution/skole)`:''}</b><span>Tæthed</span><b>${e.dens} boliger/ha · ${e.tl} % tæt-lav</b><span>Boliger · indbyggere</span><b>ca. ${fmt(e.homes)} · ${fmt(e.people)}</b><span>Terræn (EU-DEM)</span><b>ca. ${e.z} m over havet</b><span>Til skole · Centret</span><b>${fmt(e.d_school)} m · ${fmt(e.d_center)} m</b></div>
<p style="margin:8px 0 0"><b>Adgang:</b> ${e.access}</p><p style="margin:6px 0 0"><b>Hvorfor her:</b> ${e.why}</p><p style="margin:6px 0 0;color:var(--los4)"><b>Vær opmærksom:</b> ${e.watch}</p>`;}
function drawEtape(e,active){
  if((BUILT_IDS[scen]||[]).includes(e.id))return;   // tegnes som bebygget i drawBuilt()
  const col=css(e.stage==='k75'?'--area':e.stage==='res'?'--ink-3':'--area2');
  const g=L.geoJSON(e.geom,{renderer:R('areas'),style:{color:col,weight:active?2:1.2,dashArray:active?null:'4 4',fillColor:col,fillOpacity:active?.30:.10}}).bindPopup(()=>etapePopup(e),{maxWidth:360}).addTo(areaLayer);
  const lab=L.marker([e.label[1],e.label[0]],{pane:'lbl',interactive:false,icon:L.divIcon({className:'',html:`<div class="lbl eta ${e.stage}" style="transform:translate(-50%,-50%);${active?'':'opacity:.7'}">${e.id} · ${Math.round(e.ha)} ha<small>${e.stage==='res'?'reserve efter 10.000 · Sydskoven':(active?'':'kommende · ')+'ca. '+e.homes+' boliger'}</small></div>`,iconSize:[0,0]})}).addTo(areaLayer);
  e._g=g; return g;
}
const bindLayer=L.layerGroup(), rammeLayer=L.layerGroup(), cykLayer=L.layerGroup(), natLayer=L.layerGroup();
function drawCyk(){
  cykLayer.clearLayers(); const C=STRU.cyclenet; const col=css('--cycle');
  (C.local||[]).forEach(c=>L.polyline(c,{renderer:R('net'),color:col,weight:1.5,dashArray:'2 4',opacity:.8,interactive:false}).addTo(cykLayer));
  (C.tracks||[]).forEach(c=>L.polyline(c,{renderer:R('net'),color:col,weight:3.5,opacity:.95}).bindTooltip('Cykelsti langs fordelingsvej/adgangsvej',{sticky:true}).addTo(cykLayer));
  Object.entries(C.routes||{}).forEach(([k,c])=>L.polyline(c,{renderer:R('net'),color:'#fff',weight:8,opacity:.85,interactive:false}).addTo(cykLayer));
  const names={superc:'Supercykelsti til Køge St.',loop:'Sammenbindingssløjfen',aadal:'Ådalsstien til Valløby',byband:'Bybåndets cykelsti til Strøby Nord',prom1:'Strandpromenaden etape 1',coastprom:'Kystpromenaden',K1:'Kystkile K1',K2:'Kystkile K2',K3:'Kystkile K3'};
  Object.entries(C.routes||{}).forEach(([k,c])=>L.polyline(c,{renderer:R('net'),color:col,weight:5,opacity:.95}).bindTooltip(names[k]||k,{sticky:true}).addTo(cykLayer));
  (STRU.pathlinks||[]).forEach(l=>L.polyline(l.c,{renderer:R('net'),color:col,weight:3,dashArray:'2 6'}).addTo(cykLayer));
}
function drawBind(){
  bindLayer.clearLayers();
  const C=SUIT.constraints; const b=css('--bind'), n=css('--nat');
  const add=(geom,style,tip)=>{if(!geom||!geom.coordinates||!geom.coordinates.length)return;const l=L.geoJSON(geom,{renderer:R('areas'),style}).addTo(bindLayer);if(tip)l.bindTooltip(tip,{sticky:true});};
  add(C.low,{color:b,weight:0,fillColor:b,fillOpacity:.28},'Under kote 3 m (EU-DEM 25 m, omtrentlig) - kommuneplanen fraråder boliger under kote 2,80');
  add(C.marg,{color:b,weight:0,fillColor:b,fillOpacity:.12},'Kote 3-4 m (EU-DEM) - kræver afværge/terrænvurdering');
  add(C.strand,{color:b,weight:1,dashArray:'2 4',fillColor:b,fillOpacity:.10},'Strandbeskyttelseslinje - her vist som 300 m fra kysten (omtrentlig; den fastlagte linje kan afvige i bebyggede områder)');
  add(C.p3,{color:n,weight:1,fillColor:n,fillOpacity:.35},'§ 3-beskyttet natur (Danmarks Miljøportal)');
  add(C.natura,{color:n,weight:2,fillColor:n,fillOpacity:.12},'Natura 2000-habitatområde Tryggevælde Ådal (Danmarks Miljøportal)');
  add(C.aa,{color:b,weight:1.5,dashArray:'6 4',fillColor:b,fillOpacity:.06},'Åbeskyttelseslinje, 150 m (naturbeskyttelsesloven § 16)');
  add(C.kirke,{color:'#8A2E6B',weight:1.5,dashArray:'6 4',fillColor:'#8A2E6B',fillOpacity:.10},'Kirkebyggelinje, 300 m om Strøby Kirke (§ 19)');
  add(C.fred,{color:'#8A2E6B',weight:2,fillColor:'#8A2E6B',fillOpacity:.15},'Fredet område');
  add(C.bnbo,{color:'#1F44B8',weight:1.5,fillColor:'#1F44B8',fillOpacity:.15},'Boringsnært beskyttelsesområde (BNBO) - drikkevand');
}
const FRILU_ICON={naturbase:'park',spejder:'shelter',skovskole:'park',verdensarv:'park',fyr:'fyr'};
function drawFrilu(){
  natLayer.clearLayers();
  if(STRU.friluftspine){
    L.polyline(STRU.friluftspine,{renderer:R('net'),color:css('--skov'),weight:3,opacity:.8,dashArray:'2 7',lineCap:'round'})
      .bindTooltip('Illustrativt Stevns-spor (forslag): Naturbasen \u2192 \u00c5dalen \u2192 Store Heddinge \u2192 Verdensarvsstien \u2192 Stevns Fyr - fragmenter findes i dag, ingen samlet plan endnu',{sticky:true})
      .addTo(natLayer);
  }
  (STRU.friluft||[]).forEach(n=>{
    L.marker(n.p,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM[FRILU_ICON[n.kind]](),iconSize:[24,24],iconAnchor:[12,12]})}).bindPopup(`<h4>${n.name}</h4><p style="margin:4px 0 0">${n.t}</p>`,{maxWidth:340}).addTo(natLayer);
    lblAt([n.p[0]-0.0004,n.p[1]],n.name.split(' - ')[0],'node '+n.kind).addTo(natLayer);
  });
}
function drawRammer(){
  rammeLayer.clearLayers();
  SUIT.rammer.forEach(r=>{const isB=r.anv==='Boligområde';const col=r.anv==='Sommerhusområde'?css('--upg'):r.anv==='Boligområde'?css('--ink-2'):r.anv==='Rekreativt område'?css('--down'):css('--ink-3');
    const l=L.geoJSON(r.geom,{renderer:R('areas'),style:{color:col,weight:1.2,dashArray:'3 3',fillOpacity:0}}).bindTooltip(`${r.nr} ${r.navn} · ${r.anv} · ${r.ha} ha · ${r.zone||''}`,{sticky:true}).addTo(rammeLayer);
    const c=l.getBounds().getCenter();L.marker(c,{pane:'lbl',interactive:false,icon:L.divIcon({className:'',html:`<div class="lbl ramme" style="transform:translate(-50%,-50%)">${r.nr}</div>`,iconSize:[0,0]})}).addTo(rammeLayer);});
}
function renderHousing(){
  const box=$('#housing-body');const rest=415;
  const st1=ETA.filter(e=>e.stage==='k75'), st2=ETA.filter(e=>e.stage==='k10'), res=ETA.filter(e=>e.stage==='res');
  const sum=a=>a.reduce((x,e)=>x+e.people,0), sumH=a=>a.reduce((x,e)=>x+e.homes,0), sumA=a=>a.reduce((x,e)=>x+e.ha,0);
  const row=e=>`<tr data-id="${e.id}" tabindex="0"><td><span class="etag ${e.stage}">${e.id}</span></td><td>${e.name}<div class="small muted">${e.side} · ${e.tl} % tæt-lav · ${fmt(e.d_school)} m til skolen</div></td><td class="r">${e.ha.toLocaleString('da-DK')}</td><td class="r">${fmt(e.homes)}</td><td class="r">${fmt(e.people)}</td></tr>`;
  box.innerHTML=`
  <p>Arealbehovet følger kommuneplanens egne fingerregler: <b>8-10 parcelhuse</b> eller <b>20 tæt-lave boliger pr. hektar</b>, 3,2 personer pr. bolig. Vækst fra ca. 4.900 til 7.500 er ca. 2.600 mennesker; til 10.000 yderligere ca. 2.500.</p>
  <div class="budget"><div><b>81 ha</b><span>ren parcelhusby · 10/ha</span></div><div><b>58 ha</b><span>blandet · 14/ha</span></div><div><b>45 ha</b><span>tæt · 18/ha</span></div></div>
  <p class="small muted">Arealbehov pr. 2.600 indbyggere ved tre tætheder. Etaperne nedenfor er blandet (11-14/ha) og tager hensyn til, at Strøby Egede allerede har <b>11,0 ha restrummelighed</b> (Nicolinelund 3.1 og 3.2, Kommuneplan 2025) ≈ 130 boliger ≈ 415 personer.</p>
  <h3>Sådan er arealerne fundet</h3>
  <p>Alle marker omkring byen er screenet mod de bindinger, der kan slås op offentligt: Natura 2000 og § 3-natur, å- og søbeskyttelseslinjer, kirkebyggelinjen om Valløby Kirke, fredninger, boringsnære beskyttelsesområder, strandbeskyttelse (300 m), terræn under kote 3 m (EU-DEM), 50 m støjzone langs Stevnsvej og 75 m langs omfartsvej/statsvej, samt 200 m om renseanlægget ved Strøby Ladeplads. Resten er scoret på afstand til skole/idrætscenter og Centret, sammenhæng med eksisterende byzone (indefra og ud), adgang til Lendrumvej/omfartsvejen og terrænhøjde. Slå <i>Bindinger</i> til på kortet for at se lagene.</p>
  <h3>7.500: etape E0-E2 (${Math.round(sumA(st1))} ha)</h3>
  <div style="overflow-x:auto"><table class="eta"><thead><tr><th></th><th>Område</th><th class="r">ha</th><th class="r">Boliger</th><th class="r">Indb.</th></tr></thead><tbody>${st1.map(row).join('')}<tr class="sum"><td></td><td>E0-E2 + restrummelighed (11 ha)</td><td class="r">${(sumA(st1)+11).toLocaleString('da-DK')}</td><td class="r">${fmt(sumH(st1)+130)}</td><td class="r">${fmt(sum(st1)+rest)}</td></tr><tr class="sum"><td></td><td>Indbyggere i alt</td><td></td><td></td><td class="r">${fmt(4900+sum(st1)+rest)}</td></tr></tbody></table></div>
  <p class="small">Rækkefølgen er indefra og ud: først hullet ved Stolpegårdens jorder (E0, matr. 8iq - ikke en del af Nicolinelund), som allerede var perspektivområde i Kommuneplan 2017 og fik afvist sit kommuneplantillæg i 2023 med fire betingelser, der bliver denne plans tjekliste. Nicolinelunds eng (4,8 ha, G14) er grundejerforeningernes fællesareal og forbliver eng - E0 bygger ikke på den, lægger sin egen 25 m grønne kant og leder ikke regnvand ind i den. Så Lendrumvej-kilen (E1) og Idrætstorvets bydel (E2). Alle tre kobles på den åbnede Lendrumvej og omfartsvejen - ingen nye kryds på Stevnsvej. Arealet vest for skolen (3-4 m over havet) er lagt ud til erhverv (N1). Ådalskanten vest for Stevnsvej (E3) venter til 10.000.</p>
  <h3>Erhverv (${ERHV.reduce((x,n)=>x+n.ha,0).toFixed(0)} ha)</h3>
  <div style="overflow-x:auto"><table class="eta"><thead><tr><th></th><th>Område</th><th class="r">ha</th><th>Type</th></tr></thead><tbody>${ERHV.map(n=>`<tr data-erhv="${n.id}" tabindex="0"><td><span class="etag" style="background:var(--erhv)">${n.id}</span></td><td>${n.name}<div class="small muted">${n.stage==='k75'?'7.500':'10.000 · option'}</div></td><td class="r">${n.ha.toLocaleString('da-DK')}</td><td class="small">${n.typ}</td></tr>`).join('')}</tbody></table></div>
  <p class="small">Strøby Egede har ingen erhvervsramme i dag (kun bymidten 3 C1 og blandet bolig/erhverv 3 C2). Videnstunge kontorjobs lægges ved Idrætstorvet, i Centret og N1; e-handel og lager i N2 ved omfartsvejen med lastbiler uden for byen. Ved 10.000 flyttes logistik helt ud til Statsvejsporten (N3, option).</p>
  <h3>10.000: Ådalskanten, plateauet, Kystbyen og Strøby Nord (${Math.round(sumA(st2))} ha)</h3>
  <div style="overflow-x:auto"><table class="eta"><thead><tr><th></th><th>Område</th><th class="r">ha</th><th class="r">Boliger</th><th class="r">Indb.</th></tr></thead><tbody>${st2.map(row).join('')}<tr class="sum"><td></td><td>E3 + E5 + S1V + E8</td><td class="r">${sumA(st2).toLocaleString('da-DK')}</td><td class="r">${fmt(sumH(st2))}</td><td class="r">${fmt(sum(st2))}</td></tr><tr class="sum"><td></td><td>Indbyggere i alt</td><td></td><td></td><td class="r">${fmt(4900+sum(st1)+rest+sum(st2))}</td></tr>${res.map(e=>`<tr data-id="${e.id}" tabindex="0"><td><span class="etag" style="background:var(--ink-3)">${e.id}</span></td><td>${e.name}<div class="small muted">Reserve efter 10.000${e.id==='E7'?' - plantes som Sydskoven indtil da':''}</div></td><td class="r">${e.ha.toLocaleString('da-DK')}</td><td class="r muted">(${fmt(e.homes)})</td><td class="r muted">(${fmt(e.people)})</td></tr>`).join('')}</tbody></table></div>
  <p class="small">"Ned mod vandet": ved 10.000 vokser plateauet (E5), Lendrumvej-kilen (E1), Stolpegården (E0) og den gamle sommerhusby sammen til én kystby ved at konvertere sommerhusområdets vestlige 34 ha til helårs (S1-Vest) - som "Ved Kystvejen" i 2019, blot større. Det udnytter allerede bebygget jord i stedet for nye marker; E6 på plateauet og E7 syd for omfartsvejen holdes som reserver (E7 plantes som Sydskoven). Sammenhæng er tjekket geometrisk: E0 rører Nicolinelund og Ved Kystvejen (3-16 m), E1-E2-E5 rører hinanden (0-10 m), S1-Vest grænser op til E1/B13, E3 ligger op ad byzonen, og E8 ligger 20 m fra Strøbys byzone - alt er byvækst i tilknytning til eksisterende byzone, indefra og ud.</p>
  <div class="callout"><b>Planlovens bremse.</b> Kommuneplan 2025 udlægger ingen nye boligarealer og opgør kommunens behov til <b>1,4 ha</b> ny byzone i planperioden (5,1 ha netto før omfordeling). E1-E4 alene er 55 ha. Vejen frem er enten omfordeling fra uudnyttede rammer (Store Heddinge 34,7 ha, Rødvig 17,2 ha) eller en ny behovsopgørelse med dokumenteret vækststrategi i næste kommuneplan - og statens accept. Det er den første politiske beslutning, ikke den sidste.</div>
  <h3>Håndtag uden nyt areal - og deres pris</h3>
  <p><b>Sommerhusområdet 3 S1 (106 ha)</b> og <b>Ved Kystvejen 3 B13 (31,5 ha byzone siden 2019)</b> kan give hundredvis af helårsboliger uden en eneste ny udstykning. Prisen: al trafikken lander på Kystvejen (6 m, kan ikke udvides), og rammen er udpeget som oversvømmelses- og erosionstruet. Kun forsvarligt efter den østlige fordelingsvej og kystsikringen. <b>Ramme 3 D1 (Strøbyskolen og institutioner)</b> tillader boliger - det er den hjemmel, en udstykning af Ellehallen ville bruge.</p>
  <p class="small muted">Datagrundlag: Plandata.dk (Kommuneplan 2025, vedtaget 20-11-2025), Danmarks Miljøportal (habitat, § 3, byggelinjer, fredning, BNBO), EU-DEM 25 m (terræn, ±1-2 m), OpenStreetMap (marker, bygninger). Strandbeskyttelseslinjen er vist som 300 m-bånd; den fastlagte linje skal slås op. Terræn skal efterprøves i Danmarks Højdemodel før lokalplanlægning.</p>`;
  $$('#housing-body tr[data-erhv]').forEach(tr=>{tr.addEventListener('click',()=>{const n=ERHV.find(x=>x.id===tr.dataset.erhv);if(scen!=='k75'&&scen!=='k10'){$('#scen button[data-s="k75"]').click();}if(mode!=='plan'){$('#mode button[data-m="plan"]').click();}setTimeout(()=>map.flyTo([n.label[1],n.label[0]],15,{duration:.8}),300);});});
  $$('#housing-body tr[data-id]').forEach(tr=>{const go=()=>{const e=ETAPE[tr.dataset.id];if(!e)return;if(scen!==e.stage&&!(scen==='k10')){/* switch scenario */const b=$(`#scen button[data-s="${e.stage}"]`);b&&b.click();}setTimeout(()=>{map.flyTo([e.label[1],e.label[0]],15,{duration:.8});setTimeout(()=>e._g&&e._g.openPopup([e.label[1],e.label[0]]),850);},scen===e.stage||scen==='k10'?0:400);};tr.addEventListener('click',go);tr.addEventListener('keydown',ev=>{if(ev.key==='Enter')go();});});
}


/* ---------- bystruktur (målbillede) ---------- */
const structLayer=L.layerGroup();
function erhvPopup(n){return `<h4>${n.id} · ${n.name}</h4><span class="tag" style="background:${css('--erhv')}">${n.stage==='k75'?'7.500':'10.000 (option)'}</span><div class="kv"><span>Areal</span><b>${n.ha} ha</b><span>Type</span><b>${n.typ}</b></div><p style="margin:8px 0 0"><b>Hvorfor her:</b> ${n.why}</p><p style="margin:6px 0 0;color:var(--los4)"><b>Vær opmærksom:</b> ${n.watch}</p>`;}
function lblAt(p,html,cls){return L.marker(p,{pane:'lbl',interactive:false,icon:L.divIcon({className:'',html:`<div class="lbl ${cls}" style="transform:translate(-50%,-50%)">${html}</div>`,iconSize:[0,0]})});}
function drawStructure(){
  structLayer.clearLayers();
  const stageOK=id=>scen==='k10'||(scen==='k75'&&['E1','E2','E3','N1','N2'].includes(id))||scen==='today'||scen==='k5';
  // landskab tegnes i det grønne lag (drawGreen)
  // kystkiler
  STRU.kiler.forEach(k=>{L.polyline(k.c,{renderer:R('net'),color:css('--kile'),weight:22,opacity:.32,lineCap:'round'}).bindTooltip(`${k.name}: grønt bånd og sti fra plateauet til stranden ad eksisterende vej - "strandport" uden bilparkering`,{sticky:true}).addTo(structLayer);L.polyline(k.c,{renderer:R('net'),color:css('--kile'),weight:3,dashArray:'2 8',lineCap:'round',interactive:false}).addTo(structLayer);});
  // erhverv
  ERHV.filter(n=>!(BUILT_IDS[scen]||[]).includes(n.id)).forEach(n=>{const act=stageOK(n.id);L.geoJSON(n.geom,{renderer:R('areas'),style:{color:css('--erhv'),weight:act?2:1.2,dashArray:act?null:'4 4',fillColor:css('--erhv'),fillOpacity:act?.30:.10}}).bindPopup(()=>erhvPopup(n),{maxWidth:360}).addTo(structLayer);lblAt([n.label[1],n.label[0]],`${n.id} · ${Math.round(n.ha)} ha`,'str erhv').addTo(structLayer);});
  // bybånd + ådalssti
  L.polyline(STRU.byband,{renderer:R('net'),color:'#fff',weight:11,opacity:.9,interactive:false}).addTo(structLayer);
  L.polyline(STRU.byband,{renderer:R('net'),color:css('--struct'),weight:7,opacity:.95}).bindTooltip('Bybåndet ("Sydvejen"): fordelingsvej 50 km/t med cykelsti, bus og bydelscentre som perler på en snor - fra Idrætstorvet til Strøby Nord. Aldrig gennem Strøby Bygade.',{sticky:true}).addTo(structLayer);
  L.polyline(STRU.byband,{renderer:R('net'),color:css('--cycle'),weight:2,dashArray:'6 6',interactive:false}).addTo(structLayer);
  L.polyline(STRU.aadalssti,{renderer:R('net'),color:css('--cycle'),weight:4,dashArray:'2 8',lineCap:'round'}).bindTooltip('Ådalsstien: cykel-/gangsti fra Strøbyskolen over landskabsbroen til Valløby - naturparkens rygrad',{sticky:true}).addTo(structLayer);
  // noder
  const icon={kultur:'kultur',rest:'rest',center:'shop',kyst:'marina',pr:'pr',park:'park',natur:'park'};
  STRU.noder.forEach(n=>{L.marker(n.p,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM[icon[n.kind]](),iconSize:[24,24],iconAnchor:[12,12]})}).bindPopup(`<h4>${n.name}</h4><p style="margin:4px 0 0">${n.t}</p>${n.id==='havnehus'?marinaVisionButton():''}`,{maxWidth:320}).addTo(structLayer);lblAt([n.p[0]-0.0004,n.p[1]],n.name.split(' - ')[0],'node '+n.kind).addTo(structLayer);});
}


function renderStructure(){
  const box=$('#struct-body');
  const it=(sym,t,e)=>`<div class="it"><span class="sym">${SYM[sym]()}</span><span><b>${t}</b><span>${e}</span></span></div>`;
  box.innerHTML=`
  <p>Byen får sammenhæng af <b>tre spor</b> og de kiler, der binder dem til landskabet. Slå kortvisningen <b>Bystruktur</b> til for at se målbilledet.</p>
  <div class="stack">
   ${it('byport','1 · Bygaden: Stevnsvej fra Prambroen til Idrætstorvet','Når omfartsvejen åbner, bliver Stevnsvej byens hovedgade (40 km/t, 30 i hjertezonen): butikker, kulturhuset i Ellehallen 160 m fra gaden, busstop og sikre krydsninger. Biler er gæster, ikke gennemkørende.')}
   ${it('newroad','2 · Bybåndet: Idrætstorvet → Sydøstplateauet → Strøby Nord','Fordelingsvej 50 km/t med cykelsti og bus, bydelscentre som perler på en snor (Idrætstorvet, E5-centret, Brugsen i Strøby Nord). Al trafik fra de nye bydele kører til omfartsvejen - aldrig gennem byen eller Strøby Bygade.')}
   ${it('prom','3 · Kystsporet: promenaden fra Vallø Strand til Strøby Ladeplads','Kystprojektets mole + promenade er det blå spor med to knudepunkter: Havnehuset/marinaen i vest og Strøby Ladeplads havn/Vejs Ende i øst. Ingen boliger på kysten (strandbeskyttelse, kote &lt; 3 m) - men alle får kysten i gåafstand.')}
   ${it('park','Kilerne binder sporene sammen','Tre kystkiler fra plateauet til stranden, Bydelsparken i Lendrumvej-kilen, Kirkekilen mod Strøby, ådalen mod vest og Strøbylille-vidden mod øst. Ingen bolig mere end 500 m fra grønt.')}
  </div>
  <h3>Strøby og Valløby</h3>
  <p><b>Strøby</b> kobles fysisk på ad Bybåndet: vej, cykelsti (skolevej til Strøbyskolen) og bus ender ved den nye Dagli’Brugsen i Strøbys nordkant (ramme 7 C2), som Trafikplanen flytter derud. Kirkekilen (ca. ${Math.round(STRU.kirkekile.ha)} ha) holder det åbne landskab, så byerne kobles uden at vokse sammen - det er både Fingerplanens krav om byudvikling af lokal karakter og Strøbys egen identitet. Strøby Nord (E8, 6 ha) er den lille afrunding, der giver knuden liv. Kommuneplan 2025 lægger selv op til en udviklingsskitse for Strøby - det er den, dette kort er et oplæg til.</p>
  <p><b>Valløby</b> ligger på den anden side af Natura 2000-ådalen. Koblingen er derfor vej (omfartsvejen møder Køgevej mellem ådalen og Valløby), Ådalsstien over landskabsbroen (1,5 km fra Strøbyskolen) og udsigten fra Ådalskanten (E3). Ingen boliger i ådalen fra denne plan - Valløby har sin egen, allerede besluttede vækst uden om Strøby Egede-etaperne: Lokalplan 204 gav byen 35 boliger syd for Valløby efter en lokal udviklingsskitse (KB 15-12-2022, pkt. 252), med egen cykel-/gangsti langs Sognevej. Vallø Slot og Vallø Stift er en selvstændig tråd i kommunens turismestrategi.</p>
  <h3>Kysten: promenade, marina og "øen"</h3>
  <p>Fra badebroerne ved Stevnsvej og Solgårdsparken løber strandpromenaden 1,3 km oven på kystsikringens mole til Havnehuset og marinaen ved Bådklubben Ege (600 både, tegnet ind fra 7.500). Øst for marinaen ligger aktivitetsbroen - havnebad, sauna, kajak, fiskepladser og sæsonbaseret cablepark - som det rekreative bindeled mellem de to områder. Den kunstige ø er droppet på grund af fredningsforslaget for Køge Bugt (jan. 2026); broen på pæle giver det samme liv uden opfyldning og er langt lettere at få tilladelse til.</p>
  <h3>Natur: skov, vidder og kyst</h3>
  <p><b>Byskoven</b> (ca. ${Math.round(STRU.byskov.ha)} ha skovrejsning øst for E6, 10.000-trinnet) giver læ, motionsskov og drikkevandsbeskyttelse på det høje plateau. <b>Vidderne</b> er de åbne landskaber, der bevidst friholdes: Tryggevælde Ådal (naturpark, boardwalk), Kirkekilen og Strøbylille-vidden (ca. ${Math.round(STRU.vidde.ha)} ha) med udsigt til bugten. Kommuneplanen friholder selv kirkeomgivelser og bevaringsværdige landskaber for skov - derfor ligger Byskoven mod øst, ikke i kilen. Om plateauet er udpeget "skovrejsning ønsket" skal slås op i kommuneplanens kort.</p>
  <h3>Grønne områder lagt ind som områder</h3>
  <div style="overflow-x:auto"><table class="eta"><thead><tr><th></th><th>Område</th><th>Type</th><th class="r">ha</th><th>Fra</th></tr></thead><tbody>${GREEN.map(g=>`<tr data-green="${g.id}" tabindex="0"><td><span class="etag" style="background:${css(GSTYLE[g.kind].c)}">${g.id.slice(1)}</span></td><td>${g.name}</td><td class="small">${{park:'park',skov:'skov',eng:'eng',natur:'natur',kyst:'kyst',vidde:'vidde',golf:'golf',idraet:'idræt'}[g.kind]}</td><td class="r">${g.ha.toLocaleString('da-DK')}</td><td class="small muted">${{exist:'i dag',k75:'7.500',k10:'10.000'}[g.stage]}</td></tr>`).join('')}</tbody></table></div>
  <p class="small">I alt ca. ${fmt(GREEN.reduce((x,g)=>x+g.ha,0))} ha grønt, blåt og åbent land omkring en by på ca. 350 ha - vi bygger til fremtiden: skovene plantes nu, fordi de først er skov om 30 år, og engene og vidderne fredes i kommuneplanen, før nogen får den idé at bygge dem til.</p>
  <h3>Næringsliv og byliv</h3>
  <div class="stack">
   ${it('erhv','Erhverv ved vejen','N1 kontor/service ved skolen (4 ha), N2 Omfartsvejsparken til e-handel og lager (6 ha) med lastbiler direkte på omfartsvejen; ved 10.000 Statsvejsporten (N3, option) uden for byen. Modstrøms-pendling ind til byen om morgenen bruger den tomme retning.')}
   ${it('kultur','Kultur i midten: Kulturhuset i Ellehallen','Ellehallen (Ellevej 2) som kulturhus med sal til 200 (teater, biograf, koncert), café, bibliotek og tankesport - midt i boligkvartererne 160 m fra Stevnsvej, med Ådalskanten (E3) og Stolpegården (E0) inden for 10 minutters gang. Idrætstorvet ved skolen: Strøbyhallen udbygget med café, kontorfællesskab og daginstitution.')}
   ${it('rest','Restauranter og caféer','Havnehuset ved Bådklubben Ege (restaurant), caféerne i kulturhuset (Ellehallen) og Strøbyhallen, Centrets cafeer og bymidte, strandrestaurant/badehotel ved Strøby Ladeplads, bydelsbutik i E5 og Brugsen i Strøby Nord. Seks steder på de tre spor.')}
  </div>
  <h3>Veje, tryghed og pendlerens rejse</h3>
  <p><b>Uden gene for dem, der bor her</b>: Nicolinelunds eng er grundejerforeningernes og forbliver eng (G14) - ingen offentlig park, sti-rygrad eller regnvand fra E0 uden aftale. Hver ny etape kobles direkte på en fordelingsvej (Lendrumvej, Bybåndet, Ådalsvej, Sydporten) og aldrig gennem et eksisterende kvarter. Mellem ny og gammel by er der stier, ikke veje, så ingen smutveje opstår; Nicolinelunds veje, sommerhusområdet og Kystvejen forbliver lokale (Kystvejen lukkes for gennemkørsel, men er tovejs). Erhvervsbåndets lastbiler kører til omfartsvejen uden at passere en eneste bolig.</p>
  <p><b>Vejhierarkiet</b>: gennemfart uden om byen (omfartsvej 80, statsvej 90) → fordelingsveje ind og ud (Lendrumvej, Bybåndet, Ådalsvej, Køgevej-linket) via rundkørsler → bygade og hjertezone (40/30) → lokalveje 30 km/t. Ingen nye kryds på Stevnsvej; de nye bydele har altid to udveje. <b>Tryghed</b>: separate cykelstier på alle fordelingsveje. Tunneller dér, hvor bilerne er flest (Prambroen, Centret, Sydporten, Plateauporten, Strøbyporten, Køgevej) og ved skole og institutioner (Strøbyskolen, Hybenrosevej/Egehaven, skole nr. 2) - 13 i alt; inde i bygaden og på lokalveje hævede flader i niveau. Supercykelsti til Køge St. og Egøje St., sløjfen og kystkilerne til fods.</p>
  <p><b>Direkte på Stevnsvej med rundkørsler</b>: Stevnsvej syd (Sydporten → Strøby) bliver en fordelingsvej med rundkørsler ved hver bydel - Sydporten, Plateauporten (E5/E6) og Strøbyporten (Strøby Nord) - så plateauet ikke kun hænger på Bybåndet og skolens rundkørsel, men har to veje ud. Lendrumvej-kilen og Bydelsparken (E1) har ikke facade til Stevnsvej (Nicolinelund og Ved Kystvejen ligger imellem) - deres direkte vej er Lendrumvej til rundkørslen ved skolen, 600 m.</p>
  <p><b>Pendleren</b>: fra den sydlige halvdel er der ét kryds (Sydportens rundkørsel) mellem hoveddøren og omfartsvejen; fra den nordlige halvdel Prambroen. Nøgletallet "ekstra ventetid" øverst viser, hvad modellen giver for begge ruter. Mod København er der kun én motorvej, E47/E20, og to lovlige veje til den: gennem Køge (Strandvejen) eller vest om ved Herfølge (statsvejen). Nordlige linjeføringer gennem Vallø-fredningen er screenet fra af Vejdirektoratet - derfor går statsvejen syd om Valløby og mod E47, hvor pendleren er på motorvejen 5 minutter syd for Køge i stedet for at holde i kø på Strandvejen.</p>
  <p class="small muted">Alle linjeføringer, kiler, skov- og erhvervsarealer er skitser til debat - ikke planlagte tracéer. Byskov og erhverv kræver kommuneplantillæg; kultur- og caféfunktioner i Ellehallen/Strøbyhallen afgøres i Visionsplanen 2026.</p>`;
  $$('#struct-body tr[data-green]').forEach(tr=>{tr.addEventListener('click',()=>{const g=GREEN.find(x=>x.id===tr.dataset.green);const need={exist:'today',k75:'k75',k10:'k10'}[g.stage];const rank={today:0,k5:0,k75:1,k10:2};if(rank[scen]<rank[need]){$(`#scen button[data-s="${need}"]`).click();}setTimeout(()=>map.flyTo([g.label[1],g.label[0]],Math.max(map.getZoom(),14),{duration:.8}),300);});});
}


/* ---------- bebyggede etaper (veje og huse), marina, grønne områder ---------- */
const builtLayer=L.layerGroup().addTo(map), greenLayer=L.layerGroup().addTo(map);
const existLayer=L.layerGroup();
function drawExisting(){existLayer.clearLayers();(SUIT.exist_bld||[]).forEach(b=>L.polygon(b,{renderer:R('base'),stroke:false,fillColor:css('--bld'),fillOpacity:1,interactive:false}).addTo(existLayer));}
function existVisibility(){const z=map.getZoom();if(z>=14.25){if(!map.hasLayer(existLayer))existLayer.addTo(map);}else{if(map.hasLayer(existLayer))map.removeLayer(existLayer);}}
map.on('zoomend',existVisibility);
function drawBuiltArea(id,geom,col,label,popup){
  const B=BUILT[id]; if(!B)return;
  const konv=B.kind==='konv';
  L.geoJSON(geom,{renderer:R('areas'),style:{color:col,weight:2.4,fillColor:css('--urban'),fillOpacity:konv?.0:1,dashArray:konv?'8 5':null}}).bindPopup(popup,{maxWidth:360}).addTo(builtLayer);
  const rc=css('--road-case'),rf=css('--road-fill');
  B.access.forEach(a=>L.polyline(a,{renderer:R('net'),color:rc,weight:5,interactive:false,lineCap:'round'}).addTo(builtLayer));
  B.streets.forEach(st=>L.polyline(st,{renderer:R('net'),color:rc,weight:3.6,interactive:false,lineCap:'round'}).addTo(builtLayer));
  B.access.forEach(a=>L.polyline(a,{renderer:R('net'),color:rf,weight:3,interactive:false,lineCap:'round'}).addTo(builtLayer));
  B.streets.forEach(st=>L.polyline(st,{renderer:R('net'),color:rf,weight:2,interactive:false,lineCap:'round'}).addTo(builtLayer));
  B.bld.forEach(b=>L.polygon(b,{renderer:R('net'),stroke:false,fillColor:B.kind==='erhv'?css('--erhv'):css('--bld'),fillOpacity:B.kind==='erhv'?.55:1,interactive:false}).addTo(builtLayer));
  if(label)lblAt(label.p,label.html,label.cls).addTo(builtLayer);
}
function drawMarina(){
  const M=STRU.marina; if(!M)return;
  L.polygon(M.basin,{renderer:R('areas'),color:css('--prom'),weight:1,fillColor:css('--water'),fillOpacity:1}).on('click',()=>openMarinaVision()).addTo(builtLayer);
  M.moles.forEach(m=>L.polyline(m,{renderer:R('net'),color:css('--ink-2'),weight:7,lineCap:'round',interactive:false}).addTo(builtLayer));
  M.moles.forEach(m=>L.polyline(m,{renderer:R('net'),color:'#E9E4D6',weight:3.5,lineCap:'round',interactive:false}).addTo(builtLayer));
  M.pontoons.forEach(p=>L.polyline(p,{renderer:R('net'),color:'#F2EFE6',weight:2.5,lineCap:'round',interactive:false}).addTo(builtLayer));
  lblAt(M.label,'Marina · 600 både','node kyst').addTo(builtLayer);
  const P_=STRU.pier;
  L.polyline(P_.line,{renderer:R('net'),color:css('--ink-2'),weight:5,lineCap:'round',interactive:false}).addTo(builtLayer);
  L.polyline(P_.line,{renderer:R('net'),color:'#F2EFE6',weight:2.5,lineCap:'round',interactive:false}).addTo(builtLayer);
  L.polygon(P_.platform,{renderer:R('areas'),color:css('--ink-2'),weight:1.5,fillColor:'#E9E4D6',fillOpacity:1}).bindPopup('<h4>Aktivitetsbroen - "øen" i lav-impact-udgave</h4><p style="margin:4px 0 0">Multifunktionel bro på pæle/pontoner med havnebad, sauna, kajak-/SUP-platform, fiskepladser og en sæsonbaseret cablepark - det rekreative bindeled mellem badebroerne ved Stevnsvej og marinaen. Den kunstige ø er droppet på grund af fredningsforslaget for Køge Bugt (jan. 2026); broen giver det samme liv uden opfyldning.</p>',{maxWidth:340}).addTo(builtLayer);
  L.polyline(STRU.promenade1,{renderer:R('net'),color:'#fff',weight:7,opacity:.9,interactive:false,lineCap:'round'}).addTo(builtLayer);
  L.polyline(STRU.promenade1,{renderer:R('net'),color:css('--prom'),weight:4,dashArray:'1 7',lineCap:'round'}).bindTooltip('Strandpromenaden, etape 1: fra badebroerne ved Stevnsvej/Solgårdsparken til Havnehuset og marinaen (1,3 km) - oven på kystsikringens mole',{sticky:true}).addTo(builtLayer);
}
function drawBuilt(){
  builtLayer.clearLayers();
  const ids=BUILT_IDS[scen]||[];
  ids.forEach(id=>{
    if(id.startsWith('3B')){const r=REST.find(x=>x.nr.replace(' ','')===id);if(!r)return;const c=L.geoJSON(r.geom).getBounds().getCenter();drawBuiltArea(id,r.geom,css('--area'),{p:[c.lat,c.lng],html:`${r.nr}<small>udbygget · ${r.ha} ha</small>`,cls:'eta k75'},`<h4>${r.nr} ${r.navn}</h4><p style="margin:4px 0 0">Udbygget i dette scenarie: ${r.ha} ha af kommuneplanens restrummelighed (Kommuneplan 2025).</p>`);return;}
    const e=ETAPE[id]; const n=ERHV.find(x=>x.id===id);
    if(e){drawBuiltArea(id,e.geom,css(e.stage==='k75'?'--area':'--area2'),{p:[e.label[1],e.label[0]],html:`${e.id} · ${Math.round(e.ha)} ha<small>${e.id==='S1V'?'konverteret til helårs':'udbygget'} · ca. ${e.homes} boliger</small>`,cls:'eta '+e.stage},etapePopup(e));}
    else if(n){drawBuiltArea(id,n.geom,css('--erhv'),{p:[n.label[1],n.label[0]],html:`${n.id} · ${Math.round(n.ha)} ha<small>erhverv · udbygget</small>`,cls:'str erhv'},erhvPopup(n));}
  });
  const S=SCEN[scen]; const rc=css('--road-case'),rf=css('--road-fill');
  (STRU.interlinks||[]).filter(l=>ids.includes(l.a)&&ids.includes(l.b)).forEach(l=>{L.polyline(l.c,{renderer:R('net'),color:rc,weight:3.6,interactive:false,lineCap:'round'}).addTo(builtLayer);L.polyline(l.c,{renderer:R('net'),color:rf,weight:2,interactive:false,lineCap:'round'}).addTo(builtLayer);});
  (STRU.pathlinks||[]).filter(l=>ids.includes(l.a)).forEach(l=>L.polyline(l.c,{renderer:R('net'),color:css('--cycle'),weight:2.5,dashArray:'2 6',lineCap:'round'}).bindTooltip('Sti (ikke vej) mellem '+l.a+' og Nicolinelund - ingen smutvej for biler',{sticky:true}).addTo(builtLayer));
  const roads=[];
  if(S.bypass){roads.push([LINKS.bypass.geo,6,3.8]);roads.push([scen==='k75'?STRU.byband.slice(0,4):STRU.byband,5,3]);roads.push([[[55.4053,12.2679],[55.4069,12.2706]],5,3]);}
  if(S.statsvej&&svOn)roads.push([LINKS.statsvej.geo,6,3.8]);
  roads.forEach(([g,w1,w2])=>L.polyline(g,{renderer:R('net'),color:rc,weight:w1,interactive:false,lineCap:'round',lineJoin:'round'}).addTo(builtLayer));
  roads.forEach(([g,w1,w2])=>L.polyline(g,{renderer:R('net'),color:rf,weight:w2,interactive:false,lineCap:'round',lineJoin:'round'}).addTo(builtLayer));
  if(S.bypass)drawMarina();
  if(S.ring){const RG=STRU.ring;L.polyline(RG.plateauvej,{renderer:R('net'),color:rc,weight:5,interactive:false,lineCap:'round'}).addTo(builtLayer);L.polyline(RG.plateauvej,{renderer:R('net'),color:rf,weight:3,interactive:false,lineCap:'round'}).addTo(builtLayer);
    [[RG.plateauporten,'Plateauporten - rundkørsel på Stevnsvej syd: E5/E6 direkte på Stevnsvej'],[RG.strobyporten,'Strøbyporten - rundkørsel Stevnsvej/Strandvejen/Bybåndet ved Strøby Nord']].forEach(([p,t])=>L.marker(p,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.rundk('#D9731A'),iconSize:[24,24],iconAnchor:[12,12]})}).bindTooltip(t).addTo(builtLayer));}
  if(S.bypass){(STRU.cykelkryds||[]).forEach(c=>{if(c.k==='tunnel'&&c.road==='Bybåndet'&&scen==='k75')return;if(c.k==='tunnel'&&(c.road==='Plateauvej')&&scen==='k75')return;L.marker(c.p,{pane:'sym',icon:L.divIcon({className:'sym corr',html:c.k==='tunnel'?SYM.tunnel():SYM.haevet(),iconSize:[20,20],iconAnchor:[10,10]})}).bindTooltip(c.n).addTo(builtLayer);});}
  if(S.bypass){L.marker(PT.elle,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.kultur(),iconSize:[30,30],iconAnchor:[15,15]})}).bindPopup('<h4>Kulturhuset i Ellehallen</h4><p style="margin:4px 0 0">Ellehallen (Ellevej 2) som kulturhus og medborgerhus: sal til 200 (teater, biograf, koncert), café, bibliotek, tankesport og foreningsliv - midt i boligkvartererne, 160 m fra Stevnsvej: 900 m fra Centret, 800 m fra Stolpegården, 200 m fra Ådalskanten (E3), 1,2 km fra skolen.</p>',{maxWidth:340}).addTo(builtLayer);
    lblAt([55.4088,12.2522],'Kulturhuset i Ellehallen','node kultur').addTo(builtLayer);
    L.marker([55.4030,12.2648],{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.kultur(),iconSize:[24,24],iconAnchor:[12,12]})}).bindPopup('<h4>Idrætstorvet - Strøbyhallen og skolen</h4><p style="margin:4px 0 0">Strøbyhallen udbygget med café, Strøbyskolen, daginstitution, kontorfællesskab og Bybåndets start i hjertezonen (30 km/t).</p>',{maxWidth:320}).addTo(builtLayer);
    lblAt([55.4040,12.2665],'Idrætstorvet · Strøbyhallen','node kultur').addTo(builtLayer);}
  if(S.bypass&&S.statsvej&&svOn){const C=STRU.statsvej;
    C.crossings.forEach(c=>L.marker(c.p,{pane:'sym',icon:L.divIcon({className:'sym corr',html:SYM.bridge(),iconSize:[20,20],iconAnchor:[10,10]})}).bindTooltip(`${c.n} føres over statsvejen (bro)`).addTo(builtLayer));
    C.passages.forEach(c=>L.marker(c.p,{pane:'sym',icon:L.divIcon({className:'sym corr',html:SYM.passage(),iconSize:[20,20],iconAnchor:[10,10]})}).bindTooltip('Landbrugs-/faunapassage over den nedgravede vej').addTo(builtLayer));
    C.junctions.forEach(j=>L.marker(j.p,{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.rundk('#1F44B8'),iconSize:[24,24],iconAnchor:[12,12]})}).bindTooltip(j.n).addTo(builtLayer));
  }
  if(S.kystluk){L.marker([55.4045,12.2905],{pane:'sym',icon:L.divIcon({className:'sym',html:SYM.luk(),iconSize:[26,26],iconAnchor:[13,13]})}).bindPopup('<h4>Kystvejen lukket for gennemkørsel</h4><p style="margin:4px 0 0">Bussluse/cykelpassage mellem udsigten og Strandvejen. Kystvejen forbliver <b>tovejs</b> lokalvej - ikke ensrettet - på begge sider af lukningen. Strøby Ladeplads kører ad Strandvejen til Strøby og videre ad Stevnsvej (7.500) eller Bybåndet (10.000) til Sydporten. Præcis placering fastlægges ved udsigten.</p>').addTo(builtLayer);}
}
const GSTYLE={park:{fo:.40,c:'--kile',f:'--kile'},skov:{fo:1,c:'--skov',f:'--wood'},eng:{fo:.22,c:'--kile',f:'--kile',d:'6 4'},natur:{fo:0,c:'--nat',f:'--nat',d:'4 4'},kyst:{fo:.18,c:'--prom',f:'--prom'},vidde:{fo:.06,c:'--kile',f:'--kile',d:'2 6'},golf:{fo:.55,c:'--kile',f:'--green'},idraet:{fo:.30,c:'--kile',f:'--kile'}};
function drawGreen(){
  greenLayer.clearLayers();
  const stageRank={today:0,k5:0,k75:1,k10:2}, need={exist:0,k75:1,k10:2};
  GREEN.forEach(g=>{
    if(stageRank[scen]<need[g.stage])return;
    if(g.id==='G5'&&scen!=='k10')return;
    const st=GSTYLE[g.kind]||GSTYLE.park;
    L.geoJSON(g.geom,{renderer:R('areas'),style:{color:css(st.c),weight:1.2,dashArray:st.d||null,fillColor:css(st.f),fillOpacity:st.fo}}).bindPopup(`<h4>${g.id} · ${g.name}</h4><span class="tag" style="background:${css(st.c)}">${{park:'park',skov:'skov',eng:'eng',natur:'natur',kyst:'kyst',vidde:'vidde',golf:'golf',idraet:'idræt'}[g.kind]} · ${g.ha} ha</span><p style="margin:6px 0 0">${g.t}</p>`,{maxWidth:340}).addTo(greenLayer);
    if(g.kind!=='natur'||true)lblAt([g.label[1],g.label[0]],g.name.split(' - ')[0],'str'+(g.kind==='vidde'?' vidde':g.kind==='kyst'?' kyst':'')).addTo(greenLayer);
  });
}


function renderCheck(){
  const NC=SUIT.netcheck||{areas:{}}; const A=NC.areas;
  const ford={E0:'Lendrumvej (åbnet) → Lendrumvej-knuden → Sydporten',E1:'Lendrumvej → Lendrumvej-knuden → Sydporten',E2:'Bybåndet → Sydporten',E3:'Ådalsvej → signalerne Valnøddevej/Hybenrosevej → Stevnsvej',E5:'Bybåndet → Sydporten eller Plateauporten → Stevnsvej syd → Sydporten',E6:'Bybåndet eller Plateauporten → Stevnsvej syd (reserve)',E8:'Strøbyporten → Stevnsvej syd → Sydporten eller Bybåndet',E7:'Sydporten direkte (reserve)',N1:'Sydporten',N2:'Sydporten / Stevnsvej syd',N3:'Køgevej → statsvejen (option)',S1V:'Lendrumvej (åbnet) mod syd · Strandvejen mod øst · Kystvejen (lokal)','3B11':'Hybenrosevej-signalet (eksisterende lokalplan)','3B12':'Hybenrosevej-signalet (eksisterende lokalplan)'};
  const order=['3B11','3B12','E0','E1','E2','E3','E5','S1V','E8','N1','N2','N3','E6','E7'];
  const rows=order.filter(id=>A[id]).map(id=>{const a=A[id];const ok=a.connected!==false;const acc=a.access;const accOk=acc>=2||id==='3B12'||id==='S1V'||id==='N3';return `<tr><td><b>${id}</b></td><td>${ok?'<span class="pill l1">ja</span>':'<span class="pill l4">nej</span>'}</td><td class="r">${a.connected===null?'eksist.':acc}${accOk?'':' <span class="pill l3">én</span>'}</td><td class="small">${ford[id]||''}</td><td class="r">${a.cyc_m} m</td></tr>`;}).join('');
  $('#check-body').innerHTML=`
  <p>Alle nye områder er lagt ind som gadenet med faktiske adgange, og nettet er testet som graf (10.000-udbygningen, inkl. eksisterende veje, omfartsvej, statsvej, Bybåndet og den åbnede Lendrumvej):</p>
  <div class="kpis"><div class="kpi l1"><span class="stripe"></span><div class="l">Vejnet</div><div class="v">1<small>sammenhængende net</small></div><div class="alt">alle områder når Sydporten og Prambroen</div></div><div class="kpi l1"><span class="stripe"></span><div class="l">Cykelnet</div><div class="v">${NC.cycle_components||1}<small>komponent</small></div><div class="alt">${NC.cycle_km||''} km ruter og stier + 30 km/t-gader; alle områder 0 m fra nettet</div></div></div>
  <div style="overflow-x:auto;margin-top:10px"><table class="eta"><thead><tr><th>Område</th><th>Forbundet</th><th class="r">Adgange</th><th>Vejen ud</th><th class="r">Til cykelnet</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="small">Reglen er to udkørsler pr. område, så én spærring aldrig lukker et kvarter, og så trafikken fordeler sig. Nicolinelund 3.2 har én efter sin lokalplan (og sti til E0). Naboetaper er bundet sammen med ${NC.inter||0} korte vejstykker (E0-E1, E1-E2, E1-E5, E2-E5, E5-E6), så man kan køre på tværs af den nye by uden om Stevnsvej; mod de gamle kvarterer (Nicolinelund) er der kun stier (${NC.paths||0} stk.). E3 er den ene undtagelse, der stadig ender i signalanlæg på Stevnsvej - det er prisen for at bygge vest for vejen.</p>
  <p class="small"><b>Krydsninger:</b> ${(STRU.cykelkryds||[]).filter(c=>c.k==='tunnel').length} tunneller/underføringer, hvor bilerne er flest eller ved skole og institution, og ${(STRU.cykelkryds||[]).filter(c=>c.k!=='tunnel').length} hævede flader inde i byen og på Kystvejen - alle steder, hvor cykelnettet møder en hovedvej eller fordelingsvej, fundet geometrisk og vist på kortet fra 7.500.</p>
  <p class="small">Cykelnettet: supercykelstien til Køge St., sløjfen, Bybåndets sti, Ådalsstien, promenaderne og de tre kystkiler er ét sammenhængende net sammen med cykelstier langs alle fordelings- og adgangsveje og 30 km/t-gaderne inde i områderne. Slå <i>Cykelnet</i> til på kortet for at se det hele. Metoden er geometrisk (12 m tolerance) - den viser, at der er forbindelse, ikke at hver enkelt krydsning er sikker; det afgøres i projekteringen.</p>`;
}

/* ---------- panel rendering ---------- */
function kpi(l,v,alt,cls){return `<div class="kpi ${cls||''}"><span class="stripe"></span><div class="l">${l}</div><div class="v">${v}</div>${alt?`<div class="alt">${alt}</div>`:''}</div>`;}
function renderKPIs(){
  const r=res,o=resOther,f=r.flows;
  const vcN=f.stevnsN/LINKS.stevnsN.cap, vcK=f.strandKoge/LINKS.strandKoge.cap;
  const on=o?o.flows.stevnsN/LINKS.stevnsN.cap:null, ok=o?o.flows.strandKoge/LINKS.strandKoge.cap:null;
  const other=preset==='calib'?'stresstest':'kalibreret';
  $('#kpi-scen').textContent=SCEN[scen].label;
  $('#kpis').innerHTML=
    kpi('Indbyggere · husstande',`${fmt(r.P)}<small>· ${fmt(r.H)} boliger</small>`,`à ${A.h.toFixed(1)} personer`)+
    kpi('Pendlere i bil (pr. døgn, én retning)',fmt(r.carsDay*(1-r.shift)),o?`${other}: ${fmt(o.carsDay*(1-o.shift))}`:'')+
    kpi('Biler ud over Prambroen i spidstimen',`${fmt(r.E+r.Tout)}<small>/t</small>`,`heraf ${fmt(r.Tout)} fra resten af Stevns (${pct(A.rshare)} af ${fmt(A.rpop*A.rwork)} i erhvervsaktiv alder = ${fmt(r.Tadt)} ÅDT) · ${other}: ${o?fmt(o.E+o.Tout):'-'}`)+
    kpi('Modelleret ÅDT ved Prambroen',fmt(r.adt),`målt i dag: >13.000 (Trafikplan 2025) · ${other}: ${o?fmt(o.adt):'-'}`)+
    kpi('Stevnsvej nord (Centret → Prambroen)',`${pct(vcN)}<small>af kapacitet</small>`,`<span class="pill l${los(vcN)}">${LOSN[los(vcN)]}</span> ${on!=null?'· '+other+': '+pct(on):''}`,'l'+los(vcN))+
    kpi('Køge-strækningen (Strandvejen)',`${pct(vcK)}<small>af kapacitet</small>`,`<span class="pill l${los(vcK)}">${LOSN[los(vcK)]}</span> ${ok!=null?'· '+other+': '+pct(ok):''}`,'l'+los(vcK))+
    kpi('Pendlerens ekstra ventetid i myldretiden (skøn)',`${Math.round(r.dN)}<small>min via Prambroen</small>`,`${SCEN[scen].bypass?`sydlige bydel via omfartsvej: ${Math.round(r.dS)} min${r.useSv?' (statsvej)':' (Køgevej → Strandvejen)'}`:'hele byen kører samme vej'} · ${other}: ${o?Math.round(o.dN)+' / '+Math.round(o.dS)+' min':'-'}`,'l'+los(Math.min(2.2,r.dN/12+0.4)));
  const cal=$('#calib');
  if(preset==='calib'){cal.className='callout blue';cal.innerHTML=`<b>Kalibreret sæt vises.</b> Pendlerandel 30 % af alle over 25 år og 68 % af de 25-64-årige i resten af Stevns over Prambroen (8.500 biler/døgn) rammer Trafikplanens tælling (>13.000 ÅDT) og beskrivelsen "kø morgen og eftermiddag". Skift til stresstesten under <i>Antagelser</i> for stresstesten.`;}
  else{cal.className='callout';cal.innerHTML=`<b>Stresstest.</b> Med 80 % af alle over 25 år i bil (${preset==='work'?'her: 80 % af de 25-64-årige':'inkl. pensionister'}) giver modellen ${fmt(r.E+r.Tout)} biler/t ud over Prambroen ${scen==='today'?'i dag':'i dette scenarie'}${scen==='today'?` - tællingerne svarer til ca. ${fmt(resOther?resOther.E+resOther.Tout:0)}. Antagelsen overvurderer altså dagens trafik med ca. ${pct((r.E+r.Tout)/(resOther?resOther.E+resOther.Tout:1)-1)}, men er en fair øvre grænse til at dimensionere efter`:''}. Det kalibrerede tal står i småt ved hvert nøgletal.`;}
}
function renderTable(){
  const tb=$('#linktbl tbody');const S=SCEN[scen];
  const ids=['stevnsS','stevnsMid','stevnsN','prambro','strandKoge','kystW','kystE','strandStroby','lendrum','byband','kogevej','bypass','statsvej'].filter(id=>!(id==='bypass'&&!S.bypass)&&!(id==='byband'&&!S.bypass)&&!(id==='statsvej'&&!(S.statsvej&&svOn))&&!(id==='kogevej'&&!S.bypass));
  tb.innerHTML=ids.map(id=>{const L_=LINKS[id],f=res.flows[id],vc=f/L_.cap,l=los(vc);return `<tr data-id="${id}" tabindex="0"><td>${L_.name}</td><td class="r">${fmt(f)}</td><td class="r muted">${fmt(L_.cap)}</td><td><div class="bar"><i style="width:${Math.min(100,vc*100)}%;background:${losColor(l)}"></i><em></em></div><span class="small num" style="color:${losColor(l)}">${pct(vc)}</span></td></tr>`;}).join('');
  $$('#linktbl tbody tr').forEach(tr=>{const go=()=>{const pl=linkPaths[tr.dataset.id];if(!pl)return;map.flyToBounds(pl.getBounds().pad(0.3),{duration:.8,maxZoom:15});setTimeout(()=>pl.openPopup(),850);};tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter')go();});});
}
function renderMeasures(){
  const ul=$('#measures');const list=MEAS.filter(m=>m.s.includes(scen));
  ul.innerHTML=list.map(m=>`<li class="measure" data-id="${m.id}" tabindex="0" role="button"><span class="sym">${SYM[m.sym]()}</span><span><span class="t">${m.t}</span><div class="e">${m.e}</div></span><span class="w ${m.w}">${{new:'Ny',upg:'Ombyg',down:'Bygade',cycle:'Cykel',area:'Areal',warn:'Vagt'}[m.w]}</span></li>`).join('');
  $$('#measures .measure').forEach(li=>{const go=()=>{const m=MEAS.find(x=>x.id===li.dataset.id);map.flyTo(m.at,Math.max(map.getZoom(),14.5),{duration:.8});setTimeout(()=>m._mk&&m._mk.openPopup(),850);};li.addEventListener('click',go);li.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});
}
function renderStory(){
  $('#story').innerHTML=STORY[scen];
  const r=res,f=r.flows,o=resOther;const S=SCEN[scen];
  const vc=id=>pct(f[id]/LINKS[id].cap);const vco=id=>o?pct(o.flows[id]/LINKS[id].cap):'-';
  let t='';
  if(scen==='today'||scen==='k5'){t=`Med de valgte antagelser sender byen <b>${fmt(r.E)} biler/t</b> mod Køge i morgenspidsen, og <b>${fmt(r.Tout)} biler/t fra resten af Stevns</b> (Strøby, Store Heddinge, Rødvig, Klippinge, kysten - ${fmt(r.Tadt)} biler/døgn) kommer til ved Sydporten og Kystvejen. Stevnsvej nord ligger på <b>${vc('stevnsN')}</b> af praktisk kapacitet (${preset==='calib'?'stresstest':'kalibreret'}: ${vco('stevnsN')}), Køge-strækningen på ${vc('strandKoge')}. Kystvejen: ${vc('kystW')}. Belastningsgrader over 100 % betyder, at køen vokser time for time - det er det, Trafikplanen beskriver med ord.`;}
  else if(scen==='k75'){t=`Byen sender <b>${fmt(r.E)} biler/t</b> mod arbejde i spidstimen. Omfartsvejen tager <b>${fmt(f.bypass)} biler/t</b> (${vc('bypass')} af kapacitet), hvoraf ${fmt(f.statsvej)} fortsætter ad statsvejen til E47. Stevnsvej gennem byen falder til ${vc('stevnsMid')}; Stevnsvej nord ligger på <b>${vc('stevnsN')}</b> (${preset==='calib'?'stresstest':'kalibreret'}: ${vco('stevnsN')}) og Køge-strækningen på ${vc('strandKoge')}. Justér "Overflytning" under Antagelser for at se, hvad supercykelsti og bus flytter.`;}
  else{t=`Byen sender <b>${fmt(r.E)} biler/t</b> mod arbejde i spidstimen. Omfartsvejen: ${fmt(f.bypass)} biler/t (${vc('bypass')}); den østlige fordelingsvej tager ${fmt(f.lendrum)} biler/t fra kysten. Stevnsvej nord ligger på <b>${vc('stevnsN')}</b> (${preset==='calib'?'stresstest':'kalibreret'}: ${vco('stevnsN')}), Prambroen på ${vc('prambro')} og Køge-strækningen på <b>${vc('strandKoge')}</b>. Sæt "Overflytning" til 20 % og se, hvor meget bus og cykel er nødt til at bære.`;}
  const el=$('#story-model');if(el)el.innerHTML=t;
}
function renderSliders(){
  const box=$('#sliders');
  box.innerHTML=SLIDERS.map(s=>{const v=s.k==='shift'?(shiftOverride==null?SCEN[scen].shift:shiftOverride):A[s.k];return `<div class="sl"><label for="sl-${s.k}">${s.l}</label><output id="out-${s.k}">${s.f(v)}</output><input type="range" id="sl-${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}"></div>`;}).join('');
  SLIDERS.forEach(s=>{const inp=$('#sl-'+s.k);inp.addEventListener('input',()=>{const v=parseFloat(inp.value);$('#out-'+s.k).textContent=s.f(v);if(s.k==='shift'){shiftOverride=v;}else{A[s.k]=v;preset='custom';$$('#presets button').forEach(b=>b.setAttribute('aria-pressed','false'));}update(false);});});
}
function renderAttn(){$('#attnlist').innerHTML=ATTN.map(a=>`<li><b>${a[0]}</b><span>${a[1]}</span></li>`).join('');}
function legendSVG(kind){
  const c=v=>css(v);
  switch(kind){
    case 'main':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--road-case')}" stroke-width="7" stroke-linecap="round"/><path d="M2 9h40" stroke="${c('--road-fill')}" stroke-width="4" stroke-linecap="round"/></svg>`;
    case 'tert':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--road-case')}" stroke-width="5" stroke-linecap="round"/><path d="M2 9h40" stroke="${c('--road-fill')}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    case 'minor':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--road-minor')}" stroke-width="3" stroke-linecap="round"/></svg>`;
    case 'new':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M2 9h40" stroke="${c('--new')}" stroke-width="6" stroke-linecap="round"/></svg>`;
    case 'newdash':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--new')}" stroke-width="5" stroke-dasharray="8 6"/></svg>`;
    case 'reserve':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--ink-3')}" stroke-width="12" stroke-opacity=".3"/><path d="M2 9h40" stroke="${c('--new')}" stroke-width="1.5" stroke-dasharray="2 3"/></svg>`;
    case 'upg':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--upg')}" stroke-width="12" stroke-opacity=".4"/><path d="M2 9h40" stroke="${c('--road-case')}" stroke-width="5"/><path d="M2 9h40" stroke="${c('--road-fill')}" stroke-width="2.5"/></svg>`;
    case 'down':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--down')}" stroke-width="8" stroke-dasharray="2 6" stroke-linecap="round"/></svg>`;
    case 'cycleold':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--cycle')}" stroke-width="2" stroke-dasharray="5 5"/></svg>`;
    case 'cycle':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--cycle')}" stroke-width="5" stroke-linecap="round"/></svg>`;
    case 'loop':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--cycle')}" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/></svg>`;
    case 'prom':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--prom')}" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round"/></svg>`;
    case 'foot':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--ink-3')}" stroke-width="1.5" stroke-dasharray="2 4"/></svg>`;
    case 'bus':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="${c('--upg')}" stroke-width="3" stroke-dasharray="12 6"/></svg>`;
    case 'los':return `<svg viewBox="0 0 44 18"><rect x="0" y="4" width="11" height="10" fill="${c('--los1')}"/><rect x="11" y="4" width="11" height="10" fill="${c('--los2')}"/><rect x="22" y="4" width="11" height="10" fill="${c('--los3')}"/><rect x="33" y="4" width="11" height="10" fill="${c('--los4')}"/></svg>`;
    case 'width':return `<svg viewBox="0 0 44 18"><path d="M2 9h12" stroke="${c('--los1')}" stroke-width="3"/><path d="M16 9h12" stroke="${c('--los2')}" stroke-width="7"/><path d="M30 9h12" stroke="${c('--los4')}" stroke-width="12"/></svg>`;
    case 'arrow':return `<svg viewBox="0 0 44 18"><path d="M2 9h30" stroke="${c('--los3')}" stroke-width="8"/><path d="M28 3l10 6-10 6z" fill="#fff" stroke="#333" stroke-width=".5"/></svg>`;
    case 'speed':return `<svg viewBox="0 0 44 18"><circle cx="9" cy="9" r="7" fill="#fff" stroke="#C22F27" stroke-width="2.5"/><text x="9" y="12" text-anchor="middle" font-family="Archivo Narrow,Arial" font-weight="700" font-size="7.5" fill="#111">50</text><path d="M20 9h22" stroke="${c('--sp40')}" stroke-width="5"/></svg>`;
    case 'speedscale':return `<svg viewBox="0 0 44 18"><rect x="0" y="4" width="7.3" height="10" fill="${c('--sp30')}"/><rect x="7.3" y="4" width="7.3" height="10" fill="${c('--sp40')}"/><rect x="14.6" y="4" width="7.3" height="10" fill="${c('--sp50')}"/><rect x="22" y="4" width="7.3" height="10" fill="${c('--sp60')}"/><rect x="29.3" y="4" width="7.3" height="10" fill="${c('--sp80')}"/><rect x="36.6" y="4" width="7.4" height="10" fill="${c('--sp90')}"/></svg>`;
    case 'natura':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--nat')}" fill-opacity=".15" stroke="${c('--nat')}" stroke-dasharray="4 4"/></svg>`;
    case 'area':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--area')}" fill-opacity=".3" stroke="${c('--area')}" stroke-width="2"/></svg>`;
    case 'area2':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--area2')}" fill-opacity=".3" stroke="${c('--area2')}" stroke-width="2"/></svg>`;
    case 'built':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--urban')}" stroke="${c('--area')}" stroke-width="2"/><path d="M2 9h40" stroke="${c('--road-fill')}" stroke-width="2"/><rect x="8" y="3.5" width="5" height="3.5" fill="${c('--bld')}"/><rect x="18" y="3.5" width="5" height="3.5" fill="${c('--bld')}"/><rect x="28" y="3.5" width="5" height="3.5" fill="${c('--bld')}"/><rect x="8" y="11" width="5" height="3.5" fill="${c('--bld')}"/><rect x="18" y="11" width="5" height="3.5" fill="${c('--bld')}"/><rect x="28" y="11" width="5" height="3.5" fill="${c('--bld')}"/></svg>`;
    case 'marina':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--water')}"/><path d="M4 16l6-12 10 2M40 16l-6-10" stroke="${c('--ink-2')}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M14 8h14M14 12h14" stroke="#F2EFE6" stroke-width="2"/></svg>`;
    case 'gpark':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--kile')}" fill-opacity=".4" stroke="${c('--kile')}"/></svg>`;
    case 'gskov':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--wood')}" stroke="${c('--skov')}" stroke-width="1.5"/></svg>`;
    case 'geng':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--kile')}" fill-opacity=".22" stroke="${c('--kile')}" stroke-dasharray="6 4"/></svg>`;
    case 'gkyst':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--prom')}" fill-opacity=".18" stroke="${c('--prom')}"/></svg>`;
    case 'gvidde':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--kile')}" fill-opacity=".06" stroke="${c('--kile')}" stroke-dasharray="2 6"/></svg>`;
    case 'rest':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--area')}" fill-opacity=".25" stroke="${c('--area')}" stroke-dasharray="6 4" stroke-width="2"/></svg>`;
    case 'bind':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="20" height="14" fill="${c('--bind')}" fill-opacity=".28"/><rect x="22" y="2" width="20" height="14" fill="${c('--nat')}" fill-opacity=".35"/></svg>`;
    case 'erhv':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--erhv')}" fill-opacity=".3" stroke="${c('--erhv')}" stroke-width="2"/></svg>`;
    case 'skov':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--skov')}" fill-opacity=".35" stroke="${c('--skov')}" stroke-width="1.5"/></svg>`;
    case 'kile':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--kile')}" fill-opacity=".14" stroke="${c('--kile')}" stroke-dasharray="6 4" stroke-width="1.5"/></svg>`;
    case 'byband':return `<svg viewBox="0 0 44 18"><path d="M2 9h40" stroke="#fff" stroke-width="10"/><path d="M2 9h40" stroke="${c('--struct')}" stroke-width="6"/><path d="M2 9h40" stroke="${c('--cycle')}" stroke-width="1.5" stroke-dasharray="5 5"/></svg>`;
    case 'urban':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--urban')}"/></svg>`;
    case 'water':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="40" height="14" fill="${c('--sea')}"/></svg>`;
    case 'wood':return `<svg viewBox="0 0 44 18"><rect x="2" y="2" width="20" height="14" fill="${c('--wood')}"/><rect x="22" y="2" width="20" height="14" fill="${c('--wet')}"/></svg>`;
  }
  return '';
}
function renderLegend(){
  const rows=[
   ['h','Belastning (kortvisning "Belastning")'],['los','Belastningsgrad: under 60 % · 60-80 % · 80-100 % · over 100 % (kø vokser)'],['width','Stregbredde = biler pr. time i spidsretningen'],['arrow','Pil = retning i spidstimen (morgen ud, eftermiddag hjem)'],
   ['h','Fartgrænser (kortvisning "Fartgrænser")'],['speed','Rundt skilt = fartgrænse på strækningen; stiplet ring = anbefalet ændring'],['speedscale','Farveskala 30 · 40 · 50 · 60 · 80 · 90 km/t'],
   ['h','Veje (kortvisning "Vejnet & stier")'],['main','Eksisterende gennemfartsvej (Stevnsvej, Køgevej, Strandvejen)'],['tert','Eksisterende fordelingsvej (Kystvejen, Lendrumvej)'],['minor','Lokalvej'],['new','Ny vej (omfartsvej, fordelingsvej)'],['newdash','Ny statsvej - illustrativ linjeføring'],['reserve','Arealreservation (korridor holdes fri)'],['upg','Ombygget/opgraderet vej eller kryds'],['down','Nedklassificeret til bygade, 40 km/t'],
   ['h','Stier'],['cycleold','Eksisterende cykelsti/fællessti (OSM)'],['cycle','Supercykelsti (ny/opgraderet)'],['loop','Sammenbindingssløjfen (cykel/gang)'],['prom','Kystpromenade (kystprojekt)'],['foot','Gangsti'],['bus','Buskorridor med prioritet'],
   ['h','Punkter'],['S:signal','Signalanlæg'],['S:rundk','Rundkørsel (ny/ombygget)'],['S:black','Sort plet (politiregistrerede uheld)'],['S:byport','Byport - overgang til bygade'],['S:cross','Sikret krydsning for bløde trafikanter'],['S:pr','Pendlerplads / park & ride'],['S:bus','Bus-knudepunkt / mobilitetshub'],['S:bridge','Landskabsbro (Natura 2000-krydsning)'],['S:marina','Marina'],['S:hall','Hal / medborgerhus'],['S:school','Skole'],['S:shop','Center / butikker'],['S:warn','Opmærksomhedspunkt uden for kommunens råderum'],
   ['h','Flader'],['urban','Byzone i dag'],['area','Boligetape til 7.500 (E1-E4)'],['area2','Boligetape til 10.000 (E5-E7)'],['built','Udbygget i scenariet: byområde med veje og huse (kant i etapens farve)'],['rest','Restrummelighed i kommuneplanen (Nicolinelund 3.1/3.2)'],['S:luk','Lukket for gennemkørsel (bussluse/cykelpassage) - tovejs lokalvej'],['marina','Marina med moler, aktivitetsbro og promenade'],
   ['h','Natur & friluftsliv (slå til på kortet)'],['S:park','Naturbasen / Skolens Skov / Verdensarvsstien'],['S:shelter','Spejderpunktet - shelter og bålhytte (i gang)'],['S:fyr','Stevns Fyr - sydlig ende af det illustrative Stevns-spor'],
   ['h','Grønne områder'],['gpark','Park / bydelspark'],['gskov','Skov (byskov, Sydskoven)'],['geng','Eng og kirkekile (afgræsning, regnvand)'],['gkyst','Kystpark og strandpark'],['gvidde','Vidde - åbent land, der friholdes'],['erhv','Erhvervsområde (N1-N3)'],['skov','Byskov (skovrejsning)'],['kile','Kiler og vidder (friholdes)'],['byband','Bybåndet: fordelingsvej med cykelsti og bus'],['S:kultur','Kulturhus / kulturtorv'],['S:rest','Restaurant / café'],['S:park','Park, skov, naturområde'],['bind','Bindinger (slå til på kortet): lavland, strand-/å-/kirkebyggelinje, § 3, BNBO'],['natura','Natura 2000 - Tryggevælde Ådal (omtrentlig)'],['wood','Skov · eng/vådområde'],['water','Køge Bugt, søer og å']
  ];
  $('#legend').innerHTML=rows.map(r=>r[0]==='h'?`<h4>${r[1]}</h4>`:`<div class="lg">${r[0].startsWith('S:')?`<span style="display:inline-grid;place-items:center;width:44px">${SYM[r[0].slice(2)]()}</span>`:legendSVG(r[0])}<span>${r[1]}</span></div>`).join('');
  renderMapLegend();
}
function renderMapLegend(){
  const ml=$('#maplegend');
  if(mode==='load')ml.innerHTML=`<h4>Belastning · ${pm?'eftermiddag':'morgen'}spids</h4><div class="lg">${legendSVG('built')}<span>Udbygget i scenariet</span></div><div class="lg">${legendSVG('los')}<span>&lt;60 · 60-80 · 80-100 · &gt;100 % af kapacitet</span></div><div class="lg">${legendSVG('width')}<span>Bredde = biler/time</span></div><div class="lg">${legendSVG('arrow')}<span>Retning i spidstimen</span></div>`;
  else if(mode==='speed')ml.innerHTML=`<h4>Fartgrænser · ${SCEN[scen].label}</h4><div class="lg">${legendSVG('speedscale')}<span>30 · 40 · 50 · 60 · 80 · 90 km/t</span></div><div class="lg">${legendSVG('speed')}<span>Skilt = grænse; stiplet = anbefalet</span></div>`;
  else if(mode==='plan')ml.innerHTML=`<h4>Bystruktur · målbillede</h4><div class="lg">${legendSVG('built')}<span>Udbygget i scenariet</span></div><div class="lg">${legendSVG('gskov')}<span>Skov</span></div><div class="lg">${legendSVG('geng')}<span>Eng / kile</span></div><div class="lg">${legendSVG('area')}<span>Boliger 7.500</span></div><div class="lg">${legendSVG('area2')}<span>Boliger 10.000</span></div><div class="lg">${legendSVG('erhv')}<span>Erhverv</span></div><div class="lg">${legendSVG('skov')}<span>Byskov</span></div><div class="lg">${legendSVG('kile')}<span>Kiler og vidder</span></div><div class="lg">${legendSVG('byband')}<span>Bybåndet</span></div><div class="lg">${legendSVG('loop')}<span>Stier</span></div>`;
  else ml.innerHTML=`<h4>Vejnet &amp; stier</h4><div class="lg">${legendSVG('main')}<span>Eksisterende hovedvej</span></div><div class="lg">${legendSVG('new')}<span>Ny vej</span></div><div class="lg">${legendSVG('newdash')}<span>Ny statsvej (illustrativ)</span></div><div class="lg">${legendSVG('reserve')}<span>Arealreservation</span></div><div class="lg">${legendSVG('upg')}<span>Ombygget</span></div><div class="lg">${legendSVG('down')}<span>Bygade 40</span></div><div class="lg">${legendSVG('cycle')}<span>Supercykelsti</span></div><div class="lg">${legendSVG('loop')}<span>Sløjfen</span></div><div class="lg">${legendSVG('area')}<span>Boligetape 7.500</span></div><div class="lg">${legendSVG('area2')}<span>Boligetape 10.000</span></div><div class="lg">${legendSVG('natura')}<span>Natura 2000</span></div>`;
}

/* ---------- update cycle ---------- */
function update(rerenderSliders){
  res=model(scen,A);
  const otherP=preset==='calib'?PRESETS.thomas:PRESETS.calib;
  resOther=model(scen,otherP);
  drawGreen();drawBuilt();drawLinks();drawMeasures();if(mode==='plan'){drawStructure();structLayer.addTo(map);}else{map.removeLayer(structLayer);}renderKPIs();renderTable();renderMeasures();renderStory();renderMapLegend();
  $('#svwrap').style.opacity=SCEN[scen].statsvej?1:.4;$('#sv').disabled=!SCEN[scen].statsvej;
  if(rerenderSliders!==false)renderSliders();
}

/* ---------- events ---------- */
$$('#scen button').forEach(b=>b.addEventListener('click',()=>{scen=b.dataset.s;shiftOverride=null;$$('#scen button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update();if(scen==='k75'||scen==='k10')setView('south');else setView('town');}));
$$('#mode button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.m;$$('#mode button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update(false);}));
$('#pm').addEventListener('change',e=>{pm=e.target.checked;update(false);});
$('#sv').addEventListener('change',e=>{svOn=e.target.checked;update(false);});
$$('#presets button').forEach(b=>b.addEventListener('click',()=>{preset=b.dataset.p;A=Object.assign({},PRESETS[preset]);$$('#presets button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update();}));
$$('.mapbar button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.v)));
$('#bind').addEventListener('change',e=>{if(e.target.checked){drawBind();bindLayer.addTo(map);}else{map.removeLayer(bindLayer);}});
$('#rammer').addEventListener('change',e=>{if(e.target.checked){drawRammer();rammeLayer.addTo(map);}else{map.removeLayer(rammeLayer);}});
$('#cyk').addEventListener('change',e=>{if(e.target.checked){drawCyk();cykLayer.addTo(map);}else{map.removeLayer(cykLayer);}});
$('#frilu').addEventListener('change',e=>{if(e.target.checked){drawFrilu();natLayer.addTo(map);}else{map.removeLayer(natLayer);}});
const mq=window.matchMedia('(prefers-color-scheme: dark)');
const rethem=()=>{paintBase();drawExisting();update(false);renderLegend();if($('#bind').checked)drawBind();if($('#rammer').checked)drawRammer();if($('#cyk').checked)drawCyk();};
mq.addEventListener?mq.addEventListener('change',rethem):mq.addListener(rethem);
new MutationObserver(rethem).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

/* ---------- boot ---------- */
map.setView(VIEWS.town.c,VIEWS.town.z-(map.getContainer().clientWidth<600?0.75:0));
zoomClass();drawExisting();existVisibility();renderAttn();renderLegend();renderHousing();renderStructure();renderCheck();update();
})();

/* ---------- marina vision gallery ---------- */
function openMarinaVision(start=0){
  let dialog=document.getElementById('marina-vision');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='marina-vision';
    dialog.setAttribute('aria-labelledby','marina-vision-title');
    dialog.innerHTML=`<div class="vision-header"><div><small>STRØBY EGEDE · BÅDKLUBBEN EGE</small><h2 id="marina-vision-title">En sommerdag ved marinaen</h2></div><button type="button" data-close aria-label="Luk visionsbilleder">Luk ×</button></div><figure><img alt="" width="1536" height="1024"><figcaption aria-live="polite"></figcaption></figure><div class="vision-controls"><button type="button" data-prev aria-label="Forrige billede">← Forrige</button><span data-count></span><button type="button" data-next aria-label="Næste billede">Næste →</button></div><p class="vision-note">AI-genererede visionsbilleder af en marina med 600 både, vinterbadeklub, cablepark og en ny sandstrand 20-30 meter ud fra den nuværende kyst. Illustrativ arkitektur og kyst, ikke en opmålt projekttegning eller en vedtaget plan. Stedreference: <a href="https://baadklubben-ege.dk/cms/Gallery.aspx#Dronefoto_Kajak_2025" target="_blank" rel="noopener noreferrer">Bådklubben Eges dronegalleri, 2025</a>.</p>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.querySelector('[data-prev]').onclick=()=>show(-1);
    dialog.querySelector('[data-next]').onclick=()=>show(1);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(e.key==='ArrowLeft'?-1:1);}});
    dialog.addEventListener('close',()=>{document.body.style.overflow=dialog._overflow;dialog._opener?.focus();});
  }
  const scenes=[
    ['marina-sommer-overblik.png','Marinaen og kystbyen','Sommerudsigt over den foreslåede marina med bådebroer, stenmoler og Strøby Egede bag kysten.'],
    ['marina-sommer-klubhus.png','Havnehuset helt ude i vandet','Café og restaurant i et nordisk klubhus med egetræ, sten, stål og ensidigt hældende sedumtag.'],
    ['marina-sommer-vandsport.png','Et fælles liv ved vandet','Vinterbadeklub med sauna, cablepark, kajakker, surf og optimistsejlads ved den nye sandstrand.']
  ];
  function show(delta){
    dialog._index=(dialog._index+delta+scenes.length)%scenes.length;
    const [file,title,description]=scenes[dialog._index];
    const base=location.pathname.startsWith('/kommunalpolitik/')?'/kommunalpolitik/byudviklingnord/images/':'images/';
    const img=dialog.querySelector('img');img.src=base+file;img.alt=description;
    dialog.querySelector('figcaption').textContent=title+' · '+description;
    dialog.querySelector('[data-count]').textContent=(dialog._index+1)+' / '+scenes.length;
  }
  dialog._index=start;show(0);
  if(!dialog.open){dialog._opener=document.activeElement;dialog._overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();}
}
function marinaVisionButton(){return '<button type="button" class="vision-open" onclick="openMarinaVision()">Se marinaens visionsbilleder →</button>';}
