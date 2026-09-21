import json, math
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
d=json.load(open('suit.json'))
rows={r['k']:r for r in d['rows']}
LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
from shapely.ops import transform
def proj(g): return transform(lambda x,y,z=None: ((x-LON0)*KX,(y-LAT0)*KY), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
ET=[
 dict(id='E1',stage='k75',name='Lendrumvej-kilen',parcels=[18,20,16,19,12,15,13],dens=13,tl=45,side='NØ for Stevnsvej',
      access='Lendrumvej som fordelingsvej (opgraderet) med intern sløjfe. Kun cykel-/nødadgang til Kystvejen. Til Stevnsvej alene via rundkørslen ved Lendrumvej/skolen.',
      why='Tættest på skole, idrætscenter og Ellehallen (400-800 m). Terræn 5-9 m over havet. Bag sommerhusområdet, dvs. inde i byen set fra kysten (kystnærhedszone). Ligger, hvor den østlige fordelingsvej alligevel skal gå.',
      watch='Renseanlægget ved Strøby Ladeplads (ramme 9 T1) giver et 200 m hensynsbælte midt i kilen - nedlægges anlægget, frigives 5-8 ha ekstra. Kystvejen må ikke blive adgangsvej.'),
 dict(id='E2',stage='k75',name='Syd for skolen',parcels=[11],dens=14,tl=50,reserve_ha=2.5,side='NØ for Stevnsvej',
      access='Ny fordelingsvej ("Sydvejen") fra rundkørslen ved Lendrumvej/omfartsvejen langs bagkanten af området - ingen nye kryds på Stevnsvej. Forlænges senere ind i E5/E6.',
      why='350 m til Strøbyskolen og idrætscentret, 6 m over havet, direkte på omfartsvejens tilslutning. 2,5 ha reserveres til daginstitution/udvidelse af skolen.',
      watch='Støjzone 100 m langs Stevnsvej og omfartsvejen holdes fri til regnvandsbassiner og grønt. Kræver arealudlæg (kommuneplantillæg) og afklaring af drikkevandsinteresser.'),
 dict(id='E3',stage='k75',name='Ådalskanten (vest for Stevnsvej)',parcels=[29,28,31],dens=11,tl=30,side='SV for Stevnsvej',
      access='Ny parallel samlevej ("Ådalsvej") bag første husrække, koblet på de eksisterende signaler ved Valnøddevej og Hybenrosevej - ingen nye kryds på Stevnsvej.',
      why='Giver byen sin anden side: 5-6 m høj kant mellem Stevnsvej og ådalen, 700-1.100 m fra Centret og 500-1.000 m fra skolen. Parcelhuse og rækkehuse med grøn front mod Natura 2000-området.',
      watch='Åbeskyttelseslinjen (150 m) og Natura 2000 ligger lige bag - respektafstand 200 m, ingen bebyggelse under kote 3. Dele af strimlen er kun 80-150 m bred.'),
 dict(id='E4',stage='k75',name='Skolen vest (option)',parcels=[0],dens=10,tl=30,side='SV for Stevnsvej',
      access='Fra rundkørslen ved omfartsvejens tilslutning - ikke fra Stevnsvej.',
      why='Tæt på skolen (160 m) og omfartsvejen; egnet til rækkehuse eller til pendlerplads/afsætning, hvis boliger vælges fra.',
      watch='Terræn kun 3-4 m over havet (EU-DEM): kræver terrænhævning eller afværge iht. kommuneplanens kote 2,80-regel. Tages først i brug, hvis E1-E3 ikke rækker.'),
 dict(id='E5',stage='k10',name='Sydøstplateauet I',parcels=[14,3],dens=12,tl=35,reserve_ha=3.0,side='NØ for Stevnsvej',
      access='Forlængelse af Sydvejen fra E2; al trafik ledes til omfartsvejen, ikke til Strøby Bygade (sort strækning).',
      why='Sammenhængende plateau 6-8 m over havet mellem byen, Strøby Ladeplads og Strøby. Naturlig forlængelse af E2 - indefra og ud. 3 ha reserveres til skole nr. 2 / bydelscenter.',
      watch='Udenfor gåafstand til Centret (2,5-3 km) - bydelen skal have egne dagligvarer og bus. Nærmer sig Strøbys kirkeomgivelser mod syd.'),
 dict(id='E6',stage='k10',name='Sydøstplateauet II',parcels=[4],dens=12,tl=35,side='NØ for Stevnsvej',
      access='Sydvejen føres videre mod øst; sti til Strøby Ladeplads og kysten.',
      why='Fortsætter plateauet mod campingpladsen og sommerhusområdet. 7-9 m over havet, ingen kendte bindinger ud over kirkebyggelinjen, som er holdt fri.',
      watch='Sidste etape - først når E5 er 75 % udbygget (rækkefølge). Landskabelig overgang til det åbne land mod Strøbylille.'),
 dict(id='E7',stage='k10',name='Syd for omfartsvejen (vest for Stevnsvej)',parcels=[10,6],dens=11,tl=30,side='SV for Stevnsvej',
      access='Kort stikvej fra omfartsvejen; intern forbindelse til Stevnsvej syd (bygade) mod Strøby.',
      why='Giver de sidste 200-300 boliger på begge sider af Stevnsvej. Afrunder byen mod syd mellem omfartsvej og Strøby.',
      watch='Ca. en tredjedel ligger 3-4 m over havet mod ådalen - kun den østlige, høje del bebygges. Støj fra omfartsvej (80 km/t): 150 m afstand eller støjvold.'),
]
def area_ha(g): return proj(g).area/1e4
out=[]; cum={'k75':0,'k10':0}
for e in ET:
    polys=[shape(rows[k]['geom']) for k in e['parcels']]
    u=unary_union([proj(p).buffer(12) for p in polys]).buffer(-12)
    ha=u.area/1e4; res=e.get('reserve_ha',0); marg=sum(rows[k]['marg']*rows[k]['ha'] for k in e['parcels'])
    net=ha-res-(0.5*marg if e['id']=='E7' else 0)
    homes=round(net*e['dens']); people=round(homes*3.2)
    z=sum(rows[k]['z']*rows[k]['ha'] for k in e['parcels'])/sum(rows[k]['ha'] for k in e['parcels'])
    dsch=min(rows[k]['d_school'] for k in e['parcels']); dcen=min(rows[k]['d_center'] for k in e['parcels'])
    cum[e['stage']]+=people
    out.append(dict(id=e['id'],stage=e['stage'],name=e['name'],side=e['side'],ha=round(ha,1),reserve=res,dens=e['dens'],tl=e['tl'],homes=homes,people=people,z=round(z,1),marg=round(marg,1),d_school=round(dsch),d_center=round(dcen),access=e['access'],why=e['why'],watch=e['watch'],geom=mapping(unproj(u.simplify(3))),label=unproj(u.representative_point()).coords[0]))
    print(f"{e['id']} {e['name']:38s} {ha:5.1f} ha  net {net:5.1f}  {e['dens']:2d}/ha  {homes:4d} boliger  {people:5d} pers  z {z:4.1f}  skole {dsch:4.0f} m  center {dcen:4.0f} m")
print('stage 1 people',cum['k75'],'+ restrummelighed ~415 ->',4900+cum['k75']+415,'| stage 2 people',cum['k10'],'->',4900+cum['k75']+415+cum['k10'])
json.dump({'etaper':out,'constraints':d['constraints'],'rammer':d['rammer']},open('etaper.json','w'),ensure_ascii=False)
import os; print('etaper.json',os.path.getsize('etaper.json'))
