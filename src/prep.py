import json, math, os, sys
from collections import defaultdict

def load(fn):
    try:
        d=json.load(open(fn)); return d['elements']
    except Exception as e:
        print('skip',fn,e); return []

roads=load('osm_roads.json'); ctx=load('osm_ctx.json'); base=load('osm_base.json')

# ---------- simplification ----------
def dp(pts, tol):
    if len(pts)<3: return pts
    # tol in degrees-ish (use scaled lon)
    def d(p,a,b):
        ax,ay=a[1]*0.568,a[0]; bx,by=b[1]*0.568,b[0]; px,py=p[1]*0.568,p[0]
        dx,dy=bx-ax,by-ay
        if dx==dy==0: return math.hypot(px-ax,py-ay)
        t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
        return math.hypot(px-(ax+t*dx),py-(ay+t*dy))
    imax,dmax=0,0
    for i in range(1,len(pts)-1):
        dd=d(pts[i],pts[0],pts[-1])
        if dd>dmax: imax,dmax=i,dd
    if dmax>tol:
        return dp(pts[:imax+1],tol)[:-1]+dp(pts[imax:],tol)
    return [pts[0],pts[-1]]
TOL_ROAD=0.00003   # ~3 m
TOL_POLY=0.00006
def rnd(p): return [round(p[0],5), round(p[1],5)]
def geom(e): return [[g['lat'],g['lon']] for g in e.get('geometry',[])]

seen=set()
def uniq(elements):
    out=[]
    for e in elements:
        k=(e['type'],e['id'])
        if k in seen: continue
        seen.add(k); out.append(e)
    return out

allel = uniq(roads+ctx+base)
print('elements',len(allel))

layers=defaultdict(list)   # name -> list of {c:[[lat,lon],...], n:name, s:maxspeed, ...}
polys=defaultdict(list)

TOWN=(55.392,12.215,55.432,12.325)  # lat0,lon0,lat1,lon1 for detail layers
def inbox(pts,b):
    return any(b[0]<=p[0]<=b[2] and b[1]<=p[1]<=b[3] for p in pts)

for e in allel:
    t=e.get('tags',{})
    if e['type']!='way': continue
    pts=geom(e)
    if len(pts)<2: continue
    closed = pts[0]==pts[-1]
    hw=t.get('highway')
    if hw:
        cls=None
        if hw in ('motorway','motorway_link'): cls='motorway'
        elif hw in ('trunk','primary','secondary','secondary_link','primary_link','trunk_link'): cls='main'
        elif hw in ('tertiary','tertiary_link'): cls='tertiary'
        elif hw in ('unclassified','residential'): cls='minor'
        elif hw=='service':
            if inbox(pts,TOWN) and t.get('service') not in ('driveway','parking_aisle'): cls='service'
        elif hw=='cycleway': cls='cycle'
        elif hw in ('path','footway','track'):
            if t.get('bicycle') in ('designated','yes') or t.get('segregated') or hw=='path' and t.get('surface') in ('asphalt','paved'):
                cls='cycle'
            elif inbox(pts,TOWN) and hw in ('path','footway') and t.get('footway')!='sidewalk' and t.get('footway')!='crossing':
                cls='foot'
        if not cls: continue
        rec={'c':[rnd(p) for p in dp(pts,TOL_ROAD)]}
        if t.get('name'): rec['n']=t['name']
        if t.get('ref'): rec['r']=t['ref']
        if t.get('maxspeed'): rec['s']=t['maxspeed']
        cw=[t[k] for k in ('cycleway','cycleway:both','cycleway:left','cycleway:right') if k in t]
        if cw: rec['cw']=','.join(cw)
        layers[cls].append(rec)
        continue
    if t.get('waterway') in ('river','stream'):
        layers['river'].append({'c':[rnd(p) for p in dp(pts,TOL_ROAD)],'n':t.get('name','')}); continue
    if t.get('natural')=='coastline':
        layers['coast'].append({'c':[rnd(p) for p in dp(pts,TOL_ROAD)]}); continue
    if not closed: continue
    pc=None
    lu=t.get('landuse'); na=t.get('natural'); le=t.get('leisure')
    if lu in ('residential','retail','commercial'): pc='urban'
    elif lu=='industrial': pc='industrial'
    elif lu in ('forest',) or na=='wood': pc='wood'
    elif na=='wetland': pc='wetland'
    elif lu in ('meadow','grass','village_green','recreation_ground','allotments','cemetery') or na in ('grassland','heath','scrub') or le in ('park','pitch','golf_course','nature_reserve','sports_centre'): pc='green'
    elif na=='water' or le=='marina': pc='water'
    elif na=='beach': pc='beach'
    if pc:
        polys[pc].append({'c':[rnd(p) for p in dp(pts,TOL_POLY)],'n':t.get('name','')})

# relations natural=water / protected areas: take outer ways
for e in allel:
    if e['type']!='relation': continue
    t=e.get('tags',{})
    pc=None
    if t.get('natural')=='water': pc='water'
    elif t.get('boundary')=='protected_area' or t.get('leisure')=='nature_reserve': pc='protected'
    if not pc: continue
    for m in e.get('members',[]):
        if m.get('type')=='way' and m.get('role') in ('outer','') and m.get('geometry'):
            pts=[[g['lat'],g['lon']] for g in m['geometry']]
            polys[pc].append({'c':[rnd(p) for p in dp(pts,TOL_POLY)],'n':t.get('name',''),'open':pts[0]!=pts[-1]})

for k,v in layers.items(): print('line layer',k,len(v),sum(len(x['c']) for x in v))
for k,v in polys.items(): print('poly layer',k,len(v),sum(len(x['c']) for x in v))

# ---------- merge named main roads into chains ----------
def merge_named(names, classes=('main','tertiary','minor','motorway')):
    out={}
    for nm in names:
        segs=[r['c'] for cls in classes for r in layers[cls] if r.get('n')==nm]
        # greedy chain build
        chains=[]
        segs=[list(s) for s in segs]
        while segs:
            ch=segs.pop(0)
            changed=True
            while changed:
                changed=False
                for i,s in enumerate(segs):
                    if s[0]==ch[-1]: ch=ch+s[1:]; segs.pop(i); changed=True; break
                    if s[-1]==ch[0]: ch=s[:-1]+ch; segs.pop(i); changed=True; break
                    if s[-1]==ch[-1]: ch=ch+s[::-1][1:]; segs.pop(i); changed=True; break
                    if s[0]==ch[0]: ch=s[::-1][:-1]+ch; segs.pop(i); changed=True; break
            chains.append(ch)
        chains.sort(key=len, reverse=True)
        out[nm]=chains
        print('chain',nm,[len(c) for c in chains][:6])
    return out
chains=merge_named(['Stevnsvej','Kystvejen','Køgevej','Strandvejen','Lendrumvej','Hybenrosevej','Valnøddevej','Bakkegårdsvej','Vedskøllevej','Billesborgvej','Vordingborgvej','Egøjevej','Strøby Bygade','Sydmotorvejen','Ringvejen','Søndre Viaduktvej','Vallørækken','Stolpegårdsvej','Nimgårdsvej','Strandroseparken','Brinken','Egedalen','Kirkehøjen','Grubberholmsvej','Klippingevej','Bregnevej'])

# POIs
pois=[]
for e in allel:
    t=e.get('tags',{})
    if 'name' not in t: continue
    if e['type']=='node' and (t.get('place') or t.get('railway')=='station' or t.get('highway')=='motorway_junction'):
        pois.append({'n':t['name'],'k':t.get('place') or t.get('railway') or 'junction','p':rnd([e['lat'],e['lon']]),'r':t.get('ref','')})

json.dump({'lines':layers,'polys':polys,'chains':chains,'pois':pois}, open('base.json','w'), ensure_ascii=False, separators=(',',':'))
print('size', os.path.getsize('base.json'))
