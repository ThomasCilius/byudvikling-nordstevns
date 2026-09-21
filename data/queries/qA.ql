[out:json][timeout:240];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link)$"](55.22,11.88,55.55,12.50);
  way["railway"~"^(rail|light_rail)$"](55.22,11.88,55.55,12.50);
  node["railway"~"^(station|halt)$"](55.22,11.88,55.55,12.50);
  node["place"~"^(city|town|village|suburb)$"](55.22,11.88,55.55,12.50);
  way["natural"="coastline"](55.20,11.88,55.60,12.60);
);
out tags geom;
