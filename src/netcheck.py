import json, math
from shapely.geometry import shape, LineString, Point, MultiLineString, Polygon
from shapely.ops import unary_union, linemerge, transform
LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
def proj(g): return transform(lambda x,y,z=None: ((x-LON0)*KX,(y-LAT0)*KY), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
def L(coords): return proj(LineString([(lo,la) for la,lo in coords]))
E=json.load(open('etaper.json')); B=json.load(open('base.json'))
TOWN=(55.380,12.20,55.435,12.34)
def intown(c): return any(TOWN[0]<=p[0]<=TOWN[2] and TOWN[1]<=p[1]<=TOWN[3] for p in c)
S=E['struktur']; BU=E['built']
# ---- car network for 10.000 (all built) ----
existing=[L(r['c']) for cls in ('main','tertiary','minor','service') for r in B['lines'][cls] if intown(r['c'])]
newroads=[L(S['statsvej']['bypass']),L(S['statsvej']['line']),L(S['byband']),L([[55.4053,12.2679],[55.4069,12.2706]])]
etape_lines={}
for id_,b in BU.items():
    etape_lines[id_]=[L(c) for c in b['streets']]+[L(c) for c in b['access']]
def components(lines):
    u=unary_union(lines); m=linemerge(u) if u.geom_type!='LineString' else u
    parts=list(m.geoms) if hasattr(m,'geoms') else [m]
    # union again to node at intersections -> build graph via endpoints
    import collections
    nodes={}; adj=collections.defaultdict(set)
    def key(p): return (round(p[0]/3),round(p[1]/3))
    segs=list(unary_union(parts).geoms) if unary_union(parts).geom_type!='LineString' else [unary_union(parts)]
    for s in segs:
        a=key(s.coords[0]); b=key(s.coords[-1]); adj[a].add(b); adj[b].add(a)
    comp={}; cid=0
    for n in list(adj):
        if n in comp: continue
        stack=[n]; comp[n]=cid
        while stack:
            x=stack.pop()
            for y in adj[x]:
                if y not in comp: comp[y]=cid; stack.append(y)
        cid+=1
    return segs,comp,key
allcar=existing+newroads+[l for ls in etape_lines.values() for l in ls]
segs,comp,key=components(allcar)
print('vejnet 10.000: komponenter',len(set(comp.values())))
syd=proj(Point(12.2638,55.3992)); pram=proj(Point(12.2232,55.4203))
def comp_of(pt):
    best=min(comp.keys(),key=lambda k:math.hypot(k[0]*3-pt.x,k[1]*3-pt.y)); return comp[best]
csyd=comp_of(syd); cpram=comp_of(pram); print('Sydporten komp',csyd,'Prambroen komp',cpram)
report={}
for id_,ls in etape_lines.items():
    if not ls: report[id_]={'streets':0}; continue
    comps=set(comp_of(Point(l.coords[0])) for l in ls)|set(comp_of(Point(l.coords[-1])) for l in ls)
    # access points: endpoints of etape lines touching non-etape lines
    other=unary_union(existing+newroads+[l for k,v in etape_lines.items() if k!=id_ for l in v])
    ends=[Point(l.coords[0]) for l in ls]+[Point(l.coords[-1]) for l in ls]
    acc=[e for e in ends if e.distance(other)<4]
    # distinct access points (>80 m apart)
    dist=[]
    for a in acc:
        if all(a.distance(d)>80 for d in dist): dist.append(a)
    report[id_]={'streets':len(ls),'comps':sorted(comps),'reach_syd':csyd in comps,'reach_pram':cpram in comps,'access':len(dist),'access_pts':[[round(unproj(a).y,5),round(unproj(a).x,5)] for a in dist]}
    print(f"{id_:5s} gader {len(ls):3d} komponenter {sorted(comps)} Sydporten {csyd in comps} Prambroen {cpram in comps} adgange {len(dist)}")
# adjacency between etaper (do neighbours connect?)
ids=[i for i in etape_lines if etape_lines[i]]
geoms={e['id']:proj(shape(e['geom'])) for e in E['etaper']}
for n in E['erhverv']: geoms[n['id']]=proj(shape(n['geom']))
for r in E['rammer']:
    if r['nr'] in ('3 B11','3 B12'): geoms[r['nr'].replace(' ','')]=proj(shape(r['geom']))
print('--- naboer (afstand < 150 m) og om deres gadenet mødes ---')
pairs=[]
for i,a in enumerate(ids):
    for b in ids[i+1:]:
        if a in geoms and b in geoms and geoms[a].distance(geoms[b])<150:
            ua=unary_union(etape_lines[a]); ub=unary_union(etape_lines[b])
            d=ua.distance(ub); pairs.append((a,b,round(geoms[a].distance(geoms[b])),round(d)))
            print(f"  {a}-{b}: område-afstand {geoms[a].distance(geoms[b]):4.0f} m, gadenet-afstand {d:4.0f} m {'(forbundet)' if d<5 else '(IKKE forbundet)'}")
# ---- cycle network ----
cyc_exist=[L(r['c']) for r in B['lines']['cycle'] if intown(r['c'])]
coast=[p for p in B['coast_chain'] if 12.226<p[1]<12.300]
PT={'j1':[55.4162,12.2434],'jKoge':[55.4203,12.2232],'kogeSt':[55.4580,12.1865],'center':[55.4164,12.2424],'ege':[55.4154,12.2560],'lendrumN':[55.4097,12.2720],'lendrumMid':[55.4046,12.2692],'hal':[55.4032,12.2640],'school':[55.4011,12.2636],'j4':[55.4005,12.2622],'nicol':[55.4062,12.2586],'egehaven':[55.4065,12.2547],'j3':[55.4057,12.2545],'elle':[55.4110,12.2543],'j2':[55.4094,12.2484],'bakke':[55.4116,12.2458],'egojeSt':[55.4243,12.1900]}
stev=B['chains']['Stevnsvej'][0]
def sub(ch,a,b):
    def ni(p): return min(range(len(ch)),key=lambda i:math.hypot(ch[i][0]-p[0],(ch[i][1]-p[1])*0.568))
    i,j=ni(a),ni(b); s=ch[min(i,j):max(i,j)+1]; return s if i<=j else s[::-1]
superc=sub(stev,PT['j1'],PT['jKoge'])+B['chains']['Strandvejen'][0][::-1]+[[55.4560,12.1870],PT['kogeSt']]
loop=[PT['center'],PT['j1'],[55.4166,12.2450],[55.4160,12.2500],[55.4150,12.2545],PT['ege'],[55.4140,12.2600],[55.4120,12.2660],PT['lendrumN'],[55.4069,12.2706],PT['lendrumMid'],PT['hal'],PT['school'],PT['j4'],[55.4025,12.2600],PT['nicol'],PT['egehaven'],PT['j3'],[55.4080,12.2510],PT['elle'],[55.4105,12.2500],PT['j2'],PT['bakke'],[55.4140,12.2440],PT['center']]
proposed={'superc':superc,'loop':loop,'aadal':S['aadalssti'],'byband':S['byband'],'prom1':S['promenade1'],'coastprom':coast,'K1':S['kiler'][0]['c'],'K2':S['kiler'][1]['c'],'K3':S['kiler'][2]['c']}
cyc_prop=[L(v) for v in proposed.values()]
csegs,ccomp,ckey=components(cyc_exist+cyc_prop)
print('cykelnet: komponenter',len(set(ccomp.values())))
def ccomp_of(pt):
    best=min(ccomp.keys(),key=lambda k:math.hypot(k[0]*3-pt.x,k[1]*3-pt.y)); return ccomp[best]
for nm,v in proposed.items():
    l=L(v); print(f"  rute {nm:9s} komp start {ccomp_of(Point(l.coords[0]))} slut {ccomp_of(Point(l.coords[-1]))}")
cnet=unary_union(cyc_exist+cyc_prop)
print('--- cykelsti-afstand pr. område (m) ---')
for id_,g in geoms.items():
    print(f"  {id_:5s} {g.distance(cnet):5.0f} m  {'OK' if g.distance(cnet)<50 else 'MANGLER'}")
json.dump({'report':report,'pairs':pairs},open('netcheck.json','w'))
