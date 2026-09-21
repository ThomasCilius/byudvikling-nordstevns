import json, math, collections
from shapely.geometry import shape, LineString, Point, Polygon
from shapely.ops import unary_union, linemerge, transform, nearest_points
LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
def proj(g): return transform(lambda x,y,z=None: ((x-LON0)*KX,(y-LAT0)*KY), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
def L(coords): return proj(LineString([(lo,la) for la,lo in coords]))
def ll(g): return [[round(y,5),round(x,5)] for x,y in unproj(g).coords]
E=json.load(open('etaper.json')); B=json.load(open('base.json'))
TOWN=(55.380,12.20,55.435,12.34)
def intown(c): return any(TOWN[0]<=p[0]<=TOWN[2] and TOWN[1]<=p[1]<=TOWN[3] for p in c)
S=E['struktur']; BU=E['built']
existing=[L(r['c']) for cls in ('main','tertiary','minor','service') for r in B['lines'][cls] if intown(r['c'])]
lendrum_open=L([[55.4053,12.2679],[55.4069,12.2706]])
lendrum_all=unary_union([L(r['c']) for cls in ('minor','service') for r in B['lines'][cls] if r.get('n')=='Lendrumvej']+[lendrum_open])
byband=L(S['byband']); bypass=L(S['statsvej']['bypass']); statsvej=L(S['statsvej']['line'])
stev=B['chains']['Stevnsvej'][0]; stevnsS=L([p for p in stev if p[0]<55.4010])
kogevej=L(B['chains']['Køgevej'][0])
syd=proj(Point(12.2638,55.3992))
TARGET={'E0':[lendrum_all],'E1':[lendrum_all],'E2':[byband],'E5':[byband],'E6':[byband],'E8':[byband],'E3':[proj(Point(12.2484,55.4094)),proj(Point(12.2545,55.4057)),proj(Point(12.2458,55.4116))],'E7':[syd,stevnsS],'N1':[syd],'N2':[syd,stevnsS],'N3':[kogevej,statsvej],'3B11':[proj(Point(12.2545,55.4057))],'3B12':[proj(Point(12.2545,55.4057))]}
geoms={e['id']:proj(shape(e['geom'])) for e in E['etaper']}
for n in E['erhverv']: geoms[n['id']]=proj(shape(n['geom']))
for r in E['rammer']:
    if r['nr'] in ('3 B11','3 B12'): geoms[r['nr'].replace(' ','')]=proj(shape(r['geom']))
def snap_line(line,target):
    a=Point(line.coords[0]); b=Point(line.coords[-1])
    # snap the endpoint nearest to target exactly onto it
    if a.distance(target)<b.distance(target): p=nearest_points(a,target)[1]; return LineString([p,b])
    else: p=nearest_points(b,target)[1]; return LineString([a,p])
def comps(lines):
    if not lines: return {}
    u=unary_union(lines); segs=list(u.geoms) if hasattr(u,'geoms') else [u]
    adj=collections.defaultdict(set); key=lambda p:(round(p[0]),round(p[1]))
    for s in segs: a=key(s.coords[0]); b=key(s.coords[-1]); adj[a].add(b); adj[b].add(a)
    comp={}; cid=0
    for n in list(adj):
        if n in comp: continue
        st=[n]; comp[n]=cid
        while st:
            x=st.pop()
            for y in adj[x]:
                if y not in comp: comp[y]=cid; st.append(y)
        cid+=1
    return comp,segs,key
def endpoints(lines): return [Point(l.coords[0]) for l in lines]+[Point(l.coords[-1]) for l in lines]
new_links={}; new_access={}
for id_,b in BU.items():
    if not b['streets'] and not b['access']: continue
    streets=[L(c) for c in b['streets']]; targets=[t if t.geom_type!='Point' else t for t in TARGET.get(id_,[])]
    tgt=unary_union([t.buffer(0.01) if t.geom_type=='Point' else t for t in targets]) if targets else None
    # 1) connect internal components
    links=[]
    for _ in range(12):
        comp,segs,key=comps(streets+links)
        cids=set(comp.values())
        if len(cids)<=1: break
        # find closest pair of components
        best=None
        pts_by=collections.defaultdict(list)
        for n,c in comp.items(): pts_by[c].append(Point(n[0],n[1]))
        cl=list(pts_by)
        for i,a in enumerate(cl):
            for bb in cl[i+1:]:
                for p in pts_by[a]:
                    for q in pts_by[bb]:
                        d=p.distance(q)
                        if best is None or d<best[0]: best=(d,p,q)
        if best is None or best[0]>320: break
        links.append(LineString([best[1],best[2]]))
    # 2) access links: snap existing, then ensure >=2 distinct
    access=[snap_line(L(c),tgt) if tgt is not None else L(c) for c in b['access']]
    if tgt is not None:
        allv=endpoints(streets+links)
        def distinct(acc):
            out=[]
            for a in acc:
                p=Point(a.coords[-1]) if Point(a.coords[-1]).distance(tgt)<1 else Point(a.coords[0])
                if all(p.distance(o)>120 for o in out): out.append(p)
            return out
        tries=0
        while len(distinct(access))<2 and tries<3:
            tries+=1
            have=distinct(access)
            cand=[v for v in allv if v.distance(tgt)<420 and all(v.distance(h)>150 for h in have)]
            if not cand: break
            v=max(cand,key=lambda v:min([v.distance(h) for h in have]) if have else -v.distance(tgt))
            p=nearest_points(v,tgt)[1]; access.append(LineString([v,p]))
    new_links[id_]=links; new_access[id_]=access
    b['streets']=[ll(s) for s in streets]+[ll(l) for l in links]; b['access']=[ll(a) for a in access]
# 3) inter-etape road links (new areas only)
inter=[]
for a,bb in [('E0','E1'),('E1','E2'),('E1','E5'),('E2','E5'),('E5','E6')]:
    la=[L(c) for c in BU[a]['streets']]; lb=[L(c) for c in BU[bb]['streets']]
    if not la or not lb: continue
    ea=endpoints(la); eb=endpoints(lb)
    best=min(((p.distance(q),p,q) for p in ea for q in eb),key=lambda x:x[0])
    if best[0]<220: inter.append({'a':a,'b':bb,'c':ll(LineString([best[1],best[2]]))})
E['struktur']['interlinks']=inter
# 4) cycle network: existing OSM cycle + proposed routes + tracks along fordelingsveje/access + path links to old neighbourhoods
cyc_exist=[L(r['c']) for r in B['lines']['cycle'] if intown(r['c'])]
coast=[p for p in B['coast_chain'] if 12.226<p[1]<12.300]
PT={'j1':[55.4162,12.2434],'jKoge':[55.4203,12.2232],'kogeSt':[55.4580,12.1865],'center':[55.4164,12.2424],'ege':[55.4154,12.2560],'lendrumN':[55.4097,12.2720],'lendrumMid':[55.4046,12.2692],'hal':[55.4032,12.2640],'school':[55.4011,12.2636],'j4':[55.4005,12.2622],'nicol':[55.4062,12.2586],'egehaven':[55.4065,12.2547],'j3':[55.4057,12.2545],'elle':[55.4110,12.2543],'j2':[55.4094,12.2484],'bakke':[55.4116,12.2458],'egojeSt':[55.4243,12.1900]}
def sub(ch,a,b):
    def ni(p): return min(range(len(ch)),key=lambda i:math.hypot(ch[i][0]-p[0],(ch[i][1]-p[1])*0.568))
    i,j=ni(a),ni(b); s=ch[min(i,j):max(i,j)+1]; return s if i<=j else s[::-1]
superc=sub(stev,PT['j1'],PT['jKoge'])+B['chains']['Strandvejen'][0][::-1]+[[55.4560,12.1870],PT['kogeSt']]
loop=[PT['center'],PT['j1'],[55.4166,12.2450],[55.4160,12.2500],[55.4150,12.2545],PT['ege'],[55.4140,12.2600],[55.4120,12.2660],PT['lendrumN'],[55.4069,12.2706],PT['lendrumMid'],PT['hal'],PT['school'],PT['j4'],[55.4025,12.2600],PT['nicol'],PT['egehaven'],PT['j3'],[55.4080,12.2510],PT['elle'],[55.4105,12.2500],PT['j2'],PT['bakke'],[55.4140,12.2440],PT['center']]
routes={'superc':superc,'loop':loop,'aadal':S['aadalssti'],'byband':S['byband'],'prom1':S['promenade1'],'coastprom':coast,'K1':S['kiler'][0]['c'],'K2':S['kiler'][1]['c'],'K3':S['kiler'][2]['c'],'egoje':None}
tracks=[]  # cykelsti langs fordelingsveje og adgangsveje
tracks.append(ll(lendrum_all) if lendrum_all.geom_type=='LineString' else None)
tracks=[t for t in tracks if t]
for g in (lendrum_all.geoms if hasattr(lendrum_all,'geoms') else [lendrum_all]): tracks.append(ll(g))
for id_,acc in new_access.items():
    for a in acc: tracks.append(ll(a))
for lk in inter: tracks.append(lk['c'])
# Ådalsvej: E3's two longest streets
e3=[L(c) for c in BU['E3']['streets']]; e3.sort(key=lambda l:-l.length)
for l in e3[:3]: tracks.append(ll(l))
# Sydporten -> N2 -> Stevnsvej syd along bypass first 300 m + K3 connector via E6 grid, Køgevej-link
tracks.append(ll(L([[55.3992,12.2638],[55.3978,12.2585]])))
tracks.append([[55.3965,12.2790],[55.3960,12.2850],[55.3965,12.2905]])   # bybånd -> K3
tracks.append([[55.3945,12.2830],[55.3990,12.2870],[55.3995,12.2825]])   # E6/E5 tværsti -> K2
tracks.append(ll(L(sub(B['chains']['Køgevej'][0],[55.4203,12.2232],[55.3937,12.2498]))))
tracks.append([[55.3937,12.2498],[55.3910,12.2430],[55.3895,12.2430]])   # til N3
# path-only links to old neighbourhoods (E0 -> Nicolinelund/Ved Kystvejen) 
paths=[]
for a,bb in [('E0','3B12'),('E0','3B11')]:
    la=[L(c) for c in BU[a]['streets']]; lb=[L(c) for c in BU[bb]['streets']]
    ea=endpoints(la); eb=endpoints(lb)
    best=min(((p.distance(q),p,q) for p in ea for q in eb),key=lambda x:x[0])
    paths.append({'a':a,'b':bb,'c':ll(LineString([best[1],best[2]]))})
E['struktur']['pathlinks']=paths
cyc_all=cyc_exist+[L(v) for k,v in routes.items() if v]+[L(t) for t in tracks]+[L(p['c']) for p in paths]
# connectivity with 12 m tolerance: buffer-union
u=unary_union([c.buffer(12) for c in cyc_all])
ncomp=len(u.geoms) if hasattr(u,'geoms') else 1
print('cykelnet komponenter (12 m tolerance):',ncomp)
if ncomp>1:
    parts=sorted(u.geoms,key=lambda g:-g.area)
    for g in parts[1:8]: c=unproj(g.centroid); print('  løs komponent areal-ækv',round(g.area/24/1000,2),'km ved',round(c.y,4),round(c.x,4))
cnet=unary_union(cyc_all)
res={}
for id_,g in geoms.items(): res[id_]={'cyc_m':round(g.distance(cnet))}
# 5) road connectivity re-check (snap tolerance via buffer 6 m)
allcar=existing+[bypass,statsvej,byband,lendrum_open]+[L(c) for b in BU.values() for c in b['streets']+b['access']]+[L(l['c']) for l in inter]
uc=unary_union([c.buffer(6) for c in allcar]); carparts=list(uc.geoms) if hasattr(uc,'geoms') else [uc]
main=max(carparts,key=lambda g:g.area)
for id_,b in BU.items():
    ls=[L(c) for c in b['streets']+b['access']]
    if not ls: res[id_].update({'connected':None,'access':0}); continue
    conn=all(main.contains(Point(l.coords[0])) or main.intersects(l) for l in ls)
    tgt=TARGET.get(id_); 
    n_acc=len(new_access.get(id_,[]))
    res[id_].update({'connected':bool(conn),'access':n_acc})
    print(f"{id_:5s} forbundet til hovednettet: {conn}  adgange: {n_acc}  cykelsti: {res[id_]['cyc_m']} m")
E['struktur']['cyclenet']={'routes':{k:v for k,v in routes.items() if v},'tracks':tracks}
E['netcheck']={'areas':res,'cycle_components':ncomp,'inter':len(inter),'paths':len(paths)}
json.dump(E,open('etaper.json','w'),ensure_ascii=False,separators=(',',':'))
print('inter-links',len(inter),'path-links',len(paths))
