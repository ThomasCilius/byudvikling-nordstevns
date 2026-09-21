[out:json][timeout:120];
(
  way["landuse"~"^(residential|industrial|retail|commercial|forest|meadow|allotments|recreation_ground|cemetery|grass|village_green|farmyard)$"](55.375,12.19,55.44,12.34);
  way["natural"~"^(wood|wetland|scrub|water|beach|heath|grassland)$"](55.375,12.19,55.44,12.34);
  way["leisure"~"^(park|nature_reserve|pitch|golf_course|marina|sports_centre)$"](55.375,12.19,55.44,12.34);
);
out tags geom;
