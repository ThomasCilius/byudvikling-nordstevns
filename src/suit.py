import json, math
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, Point, mapping
from shapely.ops import unary_union, transform
from shapely import affinity
import numpy as np

LAT0=55.40; LON0=12.24; KY=111320.0; KX=111320.0*math.cos(math.radians(LAT0))
def to_m(lon,lat): return ((lon-LON0)*KX,(lat-LAT0)*KY)
def proj(g): return transform(lambda x,y,z=None: to_m(x,y), g)
def unproj(g): return transform(lambda x,y,z=None: (x/KX+LON0, y/KY+LAT0), g)
def load_geojson(fn):
    d=json.load(open(fn)); out=[]
    for f in d['features']:
        try:
            g=shape(f['geometry'])
            if not g.is_valid: g=g.buffer(0)
            out.append((proj(g),f['properties']))
        except Exception as e: pass
    return out
def osm_polys(fn, pred):
    d=json.load(open(fn)); out=[]
    for e in d['elements']:
        t=e.get('tags',{})
        if not pred(t): continue
        if e['type']=='way':
            pts=[(g['lon'],g['lat']) for g in e.get('geometry',[])]
            if len(pts)>=4 and pts[0]==pts[-1]:
                g=Polygon(pts)
                if not g.is_valid: g=g.buffer(0)
                out.append(proj(g))
        elif e['type']=='relation':
            for m in e.get('members',[]):
                if m.get('role')=='outer' and m.get('geometry'):
                    pts=[(g['lon'],g['lat']) for g in m['geometry']]
                    if len(pts)>=4 and pts[0]==pts[-1]:
                        g=Polygon(pts); out.append(proj(g if g.is_valid else g.buffer(0)))
    return out

# ---------- study area ----------
study=proj(Polygon([(12.235,55.390),(12.310,55.390),(12.310,55.428),(12.235,55.428)]))

# ---------- rammer ----------
rammer=load_geojson('rammer.json')
town=[]; rest=[]
for g,p in rammer:
    nr=p.get('plannr','')
    if nr.startswith('3 ') or nr.startswith('8 ') or nr.startswith('9 '):
        town.append(g)
        if nr in ('3 B11','3 B12'): rest.append((nr,g))
town_u=unary_union(town)
byzone_u=unary_union([g for g,p in rammer if p.get('plannr','').startswith('3 ') and p.get('plannr') not in ('3 S1','3 R3','3 R4')])
print('town rammer area ha', round(town_u.area/1e4,1), 'Strøby Egede byzone rammer ha', round(byzone_u.area/1e4,1))

# ---------- constraints ----------
hab=unary_union([g for g,p in load_geojson('dai_habitat_omr.json')])
aa=unary_union([g for g,p in load_geojson('dai_aa_bes_linjer.json')])
soe=unary_union([g for g,p in load_geojson('dai_soe_bes_linjer.json')])
skov=unary_union([g for g,p in load_geojson('dai_skovbyggelinjer.json')])
kirke=unary_union([g for g,p in load_geojson('dai_kirkebyggelinjer.json')])
fred=unary_union([g for g,p in load_geojson('dai_fredede_omr.json')])
p3=unary_union([g for g,p in load_geojson('dai_bes_naturtyper.json')])
bnbo=unary_union([g for g,p in load_geojson('dai_status_bnbo.json')])
print('constraint areas (ha in study): natura',round(hab.intersection(study).area/1e4,1),'aa',round(aa.intersection(study).area/1e4,1),'skov',round(skov.intersection(study).area/1e4,1),'kirke',round(kirke.intersection(study).area/1e4,1),'fred',round(fred.intersection(study).area/1e4,1),'§3',round(p3.intersection(study).area/1e4,1),'bnbo',round(bnbo.intersection(study).area/1e4,1))

base=json.load(open('base.json'))
coast=LineString([(p[1],p[0]) for p in base['coast_chain']]); coast=proj(coast)
river=LineString([(p[1],p[0]) for p in base['river_chain']]); river=proj(river)
def bp(q):
    g=Polygon([(p[1],p[0]) for p in q['c']]); g=g if g.is_valid else g.buffer(0); return proj(g)
water=unary_union([bp(q).buffer(0) for q in base['polys'].get('water',[]) if len(q['c'])>=4])
wet=unary_union([bp(q).buffer(0) for q in base['polys'].get('wetland',[]) if len(q['c'])>=4])
wood=unary_union([bp(q).buffer(0) for q in base['polys'].get('wood',[]) if len(q['c'])>=4])
sea=bp(base['polys']['sea'][0]).buffer(0)
stevnsvej=proj(LineString([(p[1],p[0]) for p in base['chains']['Stevnsvej'][0]]))
kystvejen=proj(LineString([(p[1],p[0]) for p in base['chains']['Kystvejen'][0]]))
lendrum=proj(LineString([(p[1],p[0]) for p in base['chains']['Lendrumvej'][0]]+[(12.2706,55.4069),(12.2720,55.4097)]))
bypass=proj(LineString([(12.2638,55.3992),(12.2585,55.3982),(12.2530,55.3978),(12.2478,55.3983),(12.2432,55.3990)]))
statsvej=proj(LineString([(12.2432,55.3990),(12.2390,55.3960),(12.2300,55.3942),(12.2200,55.3940)]))
bld=osm_polys('osm_bld.json', lambda t:'building' in t)
bld_u=unary_union([b.buffer(25) for b in bld])
farm=osm_polys('osm_bld.json', lambda t:t.get('landuse')=='farmland')
farmyard=unary_union(osm_polys('osm_bld.json', lambda t:t.get('landuse')=='farmyard'))
rens=proj(Point(12.2739,55.4032)).buffer(200)   # rensningsanlæg 9 T1
school=proj(Point(12.2636,55.4011)); hal=proj(Point(12.2625,55.4028)); center=proj(Point(12.2424,55.4164)); j4=proj(Point(12.2622,55.4005)); bpj=proj(Point(12.2638,55.3992)); lendN=proj(Point(12.2720,55.4097))

# DEM
dem=json.load(open('dem.json'))
lats=dem['lats']; lons=dem['lons']
Z=np.full((len(lats),len(lons)),np.nan)
li={round(v,5):i for i,v in enumerate(lats)}; lj={round(v,5):j for j,v in enumerate(lons)}
for la,lo,z in dem['pts']:
    i=li.get(round(la,5)); j=lj.get(round(lo,5))
    if i is not None and j is not None and z is not None: Z[i,j]=z
def elev(x,y):
    lon=x/KX+LON0; lat=y/KY+LAT0
    i=(lat-lats[0])/0.0009; j=(lon-lons[0])/0.0016
    i0=int(max(0,min(len(lats)-2,math.floor(i)))); j0=int(max(0,min(len(lons)-2,math.floor(j))))
    fi=i-i0; fj=j-j0
    a=Z[i0,j0]*(1-fi)*(1-fj)+Z[i0+1,j0]*fi*(1-fj)+Z[i0,j0+1]*(1-fi)*fj+Z[i0+1,j0+1]*fi*fj
    return float(a)

# hard exclusion union
excl=unary_union([town_u, hab, aa, soe, kirke, fred, p3.buffer(25), bnbo, coast.buffer(300), sea, water, wet, wood.buffer(30), bld_u, farmyard.buffer(30), rens, stevnsvej.buffer(50), kystvejen.buffer(25), bypass.buffer(75), statsvej.buffer(75), river.buffer(150)])
# candidate land = farmland parcels minus exclusions, within study
cands=[]
for i,f in enumerate(farm):
    g=f.intersection(study).difference(excl)
    if g.is_empty: continue
    polys=[g] if g.geom_type=='Polygon' else list(g.geoms)
    for p in polys:
        if p.area>15000: cands.append(p)
print('candidate parcels',len(cands),'total ha',round(sum(c.area for c in cands)/1e4,1))

# scoring per parcel via sampled points
def score_poly(p):
    minx,miny,maxx,maxy=p.bounds; pts=[]
    for x in np.arange(minx+20,maxx,40):
        for y in np.arange(miny+20,maxy,40):
            pt=Point(x,y)
            if p.contains(pt): pts.append(pt)
    if not pts: pts=[p.representative_point()]
    s=[]; zs=[]
    for pt in pts:
        d_sch=min(pt.distance(school),pt.distance(hal)); d_cen=pt.distance(center); d_by=pt.distance(byzone_u)
        d_acc=min(pt.distance(lendrum),pt.distance(j4),pt.distance(bpj))
        d_st=pt.distance(stevnsvej); d_bp=min(pt.distance(bypass),pt.distance(statsvej)); d_co=pt.distance(coast); d_nat=pt.distance(hab); d_sk=pt.distance(skov) if not skov.is_empty else 9999
        z=elev(pt.x,pt.y); zs.append(z)
        sc = 0.22*max(0,min(1,1-(d_sch-600)/1400)) + 0.18*max(0,min(1,1-(d_cen-800)/1700)) + 0.20*(1 if d_by<150 else 0.5 if d_by<500 else 0.15) + 0.15*max(0,min(1,1-(d_acc-500)/1000))
        sc += 0.10*(1 if d_st>100 else 0.5) + 0.05*(1 if d_bp>150 else 0.4) + 0.05*(1 if d_co>600 else 0.4)
        sc += 0.05*(1 if z>=5 else 0.6 if z>=4 else 0.2)
        if skov.contains(pt): sc-=0.15
        if d_nat<200: sc-=0.08
        s.append(sc)
    return float(np.mean(s)), float(np.mean(zs)), float(np.min(zs))
rows=[]
for k,p in enumerate(cands):
    sc,zm,zmin=score_poly(p)
    c=p.centroid; d_by=p.distance(byzone_u)
    side='NØ for Stevnsvej' if (lambda pt: (pt.y - stevnsvej.interpolate(stevnsvej.project(pt)).y) > 0)(c) else 'SV for Stevnsvej'
    rows.append(dict(k=k,ha=p.area/1e4,score=sc,z=zm,zmin=zmin,d_by=d_by,side=side,cx=c.x/KX+LON0,cy=c.y/KY+LAT0,geom=p))
rows.sort(key=lambda r:-r['score'])
for r in rows[:25]:
    print(f"{r['k']:3d} {r['ha']:6.1f} ha score {r['score']:.2f} z {r['z']:4.1f} (min {r['zmin']:4.1f}) d_by {r['d_by']:5.0f} {r['side']:18s} {r['cy']:.4f},{r['cx']:.4f}")
json.dump({'rows':[{k:v for k,v in r.items() if k!='geom'}|{'geom':mapping(unproj(r['geom'].simplify(5)))} for r in rows],
           'constraints':{'natura':mapping(unproj(hab.intersection(study).simplify(8))),'aa':mapping(unproj(aa.intersection(study).simplify(8))),'skov':mapping(unproj(skov.intersection(study).simplify(8))),'kirke':mapping(unproj(kirke.intersection(study).simplify(8))),'p3':mapping(unproj(p3.intersection(study).simplify(5))),'bnbo':mapping(unproj(bnbo.intersection(study).simplify(5))),'strand':mapping(unproj(coast.buffer(300).intersection(study).difference(sea).simplify(8))),'fred':mapping(unproj(fred.intersection(study).simplify(8)))},
           'rammer':[{'nr':p.get('plannr'),'navn':p.get('plannavn'),'anv':p.get('anvendelsegenerel'),'zone':p.get('fremtidigzonestatus'),'ha':round(g.area/1e4,1),'geom':mapping(unproj(g.simplify(5)))} for g,p in rammer if p.get('plannr','')[:2] in ('3 ','8 ','9 ')]},
          open('suit.json','w'))
