// Dieser Endpunkt läuft auf Vercel als kleiner "Mittelsmann" zwischen deiner
// App und Replicate. Der API-Key bleibt hier auf dem Server versteckt (als
// Environment Variable) und wird NIE an den Browser ausgeliefert.
//
// Aufruf von der App aus:
//   POST /api/generate            → startet eine neue Bildgenerierung
//   GET  /api/generate?id=xyz     → fragt den Status einer laufenden Generierung ab

export default async function handler(req, res) {
  // Erlaubt Aufrufe von deiner App aus (CORS-Freigabe für den eigenen Proxy).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN ist auf dem Server nicht gesetzt." });
  }

  try {
    if (req.method === "POST") {
      // Neue Generierung starten
      const { prompt, aspect_ratio } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: "Feld 'prompt' fehlt." });
      }

      const createRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "black-forest-labs/flux-schnell",
          input: { prompt, aspect_ratio: aspect_ratio || "3:4" },
        }),
      });

      const data = await createRes.json();
      if (!createRes.ok) {
        return res.status(createRes.status).json({ error: data.detail || "Replicate-Anfrage fehlgeschlagen." });
      }
      return res.status(200).json(data);
    }

    if (req.method === "GET") {
      // Status einer laufenden Generierung abfragen
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Query-Parameter 'id' fehlt." });
      }

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { "Authorization": `Bearer ${REPLICATE_API_TOKEN}` },
      });
      const data = await pollRes.json();
      if (!pollRes.ok) {
        return res.status(pollRes.status).json({ error: data.detail || "Status-Abfrage fehlgeschlagen." });
      }
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Methode nicht erlaubt." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unbekannter Serverfehler." });
  }
}
