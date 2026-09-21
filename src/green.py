import json, math
from shapely.geometry import shape, mapping, Polygon, LineString, Point, box
from shapely.ops import unary_union, transform
LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
def proj(g): return transform(lambda x,y,z=None: ((x-LON0)*KX,(y-LAT0)*KY), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
def P(coords): return proj(Polygon([(lo,la) for la,lo in coords]))
E=json.load(open('etaper.json'))
ram={r['nr']:proj(shape(r['geom'])) for r in E['rammer']}
allram=json.load(open('rammer.json'))
def ramge(nr):
    for f in allram['features']:
        if f['properties'].get('plannr')==nr: return proj(shape(f['geometry']))
base=json.load(open('base.json'))
coast=proj(LineString([(p[1],p[0]) for p in base['coast_chain']]))
sea=proj(shape({'type':'Polygon','coordinates':[[(p[1],p[0]) for p in base['polys']['sea'][0]['c']]]})).buffer(0)
C=E['constraints']
low=proj(shape(C['low'])); natura=proj(shape(C['natura'])); p3=proj(shape(C['p3']))
S1=ram['3 S1']; B13=ram['3 B13']
et={e['id']:proj(shape(e['geom'])) for e in E['etaper']}
# ---- S1-Vest konvertering (10.000): western part of the summer-house area ----
S1V=S1.intersection(P([(55.390,12.270),(55.415,12.270),(55.415,12.3075),(55.390,12.3075)])).difference(coast.buffer(100))
plots=S1V.area/1e4/0.1
conv_share=0.50; extra=0.12
homes=round(plots*conv_share+plots*extra); people=round(homes*3.2)
print('S1-Vest',round(S1V.area/1e4,1),'ha, plots',round(plots),'-> new homes',homes,'people',people)
E['etaper']=[e for e in E['etaper'] if e['id']!='E7']+[e for e in E['etaper'] if e['id']=='E7']
for e in E['etaper']:
    if e['id']=='E7':
        e['stage']='res'; e['name']='Syd for omfartsvejen - reserve efter 10.000 (Sydskoven indtil da)'
        e['why']='Holdes som langsigtet reserve: plantes til som Sydskoven (skovrejsning), der kan ryddes etapevis, hvis byen skal videre efter 10.000. Skov er den eneste arealanvendelse, der både beskytter grundvandet, skærmer for omfartsvejen og kan vige for by senere.'
        e['watch']='Skovrejsning på arealet kræver, at kommuneplanen ikke har det som "skovrejsning uønsket". Reserven må ikke lokalplanlægges før E5/E6 og S1-Vest er udbygget.'
E['etaper'].append(dict(id='S1V',stage='k10',name='Kystbyen - sommerhusområdet vest konverteres til helårs',side='NØ for Stevnsvej · ned mod vandet',ha=round(S1V.area/1e4,1),reserve=0,dens=round(homes/(S1V.area/1e4),1),tl=0,homes=homes,people=people,z=4.5,d_school=900,d_center=1900,
   access='Tovejs lokalveje som i dag (Kystvejen, Brinken, Skrænten). Udkørsel mod syd ad den åbnede Lendrumvej til Lendrumvej-knuden og Sydporten - og mod øst ad Strandvejen. Kystvejen forbliver tovejs, men lukket for gennemkørsel ved udsigten.',
   why='"Ned mod vandet": de nye klumper (E1, E5, E6) og den gamle sommerhusby vokser sammen til én kystby uden at inddrage en eneste ny mark. Halvdelen af grundene konverteres til helårs, og større grunde får mulighed for en ekstra bolig. Som "Ved Kystvejen" (3 B13) i 2019 - blot 50 ha mere.',
   watch='Sommerhusområder må kun overføres til byzone gennem statens landsplandirektiv for sommerhusområder (kommunen ansøger i næste runde). Rammen er udpeget som oversvømmelses- og erosionstruet - konverteringen forudsætter kystsikringen (færdig ved 7.500) og bebyggelse over kote 3. Andelen af allerede helårsbeboede huse er en antagelse (50 % konverteres), der skal tælles op i BBR.',
   geom=mapping(unproj(S1V.simplify(3))),label=list(unproj(S1V.representative_point()).coords[0])))
# ---- green areas ----
kyst=coast.buffer(140).intersection(P([(55.395,12.225),(55.43,12.225),(55.43,12.325),(55.395,12.325)])).difference(sea)
kyst=kyst.difference(unary_union([b for b in [proj(Polygon([(p[1],p[0]) for p in q['c']])).buffer(0) for q in base['polys'].get('urban',[])]]).buffer(-60)) if False else kyst
aadalseng=low.intersection(P([(55.393,12.240),(55.412,12.240),(55.412,12.270),(55.393,12.270)])).difference(natura).difference(sea)
aadalseng=aadalseng.difference(unary_union([et['E3'],et['N1'] if 'N1' in et else et['E3']])) if 'E3' in et else aadalseng
erhv={n['id']:proj(shape(n['geom'])) for n in E['erhverv']}
aadalseng=aadalseng.difference(unary_union([erhv['N1'],erhv['N2'],et['E3']]).buffer(10))
bydelspark=proj(Point(12.2741,55.4032)).buffer(210).difference(et['E1']).difference(ram['3 B13']).difference(ram['3 S1'])
idraet=unary_union([ram['9 D11'],ram['3 D1']])
GR=[
 ('G1','Kystparken - promenade og strand','kyst',kyst,'exist','Strandbeskyttelseszonen som offentlig kystpark: mole, promenade, badebroer, strandporte for enden af kystkilerne. Ingen bebyggelse.'),
 ('G2','Solgårdsparken','park',ram['3 R1'],'exist','Eksisterende park ved Vallø Strand (ramme 3 R1).'),
 ('G3','Bydelsparken','park',bydelspark,'k75','Renseanlæggets 200 m hensynszone bliver E1s park: legeplads, regnvandssøer, boldbaner, frugtlund. Hele kilen, hvis anlægget nedlægges.'),
 ('G4','Strøby Egede Byskov','skov',proj(shape(E['struktur']['byskov']['geom'])),'k10','20 ha skovrejsning på plateauet: motionsskov, læ for E6, drikkevandsbeskyttelse. Plantes 2030-35, fordi skov tager 30 år.'),
 ('G5','Sydskoven (E7-reserven)','skov',et['E7'],'k10','19 ha skovrejsning syd for omfartsvejen: støjskærm, grundvand, og byens reserve efter 10.000.'),
 ('G6','Kirkekilen - Kirkeengene','eng',proj(shape(E['struktur']['kirkekile']['geom'])),'k75','Åbne enge og marker mellem Strøby Egede og Strøby: afgræsning, stier, udsigt til Strøby Kirke. Friholdes for både byggeri og skov.'),
 ('G7','Ådalsengene','eng',aadalseng,'k75','Den lave jord (under kote 3) mellem byen og Natura 2000-ådalen: våde enge, regnvandsbassiner, græsning - byens klimabuffer.'),
 ('G8','Tryggevælde Ådal - naturpark','natur',natura,'exist','Natura 2000 (91 ha i kortudsnittet), pilotnaturpark: boardwalk, fugletårn, Ådalsstien til Valløby.'),
 ('G9','Vejs Ende - strandpark øst','kyst',ram['3 R3'],'exist','27 ha rekreativ ramme ved Strøby Ladeplads: naturlegeplads, kajak, vinterbad, strandrestaurant.'),
 ('G10','Strøbylille-vidden','vidde',proj(shape(E['struktur']['vidde']['geom'])),'k10','139 ha åbent dyrket land med kig til bugten - byens østlige horisont. Friholdes.'),
 ('G11','Vallø Golf','golf',ram['9 D1'],'exist','73 ha golfbane (ramme 9 D1) - det store grønne rum sydvest for byen.'),
 ('G12','Idrætsparken','idraet',idraet,'exist','Strøbyskolen, idrætscenter, boldbaner (rammer 3 D1 og 9 D11) - Kulturtorvets grønne side.'),
]
E['green']=[dict(id=i,name=n,kind=k,stage=st,ha=round(g.area/1e4,1),t=t,geom=mapping(unproj(g.simplify(4))),label=list(unproj(g.representative_point()).coords[0])) for i,n,k,g,st,t in GR if not g.is_empty]
for g in E['green']: print(g['id'],g['name'][:32],g['kind'],g['stage'],g['ha'],'ha')
# built entry for S1V: outline only
E['built']['S1V']={'streets':[],'access':[],'bld':[],'kind':'konv'}
# ---- marina, promenade, aktivitetsbro ----
E['struktur']['marina']={
 'basin':[[55.4150,12.2536],[55.4183,12.2548],[55.4186,12.2592],[55.4150,12.2604]],
 'moles':[[[55.4148,12.2530],[55.4183,12.2546],[55.4187,12.2596]],[[55.4149,12.2606],[55.4176,12.2600]]],
 'pontoons':[[[55.4157,12.2548],[55.4176,12.2556]],[[55.4157,12.2561],[55.4178,12.2569]],[[55.4157,12.2574],[55.4179,12.2582]],[[55.4157,12.2587],[55.4176,12.2593]]],
 'label':[55.4168,12.2568]}
E['struktur']['promenade1']=[[55.4212,12.2296],[55.4205,12.2330],[55.4195,12.2380],[55.4185,12.2425],[55.4175,12.2470],[55.4165,12.2510],[55.4152,12.2545]]
E['struktur']['pier']={'line':[[55.4150,12.2604],[55.4162,12.2635],[55.4180,12.2655]],'platform':[[55.4176,12.2648],[55.4184,12.2652],[55.4186,12.2664],[55.4179,12.2666],[55.4174,12.2657]]}
json.dump(E,open('etaper.json','w'),ensure_ascii=False,separators=(',',':'))
import os; print('etaper.json',os.path.getsize('etaper.json'))
