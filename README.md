# Byudvikling Nordstevns - Strøby Egede trafikatlas

Et interaktivt debatoplæg om, hvordan Strøby Egede (Stevns Kommune) kan vokse fra ca. 4.900 til 5.000, 7.500 og 10.000 indbyggere - uden at sande til i trafik. Ét kort, du kan zoome og lege med: trafikmodel, omfartsvej og statsvej, boligetaper med veje og huse, erhverv, kultur, grønne områder, kystpromenade og marina, cykelnet og en geometrisk kontrol af, at det hele hænger sammen.

**Se det live:** https://thomascilius.dk/kommunalpolitik/byudviklingnord
**Eller åbn `index.html`** direkte i en browser - alt ligger i én fil (Leaflet hentes fra cdnjs).

> Debatoplæg af Thomas Cilius - ikke en vedtaget plan. Linjeføringer, etaper og tal er skitser til debat.
> Repoet er åbent, så andre kan byudvikle med: ret antagelser, flyt etaper, tegn nye veje - og send en pull request.

## Sådan bruger du kortet

- **Scenarie:** I dag · 5.000 · 7.500 · 10.000 - kortet viser byen som den er bygget ved hvert trin.
- **Visning:** Belastning (biler pr. time i morgenspidsen mod kapacitet), Fartgrænser, Vejnet & stier, Bystruktur (målbilledet).
- **Knapper på kortet:** Byen / Omfartsvej / Til motorvejen / Stevns & Køge, og lagene *Bindinger* (Natura 2000, § 3, byggelinjer, lavland), *Kommuneplanrammer* og *Cykelnet*.
- **Antagelser:** skydere for personer pr. bolig, pendlerandel, personer pr. bil, spidstimeandel, resten af Stevns' trafik, overflytning til cykel/bus - og tre forudindstillinger (stresstest / erhvervsaktive / kalibreret til tællinger).
- **Klik** på strækninger, etaper, tiltag og punkter for tal og begrundelser.

## Sådan byudvikler du med

Alt indhold ligger som data, ikke som håndtegning:

| Vil du ændre… | Ret i | Byg igen |
|---|---|---|
| Etaper (afgrænsning, tæthed, tekster) | `data/etaper.json` → `etaper[]` (eller regenerér med `src/etaper2.py`) | `python3 build.py` |
| Erhvervsområder, grønne områder, noder | `data/etaper.json` → `erhverv[]`, `green[]`, `struktur.noder[]` | `python3 build.py` |
| Omfartsvej/statsvej, Bybåndet, kiler, promenade, marina | `data/etaper.json` → `struktur.*` | `python3 build.py` |
| Trafikmodellens formler og kapaciteter | `src/app.js` → `model()` og `LINKS` | `python3 build.py` |
| Tiltag, tekster, signaturforklaring | `src/app.js` → `MEAS`, `STORY`, `ATTN`, `renderLegend()` | `python3 build.py` |
| Layout og farver | `src/head.html` (tokens i `:root`) | `python3 build.py` |

`python3 build.py` samler `src/` og `data/` til `index.html`. Ingen afhængigheder ud over Python 3.

### Regenerere data (valgfrit)

Pipelinen, der har lavet `data/base.json` og `data/etaper.json`, ligger i `src/`. Scripts læser og skriver i den mappe, de køres fra - kør dem fra `data/`:

1. Hent rå OSM-data med Overpass-queries i `data/queries/` (`curl --data-urlencode "data@qA.ql" https://overpass-api.de/api/interpreter -o osm_regA.json` osv. - de rå filer er ikke i repoet).
2. `python3 ../src/prep2.py` - grundkort (veje, jernbane, arealanvendelse, kyst, kommunegrænser).
3. `python3 ../src/suit2.py` - arealscreening (kræver `shapely`: `pip install shapely`).
4. `python3 ../src/etaper2.py` → `green.py` → `gen_built.py` → `netfix.py` - etaper, grønne områder, gadenet og huse, kontrol af sammenhæng.
5. `cd .. && python3 build.py`.

## Metode (kort)

- **Trafikmodel:** spidstimemodel for én retning. Pendlerbiler = indbyggere × andel over 25 år × pendlerandel ÷ personer pr. bil; spidstimeandel i den travleste time; plus lokale ærindeture og gennemkørende trafik fra resten af Stevns (indbyggere øst for ådalen × bilture pr. indbygger over Prambroen). Praktiske kapaciteter pr. retning: bygennemfart med signalanlæg 950, Kystvejen 450, Køgevej 1.200, omfartsvej 1.300, statsvej 1.500, Køge-strækningen 800. Belastning = biler ÷ kapacitet. Kalibreret mod Trafikplan 2025-2029 (ÅDT > 13.000 på Stevnsvej, 4.400 på Kystvejen).
- **Arealscreening:** alle marker om byen mod Natura 2000, § 3-natur, å-/sø-/kirkebyggelinjer, fredninger, BNBO, strandbeskyttelse (300 m), terræn under kote 3 m (EU-DEM), støjzoner og renseanlæg; scoret på afstand til skole/center, sammenhæng med byzone (indefra og ud), adgang til fordelingsveje og terrænhøjde. Tætheder efter Kommuneplan 2025 (8-10 åben-lav / 20 tæt-lav pr. ha).
- **Kontrol:** vej- og cykelnet bygges som grafer; hver etape skal have to udkørsler, nå Sydporten/Prambroen, og ligge på cykelnettet. Cykelkrydsninger af hovedveje er fundet geometrisk og klassificeret (tunnel hvor bilerne er flest eller ved skole/institution, ellers hævet flade).

## Datakilder og licenser

- Vejgeometri, arealanvendelse, bygninger, kyst, kommunegrænser: **OpenStreetMap-bidragydere** (ODbL). Afledte data i `data/base.json` og `data/etaper.json` er derfor ODbL.
- Kommuneplanrammer: **Plandata.dk** (Kommuneplan 2025, Stevns Kommune, vedtaget 20-11-2025).
- Natura 2000, § 3, byggelinjer, fredninger, BNBO: **Danmarks Miljøportal**.
- Terræn: **EU-DEM 25 m** (Copernicus) via opentopodata.org - ±1-2 m; skal efterprøves i Danmarks Højdemodel før planlægning.
- Trafiktal og planhistorik: Stevns Kommunes Trafikplan 2025-2029 og offentlige mødereferater (dato og punktnummer er angivet i teksten).
- Kode (`src/`, `build.py`): MIT. Tekster og skitser: CC BY 4.0 - brug dem, men sig hvor de kommer fra.

## Forbehold

Skitsemodel til at sammenligne scenarier - ikke en VVM, kapacitetsberegning eller bebyggelsesplan. Gadenet og huse i etaperne er genereret automatisk. Linjeføringer fastlægges i miljøkonsekvensvurderinger; arealudlæg kræver kommuneplantillæg og statens accept (planlovens behovsopgørelse, Fingerplanen, kystnærhedszonen). Andelen af sommerhuse, der allerede er helårsbeboede, er en antagelse.
