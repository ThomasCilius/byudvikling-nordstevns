[out:json][timeout:60];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|cycleway|path|track|footway|service)$"](55.385,12.170,55.450,12.340);
);
out tags geom;
