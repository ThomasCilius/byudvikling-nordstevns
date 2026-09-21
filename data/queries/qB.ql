[out:json][timeout:300];
(
  way["highway"~"^(unclassified|residential)$"](55.22,11.88,55.55,12.50);
);
out tags geom;
