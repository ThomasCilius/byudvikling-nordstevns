import json, math, random
from shapely.geometry import shape, mapping, Polygon, LineString, Point, MultiLineString, box
from shapely.ops import unary_union, transform, linemerge
from shapely import affinity
random.seed(7)
LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
def proj(g): return transform(lambda x,y,z=None: ((x-LON0)*KX,(y-LAT0)*KY), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
def pt(la,lo): return proj(Point(lo,la))
def ll(g):  # geometry -> list of [lat,lon] (for lines) 
    g=unproj(g); return [[round(y,5),round(x,5)] for x,y in g.coords]
def llpoly(g):
    g=unproj(g); return [[round(y,5),round(x,5)] for x,y in g.exterior.coords]
E=json.load(open('etaper.json'))
areas={e['id']:proj(shape(e['geom'])) for e in E['etaper']}
for n in E['erhverv']: areas[n['id']]=proj(shape(n['geom']))
for r in E['rammer']:
    if r['nr'] in ('3 B11','3 B12'): areas[r['nr'].replace(' ','')]=proj(shape(r['geom']))
byband=proj(LineString([(lo,la) for la,lo in E['struktur']['byband']]))
lendrum=proj(LineString([(12.2622,55.4005),(12.2692,55.4046),(12.2706,55.4069),(12.2720,55.4097)]))
ACCESS={'E0':pt(55.4061,12.2692),'E1':lendrum,'E2':byband,'E5':byband,'E6':byband,'E7':pt(55.3992,12.2638),'E8':pt(55.3878,12.2790),'N1':pt(55.3992,12.2638),'N2':pt(55.3992,12.2638),'N3':pt(55.3990,12.2432),'3B11':pt(55.4057,12.2545),'3B12':pt(55.4057,12.2545),'E3':None}
KIND={'N1':'erhv','N2':'erhv','N3':'erhv'}

def grid_streets(poly, s_long, s_cross, inset):
    inner=poly.buffer(-inset)
    if inner.is_empty: return [], inner
    rect=poly.minimum_rotated_rectangle
    c=list(rect.exterior.coords)[:4]
    e1=(c[0],c[1]); e2=(c[1],c[2])
    L1=math.dist(*e1); L2=math.dist(*e2)
    if L1>=L2: long_v=((e1[1][0]-e1[0][0])/L1,(e1[1][1]-e1[0][1])/L1); cross_v=((e2[1][0]-e2[0][0])/L2,(e2[1][1]-e2[0][1])/L2); Llong,Lcross=L1,L2
    else: long_v=((e2[1][0]-e2[0][0])/L2,(e2[1][1]-e2[0][1])/L2); cross_v=((e1[1][0]-e1[0][0])/L1,(e1[1][1]-e1[0][1])/L1); Llong,Lcross=L2,L1
    o=c[0] if L1>=L2 else c[1]
    # origin: corner where long edge starts; ensure long_v/cross_v orient from o
    lines=[]
    n_long=max(1,int(Lcross//s_long)); off=(Lcross-(n_long-1)*s_long)/2
    for i in range(n_long):
        d=off+i*s_long
        p0=(o[0]+cross_v[0]*d, o[1]+cross_v[1]*d); p1=(p0[0]+long_v[0]*Llong, p0[1]+long_v[1]*Llong)
        lines.append(LineString([p0,p1]))
    n_cross=max(1,int(Llong//s_cross)); off2=(Llong-(n_cross-1)*s_cross)/2
    for i in range(n_cross):
        d=off2+i*s_cross
        p0=(o[0]+long_v[0]*d, o[1]+long_v[1]*d); p1=(p0[0]+cross_v[0]*Lcross, p0[1]+cross_v[1]*Lcross)
        lines.append(LineString([p0,p1]))
    out=[]
    for l in lines:
        g=l.intersection(inner)
        parts=[g] if g.geom_type=='LineString' else list(g.geoms) if hasattr(g,'geoms') else []
        for p in parts:
            if p.geom_type=='LineString' and p.length>=55: out.append(p)
    return out, inner

def buildings(streets, inner, kind, poly):
    blds=[]; occupied=[]
    if kind=='erhv': step, w, d, off = 48, 32, 20, 22
    else: step, w, d, off = 20, 10, 11, 15
    for s in streets:
        L=s.length; n=int((L-12)//step)
        for i in range(n):
            a=s.interpolate(12+i*step); b=s.interpolate(min(L,12+i*step+1))
            dx,dy=b.x-a.x,b.y-a.y; m=math.hypot(dx,dy) or 1; ux,uy=dx/m,dy/m; nx,ny=-uy,ux
            for side in (1,-1):
                cx,cy=a.x+nx*off*side, a.y+ny*off*side
                if kind!='erhv' and random.random()<0.08: continue
                ww=w*(1.0 if kind=='erhv' else random.uniform(0.85,1.25)); dd=d*(1.0 if kind=='erhv' else random.uniform(0.85,1.15))
                if kind!='erhv' and random.random()<0.35: ww=w*2.2; dd=d*0.8   # rækkehusblok
                r=Polygon([(-ww/2,-dd/2),(ww/2,-dd/2),(ww/2,dd/2),(-ww/2,dd/2)])
                ang=math.degrees(math.atan2(uy,ux))
                r=affinity.rotate(r,ang,origin=(0,0)); r=affinity.translate(r,cx,cy)
                if not inner.contains(r): continue
                if any(r.intersects(o) for o in occupied[-80:]): continue
                if any(r.distance(st)<6 for st in streets): continue
                occupied.append(r); blds.append(r)
    return blds

BUILT={}
def process(id_, poly, kind):
    if id_=='E3': s_long,s_cross,inset=80,160,18
    elif kind=='erhv': s_long,s_cross,inset=110,220,22
    else: s_long,s_cross,inset=88,180,20
    streets,inner=grid_streets(poly,s_long,s_cross,inset)
    if not streets and not inner.is_empty:
        rect=poly.minimum_rotated_rectangle; c=list(rect.exterior.coords)[:4]
        e1=LineString([c[0],c[1]]); e2=LineString([c[1],c[2]]); long_e=e1 if e1.length>=e2.length else e2
        mid=LineString([((c[0][0]+c[3][0])/2,(c[0][1]+c[3][1])/2),((c[1][0]+c[2][0])/2,(c[1][1]+c[2][1])/2)]) if e1.length>=e2.length else LineString([((c[0][0]+c[1][0])/2,(c[0][1]+c[1][1])/2),((c[2][0]+c[3][0])/2,(c[2][1]+c[3][1])/2)])
        g=mid.intersection(inner)
        streets=[p for p in ([g] if g.geom_type=='LineString' else list(getattr(g,'geoms',[]))) if p.geom_type=='LineString' and p.length>40]
    acc=[]
    if id_=='E3':
        for target in (pt(55.4094,12.2484),pt(55.4057,12.2545),pt(55.4116,12.2458)):
            near=poly.exterior.interpolate(poly.exterior.project(target)); acc.append(LineString([near,target]))
    elif ACCESS.get(id_) is not None:
        t=ACCESS[id_]
        if t.geom_type=='Point': near=poly.exterior.interpolate(poly.exterior.project(t)); acc.append(LineString([near,t]))
        else:
            near_on_line=t.interpolate(t.project(poly.centroid)); near=poly.exterior.interpolate(poly.exterior.project(near_on_line))
            if near.distance(near_on_line)>5: acc.append(LineString([near,near_on_line]))
    for a in acc:
        pend=Point(a.coords[0])
        if streets:
            best=min(streets,key=lambda s:s.distance(pend))
            if best.distance(pend)>5:
                q=best.interpolate(best.project(pend)); streets.append(LineString([q,pend]))
    blds=buildings(streets,inner,kind,poly) if not inner.is_empty else []
    return streets,acc,blds
for id_,geom in areas.items():
    if id_=='S1V':
        BUILT[id_]={'streets':[],'access':[],'bld':[],'kind':'konv'}; continue
    kind=KIND.get(id_,'bolig')
    parts=[geom] if geom.geom_type=='Polygon' else [g for g in geom.geoms if g.area>8000]
    S_,A_,B_=[],[],[]
    for p in parts:
        st,ac,bl=process(id_,p,kind); S_+=st; A_+=ac; B_+=bl
    BUILT[id_]={'streets':[ll(s) for s in S_],'access':[ll(a) for a in A_],'bld':[llpoly(b) for b in B_],'kind':kind}
    print(id_, 'parts',len(parts),'streets',len(S_), round(sum(s.length for s in S_)/1000,2),'km', 'buildings',len(B_), 'access',len(A_))
E['built']=BUILT
# existing buildings (OSM) for the town, simplified
d=json.load(open('osm_bld.json')); exist=[]
for e in d['elements']:
    t=e.get('tags',{})
    if 'building' in t and e['type']=='way':
        pts=[(g['lon'],g['lat']) for g in e.get('geometry',[])]
        if len(pts)>=4 and 55.392<pts[0][1]<55.425 and 12.225<pts[0][0]<12.33:
            g=Polygon(pts)
            if g.area*KX*KY>25: 
                g=g.simplify(0.00002)
                exist.append([[round(y,5),round(x,5)] for x,y in g.exterior.coords])
E['exist_bld']=exist
json.dump(E,open('etaper.json','w'),ensure_ascii=False,separators=(',',':'))
import os; print('existing buildings',len(exist),'etaper.json',os.path.getsize('etaper.json'))
