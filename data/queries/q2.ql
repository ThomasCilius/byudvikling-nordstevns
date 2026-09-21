[out:json][timeout:90];
(
  way["highway"~"^(motorway|motorway_link|trunk|primary|secondary)$"](55.36,12.08,55.47,12.34);
  node["highway"="motorway_junction"](55.36,12.08,55.47,12.34);
  way["waterway"~"^(river|stream)$"]["name"~"Tryggevælde"](55.36,12.15,55.47,12.34);
  way["natural"="coastline"](55.38,12.17,55.47,12.34);
  nwr["amenity"~"^(school|community_centre|supermarket|place_of_worship|townhall|kindergarten)$"](55.385,12.20,55.45,12.33);
  nwr["leisure"~"^(sports_centre|sports_hall|marina|slipway|pitch|swimming_pool)$"](55.385,12.20,55.45,12.33);
  nwr["club"](55.385,12.20,55.45,12.33);
  nwr["railway"="station"](55.38,12.10,55.47,12.34);
  node["place"~"^(town|village|suburb|hamlet|neighbourhood)$"](55.36,12.10,55.47,12.34);
  way["landuse"="residential"](55.385,12.21,55.44,12.33);
  way["place"="island"](55.36,12.10,55.47,12.34);
);
out tags geom;
