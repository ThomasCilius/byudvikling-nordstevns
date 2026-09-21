[out:json][timeout:300];
(
  way["landuse"~"^(residential|industrial|retail|commercial|forest)$"](55.22,11.88,55.55,12.50);
  way["natural"~"^(wood|water|wetland)$"](55.22,11.88,55.55,12.50);
  relation["natural"="water"](55.22,11.88,55.55,12.50);
  relation["landuse"="forest"](55.22,11.88,55.55,12.50);
);
out tags geom;
