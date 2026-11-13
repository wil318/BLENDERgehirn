# Das Gehirn denkt – interaktives 3D-Modell

Interaktives 3D-Modell des menschlichen Gehirns (Blender → Three.js): vier Großhirnlappen mit Windungen und Furchen, Funktionsareale (motorische Rinde, Fühlrinde, Hörrinde, Broca, Wernicke), Kleinhirn, Hirnstamm, innere Strukturen (Balken, Thalamus, Hypothalamus, Hypophyse, Basalganglien, Hippocampus, Amygdala, Ventrikel) und die Sehbahn. Mit Rundgang in 12 Stationen, leuchtenden Signalpulsen entlang der Nervenbahnen, Röntgen- und Explosionsansicht. Optimiert für Desktop, iPad und Handy – als App installierbar (PWA).

## Bedienung

- **Ziehen** dreht, **Pinch/Mausrad** zoomt, **zwei Finger/Rechtsklick** verschiebt.
- **Strukturen** anklicken/antippen oder aus der Liste wählen → Infotext und Kennwerte.
- **▶** startet den Rundgang (12 Stationen à 12 s); **‹ ›** bzw. Pfeiltasten springen, Leertaste = Pause.
- **Röntgen** (X) macht die Rinde durchsichtig, **Explosion** (E) zieht die Teile auseinander, **Hälfte** blendet die rechte Großhirnhälfte aus, **Natur** zeigt Gewebefarben statt Lehrfarben.
- iPad/iPhone: in Safari *Teilen → Zum Home-Bildschirm* – startet dann als Vollbild-App und funktioniert nach dem ersten Laden auch offline.

## Lokal ansehen

```bash
python3 serve.py
```

Dann http://127.0.0.1:5173 öffnen (kein Build, kein npm; Three.js kommt per Import-Map von jsDelivr).

## Das Modell

`blender/build_brain.py` erzeugt die komplette Szene prozedural in Blender und schreibt `blender/brain.blend`, `web/models/brain.glb` (Draco-komprimiert), `web/models/meta.json` (Nervenbahnen, Marker-Anker), `web/img/render.jpg` und die App-Icons.

- **Großhirn:** Signed-Distance-Feld aus verschmolzenen Ellipsoiden, auf das eine Icosphäre projiziert wird. Furchen entstehen an den Nulldurchgängen von verzerrtem Perlin-Noise; Zentralfurche (mit parallelen Prä- und Postzentralwindungen) und Sylvische Furche sind eigens modelliert. Die Lappen und Areale werden anhand dieser Leitfurchen zugeordnet.
- **Kleinhirn:** eigenes Distanzfeld mit Wurm, parallelen Folia, Fissura prima und horizontalis.
- **Areale:** Broca, Hörrinde und Wernicke starten als Ovale und werden an die Windungen angelehnt (`snap_regions`). Die Lappen sind offene Schalen; für die Explosion schließen Kappen (`*_Kappe`, Material „Mark“) die Schnittflächen.
- **Hirnstamm, Balken, Ventrikel, Hippocampus, Sehbahn:** Sweeps entlang Catmull-Rom-Kurven mit elliptischem Querschnitt.
- Maßstab 1 Einheit = 1 cm (Länge ≈ 17 cm, Breite ≈ 14 cm). Lage und Größe sind anatomisch angenähert, nicht aus Bilddaten rekonstruiert.

### Cloud-Build

Blender läuft headless in GitHub Actions (`.github/workflows/blender.yml`): Bei jeder Änderung an `blender/build_brain.py` (oder manuell über *Run workflow*) wird Blender 5.3 geladen, das Modell gebaut, mit Cycles gerendert und das Ergebnis zurück ins Repo committet.

## Aufbau

- `web/` – statische Seite: `index.html`, `src/main.js` (Viewer), `src/content.js` (Texte, Rundgang), `src/style.css`
- `web/manifest.webmanifest`, `web/sw.js` – PWA (installierbar, offline)
- `docs/PROTOKOLL.md` – Arbeitsprotokoll

## Fall Phineas Gage

Eigener Rundgang für den Unterricht (Klasse 9): Knopf „Fall Gage“ in der unteren Leiste. Zeigt eine einzelne Rekonstruktion (Ratiu 2004 / Van Horn 2012) und kennzeichnet in jeder Station, was gesichert, umstritten oder nicht bekannt ist; mit Modellkritik und Quellenliste (Auswahl, unvollständig).
