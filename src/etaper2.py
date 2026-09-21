import json, math
from shapely.geometry import shape, mapping, Polygon, LineString, Point, box
from shapely.ops import unary_union, transform
S=json.load(open('suit.json'))
rows={r['k']:r for r in S['rows']}
LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
def proj(g): return transform(lambda x,y,z=None: ((x-LON0)*KX,(y-LAT0)*KY), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
def P(coords): return proj(Polygon([(lo,la) for la,lo in coords]))
def Ln(coords): return proj(LineString([(lo,la) for la,lo in coords]))
def par(k): return proj(shape(rows[k]['geom']))
ram={r['nr']:proj(shape(r['geom'])) for r in S['rammer']}
allram=json.load(open('rammer.json'))
def ramge(nr):
    for f in allram['features']:
        if f['properties'].get('plannr')==nr: return proj(shape(f['geometry']))
strobyB=unary_union([ramge('7 B1'),ramge('7 C1'),ramge('7 C2'),ramge('7 D1'),ramge('7 R1')])
byz=unary_union([g for nr,g in ram.items() if nr.startswith('3 ') and nr not in ('3 S1','3 R3','3 R4')])

# ---- erhverv ----
N2poly=P([(55.3992,12.2575),(55.3990,12.2635),(55.3965,12.2668),(55.3958,12.2620),(55.3968,12.2585)])
N1=par(0)
N2=par(10).intersection(N2poly)
N3=P([(55.3950,12.2380),(55.3976,12.2382),(55.3979,12.2432),(55.3956,12.2436)])
ERH=[
 dict(id='N1',stage='k75',name='Kontor- og servicebånd ved skolen/omfartsvejen',geom=N1,typ='Kontor, klinik, mindre service - "videnstunge" arbejdspladser 300-500 m fra Kulturtorvet',
      why='Arealet ligger 3-4 m over havet og lige op ad omfartsvejens tilslutning - dårligt til boliger, godt til erhverv: kontorhuse tåler terrænhævning, og bygningerne skærmer E3/skolen mod støj. Modstrøms-pendling (ind til byen om morgenen) bruger den tomme retning på vejnettet.',
      watch='Terrænhævning og regnvandshåndtering. Ingen adgang fra Stevnsvej - kun fra rundkørslen. Kræver ny erhvervsramme i kommuneplanen (Strøby Egede har ingen i dag).'),
 dict(id='N2',stage='k75',name='Omfartsvejsparken - e-handel, lager og let produktion',geom=N2,typ='E-handel/lager (miljøklasse 3-4), håndværk, let produktion, ladestation - lastbiler direkte fra omfartsvejen',
      why='Syd for omfartsvejen ved Stevnsvej: lastbiler kører aldrig gennem byen, og bygningerne skærmer E7 mod vejstøj. 10 min til E47, når statsvejen er bygget.',
      watch='Terræn 3-5 m: bygninger og oplag hæves, P-arealer kan ligge lavt. Højst 8,5 m bygningshøjde af hensyn til kig fra Strøby og ådalen. 150 m til nærmeste boliger i E7.'),
 dict(id='N3',stage='k10',name='Statsvejsporten (option) - logistik ved Køgevej/statsvejen',geom=N3,typ='Kun logistik og pladskrævende erhverv, uden for byen',
      why='Direkte på statsvejen vest for ådalen, så tung trafik holdes helt uden for både Strøby Egede og Valløby.',
      watch='Ligger 500-600 m fra Valløby og op ad åbeskyttelseslinjen - kræver dialog med Valløby og landskabelig indpasning. Tages kun i brug, hvis Omfartsvejsparken fyldes.'),
]

# ---- boliger ----
E7geom=unary_union([par(6),par(10).difference(N2poly.buffer(40))]).buffer(10).buffer(-10)
E8=P([(55.3888,12.2790),(55.3906,12.2798),(55.3908,12.2840),(55.3888,12.2843)]).difference(strobyB.buffer(20))
ET=[
 dict(id='E1',stage='k75',name='Lendrumvej-kilen',parcels=[18,20,16,19,12,15,13],dens=14,tl=50,side='NØ for Stevnsvej',
      access='Lendrumvej som fordelingsvej (opgraderet) med intern sløjfe. Kun cykel-/nødadgang til Kystvejen. Til Stevnsvej alene via rundkørslen ved Lendrumvej/skolen.',
      why='Tættest på skole, idrætscenter, Ellehallen og det kommende Kulturtorv (400-800 m). Terræn 5-9 m over havet. Bag sommerhusområdet - inde i byen set fra kysten (kystnærhedszonen). Ligger, hvor den østlige fordelingsvej alligevel skal gå.',
      watch='Renseanlægget ved Strøby Ladeplads (ramme 9 T1) giver et 200 m hensynsbælte midt i kilen - det bliver Bydelsparken; nedlægges anlægget, frigives 5-8 ha ekstra. Kystvejen må ikke blive adgangsvej.'),
 dict(id='E2',stage='k75',name='Syd for skolen - Kulturtorvets bydel',parcels=[11],dens=16,tl=55,reserve_ha=2.5,side='NØ for Stevnsvej',
      access='Bybåndet ("Sydvejen") fra rundkørslen ved Lendrumvej/omfartsvejen langs bagkanten af området - ingen nye kryds på Stevnsvej. Forlænges senere til E5/E6 og Strøby.',
      why='350 m til Strøbyskolen, idrætscentret og Ellehallen. Bymæssig tæthed (rækkehuse, små etagehuse) omkring Kulturtorvet. 2,5 ha reserveres til daginstitution og skoleudvidelse.',
      watch='Støjzonen langs omfartsvejen er lagt ud til erhverv (N1/N2) i stedet for boliger. Kræver arealudlæg (kommuneplantillæg) og afklaring af drikkevandsinteresser (BNBO ligger tæt på).'),
 dict(id='E3',stage='k75',name='Ådalskanten (vest for Stevnsvej)',parcels=[29,28,31],dens=11,tl=30,side='SV for Stevnsvej',
      access='Ny parallel samlevej ("Ådalsvej") bag første husrække, koblet på de eksisterende signaler ved Valnøddevej og Hybenrosevej - ingen nye kryds på Stevnsvej.',
      why='Giver byen sin anden side: 5-6 m høj kant mellem Stevnsvej og ådalen, 700-1.100 m fra Centret. Parcelhuse og rækkehuse med grøn front mod Natura 2000-området og udsigt til Valløby.',
      watch='Åbeskyttelseslinjen (150 m) og Natura 2000 ligger lige bag - respektafstand 200 m, ingen bebyggelse under kote 3. Dele af strimlen er kun 80-150 m bred.'),
 dict(id='E5',stage='k10',name='Sydøstplateauet I - bydelscenter',parcels=[14,3],dens=12,tl=35,reserve_ha=3.0,side='NØ for Stevnsvej',
      access='Bybåndet forlænges fra E2; al biltrafik ledes til omfartsvejen, ikke til Strøby Bygade (sort strækning).',
      why='Sammenhængende plateau 6-8 m over havet mellem byen, Strøby Ladeplads og Strøby med udsigt over bugten. Naturlig forlængelse af E2 - indefra og ud. 3 ha reserveres til skole nr. 2, daginstitution og bydelsbutik.',
      watch='2,5-3 km til Centret - bydelen skal have egne dagligvarer, bus og kystkile til stranden. Holder afstand til Strøbys kirkeomgivelser mod syd (Kirkekilen).'),
 dict(id='E6',stage='k10',name='Sydøstplateauet II',parcels=[4],dens=12,tl=35,side='NØ for Stevnsvej',
      access='Bybåndet føres videre mod øst; kystkile og sti til Strøby Ladeplads havn.',
      why='Fortsætter plateauet mod campingpladsen og sommerhusområdet, 7-9 m over havet. Byskoven plantes øst for området som læ og nærrekreativt landskab.',
      watch='Sidste plateau-etape - først når E5 er 75 % udbygget (rækkefølge). Landskabelig overgang til Strøbylille-vidden mod øst.'),
 dict(id='E7',stage='k10',name='Syd for omfartsvejen (vest for Stevnsvej)',geom=E7geom,dens=11,tl=30,side='SV for Stevnsvej',
      access='Kort stikvej fra omfartsvejens rundkørsel ("Sydporten"); intern forbindelse til Stevnsvej syd (bygade) mod Strøby og golfbanen.',
      why='Afrunder byen mod syd mellem omfartsvejen, Vallø Golf og Strøby. Omfartsvejsparken (N2) ligger som støjskærm mellem vejen og boligerne.',
      watch='Den lave del mod ådalen (3-4 m) friholdes til regnvand og grønt. 150 m til erhverv i N2.'),
 dict(id='E8',stage='k10',name='Strøby Nord (option) - afrunding ved den nye Brugsen',geom=E8,dens=10,tl=30,side='NØ for Stevnsvej',
      access='Fra Bybåndets endepunkt ved Brugsen - ikke fra Strøby Bygade.',
      why='Trafikplanen flytter Dagli’Brugsen til Strøbys nordlige udkant (ramme 7 C2). Bybåndet fra Strøby Egede ender samme sted: her mødes de to byer. En lille afrunding af Strøby (ca. 50 boliger) binder knuden sammen uden at byerne vokser sammen.',
      watch='Hører til en Strøby-udviklingsskitse (Kommuneplan 2025 lægger op til en). Kirkekilen syd for området friholdes. Kun landzone-ramme i dag.'),
]
def build(e):
    if 'parcels' in e:
        u=unary_union([par(k).buffer(12) for k in e['parcels']]).buffer(-12)
    else: u=e['geom']
    ha=u.area/1e4; res=e.get('reserve_ha',0); net=ha-res
    homes=round(net*e['dens']); people=round(homes*3.2)
    if 'parcels' in e:
        z=sum(rows[k]['z']*rows[k]['ha'] for k in e['parcels'])/sum(rows[k]['ha'] for k in e['parcels']); dsch=min(rows[k]['d_school'] for k in e['parcels']); dcen=min(rows[k]['d_center'] for k in e['parcels'])
    else:
        z={'E7':4.9,'E8':7.8}[e['id']]; school=proj(Point(12.2636,55.4011)); center=proj(Point(12.2424,55.4164)); dsch=u.distance(school); dcen=u.distance(center)
    return dict(id=e['id'],stage=e['stage'],name=e['name'],side=e['side'],ha=round(ha,1),reserve=res,dens=e['dens'],tl=e['tl'],homes=homes,people=people,z=round(z,1),d_school=round(dsch),d_center=round(dcen),access=e['access'],why=e['why'],watch=e['watch'],geom=mapping(unproj(u.simplify(3))),label=list(unproj(u.representative_point()).coords[0]),_g=u)
OUT=[build(e) for e in ET]
for o in OUT: print(f"{o['id']} {o['name'][:34]:34s} {o['ha']:5.1f} ha {o['dens']:2d}/ha {o['homes']:4d} bol {o['people']:5d} pers  skole {o['d_school']:4d} m")
s1=sum(o['people'] for o in OUT if o['stage']=='k75'); s2=sum(o['people'] for o in OUT if o['stage']=='k10' and o['id']!='E8'); s8=[o for o in OUT if o['id']=='E8'][0]['people']
print('7.500:',4900+s1+415,' 10.000:',4900+s1+415+s2,' +E8:',4900+s1+415+s2+s8)
# contiguity
G={o['id']:o['_g'] for o in OUT}
print('kontakt:',{a:{b:round(G[a].distance(G[b])) for b in G if b!=a and G[a].distance(G[b])<250} for a in G})
print('til byzone:',{a:round(G[a].distance(byz)) for a in G},' til Strøby:',{a:round(G[a].distance(strobyB)) for a in G})
ERHOUT=[]
for e in ERH:
    g=e['geom']; ERHOUT.append(dict(id=e['id'],stage=e['stage'],name=e['name'],typ=e['typ'],ha=round(g.area/1e4,1),why=e['why'],watch=e['watch'],geom=mapping(unproj(g.simplify(3))),label=list(unproj(g.representative_point()).coords[0])))
    print(e['id'],e['name'][:40],round(g.area/1e4,1),'ha')

# ---- struktur ----
byskov=unary_union([par(21),par(22)]).buffer(15).buffer(-15)
kk=P([(55.3860,12.2740),(55.3930,12.2740),(55.3930,12.2910),(55.3860,12.2910)])
kirkekile=kk.difference(unary_union([G['E5'],G['E6'],G['E7'],G['E8'],strobyB]).buffer(15))
kirkekile=kirkekile.difference(ram['9 R1']) if '9 R1' in ram else kirkekile
vidde=P([(55.3875,12.2985),(55.3975,12.2985),(55.3975,12.3200),(55.3875,12.3200)]).difference(byskov.buffer(20)).difference(ram['3 S1']).difference(ram['3 R3'])
STR={
 'byskov':{'geom':mapping(unproj(byskov.simplify(4))),'ha':round(byskov.area/1e4,1),'label':list(unproj(byskov.representative_point()).coords[0])},
 'kirkekile':{'geom':mapping(unproj(kirkekile.simplify(4))),'ha':round(kirkekile.area/1e4,1),'label':list(unproj(kirkekile.representative_point()).coords[0])},
 'vidde':{'geom':mapping(unproj(vidde.simplify(4))),'ha':round(vidde.area/1e4,1),'label':list(unproj(vidde.representative_point()).coords[0])},
 'byband':[[55.4005,12.2622],[55.3990,12.2672],[55.3978,12.2735],[55.3965,12.2790],[55.3945,12.2830],[55.3918,12.2835],[55.3895,12.2822],[55.3878,12.2790]],
 'aadalssti':[[55.4008,12.2340],[55.3998,12.2400],[55.3983,12.2478],[55.3990,12.2560],[55.4003,12.2610],[55.4011,12.2636]],
 'kiler':[{'id':'K1','name':'Kystkile Lendrumvej','c':[[55.4075,12.2695],[55.4100,12.2715],[55.4128,12.2745]]},{'id':'K2','name':'Kystkile Ladeplads vest','c':[[55.3995,12.2825],[55.4030,12.2860],[55.4058,12.2875]]},{'id':'K3','name':'Kystkile Vejs Ende','c':[[55.3965,12.2905],[55.3990,12.2990],[55.4022,12.3020]]}],
 'noder':[{'id':'kulturtorv','name':'Kulturtorvet','p':[55.4022,12.2650],'kind':'kultur','t':'Kulturhus i Ellehallen (sal 200 pladser til teater og biograf, bibliotek, café, tankesport), Strøbyhallen med café, skole, kontorfællesskab. Byens midte nr. 2.'},
          {'id':'havnehus','name':'Havnehuset - marina og restaurant','p':[55.4154,12.2560],'kind':'rest','t':'Restaurant og café ved Bådklubben Ege, sejlerskole, kultur på broen. Adgang fra Stevnsvej via Kystvejens vestligste stykke; P på landsiden.'},
          {'id':'center','name':'Strøby Egede Center - bymidten','p':[55.4164,12.2424],'kind':'center','t':'Butikker, cafeer, bibliotek (Kystvejen 7A i dag), mobilitetshub. Bygaden (Stevnsvej 40 km/t) og promenaden mødes her.'},
          {'id':'ladeplads','name':'Strøby Ladeplads - havn, strand og Vejs Ende','p':[55.4000,12.3179],'kind':'kyst','t':'Østligt kystknudepunkt: Garderhøjens Havn, badestrand, strandrestaurant/badehotel og det 27 ha store rekreative område "Vejs Ende" (ramme 3 R3).'},
          {'id':'bydel5','name':'Bydelscenter Sydøst (E5)','p':[55.3955,12.2790],'kind':'center','t':'Skole nr. 2, daginstitution, bydelsbutik og busstop på Bybåndet - inden for 1 km for E5/E6 og Strøby Nord.'},
          {'id':'strobynord','name':'Strøby Nord - hvor byerne mødes','p':[55.3878,12.2790],'kind':'center','t':'Den nye Dagli’Brugsen (ramme 7 C2) i Strøbys nordkant er Bybåndets endepunkt: fælles butik, busstop og skolesti til Strøbyskolen. Strøby Bygade (sort strækning) aflastes.'},
          {'id':'sydport','name':'Sydporten - rundkørsel og pendlerplads','p':[55.3992,12.2638],'kind':'pr','t':'Rundkørslen hvor omfartsvej, Stevnsvej syd, Bybåndet og erhvervsbåndet mødes: pendlerplads, samkørsel, bus mod Køge og ladestandere.'},
          {'id':'bydelspark','name':'Bydelsparken (renseanlæggets hensynszone)','p':[55.4045,12.2735],'kind':'park','t':'De 200 m om renseanlægget bliver E1s park med legeplads, regnvandssøer og boldbaner - og hele kilen, hvis anlægget nedlægges.'},
          {'id':'aadal','name':'Tryggevælde Ådal - naturpark','p':[55.3990,12.2470],'kind':'natur','t':'Pilotnaturpark Ådalen: boardwalk/Ådalssti over landskabsbroen til Valløby, fugletårn, ingen bebyggelse. Byens "vidde" mod vest.'},
          {'id':'golf','name':'Vallø Golf og Kirkekilen','p':[55.3880,12.2560],'kind':'natur','t':'73 ha golfbane (ramme 9 D1) + Kirkekilen holder det åbne landskab mellem Strøby Egede og Strøby.'}]
}
json.dump({'etaper':[{k:v for k,v in o.items() if k!='_g'} for o in OUT],'erhverv':ERHOUT,'struktur':STR,'constraints':S['constraints'],'rammer':S['rammer']+[{'nr':nr,'navn':nm,'anv':anv,'zone':zn,'ha':round(ramge(nr).area/1e4,1),'geom':mapping(unproj(ramge(nr).simplify(4)))} for nr,nm,anv,zn in [('7 B1','Strøby','Boligområde','Byzone'),('7 C1','Centerområde Strøby','Centerområde','Byzone'),('7 C2','Dagligvarebutik Strøby','Centerområde','Byzone'),('7 D1','Strøby Fælled','Rekreativt område','Byzone'),('7 R1','Regnvandsbassin','Rekreativt område','Landzone')]]},open('etaper.json','w'),ensure_ascii=False)
print('byskov ha',STR['byskov']['ha'],'kirkekile ha',STR['kirkekile']['ha'],'vidde ha',STR['vidde']['ha'])
import os; print('etaper.json',os.path.getsize('etaper.json'))
