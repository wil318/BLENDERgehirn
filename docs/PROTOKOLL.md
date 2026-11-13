# Protokoll – 3D-Modell „Das Gehirn denkt“

Laufendes Arbeitsprotokoll (neueste Einträge unten). Zeiten in MEZ.

## 13.11.2026

### 18:05 – Auftrag
- 3D-Modell des menschlichen Gehirns **im Stil von** [simon23-12/BLENDERmodelle](https://github.com/simon23-12/BLENDERmodelle) bauen.
- Blender in der Cloud verwenden; Three.js nur als Fallback, falls kein Blender-Cloud-Dienst verfügbar ist.
- Lokale Vorschau im Ordner `3D-Modelle`, alles in Markdown protokollieren.
- Nach Freigabe: neues GitHub-Repo, GitHub Pages, PWA-Optimierung für iPad und Co.

### 18:08 – Analyse des Referenz-Repos
- `BLENDERmodelle` ist eine **Übersichtsseite**; die Modelle liegen jeweils in eigenen Repos (`BLENDERviertaktmotor`, `BLENDERkinesinmicrotubula`, …).
- Gemeinsames Muster aller Modelle:
  - `blender/build_*.py` erzeugt Szene **prozedural** in Blender → exportiert `web/models/*.glb` (+ `timeline.json`), speichert `.blend`.
  - `web/` ist eine statische Seite ohne Build-Schritt: Three.js per Import-Map von jsDelivr, `src/main.js`, `src/content.js` (deutsche Texte), `src/style.css`.
  - Gestaltung: dunkles Blau (`#060c18`), Akzent Orange (`#f39a2e`), Schriften Fraunces / IBM Plex Sans / IBM Plex Mono, Glas-Panels, nummerierte Hotspots, Bauteil-Index, Info-Panel mit Kennwerten, Phasen-Karte, Zeitleiste, Zoom-Leiste, Maßstab, Messwerte.
  - Nachbearbeitung: GTAO, Outline (Auswahl), Bloom; `three-mesh-bvh` für schnelles Picking.
  - Deployment: GitHub Action `pages.yml` veröffentlicht `web/` bei jedem Push auf `main`.

### 18:15 – Modell-Konzept
Maßstab 1 Einheit = 1 cm, Blender-Achsen: +X rechts, +Y vorn, +Z oben (Three.js: x, z, −y).

| Bereich | Aufbau in Blender |
| --- | --- |
| Großhirn (2 Hemisphären) | Signed-Distance-Feld aus weich verschmolzenen Ellipsoiden (Hauptkörper, Stirn, Schläfenlappen, Hinterhauptspol), Längsspalte, Tentorium- und Orbitadach-Abflachung → Icosphäre (163 842 Vertices) wird auf die Fläche projiziert |
| Windungen & Furchen | Domain-warped Perlin-Noise, Furchen an den Nulldurchgängen (schmale Rinnen, breite Windungen); eigens modelliert: Zentralfurche, Prä-/Postzentralfurche (parallele Windungen), Sylvische Furche |
| Lappen & Areale | Flächen werden nach Lage zu den Leitfurchen zugeordnet: Stirn-, Scheitel-, Schläfen-, Hinterhauptslappen + motorische Rinde, Fühlrinde, Hörrinde, Broca- und Wernicke-Areal (links) |
| Kleinhirn | eigenes SDF (zwei Hemisphären + Wurm, Hirnstamm-Kerbe) mit parallelen Folia, Fissura prima und horizontalis |
| Hirnstamm | Mittelhirn, Brücke (mit Querfasern), Medulla (mit Oliven), Rückenmark – Sweeps mit elliptischem Querschnitt |
| Innen | Balken, Thalamus, Hypothalamus, Hypophyse mit Stiel, Epiphyse, Basalganglien (Nucleus caudatus + Putamen), Hippocampus + Fornix, Amygdala, Ventrikelsystem (Seitenventrikel, 3./4. Ventrikel, Aquädukt) |
| Sehbahn | Augen mit Iris, Sehnerven, Chiasma, Tractus opticus, seitlicher Kniehöcker, Sehstrahlung zur Sehrinde |
| Nervenbahnen (Viewer) | Pfade als JSON: Pyramidenbahn mit Kreuzung, Sehbahn (gekreuzt/ungekreuzt), Hörbahn, Fasciculus arcuatus, Papez-Kreis (Hippocampus → Fornix), Balkenfasern |

Ausgabe: `brain.glb` (Draco-komprimiert), `meta.json` (Pfade, Marker-Anker, Statistik), `render.jpg` (Cycles), App-Icons, `brain.blend`.

### 18:18 – Cloud-Build eingerichtet
- Workflow `.github/workflows/blender.yml`: lädt Blender 5.3.0 (Linux, gecacht), installiert die nötigen Systembibliotheken, führt `blender -b --factory-startup --python blender/build_brain.py` aus, lädt die Ergebnisse als Artefakt hoch und **committet sie zurück** ins Repo.
- Repo angelegt und gepusht → erster Build gestartet.

### 18:20 – Viewer (Three.js) im Referenzstil
- `web/index.html`, `src/main.js`, `src/content.js`, `src/style.css` (Basis: Referenz-Stylesheet + Ergänzungen).
- Funktionen:
  - **Rundgang** mit 12 Stationen (Überblick, vier Lappen, Bewegen, Fühlen, Sehen, Hören, Sprache, Gedächtnis, Zwischenhirn, Balken, Hirnstamm/Kleinhirn, Liquor) – Play/Pause, Zeitleiste, ‹ › und Pfeiltasten.
  - **Röntgen** (Rinde durchsichtig), **Explosion** (Lappen, Kleinhirn, Hirnstamm, Augen fahren auseinander), **Hälfte** (rechte Hemisphäre aus), **Natur** (Gewebefarben statt Lehrfarben), **Labels**.
  - 26 Strukturen mit Infotext und Kennwerten, nummerierte Hotspots mit Verdeckungsprüfung, Hover-Tooltip, Kameraflug, Zoom-Leiste, Maßstab, Vergrößerung.
  - Leuchtende **Signalpulse** entlang der Nervenbahnen in den Stationen.
- PWA: `manifest.webmanifest`, `sw.js` (eigene Dateien network-first, CDN cache-first), Apple-Meta-Tags, Safe-Area-Abstände, größere Touch-Ziele, reduzierte Nachbearbeitung auf Touch-Geräten.
- Lokaler Server: `serve.py` (nur Python-Bordmittel), Startkonfiguration in `3D-Modelle/.claude/launch.json`.

### 18:20–18:45 – Cloud-Builds und Feinschliff
| Build | Ergebnis | Änderung danach |
| --- | --- | --- |
| #1 | 170 k Dreiecke, GLB 0,38 MB, Render 4:25 min | Blender 5 zählt Icosphären-Stufen anders → nur 41 k Vertices je Hemisphäre; Windungen zu grob, Kleinhirn ohne Folia, Stirnbuckel, Kamera zu nah |
| #2 | 478 k Dreiecke, GLB 0,93 MB | Stufe 8 (164 k → decimiert 82 k Vertices je Hemisphäre); Furchen schmaler/tiefer; Kleinhirn-Folia verliefen sternförmig |
| #3 | 478 k Dreiecke, GLB ≈ 0,9 MB, Gesamt-Build ≈ 3,5 min | Stirnpol sanft verschmolzen, Zentralfurche nach hinten verlegt, Folia als quer verlaufende Bänder, Windungen etwas schmaler |

Viewer-Korrekturen nach Test im Browser:
- **Explosion**: Einzelne Lappen sind offene Schalen und sahen aufgeklappt unschön aus → es fahren jetzt nur geschlossene Teile auseinander (beide Großhirnhälften seitlich, Kleinhirn nach hinten-unten, Hirnstamm nach unten, Augen nach vorn).
- **Hervorhebung**: Leuchten an die Helligkeit der Farbe angepasst (weißer Balken überstrahlte) + farbige Kontur der besprochenen Strukturen.
- **Hotspots**: Während einer Rundgang-Station erscheinen nur die Marker der besprochenen Strukturen.
- **Bloom**-Schwelle erhöht (weiße Augen leuchteten).
- Der Service Worker registriert sich in der Vorschau des Desktop-Browsers nicht (Einschränkung der eingebetteten Vorschau) → Test der PWA-Funktion erfolgt auf GitHub Pages (HTTPS).

### 18:45 – Lokale Preview
- Server: `python3 BLENDERgehirn/serve.py` → http://127.0.0.1:5173

### Nachhirn
- **Nachhirn** (Myelencephalon = verlängertes Mark) heißt jetzt so (Nr. 22), Untertitel nennt alle drei Bezeichnungen.

### 21:15 – Logo und Modell-Verbesserungen
- **Logo**: Kopfzeile und Ladeanzeige zeigen das LMG-TECH-Logo (`web/lmg-tech-logo.png`, aus den Referenzmodellen). App-Icons und Favicon bleiben das Gehirn-Icon. `sw.js`: `VERSION` → `gehirn-v2`, Logo im Offline-Cache.
- **Stirnlappen verkleinert**: Zentralfurche (`y_central`) um ≈ 1 cm nach vorn verlegt. Oberflächenanteile (Simulation, linke Hemisphäre): Stirn 42 → 39 %, Scheitel 13 → 17 %, Schläfe 28 %, Hinterhaupt 17 %. Oberes Ende der Furche liegt jetzt knapp hinter der Mitte der Hemisphäre.
- **Areal-Grenzen an Furchen angelehnt**: Broca, Hörrinde und Wernicke sind keine Kästen mehr, sondern beginnen als glatte Ovale (`region_of`) und werden danach an die Windungen angepasst (`snap_regions`): Die Fläche wird an den Furchen in Windungsstücke zerlegt, ein Stück gehört zum Areal, wenn mindestens die Hälfte im Oval liegt; Furchen-Dreiecke übernehmen die Mehrheit ihrer Nachbarn. Sicherung: Ändert sich die Fläche eines Areals auf < 0,6× oder > 1,8×, bleibt das Oval (steht im Build-Log). Motor- und Fühlrinde liegen schon zwischen den eingeprägten Furchen.
- **Lappen einzeln explodierbar**: `lobe_caps` schließt die Schnittkanten jedes Lappens mit einem Dreiecksfächer (Objekte `Frontal_L_Kappe` usw., Material „Mark“, im Rendering ausgeblendet; 8 zusätzliche Objekte). Im Viewer sind die Kappen nur bei der Explosion sichtbar; jeder Lappen fährt in seine Richtung (Stirn vor, Hinterhaupt zurück, Scheitel hoch, Schläfe seitlich nach unten).
- Geprüft ohne Blender (Simulation mit NumPy): Kappen schließen jeden Lappen lückenlos, Areale behalten ihre Größe. **Offen**: Aussehen in Blender/Viewer nach dem Neubau ansehen und ggf. Radien der Areale (`region_of`) oder Explosionswege (`LOBE_EXPLODE` in `main.js`) nachjustieren.


### Fall Phineas Gage (eigener Rundgang)
- Neuer, **separater Rundgang** mit 9 Stationen (`GAGE_TOUR` in `web/src/content.js`); der normale Rundgang (`TOUR`) ist unverändert. Umschalten über den Knopf „Fall Gage“ in der unteren Leiste („← Rundgang“ geht zurück).
- Ablauf: Unfall 1848 → Weg der Stange (Stange in Originalgröße, 109 cm, fliegt durch den Kopf und blendet aus) → zerstörte Bereiche → warum Bewegen / Sprechen / Hören, Sehen, Fühlen möglich blieben → Persönlichkeitsveränderung → Modellkritik → Quellen.
- Dargestellt wird **bewusst nur eine Rekonstruktion** (Ratiu 2004 / Van Horn 2012, überwiegend linke Seite). Jede Station trennt farbig markiert: *Gesichert*, *Umstritten*, *Nicht bekannt*, *Deutung*, *Modell*, *Frage*. Quellenliste mit Hinweis auf Unvollständigkeit (Angaben aus frei zugänglichen Zusammenfassungen, nicht alle Volltexte geprüft – vor dem Unterricht gegenprüfen).
- Technik (nur Frontend, kein Neubau des Modells nötig): Stange (Lathe-Geometrie), roter Kanal (Zylinder, Stangendicke) entlang einer geraden Bahn, Beschriftungen für Eintritt/Austritt. Bahn in Blender-Koordinaten: x = −3,6 + 0,253·(z + 4,3), y = 4,8 + 0,0723·(z + 4,3). Das Gehirn ist das allgemeine Modellgehirn, nicht das von Gage.
- `sw.js`: `VERSION` → `gehirn-v3`.
- **Offen**: Lage des Kanals im Viewer prüfen (läuft er im linken Stirnlappen? Abstand zur motorischen Rinde und zum Broca-Areal); bei Bedarf Bahn (`GAGE_P0`, `GAGE_D`) in `web/src/main.js` nachjustieren.
