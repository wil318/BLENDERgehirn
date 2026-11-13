"""
Das menschliche Gehirn – prozeduraler Blender-Aufbau + Export für den Three.js-Viewer.

Einheiten: 1 Blender-Einheit = 1 cm.  Achsen: +X = rechts (Patient), -X = links,
+Y = vorn (anterior), +Z = oben.  glTF/Three.js: (x, y, z)_three = (x, z, -y)_blender.

Ausführen (headless, z. B. in GitHub Actions):
    blender -b --factory-startup --python blender/build_brain.py -- [--no-render]

Schreibt:
    blender/brain.blend          – die Szene
    web/models/brain.glb         – Draco-komprimiertes Modell für den Viewer
    web/models/meta.json         – Pfade (Nervenbahnen), Marker-Anker, Statistik
    web/img/render.jpg           – Cycles-Rendering (Vorschaubild)
    web/icons/icon-*.png         – App-Icons (PWA) aus einem zweiten Rendering
"""
import bpy, bmesh, math, json, os, sys, time
import numpy as np
from mathutils import Vector, noise

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "--no-render" not in ARGS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB_PATH = os.path.join(ROOT, "web/models/brain.glb")
META_PATH = os.path.join(ROOT, "web/models/meta.json")
BLEND_PATH = os.path.join(ROOT, "blender/brain.blend")
RENDER_PATH = os.path.join(ROOT, "web/img/render.jpg")
ICON_DIR = os.path.join(ROOT, "web/icons")
for p in (GLB_PATH, BLEND_PATH, RENDER_PATH, ICON_DIR + "/x"):
    os.makedirs(os.path.dirname(p), exist_ok=True)

HEMI_SUBDIV = 8          # Blender-5-Zählung: Stufe 8 = 163 842 Vertices pro Hemisphäre (vor Decimate)
HEMI_DECIMATE = 0.5
CEREB_SUBDIV = 7


def log(*a):
    print(f"[brain {time.time() - T0:6.1f}s]", *a, flush=True)


# --------------------------------------------------------------------------------------
# Szene leeren
# --------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 0.01


# --------------------------------------------------------------------------------------
# Hilfsfunktionen
# --------------------------------------------------------------------------------------
def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


MATS = {}


def make_mat(name, hexcol, rough=0.5, sss=0.0, alpha=1.0, emit=0.0, coat=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = m.node_tree.nodes.get("Principled BSDF")
    col = srgb(hexcol)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.25)
        b.inputs["Subsurface Scale"].default_value = 0.25
    if coat:
        b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*col, 1)
        b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            pass
    m.diffuse_color = (*col, alpha)
    MATS[name] = m
    return m


COLL = {}


def coll(name):
    if name not in COLL:
        c = bpy.data.collections.new(name)
        scene.collection.children.link(c)
        COLL[name] = c
    return COLL[name]


def vertex_normals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])  # flächengewichtet
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    return N


def make_object(name, V, F, mat, collection, normals=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(np.asarray(V, dtype=np.float64).tolist(), [], np.asarray(F, dtype=np.int64).tolist())
    me.update(calc_edges=True)
    me.validate()
    me.shade_smooth()
    if normals is not None:
        try:
            me.normals_split_custom_set_from_vertices([tuple(n) for n in normals])
        except Exception as e:  # ältere API
            log("custom normals failed:", e)
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    coll(collection).objects.link(o)
    return o


def icosphere(subdiv):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.index_update()
    V = np.array([v.co[:] for v in bm.verts], dtype=np.float64)
    F = np.array([[v.index for v in f.verts] for f in bm.faces], dtype=np.int64)
    bm.free()
    return V, F


# ---- SDF-Bausteine (numpy, vektorisiert) ----
def sd_ell(P, c, r):
    q = (P - np.asarray(c)) / np.asarray(r)
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / np.asarray(r), axis=1) + 1e-9
    return k0 * (k0 - 1.0) / k1


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def project(sdf, center, dirs, tmax=14.0, step=0.04):
    """Erster Nulldurchgang der SDF entlang Strahlen vom Zentrum (sternförmige Projektion)."""
    c = np.asarray(center, dtype=np.float64)
    n = len(dirs)
    t_hit = np.full(n, tmax)
    prev = np.zeros(n)
    found = np.zeros(n, dtype=bool)
    t = step
    while t <= tmax and not found.all():
        idx = np.nonzero(~found)[0]
        d = sdf(c + dirs[idx] * t)
        hit = d > 0
        hi = idx[hit]
        t_hit[hi] = t
        found[hi] = True
        t += step
    lo = np.maximum(t_hit - step, 0.0)
    hi = t_hit.copy()
    for _ in range(18):
        mid = 0.5 * (lo + hi)
        d = sdf(c + dirs * mid[:, None])
        out = d > 0
        hi = np.where(out, mid, hi)
        lo = np.where(out, lo, mid)
    return c + dirs * (0.5 * (lo + hi))[:, None]


# --------------------------------------------------------------------------------------
# Großhirn: Form, Furchen (Sulci), Lappen
# --------------------------------------------------------------------------------------
# Leitlinien (lokale Koordinaten einer rechten Hemisphäre, x >= 0)
def y_central(z):          # Sulcus centralis: von oben-hinten nach unten-vorn (oben knapp hinter der Mitte, Stirnlappen ≈ 39 % der Oberfläche)
    return 1.0 - 0.42 * (z - 1.0) + 0.25 * np.sin(z * 2.1)


def z_lateral(y):          # Sulcus lateralis (Sylvische Furche)
    return -0.9 + 0.32 * (2.5 - y)


def y_occipital(z):        # Sulcus parietooccipitalis / Incisura praeoccipitalis
    return -5.2 - 0.06 * z


def hemi_sdf(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    d = sd_ell(P, (3.3, -0.1, 0.9), (3.45, 8.35, 4.85))
    d = smin(d, sd_ell(P, (3.0, 4.6, 0.2), (2.7, 3.4, 3.0)), 2.2)      # Stirnpol, sanft verschmolzen
    d = smin(d, sd_ell(P, (4.2, 0.0, -1.8), (2.5, 4.4, 2.0)), 1.0)      # Schläfenlappen
    d = smin(d, sd_ell(P, (2.7, -6.1, 0.6), (2.6, 2.6, 3.0)), 1.0)      # Hinterhauptspol
    d = smax(d, 0.12 - x, 0.5)                                          # Fissura longitudinalis
    w = sstep(-2.5, -4.5, y)                                            # Tentorium (Kleinhirnzelt)
    tent = (-1.95 + 0.1 * (y + 5.0)) - z
    d = smax(d, tent * w + (w - 1.0) * 5.0, 0.4)
    wo = sstep(2.5, 4.0, y) * sstep(3.6, 2.0, x)                          # Orbitadach
    d = smax(d, ((-2.55) - z) * wo + (wo - 1.0) * 5.0, 0.5)
    return d


def sulcus_depth(p, seed):
    """Verschiebung entlang der Normalen (negativ = Furche). p = lokale Koordinaten."""
    x, y, z = p
    v = Vector(p)
    warp = noise.noise_vector(v * 0.33 + Vector((seed, seed * 0.7, -seed)))
    q = v + warp * 1.25
    n1 = noise.noise(q * 0.8)
    n2 = noise.noise(q * 1.45 + Vector((7.7, 1.3, seed)))
    s1 = math.exp(-(n1 / 0.15) ** 2)
    s2 = math.exp(-(n2 / 0.10) ** 2)
    dC = y - float(y_central(z))
    dL = z - float(z_lateral(y))
    # Zentralregion: lange, parallele Windungen (Gyrus prae-/postcentralis)
    calm = math.exp(-(dC / 1.75) ** 4) if dL > 0.3 else 0.0
    rnd = max(0.52 * s1, 0.2 * s2) * (1.0 - 0.85 * calm)
    sC = 0.7 * math.exp(-(dC / 0.2) ** 2) * (1.0 if dL > -0.2 else 0.0)
    sPre = 0.45 * math.exp(-((dC - 1.5) / 0.17) ** 2) * (1.0 if dL > 0.4 else 0.0) * (1.0 if z < 5.1 else 0.6)
    sPost = 0.42 * math.exp(-((dC + 1.45) / 0.17) ** 2) * (1.0 if dL > 0.4 else 0.0)
    lat_on = (1.0 if -4.2 < y < 4.6 else math.exp(-((abs(y) - 4.4) / 0.6) ** 2)) * min(1.0, max(0.0, (x - 1.6) / 1.2))
    sL = 1.1 * math.exp(-(dL / 0.28) ** 2) * lat_on
    medial = min(1.0, max(0.35, (x - 0.15) / 0.8))
    bulge = 0.1 * (1.0 - s1)
    return (bulge - max(rnd, sC, sPre, sPost, sL)) * medial


REGION_NAMES = ["Frontal", "Parietal", "Temporal", "Okzipital", "Motor", "Somato", "Hoer", "Broca", "Wernicke"]


def _ell(u, v, cu, cv, ru, rv):
    return ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 < 1.0


def region_of(p, left):
    x, y, z = p
    dC = y - float(y_central(z))
    zl = float(z_lateral(y))
    if y < float(y_occipital(z)):
        return "Okzipital"
    temporal = z < zl and y > -5.6 and not (y > 2.6 and x < 2.6)
    if temporal:
        # Hörrinde (Heschl-Querwindungen): schräges Oval auf der oberen Schläfenwindung, dicht unter der Sylvischen Furche
        if x > 3.0 and _ell(y, z - zl, -0.5, -0.6, 2.1, 0.72):
            return "Hoer"
        # Wernicke-Areal: hinterer Teil der oberen Schläfenwindung
        if left and x > 3.0 and _ell(y, z - zl, -3.5, -0.9, 1.4, 1.0):
            return "Wernicke"
        return "Temporal"
    if dC > 0:
        if dC < 1.5 and z > zl + 0.35:
            return "Motor"
        # Broca-Areal: unterer Stirnwindungsbereich über dem vorderen Ende der Sylvischen Furche
        if left and x > 3.0 and _ell(y, z - zl, 3.4, 1.0, 1.5, 1.05):
            return "Broca"
        return "Frontal"
    if dC > -1.45 and z > zl + 0.35:
        return "Somato"
    return "Parietal"


SUB_AREAS = {"Motor": "Frontal", "Broca": "Frontal", "Somato": "Parietal", "Hoer": "Temporal", "Wernicke": "Temporal"}
LOBES = ("Frontal", "Parietal", "Temporal", "Okzipital")
SNAP_AREAS = ("Broca", "Hoer", "Wernicke")   # Motor/Somato liegen schon zwischen den eingeprägten Furchen
GROOVE_DEPTH = 0.25        # ab dieser Tiefe (cm) gilt eine Fläche als Furche
SNAP_KEEP = (0.6, 1.8)     # Sicherung: ein Areal darf beim Anlehnen an die Furchen nur so viel schrumpfen/wachsen


def lobe_name(r):
    return SUB_AREAS.get(r, r)


def face_pairs(F):
    """Paare benachbarter Dreiecke (gemeinsame Kante)."""
    nF = len(F)
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    fid = np.tile(np.arange(nF), 3)
    e.sort(axis=1)
    key = e[:, 0].astype(np.int64) * (int(F.max()) + 1) + e[:, 1]
    o = np.argsort(key, kind="stable")
    ks, fs = key[o], fid[o]
    same = ks[1:] == ks[:-1]
    return fs[:-1][same], fs[1:][same]


def components(n, a, b):
    """Zusammenhangskomponenten eines Graphen mit n Knoten und Kanten (a, b); Label = kleinster Knotenindex."""
    lab = np.arange(n)
    while True:
        m = np.minimum(lab[a], lab[b])
        new = lab.copy()
        np.minimum.at(new, a, m)
        np.minimum.at(new, b, m)
        new = new[new]
        if np.array_equal(new, lab):
            return lab
        lab = new


def snap_regions(reg, F, sd):
    """Lehnt die Grenzen der Funktionsareale an die Furchen an.
    Die Fläche wird an den Furchen (sd < -GROOVE_DEPTH) in Windungsstücke zerlegt; ein Stück gehört zum Areal,
    wenn mindestens die Hälfte seiner Dreiecke im (glatten) Areal liegt. Dreiecke in den Furchen übernehmen
    anschließend die Mehrheit ihrer Nachbarn. Schrumpft/wächst ein Areal dabei zu stark, bleibt es unverändert."""
    reg = np.array(reg, dtype=object)
    nF = len(F)
    a, b = face_pairs(F)
    lobe = np.array([lobe_name(r) for r in reg], dtype=object)
    groove = sd[F].min(axis=1) < -GROOVE_DEPTH
    ok = (~groove[a]) & (~groove[b]) & (lobe[a] == lobe[b])
    comp = components(nF, a[ok], b[ok])
    _, cid = np.unique(comp, return_inverse=True)
    k = int(cid.max()) + 1
    info = {"furchenanteil": float(groove.mean()), "stuecke": int(np.count_nonzero(np.bincount(cid) > 1))}
    for S in SNAP_AREAS:
        L = SUB_AREAS[S]
        before = reg == S
        if not before.any():
            continue
        in_s = np.bincount(cid, weights=before.astype(float), minlength=k)
        in_l = np.bincount(cid, weights=(lobe == L).astype(float), minlength=k)
        patch_in = (in_s / np.maximum(in_l, 1.0)) >= 0.5
        free = before | (reg == L)
        after = (patch_in[cid] & ~groove & free) | (before & groove)
        ratio = after.sum() / before.sum()
        info[S] = round(float(ratio), 2)
        if SNAP_KEEP[0] <= ratio <= SNAP_KEEP[1]:
            reg[before & ~after] = L
            reg[after & ~before] = S
        else:
            log(f"Areal {S}: Anlehnen an Furchen verworfen (Flächenverhältnis {ratio:.2f})")
    # Ränder glätten: Dreiecke in Furchen übernehmen die Mehrheit ihrer drei Nachbarn (nur innerhalb desselben Lappens)
    src = np.concatenate([a, b]); dst = np.concatenate([b, a])
    o = np.argsort(src, kind="stable"); src, dst = src[o], dst[o]
    rank = np.arange(len(src)) - np.searchsorted(src, np.arange(nF))[src]
    nb = np.full((nF, 3), -1)
    m = rank < 3
    nb[src[m], rank[m]] = dst[m]
    valid = (nb >= 0).all(axis=1)
    nb = np.where(nb < 0, 0, nb)
    code = {n: i for i, n in enumerate(REGION_NAMES)}
    c = np.array([code[r] for r in reg])
    lobe_of_code = np.array([code[lobe_name(n)] for n in REGION_NAMES])
    for _ in range(2):
        n0, n1, n2 = c[nb[:, 0]], c[nb[:, 1]], c[nb[:, 2]]
        maj = np.where(n0 == n1, n0, np.where(n0 == n2, n0, np.where(n1 == n2, n1, c)))
        change = groove & valid & (maj != c) & (lobe_of_code[maj] == lobe_of_code[c])
        c = np.where(change, maj, c)
    names = np.array(REGION_NAMES, dtype=object)
    return names[c], info


def lobe_caps(V, F, reg):
    """Schnittflächen der Lappen: Die Lappen sind offene Schalen. Jede Randschleife (zu den Nachbarlappen) wird mit
    einem Dreiecksfächer zum Schwerpunkt der Schleife geschlossen. Rückgabe: {Lappen: (Vertices, Dreiecke)}."""
    out = {}
    lobe = np.array([lobe_name(r) for r in reg], dtype=object)
    nv = int(F.max()) + 1
    for L in LOBES:
        fl = F[lobe == L]
        if len(fl) == 0:
            continue
        d = np.concatenate([fl[:, [0, 1]], fl[:, [1, 2]], fl[:, [2, 0]]])
        key = d[:, 0].astype(np.int64) * nv + d[:, 1]
        rkey = d[:, 1].astype(np.int64) * nv + d[:, 0]
        bd = d[~np.isin(rkey, key)]                      # gerichtete Randkanten a→b
        if len(bd) == 0:
            continue
        verts, inv = np.unique(bd, return_inverse=True)
        inv = inv.reshape(-1, 2)
        comp = components(len(verts), inv[:, 0], inv[:, 1])
        ucomp, cidx = np.unique(comp, return_inverse=True)
        edge_comp = cidx[inv[:, 0]]
        Vr = V[verts]
        apex = np.array([Vr[cidx == i].mean(axis=0) for i in range(len(ucomp))])
        cnt = np.bincount(edge_comp, minlength=len(ucomp))
        keep = cnt[edge_comp] >= 4
        if not keep.any():
            continue
        tri = np.stack([inv[keep, 1], inv[keep, 0], len(verts) + edge_comp[keep]], axis=1)   # b, a, Spitze
        out[L] = (np.vstack([Vr, apex]), tri)
    return out


LOBE_COLORS = {
    "Frontal": "#e9a23b", "Parietal": "#5aa7d8", "Temporal": "#79c27c", "Okzipital": "#de6f8e",
}
REGION_LOBE = {"Motor": "Frontal", "Broca": "Frontal", "Somato": "Parietal", "Hoer": "Temporal", "Wernicke": "Temporal"}

ANCHORS = {}
STATS = {}


def build_hemisphere(side):
    """side = +1 rechts, -1 links"""
    left = side < 0
    tag = "L" if left else "R"
    seed = 3.7 if left else 11.3
    D, F = icosphere(HEMI_SUBDIV)
    P = project(hemi_sdf, (3.2, -0.3, 0.6), D)
    N0 = vertex_normals(P, F)
    disp = np.array([sulcus_depth(tuple(p), seed) for p in P])
    P = P + N0 * disp[:, None]
    log(f"Hemisphäre {tag}: {len(P)} Vertices, Furchen eingeprägt")

    # Decimate in Blender (Qualitätserhaltend), danach zurück in numpy
    P_world = P * np.array([side, 1, 1])
    F_w = F if side > 0 else F[:, ::-1]
    tmp = make_object("tmp_" + tag, P_world, F_w, make_mat("tmp", "#888888"), "tmp")
    mod = tmp.modifiers.new("dec", "DECIMATE")
    mod.ratio = HEMI_DECIMATE
    mod.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    V = np.zeros(len(me2.vertices) * 3)
    me2.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    L = np.zeros(len(me2.loops), dtype=np.int64)
    me2.loops.foreach_get("vertex_index", L)
    F2 = L.reshape(-1, 3)
    bpy.data.objects.remove(tmp)
    bpy.data.meshes.remove(me2)
    N = vertex_normals(V, F2)
    log(f"Hemisphäre {tag}: decimiert auf {len(V)} Vertices / {len(F2)} Dreiecke")

    loc = V * np.array([side, 1, 1])
    cent = loc[F2].mean(axis=1)
    reg = np.array([region_of(tuple(c), left) for c in cent])
    reg, snap = snap_regions(reg, F2, hemi_sdf(loc))   # Areal-Grenzen folgen den Furchen
    log(f"Hemisphäre {tag}: Areale an Furchen angelehnt {snap}")
    out = {}
    for rn in REGION_NAMES:
        sel = np.nonzero(reg == rn)[0]
        if len(sel) == 0:
            continue
        fsub = F2[sel]
        used, inv = np.unique(fsub.ravel(), return_inverse=True)
        lobe = REGION_LOBE.get(rn, rn)
        name = f"{rn}_{tag}"
        mat = make_mat(lobe, LOBE_COLORS[lobe], rough=0.55, sss=0.12)
        o = make_object(name, V[used], inv.reshape(-1, 3), mat, "Grosshirn", normals=N[used])
        out[rn] = o
        # Marker-Anker: Oberflächenpunkt, der am weitesten in Richtung "Region-Schwerpunkt" zeigt
        vv = V[used]
        c = vv.mean(axis=0)
        dirv = c - np.array([0, -0.5, 0.5])
        dirv /= np.linalg.norm(dirv) + 1e-9
        ANCHORS[name] = vv[np.argmax(vv @ dirv)].tolist()
    # Schnittflächen der Lappen (für die Explosion einzelner Lappen); im Viewer nur bei der Explosion sichtbar
    mark = make_mat("Mark", "#efe6da", rough=0.7, sss=0.1)
    ncap = 0
    for lobe_n, (Vc, Fc) in lobe_caps(V, F2, reg).items():
        oc = make_object(f"{lobe_n}_{tag}_Kappe", Vc, Fc, mark, "Grosshirn", normals=vertex_normals(Vc, Fc))
        oc.hide_render = True
        ncap += 1
    log(f"Hemisphäre {tag}: {ncap} Schnittflächen")
    STATS["hemi_" + tag] = int(len(F2))
    return out


# --------------------------------------------------------------------------------------
# Kleinhirn
# --------------------------------------------------------------------------------------
def cereb_sdf(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    d = smin(sd_ell(P, (2.25, -5.7, -4.15), (2.9, 2.9, 2.0)), sd_ell(P, (-2.25, -5.7, -4.15), (2.9, 2.9, 2.0)), 0.8)
    d = smin(d, sd_ell(P, (0, -5.9, -4.0), (1.3, 2.6, 1.95)), 0.6)
    top = -2.05 + 0.1 * (y + 5.0)
    d = smax(d, z - top, 0.5)
    ax = np.sqrt(x ** 2 + (y + 2.35) ** 2)
    d = smax(d, (1.35 - ax) * sstep(-0.5, -1.5, z) + (sstep(-0.5, -1.5, z) - 1) * 5, 0.4)  # Hirnstamm-Kerbe
    return d


def build_cerebellum():
    D, F = icosphere(CEREB_SUBDIV)
    P = project(cereb_sdf, (0, -6.0, -4.1), D)
    N0 = vertex_normals(P, F)
    disp = np.empty(len(P))
    for i, (x, y, z) in enumerate(P):
        # Folia: quer verlaufende, leicht gebogene Bänder (Höhenlinien einer gewölbten Fläche)
        w = noise.noise(Vector((x * 0.45, y * 0.45, z * 0.45)))
        f = z + 0.09 * (y + 5.4) ** 2 + 0.06 * x * x + 0.18 * w
        g = 0.5 * (math.sin(f * 2 * math.pi / 0.36) + 1.0)
        fol = 0.17 * math.exp(-(g / 0.16) ** 2)
        prima = 0.34 * math.exp(-((f + 2.35) / 0.06) ** 2) * (1.0 if y > -6.0 else 0.0)
        horiz = 0.34 * math.exp(-((f + 3.75) / 0.06) ** 2)
        vermis = 0.35 * math.exp(-(x / 0.55) ** 2) * (1.0 if y < -6.3 else 0.0)
        disp[i] = 0.03 - max(fol, prima, horiz, vermis)
    P = P + N0 * disp[:, None]
    N = vertex_normals(P, F)
    o = make_object("Kleinhirn", P, F, make_mat("Kleinhirn", "#a98ad8", rough=0.55, sss=0.12), "Kleinhirn", normals=N)
    ANCHORS["Kleinhirn"] = P[np.argmax(P @ np.array([0.45, -0.75, -0.2]))].tolist()
    STATS["kleinhirn"] = int(len(F))
    return o


# --------------------------------------------------------------------------------------
# Röhren (Sweep entlang Catmull-Rom-Kurve) und Blobs
# --------------------------------------------------------------------------------------
def catmull(points, samples):
    P = np.asarray(points, dtype=np.float64)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    segs = len(points) - 1
    for i in range(samples):
        u = i / (samples - 1) * segs
        k = min(int(u), segs - 1)
        t = u - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return np.array(out)


def lerp_profile(vals, samples):
    vals = np.asarray(vals, dtype=np.float64)
    xs = np.linspace(0, 1, len(vals))
    return np.interp(np.linspace(0, 1, samples), xs, vals)


def tube(points, a, b=None, samples=80, ring=28, ref=(1, 0, 0), dome=0.8):
    """Röhre mit elliptischem Querschnitt (Halbachsen a entlang ref, b senkrecht), runde Enden."""
    C = catmull(points, samples)
    as_list = lambda r: list(r) if np.ndim(r) else [r, r]
    A = lerp_profile(as_list(a), samples)
    B = lerp_profile(as_list(b if b is not None else a), samples)
    T = np.gradient(C, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    refv = np.asarray(ref, dtype=np.float64)
    V = []
    ang = np.linspace(0, 2 * math.pi, ring, endpoint=False)
    for i in range(samples):
        r = refv if abs(np.dot(refv, T[i])) < 0.95 else np.array([0.0, 0.0, 1.0])
        u = r - np.dot(r, T[i]) * T[i]
        u /= np.linalg.norm(u)
        v = np.cross(T[i], u)
        for t in ang:
            V.append(C[i] + A[i] * math.cos(t) * u + B[i] * math.sin(t) * v)
    F = []
    for i in range(samples - 1):
        for j in range(ring):
            a0, a1 = i * ring + j, i * ring + (j + 1) % ring
            b0, b1 = a0 + ring, a1 + ring
            F += [(a0, b0, b1), (a0, b1, a1)]
    s = len(V)
    V.append(C[0] - T[0] * min(A[0], B[0]) * dome)
    V.append(C[-1] + T[-1] * min(A[-1], B[-1]) * dome)
    for j in range(ring):
        o = (samples - 1) * ring
        F.append((s, (j + 1) % ring, j))
        F.append((s + 1, o + j, o + (j + 1) % ring))
    return np.array(V), np.array(F), C


def blob(center, radii, subdiv=4, amp=0.04, freq=1.5, seed=0.0):
    D, F = icosphere(subdiv)
    P = np.asarray(center) + D * np.asarray(radii)
    n = np.array([noise.noise(Vector(tuple(d * freq + seed))) for d in D])
    N = vertex_normals(P, F)
    P = P + N * (amp * n)[:, None]
    return P, F


def add(name, VF, mat, collection, anchor=None):
    V, F = VF[0], VF[1]
    o = make_object(name, V, F, mat, collection, normals=vertex_normals(np.asarray(V), np.asarray(F)))
    ANCHORS[name] = list(anchor) if anchor is not None else np.asarray(V).mean(axis=0).tolist()
    return o


def merge(*parts):
    Vs, Fs, off = [], [], 0
    for V, F in parts:
        Vs.append(V)
        Fs.append(F + off)
        off += len(V)
    return np.vstack(Vs), np.vstack(Fs)


def mirror(pts):
    return [(-p[0], p[1], p[2]) for p in pts]


# --------------------------------------------------------------------------------------
# Aufbau
# --------------------------------------------------------------------------------------
log("Großhirn …")
build_hemisphere(-1)
build_hemisphere(+1)
log("Kleinhirn …")
build_cerebellum()

log("Hirnstamm, Zwischenhirn, limbisches System …")
M = {
    "stem": make_mat("Hirnstamm", "#e3cfa6", rough=0.6, sss=0.1),
    "cord": make_mat("Rueckenmark", "#efe2c4", rough=0.6, sss=0.1),
    "cc": make_mat("Balken", "#f4efe4", rough=0.5, sss=0.1),
    "thal": make_mat("Thalamus", "#f2c450", rough=0.5, sss=0.1),
    "hypo": make_mat("Hypothalamus", "#ff9fb8", rough=0.5, sss=0.1),
    "pit": make_mat("Hypophyse", "#e9709a", rough=0.45, sss=0.1),
    "pin": make_mat("Epiphyse", "#c7e36a", rough=0.45),
    "hip": make_mat("Hippocampus", "#ff8a5c", rough=0.5, sss=0.1),
    "amy": make_mat("Amygdala", "#ff5c5c", rough=0.5, sss=0.1),
    "bg": make_mat("Basalganglien", "#c79a6e", rough=0.55, sss=0.1),
    "vent": make_mat("Liquor", "#62cdf5", rough=0.15, alpha=0.6),
    "opt": make_mat("Sehbahn", "#ffe066", rough=0.45, emit=0.15),
    "rad": make_mat("Sehstrahlung", "#ffd23f", rough=0.45, emit=0.1),
    "eye": make_mat("Auge", "#f3f1ea", rough=0.25, coat=0.6),
    "iris": make_mat("Iris", "#2f7fc1", rough=0.3, coat=0.8),
}

# Hirnstamm
V, F, _ = tube([(0, -1.3, -0.4), (0, -1.6, -1.4), (0, -1.75, -2.4)], [1.0, 1.05, 1.0], [0.75, 0.8, 0.8], samples=40)
add("Mittelhirn", (V, F), M["stem"], "Hirnstamm", anchor=[0.0, -1.0, -1.4])
V, F = blob((0, -1.5, -3.25), (1.45, 1.15, 1.15), subdiv=5, amp=0.0)
z = V[:, 2]
Nn = vertex_normals(V, F)
V = V + Nn * (0.025 * np.sin(z * 22.0))[:, None]  # quer verlaufende Faserzüge
add("Bruecke", (V, F), M["stem"], "Hirnstamm", anchor=[0.0, -0.4, -3.25])
V, F, _ = tube([(0, -2.0, -3.7), (0, -2.15, -4.7), (0, -2.3, -5.8), (0, -2.35, -6.6)], [0.95, 0.85, 0.65, 0.55], [0.8, 0.72, 0.55, 0.5], samples=50)
oliv = [blob((s * 0.55, -1.55, -5.0), (0.22, 0.2, 0.55), subdiv=3, amp=0.0) for s in (-1, 1)]
add("Medulla", merge((V, F), *oliv), M["stem"], "Hirnstamm", anchor=[0.0, -1.4, -5.2])
V, F, _ = tube([(0, -2.35, -6.4), (0, -2.4, -8.0), (0, -2.4, -10.2)], [0.55, 0.52, 0.5], [0.45, 0.42, 0.4], samples=40)
add("Rueckenmark", (V, F), M["cord"], "Hirnstamm", anchor=[0.0, -2.0, -9.4])

# Balken (Corpus callosum) – C-förmig in der Mittelebene
cc_pts = [(0, 2.7, -0.3), (0, 3.55, 0.6), (0, 3.1, 1.65), (0, 1.6, 2.15), (0, -1.0, 2.25), (0, -3.1, 1.75), (0, -4.0, 0.95), (0, -3.6, 0.55)]
V, F, _ = tube(cc_pts, [0.9, 1.4, 1.5, 1.5, 1.5, 1.55, 1.5, 1.0], [0.22, 0.4, 0.33, 0.25, 0.25, 0.32, 0.5, 0.3], samples=120, ring=32)
add("Balken", (V, F), M["cc"], "Zwischenhirn", anchor=[0.0, -0.5, 2.5])

# Zwischenhirn
for s, tag in ((-1, "L"), (1, "R")):
    add(f"Thalamus_{tag}", blob((s * 0.85, -0.9, -0.2), (0.75, 1.5, 0.85), subdiv=4, amp=0.04, seed=s), M["thal"], "Zwischenhirn")
add("Hypothalamus", blob((0, 0.75, -1.3), (0.55, 0.8, 0.5), subdiv=4, amp=0.03), M["hypo"], "Zwischenhirn")
stalk = tube([(0, 0.95, -1.6), (0, 1.25, -2.3), (0, 1.4, -2.75)], 0.13, samples=16, ring=14)[:2]
gland = blob((0, 1.45, -3.0), (0.5, 0.42, 0.33), subdiv=4, amp=0.02)
add("Hypophyse", merge(stalk, gland), M["pit"], "Zwischenhirn", anchor=[0.0, 1.45, -3.1])
add("Epiphyse", blob((0, -2.55, 0.05), (0.2, 0.33, 0.2), subdiv=3, amp=0.01), M["pin"], "Zwischenhirn")

# Ventrikelsystem (Liquorräume)
vent_pts = [(0.75, 3.0, 0.5), (0.85, 1.6, 1.15), (0.95, -0.6, 1.3), (1.15, -2.6, 1.1), (1.7, -3.7, 0.5), (2.25, -3.3, -0.4), (2.55, -1.6, -1.35), (2.6, 0.5, -1.75)]
vent_a = [0.3, 0.32, 0.28, 0.3, 0.45, 0.32, 0.22, 0.2]
vent_b = [0.6, 0.45, 0.35, 0.38, 0.5, 0.32, 0.2, 0.18]
post_horn = [(1.55, -3.6, 0.55), (1.6, -4.6, 0.55), (1.45, -5.4, 0.5)]
for s, tag in ((-1, "L"), (1, "R")):
    pts = vent_pts if s > 0 else mirror(vent_pts)
    ph = post_horn if s > 0 else mirror(post_horn)
    a = tube(pts, vent_a, vent_b, samples=90, ring=22, ref=(0, 0, 1))[:2]
    b = tube(ph, [0.35, 0.25, 0.1], [0.3, 0.22, 0.1], samples=20, ring=18, ref=(0, 0, 1))[:2]
    add(f"Seitenventrikel_{tag}", merge(a, b), M["vent"], "Ventrikel")
add("Ventrikel_3", blob((0, -0.6, -0.4), (0.13, 1.45, 0.75), subdiv=3, amp=0.0), M["vent"], "Ventrikel")
aq = tube([(0, -1.9, -0.9), (0, -2.15, -1.9), (0, -2.55, -2.9)], 0.07, samples=16, ring=10)[:2]
v4 = blob((0, -3.05, -3.7), (0.65, 0.35, 0.6), subdiv=3, amp=0.0)
add("Ventrikel_4", merge(aq, v4), M["vent"], "Ventrikel", anchor=[0.0, -3.05, -3.7])

# Basalganglien (Striatum: Nucleus caudatus + Putamen)
caud = [(1.25, 2.9, 0.75), (1.4, 1.1, 1.35), (1.55, -1.4, 1.35), (2.0, -3.2, 0.65), (2.55, -2.7, -0.6)]
for s, tag in ((-1, "L"), (1, "R")):
    pts = caud if s > 0 else mirror(caud)
    c = tube(pts, [0.62, 0.45, 0.3, 0.2, 0.13], samples=60, ring=18)[:2]
    pu = blob((s * 2.45, 0.6, 0.15), (0.55, 1.65, 1.0), subdiv=4, amp=0.03, seed=2 + s)
    add(f"Basalganglien_{tag}", merge(c, pu), M["bg"], "Zwischenhirn", anchor=[s * 2.45, 0.6, 0.15])

# Limbisches System: Hippocampus (+ Fornix), Amygdala
hip = [(2.5, 1.5, -2.15), (2.62, 0.1, -1.9), (2.45, -1.6, -1.3), (2.05, -3.0, -0.35)]
fornix = [(2.05, -3.0, -0.35), (1.25, -3.35, 0.65), (0.45, -2.0, 1.15), (0.3, 0.4, 0.95), (0.3, 1.35, -0.35)]
for s, tag in ((-1, "L"), (1, "R")):
    h = tube(hip if s > 0 else mirror(hip), [0.58, 0.42, 0.34, 0.24], [0.42, 0.32, 0.28, 0.2], samples=50, ring=22, ref=(0, 0, 1))[:2]
    f = tube(fornix if s > 0 else mirror(fornix), 0.15, 0.1, samples=60, ring=12)[:2]
    add(f"Hippocampus_{tag}", merge(h, f), M["hip"], "Limbisch", anchor=[s * 2.6, 0.6, -2.0])
    add(f"Amygdala_{tag}", blob((s * 2.3, 2.3, -2.2), (0.55, 0.6, 0.5), subdiv=4, amp=0.03, seed=5 + s), M["amy"], "Limbisch")

# Sehbahn: Augen, Sehnerven, Chiasma, Tractus opticus, Corpus geniculatum laterale, Sehstrahlung
EYE = {"L": (-3.1, 7.0, -4.3), "R": (3.1, 7.0, -4.3)}
LGN = {"L": (-2.0, -1.3, -0.9), "R": (2.0, -1.3, -0.9)}
OCC = {"L": (-1.6, -7.4, 0.3), "R": (1.6, -7.4, 0.3)}
CHI = (0.0, 2.4, -2.4)
opt_parts = []
for tag, s in (("L", -1), ("R", 1)):
    ex, ey, ez = EYE[tag]
    eye = blob(EYE[tag], (1.2, 1.2, 1.2), subdiv=4, amp=0.0)
    iris = blob((ex, ey + 1.1, ez), (0.55, 0.16, 0.55), subdiv=3, amp=0.0)
    add(f"Auge_{tag}", eye, M["eye"], "Sehbahn")
    add(f"Iris_{tag}", iris, M["iris"], "Sehbahn")
    opt_parts.append(tube([(ex, ey - 1.0, ez + 0.2), (s * 2.6, 5.4, -3.6), (s * 1.3, 3.5, -2.7), (s * 0.3, 2.5, -2.42)], 0.2, samples=40, ring=14)[:2])
    opt_parts.append(tube([(s * 0.3, 2.3, -2.38), (s * 1.3, 1.0, -2.0), (s * 1.9, -0.4, -1.4), LGN[tag]], 0.14, 0.11, samples=40, ring=12)[:2])
    opt_parts.append(blob(LGN[tag], (0.28, 0.35, 0.22), subdiv=3, amp=0.0))
    rad = []
    for k, (dz, dx) in enumerate(((-0.25, 0.0), (0.2, 0.15), (0.6, 0.0))):
        rad.append(tube([LGN[tag], (s * 2.9, -2.4, -0.6 + dz), (s * 2.6, -4.6, 0.1 + dz), (OCC[tag][0] + s * dx, OCC[tag][1], OCC[tag][2] + dz)], 0.08, samples=50, ring=10)[:2])
    add(f"Sehstrahlung_{tag}", merge(*rad), M["rad"], "Sehbahn", anchor=[s * 2.8, -3.8, 0.3])
opt_parts.append(blob(CHI, (0.55, 0.3, 0.12), subdiv=3, amp=0.0))
add("Sehnerv", merge(*opt_parts), M["opt"], "Sehbahn", anchor=list(CHI))

# --------------------------------------------------------------------------------------
# Pfade für die Signal-Animation im Viewer
# --------------------------------------------------------------------------------------
def path_seh(e, l):
    ex, ey, ez = EYE[e]
    s = -1 if l == "L" else 1
    cross = 0.0 if e != l else (-0.35 if l == "L" else 0.35)
    return [(ex, ey + 1.3, ez), (ex, ey, ez), (ex, ey - 1.0, ez + 0.2), ((ex * 0.85), 5.4, -3.6), (ex * 0.42, 3.5, -2.7), (cross, 2.4, -2.4),
            (s * 1.3, 1.0, -2.0), (s * 1.9, -0.4, -1.4), LGN[l], (s * 2.9, -2.4, -0.4), (s * 2.6, -4.6, 0.3), OCC[l]]


def path_motor(s):
    return [(s * 2.7, -0.15, 5.0), (s * 2.3, 0.0, 3.2), (s * 1.9, 0.2, 1.0), (s * 0.65, -1.4, -1.5), (s * 0.5, -1.55, -3.3),
            (s * 0.35, -2.05, -5.2), (0.0, -2.25, -6.2), (-s * 0.28, -2.35, -7.0), (-s * 0.3, -2.4, -9.8)]


def path_hoer(s):
    return [(s * 6.9, -0.6, -3.3), (s * 1.0, -2.1, -4.2), (s * 0.55, -2.35, -2.6), (s * 0.5, -2.4, -1.5), (s * 1.7, -1.8, -0.8),
            (s * 3.3, -1.0, -0.4), (s * 4.7, -0.6, -0.2)]


PATHS = {
    "seh_LL": path_seh("L", "L"), "seh_LR": path_seh("L", "R"), "seh_RR": path_seh("R", "R"), "seh_RL": path_seh("R", "L"),
    "motor_L": path_motor(-1), "motor_R": path_motor(1),
    "hoer_L": path_hoer(-1), "hoer_R": path_hoer(1),
    "sprache": [(-5.3, -3.3, 0.3), (-5.2, -4.0, 1.6), (-5.0, -2.2, 2.6), (-5.0, 0.6, 2.2), (-5.2, 2.2, 1.0), (-5.4, 2.9, 0.1)],
    "gedaechtnis_L": [(-2.5, 1.5, -2.15), (-2.62, 0.1, -1.9), (-2.45, -1.6, -1.3), (-2.05, -3.0, -0.35), (-1.25, -3.35, 0.65), (-0.45, -2.0, 1.15), (-0.3, 0.4, 0.95), (-0.3, 1.35, -0.35), (-0.4, 0.3, -1.3), (-0.85, -0.9, -0.2)],
    "gedaechtnis_R": [(2.5, 1.5, -2.15), (2.62, 0.1, -1.9), (2.45, -1.6, -1.3), (2.05, -3.0, -0.35), (1.25, -3.35, 0.65), (0.45, -2.0, 1.15), (0.3, 0.4, 0.95), (0.3, 1.35, -0.35), (0.4, 0.3, -1.3), (0.85, -0.9, -0.2)],
    "balken": [(-4.8, -0.5, 2.6), (-2.5, -0.6, 2.5), (-1.0, -0.8, 2.3), (0.0, -0.9, 2.25), (1.0, -0.8, 2.3), (2.5, -0.6, 2.5), (4.8, -0.5, 2.6)],
}


def to_three(p):
    return [round(float(p[0]), 4), round(float(p[2]), 4), round(float(-p[1]), 4)]


# --------------------------------------------------------------------------------------
# Export
# --------------------------------------------------------------------------------------
bpy.data.collections.remove(COLL.pop("tmp"))
if "tmp" in bpy.data.materials:
    bpy.data.materials.remove(bpy.data.materials["tmp"])

tris = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        tris += len(o.data.polygons)
STATS["triangles"] = tris
STATS["objects"] = sum(1 for o in bpy.data.objects if o.type == "MESH")
STATS["blender"] = bpy.app.version_string
log(f"{STATS['objects']} Objekte, {tris} Dreiecke")

meta = {
    "units": "1 Einheit = 1 cm",
    "axes": "three.js: +x rechts, +y oben, -z vorn",
    "paths": {k: [to_three(p) for p in v] for k, v in PATHS.items()},
    "anchors": {k: to_three(v) for k, v in ANCHORS.items()},
    "stats": STATS,
}
with open(META_PATH, "w") as fh:
    json.dump(meta, fh, ensure_ascii=False, indent=1)

kw = dict(filepath=GLB_PATH, export_format="GLB", use_selection=False, export_apply=True, export_yup=True,
          export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
          export_draco_position_quantization=14, export_draco_normal_quantization=10)
try:
    bpy.ops.export_scene.gltf(**kw)
except TypeError as e:
    log("glTF-Export: Fallback ohne Zusatzoptionen –", e)
    bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format="GLB", export_draco_mesh_compression_enable=True)
log(f"GLB geschrieben: {os.path.getsize(GLB_PATH) / 1e6:.2f} MB")


# --------------------------------------------------------------------------------------
# Rendering (Cycles, CPU) – Vorschaubild + App-Icon
# --------------------------------------------------------------------------------------
def setup_render():
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb("#060c18"), 1)
    bg.inputs["Strength"].default_value = 1.0

    def light(name, kind, loc, energy, color, size=10.0):
        ld = bpy.data.lights.new(name, kind)
        ld.energy = energy
        ld.color = srgb(color)
        if kind == "AREA":
            ld.size = size
        lo = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(lo)
        lo.location = loc
        d = Vector((0, -0.5, 0)) - Vector(loc)
        lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return lo

    light("Key", "AREA", (-24, 18, 22), 42000, "#fff0da", 14)
    light("Rim", "AREA", (18, -26, 14), 30000, "#6fb6ff", 12)
    light("Fill", "AREA", (-14, -4, -18), 6000, "#f39a2e", 12)
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
    try:
        scene.cycles.use_denoising = True
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.view_settings.view_transform = "AgX"
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    # Liquor im Rendering ausblenden (liegt im Inneren)
    for o in bpy.data.objects:
        if o.type == "MESH" and (o.users_collection[0].name in ("Ventrikel",)):
            o.hide_render = True


def camera(loc, target, lens):
    cd = bpy.data.cameras.new("Cam")
    cd.lens = lens
    cd.clip_end = 500
    co = bpy.data.objects.new("Cam", cd)
    scene.collection.objects.link(co)
    co.location = loc
    co.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = co
    return co


if DO_RENDER:
    setup_render()
    cam = camera((-36, 25, 13), (0.3, -0.9, -1.4), 58)
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    scene.render.filepath = RENDER_PATH
    bpy.ops.render.render(write_still=True)
    log("Vorschaubild gerendert")

    # App-Icon: quadratisch, Gehirn mittig auf dunklem Grund
    cam.location = (-34, 17, 10)
    cam.rotation_euler = (Vector((0, -0.6, 0.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 70
    scene.render.resolution_x = scene.render.resolution_y = 1024
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.cycles.samples = 48
    icon_master = os.path.join(ICON_DIR, "icon-1024.png")
    scene.render.filepath = icon_master
    bpy.ops.render.render(write_still=True)
    for sz in (512, 192, 180):
        img = bpy.data.images.load(icon_master)
        img.scale(sz, sz)
        img.filepath_raw = os.path.join(ICON_DIR, f"icon-{sz}.png")
        img.file_format = "PNG"
        img.save()
        bpy.data.images.remove(img)
    log("Icons gerendert")

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH, compress=True)
log("fertig:", BLEND_PATH)
