[out:json][timeout:60];
(
  nwr["name"~"Ellehal|Strøbyhal|Idrætscenter|Bådklub|Egehaven|Strøby Egede Center|Prambro|Sejlklub|Kajak|Brugsen|Netto|Rema|Lidl|Meny|SuperBrugsen|Strøby Kirke"](55.385,12.20,55.44,12.33);
  way["natural"="water"](55.395,12.22,55.43,12.27);
  way["natural"="wetland"](55.395,12.22,55.43,12.27);
  nwr["boundary"="protected_area"](55.385,12.20,55.44,12.33);
);
out tags center;
