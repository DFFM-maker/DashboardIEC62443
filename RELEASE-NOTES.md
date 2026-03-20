# Release Notes

## v2.0.2 — 2026-03-20

### Bug Fix: Nessun advisory NVD recuperato per nessun vendor (Omron, Siemens, Rockwell…)

**File:** `backend/services/advisoryService.js`

**Causa:** L'URL di query all'API NVD includeva il parametro
`keywordExactMatch=false`. L'API NVD v2.0 tratta `keywordExactMatch` come un
flag booleano puro (presenza = attivo, assenza = disattivo) e **non ammette
un valore esplicito**. Passando `=false`, il server rispondeva HTTP 404 con
il messaggio `"keywordExactMatch parameter cannot have a value."` — il body
era vuoto, il parsing JSON falliva silenziosamente e il fetch restituiva
sempre `[]`.

**Fix:** Rimosso il parametro `keywordExactMatch=false` dall'URL. Il
comportamento di ricerca non-esatta è il default dell'API e non richiede
parametri aggiuntivi.

---

## v2.0.1 — 2026-03-20

### Bug Fix: Vulnerability Advisories non visualizzate

**File:** `frontend/src/lib/api.js`

**Causa:** La funzione `api.getAdvisories()` costruiva la query string tramite
`URLSearchParams({ vendor: undefined, source: undefined })`, che produceva
la stringa letterale `"vendor=undefined&source=undefined"`.
Il backend riceveva questo filtro e non trovava nessun advisory nel DB
corrispondente al vendor `"undefined"`, restituendo un array vuoto.

**Fix:** I valori `null` e `undefined` vengono ora esclusi dall'oggetto prima
di passarlo a `URLSearchParams`, in modo che la chiamata senza filtri attivi
raggiunga il backend senza parametri spurî.

---

### Bug Fix: Logo Tecnopack di dimensioni eccessive nei report HTML/PDF

**File:** `backend/services/reportService.js`

**Causa:** Il file SVG del logo (`logo-tecnopack-light.svg`) contiene gli
attributi `height="205.44"` e `width="949.6"` hardcoded nel tag radice.
La funzione `getLogoInlineForPdf()` aggiungeva un secondo attributo
`height="60"` senza rimuovere quelli preesistenti; il browser/renderer
usava i valori originali dell'SVG, mostrando il logo a dimensione piena
(~949×205 px) nella copertina del report.

**Fix:** Prima di iniettare il valore corretto, gli attributi `height` e
`width` originali vengono rimossi tramite regex; viene poi aggiunto
`height="60" style="width:auto"` per mantenere le proporzioni.
