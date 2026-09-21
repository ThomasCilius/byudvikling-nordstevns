import json, math, os
from collections import defaultdict
def load(fn):
    try: return json.load(open(fn))['elements']
    except Exception as e: print('skip',fn,e); return []
regA=load('osm_regA.json'); regB=load('osm_regB.json'); regC=load('osm_regC.json'); regD=load('osm_regD.json')
town=load('osm_roads.json'); townbase=load('osm_base.json'); ctx=load('osm_ctx.json')
TOWN=(55.385,12.20,55.435,12.33)
def intown(pts): return any(TOWN[0]<=p[0]<=TOWN[2] and TOWN[1]<=p[1]<=TOWN[3] for p in pts)
def dp(pts, tol):
    if len(pts)<3: return pts
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
    if dmax>tol: return dp(pts[:imax+1],tol)[:-1]+dp(pts[imax:],tol)
    return [pts[0],pts[-1]]
def rnd(p): return [round(p[0],5),round(p[1],5)]
def geom(e): return [[g['lat'],g['lon']] for g in e.get('geometry',[])]
def simp(pts, line=True):
    tol=(0.00003 if line else 0.00006) if intown(pts) else (0.00008 if line else 0.00012)
    return [rnd(p) for p in dp(pts,tol)]

seen=set(); lines=defaultdict(list); polys=defaultdict(list); pois=[]; stations=[]; places=[]
def take(e):
    k=(e['type'],e['id'])
    if k in seen: return False
    seen.add(k); return True
old=json.load(open('base.json'))
# keep town-level detailed layers from old base (service, cycle, foot, river, natura not needed)
for k in ('service','cycle','foot','river'): lines[k]=old['lines'].get(k,[])
for k in ('beach','wetland','green'): polys[k]=old['polys'].get(k,[])
for e in regA+regB+town+ctx:
    if e['type']=='node':
        t=e.get('tags',{})
        if t.get('railway') in ('station','halt') and take(e): stations.append({'n':t.get('name',''),'p':rnd([e['lat'],e['lon']])})
        elif t.get('place') and take(e): places.append({'n':t.get('name',''),'k':t['place'],'p':rnd([e['lat'],e['lon']])})
        continue
    if e['type']!='way' or not take(e): continue
    t=e.get('tags',{}); pts=geom(e)
    if len(pts)<2: continue
    hw=t.get('highway')
    if hw:
        cls=('motorway' if hw in ('motorway','motorway_link') else 'main' if hw in ('trunk','trunk_link','primary','primary_link','secondary','secondary_link') else 'tertiary' if hw in ('tertiary','tertiary_link') else 'minor' if hw in ('unclassified','residential') else None)
        if not cls: continue
        rec={'c':simp(pts)}
        if t.get('name'): rec['n']=t['name']
        if t.get('ref'): rec['r']=t['ref']
        if t.get('maxspeed'): rec['s']=t['maxspeed']
        lines[cls].append(rec); continue
    if t.get('railway') in ('rail','light_rail'):
        lines['rail'].append({'c':simp(pts),'n':t.get('name','')}); continue
    if t.get('natural')=='coastline':
        lines['coast'].append({'c':simp(pts)}); continue
for e in regC+townbase:
    t=e.get('tags',{})
    if e['type']=='way':
        if not take(e): continue
        pts=geom(e)
        if len(pts)<4 or pts[0]!=pts[-1]: continue
        lu=t.get('landuse'); na=t.get('natural')
        pc=('urban' if lu in ('residential','retail','commercial') else 'industrial' if lu=='industrial' else 'wood' if (lu=='forest' or na=='wood') else 'water' if na=='water' else 'wetland' if na=='wetland' else None)
        if pc: polys[pc].append({'c':simp(pts,False)})
    elif e['type']=='relation':
        if not take(e): continue
        pc='water' if t.get('natural')=='water' else 'wood' if t.get('landuse')=='forest' else None
        if not pc: continue
        for m in e.get('members',[]):
            if m.get('type')=='way' and m.get('role') in ('outer','') and m.get('geometry'):
                pts=[[g['lat'],g['lon']] for g in m['geometry']]
                if len(pts)>=4 and pts[0]==pts[-1]: polys[pc].append({'c':simp(pts,False)})
# boundaries
bnd=[]
for e in regD:
    if e['type']=='way' and e.get('geometry'):
        bnd.append({'c':simp(geom(e))})
# coast chain + sea
segs=[list(r['c']) for r in lines['coast'] if len(r['c'])>=2 and r['c'][0]!=r['c'][-1]]
chains=[]
while segs:
    ch=segs.pop(0); changed=True
    while changed:
        changed=False
        for i,s in enumerate(segs):
            if s[0]==ch[-1]: ch=ch+s[1:]; segs.pop(i); changed=True; break
            if s[-1]==ch[0]: ch=s[:-1]+ch; segs.pop(i); changed=True; break
    chains.append(ch)
chains.sort(key=len,reverse=True)
print('coast chains',[len(c) for c in chains][:8])
# merge chains by nearest endpoints (small gaps at harbours)
main=chains.pop(0)
while chains:
    dmin,i,how=min(((math.dist(c[0],main[-1]),i,'append') for i,c in enumerate(chains)),key=lambda x:x[0])
    dmin2,i2,how2=min(((math.dist(c[-1],main[0]),i,'prepend') for i,c in enumerate(chains)),key=lambda x:x[0])
    if dmin<=dmin2: c=chains.pop(i); main=main+c
    else: c=chains.pop(i2); main=c+main
    if max(dmin,dmin2)>0.05: pass
if main[0][0]<main[-1][0]: main=main[::-1]   # start = north end
sea=main+[[main[-1][0],12.95],[main[0][0]+0.03,12.95],[main[0][0]+0.03,main[0][1]]]
polys['sea']=[{'c':sea,'n':'Køge Bugt / Østersøen'}]
print('coast chain',len(main),main[0],main[-1])
out={'lines':dict(lines),'polys':dict(polys),'chains':old['chains'],'pois':old['pois'],'river_chain':old['river_chain'],'coast_chain':old['coast_chain'],'boundaries':bnd,'places':places,'stations':stations}
json.dump(out,open('base.json','w'),ensure_ascii=False,separators=(',',':'))
for k,v in lines.items(): print('line',k,len(v),sum(len(x['c']) for x in v))
for k,v in polys.items(): print('poly',k,len(v),sum(len(x['c']) for x in v))
print('places',len(places),'stations',len(stations),'boundary ways',len(bnd),'size',os.path.getsize('base.json'))
