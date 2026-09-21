import json, math
exec(open('suit.py').read().split('# candidate land')[0])   # reuse loaders, layers, exclusions, elev()
from shapely.geometry import box

# west-of-river exclusion (Valløby side): polygon between river line and far west
rc=[(p[1],p[0]) for p in base['river_chain']]
rc_m=[to_m(lo,la) for lo,la in rc]
rc_m=sorted(rc_m,key=lambda p:p[1])
west=Polygon(rc_m+[(-4000,rc_m[-1][1]+2000),(-4000,rc_m[0][1]-2000)])
if not west.is_valid: west=west.buffer(0)

# lowland raster polygon (< 3.0 m) and marginal (3-4 m)
cells_low=[]; cells_marg=[]
for i,la in enumerate(lats):
    for j,lo in enumerate(lons):
        z=Z[i,j]
        if np.isnan(z): continue
        x,y=to_m(lo,la); c=box(x-50*0.9,y-50*0.9,x+50*0.9,y+50*0.9)
        if z<3.0: cells_low.append(c)
        elif z<4.0: cells_marg.append(c)
low=unary_union(cells_low).buffer(20).buffer(-20); marg=unary_union(cells_marg).buffer(20).buffer(-20)
excl2=unary_union([excl, west, low])
cands=[]
for i,f in enumerate(farm):
    g=f.intersection(study).difference(excl2)
    if g.is_empty: continue
    for p in ([g] if g.geom_type=='Polygon' else list(g.geoms)):
        p=p.buffer(-8).buffer(8)  # remove slivers
        if p.is_empty: continue
        for q in ([p] if p.geom_type=='Polygon' else list(p.geoms)):
            if q.area>12000: cands.append(q)
print('candidates',len(cands),'ha',round(sum(c.area for c in cands)/1e4,1))

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
        d_st=pt.distance(stevnsvej); d_bp=min(pt.distance(bypass),pt.distance(statsvej)); d_co=pt.distance(coast); d_nat=pt.distance(hab)
        z=elev(pt.x,pt.y); zs.append(z)
        sc = 0.22*max(0,min(1,1-(d_sch-600)/1400)) + 0.16*max(0,min(1,1-(d_cen-800)/1700)) + 0.22*(1 if d_by<150 else 0.55 if d_by<450 else 0.15) + 0.15*max(0,min(1,1-(d_acc-500)/1000))
        sc += 0.08*(1 if d_st>100 else 0.5) + 0.05*(1 if d_bp>150 else 0.4) + 0.05*(1 if d_co>600 else 0.4)
        sc += 0.07*(1 if z>=5 else 0.6 if z>=4 else 0.25)
        if d_nat<200: sc-=0.06
        s.append(sc)
    return float(np.mean(s)), float(np.mean(zs)), float(np.min(zs))
rows=[]
for k,p in enumerate(cands):
    sc,zm,zmin=score_poly(p); c=p.centroid
    near=stevnsvej.interpolate(stevnsvej.project(c))
    # side: NE of the NW-SE running road => cross product sign
    i0=max(1,int(stevnsvej.project(c)))
    a=stevnsvej.interpolate(max(0,stevnsvej.project(c)-50)); b=stevnsvej.interpolate(min(stevnsvej.length,stevnsvej.project(c)+50))
    cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    # stevnsvej chain runs from Strøby (SE) to Prambroen (NW): direction NW; left of direction = SW
    side='SV for Stevnsvej' if cross>0 else 'NØ for Stevnsvej'
    rows.append(dict(k=k,ha=p.area/1e4,score=sc,z=zm,zmin=zmin,d_by=p.distance(byzone_u),side=side,cx=c.x/KX+LON0,cy=c.y/KY+LAT0,geom=p,
                     d_school=min(p.distance(school),p.distance(hal)),d_center=p.distance(center),d_lendrum=p.distance(lendrum),d_stevns=p.distance(stevnsvej),marg=p.intersection(marg).area/max(p.area,1)))
rows.sort(key=lambda r:-r['score'])
for r in rows[:30]:
    print(f"{r['k']:3d} {r['ha']:6.1f} ha sc {r['score']:.2f} z {r['z']:4.1f} min {r['zmin']:4.1f} marg {r['marg']*100:3.0f}% d_by {r['d_by']:5.0f} sch {r['d_school']:5.0f} cen {r['d_center']:5.0f} {r['side']:17s} {r['cy']:.4f},{r['cx']:.4f}")
json.dump({'rows':[{k:(v if k!='geom' else mapping(unproj(v.simplify(4)))) for k,v in r.items()} for r in rows],
  'constraints':{'natura':mapping(unproj(hab.intersection(study).simplify(6))),'aa':mapping(unproj(aa.intersection(study).difference(hab).simplify(6))),'kirke':mapping(unproj(kirke.intersection(study).simplify(6))),'p3':mapping(unproj(p3.intersection(study).simplify(4))),'bnbo':mapping(unproj(bnbo.intersection(study).simplify(4))),'strand':mapping(unproj(coast.buffer(300).intersection(study).difference(sea).simplify(6))),'fred':mapping(unproj(fred.intersection(study).simplify(6))),'low':mapping(unproj(low.intersection(study).difference(sea).simplify(8))),'marg':mapping(unproj(marg.intersection(study).difference(sea).simplify(8)))},
  'rammer':[{'nr':p.get('plannr'),'navn':p.get('plannavn'),'anv':p.get('anvendelsegenerel'),'zone':p.get('fremtidigzonestatus'),'ha':round(g.area/1e4,1),'geom':mapping(unproj(g.simplify(4)))} for g,p in rammer if p.get('plannr','')[:2] in ('3 ','8 ','9 ')]},
  open('suit.json','w'))
print('written suit.json')
