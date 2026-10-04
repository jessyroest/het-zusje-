# Zusje · digitaal bestellen (concept)

Concept-prototype waarmee gasten via een QR-code op tafel de kaart bekijken en bestellen,
in plaats van met papieren bonnetjes.

- `index.html?tafel=109` — gast-app (mobiel): kies Bourgondisch Genieten / arrangement / borrel,
  aantal personen, gerechtjes per ronde, drankjes, opmerkingen, status volgen, collega roepen, rekening vragen.
- `keuken.html` — keukenscherm met bonnen (Nieuw → In bereiding → Uitserveren) en service-oproepen.
- `qr.html` — printbare QR-kaartjes per tafel.

Geen build nodig: open de bestanden in een browser of serveer de map statisch
(`python3 -m http.server`). Bestellingen worden in deze demo in `localStorage` bewaard, dus
gast-app en keuken werken samen binnen één browser (twee tabbladen). Zonder open keukenscherm
schuift de status vanzelf door, zodat de demo ook op één telefoon werkt.

Menu en prijzen zijn overgenomen van de papieren kaart (`js/menu.js`); drankprijzen zijn deels
geschat en moeten nog gecontroleerd worden.
