import { useState, useRef } from "react";

// ---- Farben & Design ----
// Paper: #F6F1E9 · Ink: #2B2620 · Clay: #B5562F · Line: #DCD3C2 · Card: #FFFDF8

const PROXY_URL = "/api/generate"; // Relativer Pfad – läuft auf demselben Vercel-Projekt

const SETUP_STEPS = [
  { key: "model", label: "Model", eyebrow: "Wer trägt die Kleidung" },
  { key: "setting", label: "Setting", eyebrow: "Wo die Geschichte spielt" },
];

const SHOOT_STEPS = [
  { key: "clothing", label: "Kleidung", eyebrow: "Was gezeigt wird" },
  { key: "pose", label: "Pose", eyebrow: "Wie das Bild wirkt" },
  { key: "review", label: "Übersicht", eyebrow: "Alles auf einen Blick" },
];

const POSES = [
  { id: "standing", label: "Stehend, frontal", desc: "Ruhiger Blick in die Kamera" },
  { id: "walking", label: "Im Schritt", desc: "Bewegung, Stoff in Aktion" },
  { id: "sitting", label: "Sitzend", desc: "Auf Stuhl oder Fensterbank" },
  { id: "side", label: "Seitlich", desc: "Profil, Fokus auf Silhouette" },
  { id: "detail", label: "Detail-Crop", desc: "Nahaufnahme, Stoff & Schnitt" },
  { id: "back", label: "Rückenansicht", desc: "Schnitt von hinten zeigen" },
];

// Einfache SVG-Icons
const IconUpload = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconPencil = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconImage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);

const s = {
  paper: "#F6F1E9",
  ink: "#2B2620",
  clay: "#B5562F",
  line: "#DCD3C2",
  card: "#FFFDF8",
  muted: "#8A7F68",
  soft: "#6B6354",
  hover: "#EFE8DA",
  sandy: "#B5A98C",
  blush: "#FBEFE7",
  serif: "ui-serif, Georgia, serif",
};

function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function UploadBox({ label, hint, image, onUpload, onClear }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setLoading(true);
    try { onUpload(await compressImage(file)); }
    catch (err) { setError("Foto konnte nicht verarbeitet werden."); }
    finally { setLoading(false); e.target.value = ""; }
  };
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {image ? (
        <div style={{ position: "relative" }}>
          <img src={image} alt={label} style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: 4, border: `1px solid ${s.line}` }} />
          <button onClick={onClear} style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: "50%", background: s.ink, border: "none", color: s.paper, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconX />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={loading} style={{ width: "100%", height: 240, borderRadius: 4, border: `1.5px dashed ${s.sandy}`, background: "transparent", cursor: loading ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: s.muted }}>
          {loading ? <span style={{ fontSize: 14 }}>Wird verarbeitet…</span> : <><IconUpload /><span style={{ fontSize: 14 }}>{hint}</span></>}
        </button>
      )}
      {error && <p style={{ fontSize: 12, color: s.clay, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function TextField({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: s.muted, marginBottom: 8 }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "12px 16px", borderRadius: 4, border: `1px solid ${s.line}`, background: s.card, color: s.ink, fontSize: 15, fontFamily: s.serif, lineHeight: 1.6, resize: "none", outline: "none" }} />
    </label>
  );
}

function MiniBadge({ image, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 4px 4px", borderRadius: 999, border: `1px solid ${s.line}`, background: s.card, flex: 1, minWidth: 0 }}>
      {image
        ? <img src={image} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 24, height: 24, borderRadius: "50%", background: s.hover, flexShrink: 0 }} />
      }
      <span style={{ fontSize: 12, color: s.soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

function ReviewCard({ title, text, image }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 4, border: `1px solid ${s.line}`, background: s.card }}>
      {image
        ? <img src={image} alt={title} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        : <div style={{ width: 64, height: 64, borderRadius: 4, background: s.hover, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: s.sandy }}><IconImage /></div>
      }
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: s.muted, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 15, fontFamily: s.serif, color: s.ink, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{text}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [setupDone, setSetupDone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [editReturnTo, setEditReturnTo] = useState(null);
  const [model, setModel] = useState({ image: null, description: "" });
  const [setting, setSetting] = useState({ image: null, description: "" });
  const [clothing, setClothing] = useState({ image: null, name: "" });
  const [selectedPoses, setSelectedPoses] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [results, setResults] = useState([]);

  const STEPS = setupDone ? SHOOT_STEPS : SETUP_STEPS;
  const step = STEPS[stepIndex];

  const canAdvance = () => {
    if (step.key === "model") return Boolean(model.description.trim().length > 0 || model.image);
    if (step.key === "setting") return Boolean(setting.description.trim().length > 0 || setting.image);
    if (step.key === "clothing") return Boolean(clothing.image) && clothing.name.trim().length > 0;
    if (step.key === "pose") return selectedPoses.length > 0;
    return true;
  };

  const togglePose = (id) => setSelectedPoses((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) { setStepIndex(stepIndex + 1); return; }
    if (!setupDone) { setSetupDone(true); setStepIndex(0); }
    else if (editReturnTo) {
      const idx = SHOOT_STEPS.findIndex((s) => s.key === editReturnTo);
      setStepIndex(idx >= 0 ? idx : 0);
      setEditReturnTo(null);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) { setStepIndex(stepIndex - 1); }
    else if (editReturnTo) {
      const idx = SHOOT_STEPS.findIndex((s) => s.key === editReturnTo);
      setStepIndex(idx >= 0 ? idx : 0);
      setEditReturnTo(null);
    }
  };

  const editAtelier = () => { setEditReturnTo(step.key); setSetupDone(false); setStepIndex(0); };

  const startNewLook = () => { setClothing({ image: null, name: "" }); setSelectedPoses([]); setResults([]); setGenerationError(null); setStepIndex(0); };

  const buildPrompt = (poseLabel) => [
    model.description && `Model: ${model.description}.`,
    setting.description && `Setting: ${setting.description}.`,
    clothing.name && `Trägt: ${clothing.name}.`,
    `Pose: ${poseLabel}.`,
    "Stil: hochwertige redaktionelle Modefotografie, natürliches Licht, scharf, fotorealistisch.",
  ].filter(Boolean).join(" ");

  const generateImages = async () => {
    setGenerating(true); setGenerationError(null);
    setResults(selectedPoses.map((id) => ({ poseId: id, url: null, status: "pending" })));
    for (const poseId of selectedPoses) {
      const pose = POSES.find((p) => p.id === poseId);
      try {
        const url = await callProxy(buildPrompt(pose?.label || poseId));
        setResults((prev) => prev.map((r) => r.poseId === poseId ? { ...r, url, status: "done" } : r));
      } catch (err) {
        setGenerationError(err.message);
        setResults((prev) => prev.map((r) => r.poseId === poseId ? { ...r, status: "error" } : r));
        break;
      }
    }
    setGenerating(false);
  };

  async function callProxy(prompt) {
    const createRes = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspect_ratio: "3:4" }),
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) throw new Error(`Fehler ${createRes.status}: ${createData.error || JSON.stringify(createData)}`);
    let prediction = createData;
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(`${PROXY_URL}?id=${prediction.id}`);
      const pollData = await pollRes.json().catch(() => ({}));
      if (!pollRes.ok) throw new Error(`Status-Fehler ${pollRes.status}: ${pollData.error || ""}`);
      prediction = pollData;
    }
    if (prediction.status !== "succeeded") throw new Error(`Generierung fehlgeschlagen: ${prediction.error || prediction.status}`);
    return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  }

  const isShootReviewStep = setupDone && step.key === "review" && !editReturnTo;
  const isEditingAtelier = !setupDone && editReturnTo !== null;
  const isLastStep = stepIndex === STEPS.length - 1;

  const truncate = (t, max) => !t ? "" : t.length > max ? t.slice(0, max) + "…" : t;

  return (
    <div style={{ minHeight: "100vh", background: s.paper, color: s.ink }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px 112px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: s.clay, marginBottom: 4 }}>
              {setupDone ? "Shooting" : "Atelier einrichten"} · Schritt {stepIndex + 1} von {STEPS.length}
            </p>
            <h1 style={{ fontSize: 32, fontFamily: s.serif, fontWeight: 500, letterSpacing: "-0.01em" }}>{step.label}</h1>
            <p style={{ fontSize: 14, color: s.soft, marginTop: 4 }}>{step.eyebrow}</p>
          </div>
          {setupDone && step.key === "clothing" && (
            <button onClick={editAtelier} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: `1px solid ${s.sandy}`, background: "transparent", color: s.soft, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
              <IconPencil /> Model & Setting
            </button>
          )}
        </div>

        {/* Mini-Badges im Shoot-Flow */}
        {setupDone && (
          <div style={{ display: "flex", gap: 8, marginBottom: 28, marginTop: -8 }}>
            <MiniBadge image={model.image} label={truncate(model.description, 22) || "Model"} />
            <MiniBadge image={setting.image} label={truncate(setting.description, 22) || "Setting"} />
          </div>
        )}

        {isEditingAtelier && (
          <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 4, border: `1px solid ${s.clay}`, background: s.blush, fontSize: 12, color: s.soft, lineHeight: 1.6 }}>
            Du bearbeitest dein Atelier. Danach geht's zurück zum Shooting.
          </div>
        )}

        {/* Progress rail */}
        <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
          {STEPS.map((st, i) => (
            <div key={st.key} style={{ height: 3, flex: 1, borderRadius: 9999, background: i <= stepIndex ? s.clay : s.line, transition: "background 0.2s" }} />
          ))}
        </div>

        {/* Step content */}
        <div style={{ minHeight: 380 }}>

          {step.key === "model" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <UploadBox label="Model" hint="Referenzfoto hochladen (optional)" image={model.image}
                onUpload={(img) => setModel({ ...model, image: img })}
                onClear={() => setModel({ ...model, image: null })} />
              <TextField label="Beschreibung des Models"
                placeholder="z. B. Frau, Anfang 30, schlank, schulterlange dunkle Haare, ruhige Ausstrahlung"
                value={model.description} onChange={(v) => setModel({ ...model, description: v })} />
              <p style={{ fontSize: 12, color: s.muted, lineHeight: 1.6 }}>Einmal festgelegt, bleibt diese Beschreibung für alle künftigen Looks erhalten.</p>
            </div>
          )}

          {step.key === "setting" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <UploadBox label="Setting" hint="Referenzfoto des Raums hochladen (optional)" image={setting.image}
                onUpload={(img) => setSetting({ ...setting, image: img })}
                onClear={() => setSetting({ ...setting, image: null })} />
              <TextField label="Beschreibung des Settings"
                placeholder="z. B. Helles Schlafzimmer, weiß getünchte Wände, Holzdielen, großes Fenster mit Vormittagslicht"
                value={setting.description} onChange={(v) => setSetting({ ...setting, description: v })} />
              <p style={{ fontSize: 12, color: s.muted, lineHeight: 1.6 }}>Die wiederkehrende Bühne — die "Wohnung" deines Models, die in jedem Bild gleich bleibt.</p>
            </div>
          )}

          {step.key === "clothing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <UploadBox label="Kleidung" hint="Foto des Kleidungsstücks hochladen" image={clothing.image}
                onUpload={(img) => setClothing({ ...clothing, image: img })}
                onClear={() => setClothing({ ...clothing, image: null })} />
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: s.muted, marginBottom: 8 }}>Name des Stücks</span>
                <input type="text" value={clothing.name} onChange={(e) => setClothing({ ...clothing, name: e.target.value })}
                  placeholder="z. B. Satin-Bluse, Erdtöne, Gr. S"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 4, border: `1px solid ${s.line}`, background: s.card, color: s.ink, fontSize: 15, fontFamily: s.serif, outline: "none" }} />
              </label>
            </div>
          )}

          {step.key === "pose" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {POSES.map((pose) => {
                const active = selectedPoses.includes(pose.id);
                return (
                  <button key={pose.id} onClick={() => togglePose(pose.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 4, border: `1px solid ${active ? s.clay : s.line}`, background: active ? s.blush : s.card, cursor: "pointer", textAlign: "left" }}>
                    <div>
                      <p style={{ fontFamily: s.serif, fontSize: 15, color: s.ink }}>{pose.label}</p>
                      <p style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>{pose.desc}</p>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${active ? s.clay : s.sandy}`, background: active ? s.clay : "transparent", flexShrink: 0, marginLeft: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      {active && <IconCheck />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step.key === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ReviewCard title="Model" text={model.description || "Keine Beschreibung"} image={model.image} />
              <ReviewCard title="Setting" text={setting.description || "Keine Beschreibung"} image={setting.image} />
              <ReviewCard title="Kleidung" text={clothing.name || "Kein Name"} image={clothing.image} />

              <div style={{ padding: "14px 16px", borderRadius: 4, border: `1px solid ${s.line}`, background: s.card }}>
                <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: s.muted, marginBottom: 10 }}>Posen</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectedPoses.length === 0 && <span style={{ fontSize: 14, color: s.sandy }}>Keine ausgewählt</span>}
                  {selectedPoses.map((id) => {
                    const p = POSES.find((x) => x.id === id);
                    return <span key={id} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: s.hover, color: s.soft }}>{p?.label}</span>;
                  })}
                </div>
              </div>

              {/* Ergebnisse */}
              {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {results.map((r) => {
                    const pose = POSES.find((p) => p.id === r.poseId);
                    return (
                      <div key={r.poseId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 64, height: 80, borderRadius: 4, background: s.hover, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {r.status === "pending" && <span style={{ fontSize: 20 }}>⏳</span>}
                          {r.status === "done" && r.url && <img src={r.url} alt={pose?.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          {r.status === "error" && <span style={{ fontSize: 20 }}>❌</span>}
                        </div>
                        <div>
                          <p style={{ fontFamily: s.serif, fontSize: 15 }}>{pose?.label}</p>
                          <p style={{ fontSize: 12, color: r.status === "error" ? s.clay : s.muted }}>
                            {r.status === "pending" && "Wird generiert…"}
                            {r.status === "done" && "Fertig ✓"}
                            {r.status === "error" && "Fehlgeschlagen"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {generationError && (
                <div style={{ padding: "12px 16px", borderRadius: 4, background: s.blush, fontSize: 13, color: "#8A4A2A", lineHeight: 1.6 }}>
                  <strong>Fehler:</strong> {generationError}
                </div>
              )}

              <button onClick={startNewLook}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 4, border: `1px solid ${s.sandy}`, background: "transparent", color: s.soft, fontSize: 14, cursor: "pointer" }}>
                <IconStar /> Neuen Look mit gleichem Model & Setting starten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, borderTop: `1px solid ${s.line}`, background: s.paper }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px", display: "flex", gap: 12 }}>
          <button onClick={goBack} disabled={stepIndex === 0 && !editReturnTo}
            style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${s.sandy}`, background: "transparent", cursor: stepIndex === 0 && !editReturnTo ? "default" : "pointer", opacity: stepIndex === 0 && !editReturnTo ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", color: s.ink }}>
            <IconLeft />
          </button>

          {!isShootReviewStep ? (
            <button onClick={goNext} disabled={!canAdvance()}
              style={{ flex: 1, height: 44, borderRadius: 999, border: "none", background: canAdvance() ? s.ink : s.line, color: canAdvance() ? s.paper : s.sandy, fontSize: 14, cursor: canAdvance() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}>
              {isLastStep && isEditingAtelier ? "Zurück zum Shooting" : "Weiter"} <IconRight />
            </button>
          ) : (
            <button onClick={generateImages} disabled={generating || selectedPoses.length === 0}
              style={{ flex: 1, height: 44, borderRadius: 999, border: "none", background: generating ? s.sandy : s.clay, color: "#fff", fontSize: 14, cursor: generating ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {generating ? "⏳ Wird erzeugt…" : "Bilder erzeugen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
