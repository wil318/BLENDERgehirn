// Inhalte: Strukturen (Annotationen) und Rundgang-Stationen.
// Koordinaten: 1 Einheit = 1 cm, three.js: +x = rechts (Patient), +y = oben, -z = vorn.
// meshes: exakte Namen oder Präfixe mit "_" am Ende (passt auf _L und _R).
// layer: 'outer' = von außen sichtbar, 'inner' = erst mit Röntgen/Explosion sinnvoll.

export const GROUPS = [
  ['Großhirnrinde', ['frontal', 'parietal', 'temporal', 'occipital', 'motor', 'somato', 'hoer', 'broca', 'wernicke']],
  ['Im Inneren', ['balken', 'thalamus', 'hypothalamus', 'hypophyse', 'epiphyse', 'basal', 'hippocampus', 'amygdala', 'ventrikel']],
  ['Hirnstamm & Kleinhirn', ['kleinhirn', 'mittelhirn', 'bruecke', 'medulla', 'rueckenmark']],
  ['Sehbahn', ['auge', 'sehnerv', 'sehstrahlung']],
];

export const ANNOTATIONS = [
  // ---------------------------------------------------------------- Großhirn
  {
    id: 'frontal', title: 'Stirnlappen', kicker: 'Lobus frontalis', color: '#e9a23b', layer: 'outer',
    meshes: ['Frontal_', 'Motor_', 'Broca_'], anchor: 'Frontal_L',
    text:
      'Der größte Lappen – etwa ein Drittel der Großhirnrinde. Hier wird geplant, entschieden und gehandelt: Der vordere Teil (präfrontaler Cortex) steuert Aufmerksamkeit, ' +
      'Impulskontrolle und Persönlichkeit, ganz hinten liegt die primäre motorische Rinde. Der präfrontale Cortex reift als letzte Hirnregion – erst mit Mitte zwanzig.',
    facts: [['Grenze hinten', 'Zentralfurche (Sulcus centralis)'], ['Grenze unten', 'Sylvische Furche'], ['Funktionen', 'Planung, Motorik, Sprache (Broca)'], ['Reifung', 'bis ≈ 25 Jahre']],
  },
  {
    id: 'parietal', title: 'Scheitellappen', kicker: 'Lobus parietalis', color: '#5aa7d8', layer: 'outer',
    meshes: ['Parietal_', 'Somato_'], anchor: 'Parietal_L',
    text:
      'Hinter der Zentralfurche werden Berührung, Temperatur, Schmerz und Körperlage verarbeitet. Der Scheitellappen setzt daraus ein Bild vom eigenen Körper im Raum zusammen ' +
      'und ist an Rechnen, Lesen und gezielten Greifbewegungen beteiligt.',
    facts: [['Grenze vorn', 'Zentralfurche'], ['Grenze hinten', 'Sulcus parietooccipitalis'], ['Funktionen', 'Tastsinn, Raum, Aufmerksamkeit']],
  },
  {
    id: 'temporal', title: 'Schläfenlappen', kicker: 'Lobus temporalis', color: '#79c27c', layer: 'outer',
    meshes: ['Temporal_', 'Hoer_', 'Wernicke_'], anchor: 'Temporal_L',
    text:
      'Unterhalb der Sylvischen Furche liegen Hörrinde und – links – das Sprachverständnis. Die Unterseite erkennt Gesichter und Gegenstände; ' +
      'innen liegen Hippocampus und Amygdala, die für Gedächtnis und Gefühle zentral sind.',
    facts: [['Grenze oben', 'Sylvische Furche (Sulcus lateralis)'], ['Funktionen', 'Hören, Sprache verstehen, Gedächtnis'], ['innen', 'Hippocampus, Amygdala']],
  },
  {
    id: 'occipital', title: 'Hinterhauptslappen', kicker: 'Lobus occipitalis', color: '#de6f8e', layer: 'outer',
    meshes: ['Okzipital_'], anchor: 'Okzipital_L',
    text:
      'Der kleinste Lappen ist ganz dem Sehen gewidmet. In der primären Sehrinde (V1, an der Innenseite um die Spornfurche) kommen die Signale aus den Augen an; ' +
      'umliegende Areale werten Kanten, Farben und Bewegung aus. Die Sehrinde ist „verkehrt herum“ und seitenvertauscht organisiert.',
    facts: [['Primäre Sehrinde', 'Area 17 (V1)'], ['Eingang', 'Sehstrahlung vom Thalamus'], ['Gesichtsfeld', 'linke Rinde ↔ rechte Hälfte']],
  },
  {
    id: 'motor', title: 'Motorische Rinde', kicker: 'Gyrus praecentralis · Area 4', color: '#ffb84d', layer: 'outer',
    meshes: ['Motor_'], anchor: 'Motor_L', parent: 'frontal',
    text:
      'Der Windungsstreifen direkt vor der Zentralfurche sendet die Befehle für willkürliche Bewegungen. Jeder Körperteil hat hier seinen Platz (motorischer Homunculus) – ' +
      'Hände, Lippen und Zunge bekommen besonders viel Fläche. Die linke Rinde steuert die rechte Körperhälfte, weil die Pyramidenbahn im verlängerten Mark kreuzt.',
    facts: [['Bahn', 'Pyramidenbahn (Tractus corticospinalis)'], ['Kreuzung', '≈ 85 % in der Medulla'], ['Riesenzellen', 'Betz-Zellen, bis 0,1 mm']],
  },
  {
    id: 'somato', title: 'Fühlrinde', kicker: 'Gyrus postcentralis · Areae 3, 1, 2', color: '#8cc8f0', layer: 'outer',
    meshes: ['Somato_'], anchor: 'Somato_L', parent: 'parietal',
    text:
      'Spiegelbildlich zur motorischen Rinde liegt hinter der Zentralfurche die primäre somatosensorische Rinde. Sie empfängt Tast-, Temperatur- und Schmerzsignale ' +
      'der gegenüberliegenden Körperhälfte – wieder als verzerrte Körperkarte (sensibler Homunculus).',
    facts: [['Eingang', 'über den Thalamus'], ['Körperseite', 'gegenüberliegend'], ['Karte', 'sensibler Homunculus']],
  },
  {
    id: 'hoer', title: 'Hörrinde', kicker: 'Heschl-Querwindungen · Area 41/42', color: '#a4e0a6', layer: 'outer',
    meshes: ['Hoer_'], anchor: 'Hoer_L', parent: 'temporal',
    text:
      'Die primäre Hörrinde liegt größtenteils versteckt in der Sylvischen Furche auf den Heschl-Querwindungen. Sie ist nach Tonhöhen geordnet (tonotop) – ' +
      'wie eine Klaviatur. Jedes Ohr meldet an beide Hemisphären.',
    facts: [['Ordnung', 'tonotop (nach Frequenz)'], ['Hörbereich', '≈ 20 Hz – 20 kHz'], ['Eingang', 'Thalamus (Corpus geniculatum mediale)']],
  },
  {
    id: 'broca', title: 'Broca-Areal', kicker: 'Sprachproduktion · Area 44/45', color: '#ffcf70', layer: 'outer',
    meshes: ['Broca_'], anchor: 'Broca_L', parent: 'frontal',
    text:
      'Im unteren Stirnlappen der linken Hemisphäre werden Sätze grammatisch gebaut und die Sprechbewegungen geplant. ' +
      'Paul Broca beschrieb 1861 einen Patienten, der fast nur noch „tan“ sagen konnte, aber alles verstand.',
    facts: [['Seite', 'meist links (≈ 95 % der Rechtshänder)'], ['Ausfall', 'Broca-Aphasie: stockendes Sprechen'], ['Verbindung', 'Fasciculus arcuatus → Wernicke']],
  },
  {
    id: 'wernicke', title: 'Wernicke-Areal', kicker: 'Sprachverständnis · Area 22', color: '#c4ec9e', layer: 'outer',
    meshes: ['Wernicke_'], anchor: 'Wernicke_L', parent: 'temporal',
    text:
      'Im hinteren oberen Schläfenlappen links wird gehörte und gelesene Sprache verstanden. Bei einer Schädigung sprechen Betroffene flüssig, ' +
      'aber oft sinnlos – und verstehen andere kaum (Carl Wernicke, 1874).',
    facts: [['Seite', 'meist links'], ['Ausfall', 'Wernicke-Aphasie: flüssig, aber sinnleer'], ['Verbindung', 'Fasciculus arcuatus → Broca']],
  },

  // ---------------------------------------------------------------- Innen
  {
    id: 'balken', title: 'Balken', kicker: 'Corpus callosum', color: '#f4efe4', layer: 'inner',
    meshes: ['Balken'], anchor: 'Balken',
    text:
      'Die größte Nervenfaserbrücke des Gehirns verbindet linke und rechte Hemisphäre. Über sie tauschen beide Hälften Informationen aus – ' +
      'wird sie durchtrennt („Split-Brain“), weiß die eine Hälfte nicht mehr, was die andere sieht.',
    facts: [['Fasern', '≈ 200 Mio. Axone'], ['Länge', '≈ 7–9 cm'], ['Teile', 'Rostrum, Knie, Stamm, Splenium']],
  },
  {
    id: 'thalamus', title: 'Thalamus', kicker: 'Zwischenhirn', color: '#f2c450', layer: 'inner',
    meshes: ['Thalamus_'], anchor: 'Thalamus_L',
    text:
      'Das „Tor zum Bewusstsein“: Fast alle Sinnessignale – außer dem Riechen – werden hier umgeschaltet und gefiltert, bevor sie die Großhirnrinde erreichen. ' +
      'Zu ihm gehören auch die seitlichen und mittleren Kniehöcker der Seh- und Hörbahn.',
    facts: [['Größe', '≈ 3 × 1,5 cm je Seite'], ['Aufgabe', 'Umschaltstation, Filter'], ['Ausnahme', 'Riechbahn']],
  },
  {
    id: 'hypothalamus', title: 'Hypothalamus', kicker: 'Zwischenhirn', color: '#ff9fb8', layer: 'inner',
    meshes: ['Hypothalamus'], anchor: 'Hypothalamus',
    text:
      'Nur so groß wie eine Mandel, aber die Steuerzentrale des Körpers: Temperatur, Hunger, Durst, Schlaf-Wach-Rhythmus und Sexualverhalten. ' +
      'Über die Hypophyse lenkt er das Hormonsystem.',
    facts: [['Masse', '≈ 4 g'], ['Innere Uhr', 'Nucleus suprachiasmaticus'], ['Steuert', 'Hypophyse, vegetatives Nervensystem']],
  },
  {
    id: 'hypophyse', title: 'Hirnanhangdrüse', kicker: 'Hypophyse', color: '#e9709a', layer: 'inner',
    meshes: ['Hypophyse'], anchor: 'Hypophyse',
    text:
      'Die erbsengroße Drüse hängt an einem Stiel unter dem Hypothalamus im Türkensattel des Schädels. Sie schüttet Hormone aus, die Wachstum, ' +
      'Schilddrüse, Nebennieren, Fortpflanzung und Wasserhaushalt steuern.',
    facts: [['Masse', '≈ 0,6 g'], ['Vorderlappen', 'GH, TSH, ACTH, FSH, LH, Prolaktin'], ['Hinterlappen', 'ADH, Oxytocin']],
  },
  {
    id: 'epiphyse', title: 'Zirbeldrüse', kicker: 'Epiphyse', color: '#c7e36a', layer: 'inner',
    meshes: ['Epiphyse'], anchor: 'Epiphyse',
    text: 'Die kleine Drüse bildet bei Dunkelheit das Schlafhormon Melatonin und hilft so, den Tag-Nacht-Rhythmus zu takten.',
    facts: [['Größe', '≈ 8 mm'], ['Hormon', 'Melatonin'], ['Takt', 'Licht → Auge → Hypothalamus → Epiphyse']],
  },
  {
    id: 'basal', title: 'Basalganglien', kicker: 'Striatum: Nucleus caudatus + Putamen', color: '#c79a6e', layer: 'inner',
    meshes: ['Basalganglien_'], anchor: 'Basalganglien_L',
    text:
      'Tief im Großhirn wählen die Basalganglien aus, welche Bewegung gestartet und welche unterdrückt wird, und speichern Gewohnheiten. ' +
      'Fehlt ihnen Dopamin aus der Substantia nigra im Mittelhirn, entsteht die Parkinson-Krankheit.',
    facts: [['Teile (hier)', 'Schweifkern + Putamen'], ['Botenstoff', 'Dopamin'], ['Erkrankung', 'Parkinson, Chorea Huntington']],
  },
  {
    id: 'hippocampus', title: 'Hippocampus', kicker: 'Limbisches System', color: '#ff8a5c', layer: 'inner',
    meshes: ['Hippocampus_'], anchor: 'Hippocampus_L',
    text:
      'Das „Seepferdchen“ im Schläfenlappen überführt neue Erlebnisse ins Langzeitgedächtnis und bildet eine Karte der Umgebung (Ortszellen, Nobelpreis 2014). ' +
      'Über den bogenförmigen Fornix (hier mit dargestellt) sendet er seine Signale weiter.',
    facts: [['Länge', '≈ 4–5 cm'], ['Aufgabe', 'Gedächtnisbildung, Navigation'], ['Besonderheit', 'Neurone entstehen lebenslang neu']],
  },
  {
    id: 'amygdala', title: 'Mandelkern', kicker: 'Amygdala', color: '#ff5c5c', layer: 'inner',
    meshes: ['Amygdala_'], anchor: 'Amygdala_L',
    text:
      'Vor dem Hippocampus bewertet die Amygdala blitzschnell, ob etwas gefährlich ist, und löst Angst- und Schreckreaktionen aus. ' +
      'Sie sorgt auch dafür, dass emotionale Erlebnisse besonders gut im Gedächtnis bleiben.',
    facts: [['Größe', '≈ 1,5 cm, mandelförmig'], ['Aufgabe', 'Emotionen, v. a. Angst'], ['Partner', 'Hippocampus, Hypothalamus']],
  },
  {
    id: 'ventrikel', title: 'Hirnkammern', kicker: 'Ventrikel · Liquor', color: '#62cdf5', layer: 'inner',
    meshes: ['Seitenventrikel_', 'Ventrikel_3', 'Ventrikel_4'], anchor: 'Seitenventrikel_L',
    text:
      'Vier miteinander verbundene Hohlräume sind mit Hirnwasser (Liquor) gefüllt. Er polstert das Gehirn – es „schwimmt“ und wiegt dadurch effektiv nur etwa 50 g – ' +
      'und spült Abfallstoffe heraus.',
    facts: [['Liquormenge', '≈ 150 ml'], ['Neubildung', '≈ 500 ml pro Tag'], ['Kammern', '2 Seiten-, 3. und 4. Ventrikel']],
  },

  // ---------------------------------------------------------------- Hirnstamm & Kleinhirn
  {
    id: 'kleinhirn', title: 'Kleinhirn', kicker: 'Cerebellum', color: '#a98ad8', layer: 'outer',
    meshes: ['Kleinhirn'], anchor: 'Kleinhirn',
    text:
      'Nur etwa ein Zehntel des Hirnvolumens, aber mehr als die Hälfte aller Nervenzellen. Das Kleinhirn gleicht geplante und tatsächliche Bewegung ab, ' +
      'hält das Gleichgewicht und speichert eingeübte Abläufe wie Radfahren. Typisch sind die feinen, parallelen Blättchen (Folia).',
    facts: [['Volumen', '≈ 10 % des Gehirns'], ['Neurone', '≈ 69 Mrd. (≈ 80 %)'], ['Aufgaben', 'Koordination, Gleichgewicht, Lernen']],
  },
  {
    id: 'mittelhirn', title: 'Mittelhirn', kicker: 'Mesencephalon', color: '#e3cfa6', layer: 'inner',
    meshes: ['Mittelhirn'], anchor: 'Mittelhirn',
    text:
      'Der oberste Abschnitt des Hirnstamms. Die Vierhügelplatte steuert Reflexe auf Licht und Geräusche (Kopf drehen), ' +
      'die Substantia nigra liefert Dopamin für die Bewegungssteuerung.',
    facts: [['Teile', 'Vierhügelplatte, Hirnschenkel'], ['Kerne', 'Substantia nigra, Nucleus ruber'], ['Kanal', 'Aquädukt (Liquor)']],
  },
  {
    id: 'bruecke', title: 'Brücke', kicker: 'Pons', color: '#e3cfa6', layer: 'outer',
    meshes: ['Bruecke'], anchor: 'Bruecke',
    text:
      'Die Vorwölbung des Hirnstamms enthält quer verlaufende Faserzüge, die Großhirn und Kleinhirn verbinden. ' +
      'Außerdem liegen hier Kerne für Kauen, Gesichtsmimik, Gleichgewicht und die Feinsteuerung der Atmung.',
    facts: [['Länge', '≈ 2,5 cm'], ['Hirnnerven', 'V – VIII'], ['Verbindung', 'Großhirn ↔ Kleinhirn']],
  },
  {
    id: 'medulla', title: 'Nachhirn', kicker: 'Myelencephalon · Verlängertes Mark (Medulla oblongata)', color: '#e3cfa6', layer: 'outer',
    meshes: ['Medulla'], anchor: 'Medulla',
    text:
      'Das Nachhirn (verlängertes Mark) ist der unterste Hirnabschnitt und geht ins Rückenmark über. Es enthält lebenswichtige Zentren für Atmung, Herzschlag und Blutdruck sowie Schluck-, Husten- und Niesreflex. Hier kreuzen die Pyramidenbahnen zur Gegenseite – ' +
      'deshalb steuert die linke Hirnhälfte die rechte Körperseite.',
    facts: [['Länge', '≈ 3 cm'], ['Zentren', 'Atmung, Kreislauf, Reflexe'], ['Pyramidenkreuzung', 'Decussatio pyramidum']],
  },
  {
    id: 'rueckenmark', title: 'Rückenmark', kicker: 'Medulla spinalis', color: '#efe2c4', layer: 'outer',
    meshes: ['Rueckenmark'], anchor: 'Rueckenmark',
    text: 'Die Verbindung zwischen Gehirn und Körper: Absteigende Bahnen leiten Bewegungsbefehle, aufsteigende melden Empfindungen. Einfache Reflexe schaltet das Rückenmark selbst.',
    facts: [['Länge', '≈ 45 cm'], ['Segmente', '31 Paare Spinalnerven'], ['hier gezeigt', 'nur der oberste Abschnitt']],
  },

  // ---------------------------------------------------------------- Sehbahn
  {
    id: 'auge', title: 'Augen', kicker: 'Bulbus oculi', color: '#f3f1ea', layer: 'outer',
    meshes: ['Auge_', 'Iris_'], anchor: 'Auge_L',
    text: 'Die Netzhaut ist genau genommen ein ausgelagerter Teil des Gehirns: Schon hier verarbeiten mehrere Nervenzellschichten das Bild, bevor es über den Sehnerv weitergeht.',
    facts: [['Durchmesser', '≈ 2,4 cm'], ['Fotorezeptoren', '≈ 120 Mio. Stäbchen, 6 Mio. Zapfen'], ['Maßstab', 'Lage vereinfacht']],
  },
  {
    id: 'sehnerv', title: 'Sehnerv & Sehnervenkreuzung', kicker: 'N. opticus · Chiasma opticum', color: '#ffe066', layer: 'inner',
    meshes: ['Sehnerv'], anchor: 'Sehnerv',
    text:
      'Im Chiasma kreuzen die Fasern der nasalen Netzhauthälften zur Gegenseite. So landet alles, was links im Gesichtsfeld liegt, in der rechten Hirnhälfte – und umgekehrt. ' +
      'Hinter der Kreuzung ziehen die Sehstränge zum seitlichen Kniehöcker des Thalamus.',
    facts: [['Fasern', '≈ 1,2 Mio. je Sehnerv'], ['Kreuzung', 'nasale Hälfte (≈ 53 %)'], ['Ziel', 'Corpus geniculatum laterale']],
  },
  {
    id: 'sehstrahlung', title: 'Sehstrahlung', kicker: 'Radiatio optica', color: '#ffd23f', layer: 'inner',
    meshes: ['Sehstrahlung_'], anchor: 'Sehstrahlung_L',
    text: 'Ein breiter Faserfächer vom Thalamus durch Schläfen- und Scheitellappen bis zur primären Sehrinde am Hinterhauptspol.',
    facts: [['Start', 'seitlicher Kniehöcker (Thalamus)'], ['Ziel', 'primäre Sehrinde V1'], ['Besonderheit', 'Meyer-Schleife im Schläfenlappen']],
  },
];

// Kamera: az = Azimut (0 = von hinten, -90 = von links, 180 = von vorn), el = Höhe in Grad, d = Abstand in cm.
export const TOUR = [
  {
    id: 'intro', title: 'Das Gehirn', kicker: 'Überblick',
    text: 'Etwa 1,4 kg, 86 Milliarden Nervenzellen und rund 20 % des gesamten Energiebedarfs. Ziehe zum Drehen, klicke auf Teile – oder lass den Rundgang laufen.',
    view: { az: -128, el: 16, d: 40, t: [0, -0.8, 0] }, highlight: [],
  },
  {
    id: 'lappen', title: 'Vier Lappen', kicker: 'Großhirn',
    text: 'Tiefe Furchen gliedern jede Großhirnhälfte in Stirn-, Scheitel-, Schläfen- und Hinterhauptslappen. Die Faltung vergrößert die Rinde auf etwa 0,2 m².',
    view: { az: -90, el: 10, d: 38, t: [0, 0.6, 0] }, highlight: ['frontal', 'parietal', 'temporal', 'occipital'],
  },
  {
    id: 'motorik', title: 'Bewegen', kicker: 'Pyramidenbahn',
    text: 'Die motorische Rinde schickt Befehle durch Hirnstamm und Rückenmark. In der Medulla kreuzt die Bahn – links denken, rechts bewegen.',
    view: { az: -150, el: 8, d: 40, t: [0, -1.5, 0] }, highlight: ['motor'], xray: true, pulses: ['motor_L'],
  },
  {
    id: 'fuehlen', title: 'Fühlen', kicker: 'Somatosensorik',
    text: 'Berührungen der rechten Hand steigen über Rückenmark und Thalamus zur linken Fühlrinde auf – direkt hinter der Zentralfurche.',
    view: { az: -110, el: 30, d: 38, t: [0, 0.5, 0] }, highlight: ['somato', 'thalamus'], xray: true, pulses: ['motor_R'], reverse: true,
  },
  {
    id: 'sehen', title: 'Sehen', kicker: 'Sehbahn',
    text: 'Vom Auge über die Sehnervenkreuzung zum Thalamus und weiter zur Sehrinde ganz hinten. Jede Hirnhälfte sieht die gegenüberliegende Hälfte der Welt.',
    view: { az: 180, el: -48, d: 36, t: [0, -1.0, -0.5] }, highlight: ['sehnerv', 'sehstrahlung', 'occipital', 'auge'], xray: true,
    pulses: ['seh_LL', 'seh_LR', 'seh_RR', 'seh_RL'],
  },
  {
    id: 'hoeren', title: 'Hören', kicker: 'Hörbahn',
    text: 'Vom Innenohr über mehrere Stationen im Hirnstamm und den Thalamus zur Hörrinde in der Sylvischen Furche – auf beiden Seiten.',
    view: { az: -170, el: 14, d: 40, t: [0, -0.8, 0] }, highlight: ['hoer'], xray: true, pulses: ['hoer_L', 'hoer_R'],
  },
  {
    id: 'sprache', title: 'Sprechen & Verstehen', kicker: 'Sprachareale (links)',
    text: 'Wernicke versteht, Broca formuliert – verbunden durch den Fasciculus arcuatus. Bei den meisten Menschen sitzt Sprache links.',
    view: { az: -90, el: 12, d: 30, t: [0, 0.4, 0] }, highlight: ['broca', 'wernicke'], pulses: ['sprache'],
  },
  {
    id: 'gedaechtnis', title: 'Erinnern & Fühlen', kicker: 'Limbisches System',
    text: 'Der Hippocampus speichert Erlebnisse, die Amygdala gibt ihnen ihre emotionale Färbung. Über den Fornix laufen die Signale weiter zu Zwischenhirn.',
    view: { az: -120, el: 22, d: 28, t: [0, -0.5, 0] }, highlight: ['hippocampus', 'amygdala'], xray: true, pulses: ['gedaechtnis_L', 'gedaechtnis_R'],
  },
  {
    id: 'zwischenhirn', title: 'Steuerzentrale', kicker: 'Zwischenhirn & Hormone',
    text: 'Der Thalamus filtert Sinneseindrücke, der Hypothalamus regelt Temperatur, Hunger und Schlaf und lenkt über die Hypophyse das Hormonsystem.',
    view: { az: -140, el: 4, d: 26, t: [0, -1.2, 0] }, highlight: ['thalamus', 'hypothalamus', 'hypophyse', 'epiphyse'], xray: true,
  },
  {
    id: 'balken', title: 'Zwei Hälften', kicker: 'Balken',
    text: 'Rund 200 Millionen Fasern verbinden die beiden Großhirnhälften. Die Explosionsansicht zieht sie auseinander und zeigt, was dazwischen liegt.',
    view: { az: 180, el: 26, d: 46, t: [0, 0.5, 0] }, highlight: ['balken'], explode: 1, pulses: ['balken'],
  },
  {
    id: 'stamm', title: 'Lebenswichtig', kicker: 'Hirnstamm & Kleinhirn',
    text: 'Der Hirnstamm hält Atmung und Herzschlag in Gang, das Kleinhirn sorgt für flüssige, sichere Bewegungen und das Gleichgewicht.',
    view: { az: -40, el: -10, d: 38, t: [0, -3.0, 0] }, highlight: ['kleinhirn', 'bruecke', 'medulla', 'mittelhirn'],
  },
  {
    id: 'liquor', title: 'Hirnwasser', kicker: 'Ventrikelsystem',
    text: 'Im Inneren liegen vier Kammern voller Liquor. Er federt Stöße ab und lässt das Gehirn im Schädel fast schwerelos schweben.',
    view: { az: -135, el: 30, d: 30, t: [0, -0.3, 0] }, highlight: ['ventrikel'], xray: true,
  },
];

export const FACTS_GLOBAL = { mass: '≈ 1,4 kg', neurons: '≈ 86 Mrd.', energy: '≈ 20 %' };

// =====================================================================
// Fall Phineas Gage – eigener Rundgang (der normale Rundgang TOUR bleibt unverändert)
// Schwerpunkt: Modellkritik. Jede Station trennt, was gesichert, umstritten
// oder nicht bekannt ist. Dargestellt wird bewusst nur EINE Rekonstruktion
// (Ratiu 2004 / Van Horn 2012: überwiegend linke Seite).
// gage: { rod: [Start, Ende] (Position der Stangenspitze entlang der Bahn in cm), rodFade,
//         canal (Kanal sichtbar), marks: ['entry','exit'] }
// =====================================================================
export const GAGE_TAGS = {
  gesichert: 'Gesichert', umstritten: 'Umstritten', unbekannt: 'Nicht bekannt',
  deutung: 'Deutung', modell: 'Modell', frage: 'Frage',
};

export const GAGE_TOUR = [
  {
    id: 'g-unfall', title: 'Phineas Gage', kicker: 'Der Unfall · 1848',
    text: 'Vermont, 13. September 1848: Bei Gleisarbeiten löst sich eine Sprengladung. Eine 109 cm lange Eisenstange (etwa 6 kg, 3 cm dick) fliegt durch den Kopf des 25-jährigen Vorarbeiters Phineas Gage.',
    notes: [
      ['gesichert', 'Gage überlebte. Nach dem Bericht des Arztes John Harlow war er bei Bewusstsein und konnte bald wieder sprechen und gehen.'],
      ['umstritten', 'Viele Einzelheiten des Hergangs stammen aus späteren Berichten und sind teils ausgeschmückt.'],
      ['modell', 'Die Stange ist hier in Originalgröße gezeigt – im Bild ist nur ein Teil von ihr zu sehen.'],
    ],
    view: { az: -110, el: 6, d: 120, t: [-3, -36, -4] }, highlight: [], hideHotspots: true,
    gage: { rod: [-6, -6], canal: 0, marks: ['entry'] },
  },
  {
    id: 'g-weg', title: 'Der Weg der Stange', kicker: 'Rekonstruktion',
    text: 'Die Stange drang unter dem linken Wangenknochen ein, ging hinter dem linken Auge nach oben durch die linke Stirnregion und trat oben am Schädel wieder aus. Das Modell zeigt den Weg als roten Kanal.',
    notes: [
      ['gesichert', 'Der Schädel mit Ein- und Austrittsöffnung ist erhalten (Harvard, Warren Anatomical Museum). Daraus lässt sich der ungefähre Weg berechnen.'],
      ['unbekannt', 'Das Gehirn selbst wurde nie untersucht. Wie genau der Kanal im Gehirn verlief, ist eine Rechnung, keine Messung.'],
      ['modell', 'Der Kanal ist hier eine gerade Linie in der Dicke der Stange, in einem allgemeinen Modellgehirn.'],
    ],
    view: { az: -105, el: 8, d: 72, t: [-3, -10, -4] }, xray: true, highlight: [], hideHotspots: true,
    gage: { rod: [-6, 34], rodFade: true, canal: 1, marks: ['entry', 'exit'] },
  },
  {
    id: 'g-schaden', title: 'Was wurde zerstört?', kicker: 'Ratiu 2004 · Van Horn 2012',
    text: 'Betroffen war vor allem der linke Stirnlappen. Nach der Rechnung von Van Horn et al. (2012) wurden etwa 4 % der Hirnrinde und etwa 11 % der Nervenfasern (weiße Substanz) zerstört. Der allergrößte Teil des Gehirns blieb unversehrt.',
    notes: [
      ['umstritten', 'Ratiu (2004) sieht nur den linken Stirnlappen verletzt, Van Horn (2012) überwiegend die linke Seite. Eine ältere Rechnung (Damasio 1994) kam auf beide Stirnlappen. Hier ist bewusst nur die einfachere Variante gezeigt.'],
      ['unbekannt', 'Die Prozentzahlen stammen aus einem Computermodell, das den Schädel mit Durchschnittsgehirnen moderner Menschen verbindet – nicht aus Gages echtem Gehirn.'],
      ['deutung', 'Wichtig sind die Nervenfasern unter der dünnen Rinde: Wo sie durchtrennt wurden, fehlt die Verbindung zu anderen Hirnteilen.'],
    ],
    view: { az: -90, el: 10, d: 34, t: [-2, 0.5, 0] }, xray: true, highlight: ['frontal'],
    gage: { rod: null, canal: 1, marks: ['exit'] },
  },
  {
    id: 'g-bewegen', title: 'Warum er sich bewegen konnte', kicker: 'Motorische Rinde',
    text: 'Die motorische Rinde liegt als Streifen weiter hinten, direkt vor der Zentralfurche. Der Kanal verläuft nach dieser Rekonstruktion davor. Auch die Pyramidenbahn zum Rückenmark blieb dadurch weitgehend verschont.',
    notes: [
      ['frage', 'Wie groß ist der Abstand zwischen Kanal und motorischer Rinde im Modell? Wie sicher können wir uns bei dieser Entfernung sein?'],
      ['modell', 'Die Lage der Areale ist die eines allgemeinen Gehirns. Bei echten Menschen liegt sie merklich anders.'],
    ],
    view: { az: -90, el: 12, d: 34, t: [-1, 0.5, 0] }, xray: true, highlight: ['motor'], pulses: ['motor_L'],
    gage: { rod: null, canal: 1, marks: [] },
  },
  {
    id: 'g-sprache', title: 'Warum er sprechen konnte', kicker: 'Sprachareale (links)',
    text: 'Das Wernicke-Areal (Verstehen) liegt weit hinten im Schläfenlappen, weit weg vom Kanal. Das Broca-Areal (Sprechen) sitzt links im unteren Stirnlappen – nahe, aber nach den meisten Rekonstruktionen nicht im Kanal. Laut Berichten sprach Gage weiter normal.',
    notes: [
      ['umstritten', 'Wie dicht der Kanal am Broca-Areal vorbeiläuft, wird seit dem 19. Jahrhundert diskutiert und hängt von der gewählten Rekonstruktion ab.'],
      ['unbekannt', 'Ob seine Sprache wirklich völlig unverändert war, lässt sich nur aus wenigen Berichten schließen.'],
    ],
    view: { az: -90, el: 10, d: 30, t: [-2, 0.3, 0] }, xray: true, highlight: ['broca', 'wernicke'], pulses: ['sprache'],
    gage: { rod: null, canal: 1, marks: [] },
  },
  {
    id: 'g-sinne', title: 'Hören, Sehen, Fühlen', kicker: 'Weit entfernte Zentren',
    text: 'Hörrinde (seitlich im Schläfenlappen), Sehrinde (ganz hinten) und Fühlrinde (hinter der Zentralfurche) liegen weit vom Kanal entfernt. Die Hörbahn läuft außerdem auf beiden Seiten. In den Berichten über Gage werden keine Ausfälle dieser Sinne genannt.',
    notes: [
      ['frage', 'Warum sagt das Fehlen von Berichten über Ausfälle nicht automatisch, dass es keine gab?'],
    ],
    view: { az: -135, el: 18, d: 40, t: [-1, -0.5, 0] }, xray: true, highlight: ['hoer', 'somato', 'occipital'], pulses: ['hoer_L', 'hoer_R'],
    gage: { rod: null, canal: 1, marks: [] },
  },
  {
    id: 'g-gefuehl', title: 'Was sich veränderte', kicker: 'Stirnhirn & Gefühle',
    text: 'Der Stirnlappen plant, wägt ab und bremst Impulse. Er ist eng mit dem limbischen System (zum Beispiel der Amygdala) verbunden, das Gefühle färbt. Nach Harlow (1868) wurde Gage launisch, ungeduldig und unzuverlässig.',
    notes: [
      ['umstritten', 'Wie stark und wie lange sich Gage veränderte, ist unklar. Es gibt nur wenige Berichte, teils Jahre später aufgeschrieben. Spätere Forscher halten die Veränderung für übertrieben; Gage arbeitete später jahrelang als Kutscher in Chile.'],
      ['deutung', 'Van Horn et al. (2012) vermuten, dass auch Faserverbindungen der linken Stirnregion zu anderen Hirnteilen gestört waren. Das passt zu Veränderungen im Verhalten, beweist sie aber nicht.'],
    ],
    view: { az: -120, el: 22, d: 32, t: [-1, 0, 0] }, xray: true, highlight: ['frontal', 'amygdala'],
    gage: { rod: null, canal: 1, marks: [] },
  },
  {
    id: 'g-kritik', title: 'Modellkritik', kicker: 'Was dieses Modell (nicht) kann',
    text: 'Prüfe das Modell kritisch: Was zeigt es wirklich – und was ist Annahme?',
    notes: [
      ['modell', 'Das Gehirn im Modell ist ein allgemeines Modellgehirn, nicht das von Gage.'],
      ['modell', 'Der Kanal ist eine gerade, vereinfachte Linie nach nur einer Rekonstruktion (überwiegend links).'],
      ['modell', 'Nervenbahnen und Areale sind schematisch. Echte Lagen und Größen unterscheiden sich von Person zu Person.'],
      ['umstritten', 'Gage ist ein Einzelfall mit wenigen, teils unsicheren Berichten. Aus einem Fall lassen sich keine allgemeinen Gesetze ableiten.'],
      ['frage', 'Welche Schlüsse darfst du aus dem Modell ziehen – und welche nicht?'],
    ],
    view: { az: -120, el: 14, d: 44, t: [0, 0, 0] }, xray: true, highlight: [], hideHotspots: true,
    gage: { rod: null, canal: 1, marks: ['exit'] },
  },
  {
    id: 'g-quellen', title: 'Quellen', kicker: 'Auswahl · unvollständig',
    text: 'Die Liste ist eine Auswahl und unvollständig. Die Angaben wurden aus frei zugänglichen Zusammenfassungen und Webseiten zusammengestellt, nicht aus allen Volltexten.',
    sources: [
      { t: 'Van Horn, J. D. et al. (2012): Mapping Connectivity Damage in the Case of Phineas Gage. PLoS ONE 7(5): e37454.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3353935' },
      { t: 'Ratiu, P. et al. (2004): The tale of Phineas Gage, digitally remastered. Journal of Neurotrauma 21(5): 637–643.' },
      { t: 'Damasio, H. et al. (1994): The return of Phineas Gage. Science 264: 1102–1105.' },
      { t: 'Harlow, J. M. (1848 und 1868): Berichte des behandelnden Arztes (Boston Medical and Surgical Journal; Publications of the Massachusetts Medical Society).' },
      { t: 'Macmillan, M. (2000): An Odd Kind of Fame. MIT Press – kritischer Blick auf die Überlieferung.' },
    ],
    view: { az: -120, el: 14, d: 46, t: [0, 0, 0] }, xray: true, highlight: [], hideHotspots: true,
    gage: { rod: null, canal: 1, marks: [] },
  },
];
