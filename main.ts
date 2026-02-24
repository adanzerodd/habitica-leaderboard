import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Resvg } from "npm:@resvg/resvg-js";

// ================================================
// 🔧 CAMBIA ESTAS DOS URLs POR LAS TUYAS
// ================================================
const URL_RANKING = "PEGA_AQUI_LA_URL_CSV_DE_RANKING";
const URL_LEYENDA = "PEGA_AQUI_LA_URL_CSV_DE_LEYENDAMENSUAL";
// ================================================

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = values[i] || ""));
    return obj;
  });
}

function top5(data: Record<string, string>[], key: string) {
  return [...data]
    .map((r) => ({ ...r, _val: parseFloat(r[key]) || 0 }))
    .filter((r) => r._val > 0)
    .sort((a, b) => b._val - a._val)
    .slice(0, 5);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const C = {
  bg: "#1a0533",
  bgCard: "#2a1045",
  border: "#9441c8",
  gold: "#f8a100",
  text: "#e8d5f5",
  dim: "#9b7db5",
  rank1: "#FFD700",
  rank2: "#C0C0C0",
  rank3: "#CD7F32",
  green: "#4caf50",
};

const MEDALS = ["🥇", "🥈", "🥉"];

function renderTable(
  title: string,
  icon: string,
  data: { Name: string; _val: number }[],
  decimals: number,
  x: number,
  y: number
): { svg: string; height: number } {
  const ROW_H = 22;
  const W = 315;
  const headerH = 52;
  const rows = data.slice(0, 5);
  const totalH = headerH + rows.length * ROW_H + 16;

  let svg = `
    <rect x="${x}" y="${y}" width="${W}" height="${totalH}" rx="10" fill="${C.bgCard}" stroke="${C.border}" stroke-width="1"/>
    <text x="${x + 12}" y="${y + 22}" font-size="15" fill="${C.gold}" font-weight="bold" font-family="sans-serif">${icon} ${escapeXml(title)}</text>
    <line x1="${x + 10}" y1="${y + 34}" x2="${x + W - 10}" y2="${y + 34}" stroke="${C.border}" stroke-width="0.5"/>
    <text x="${x + 12}" y="${y + 47}" font-size="10" fill="${C.dim}" font-family="sans-serif">POS</text>
    <text x="${x + 48}" y="${y + 47}" font-size="10" fill="${C.dim}" font-family="sans-serif">USUARIO</text>
    <text x="${x + W - 12}" y="${y + 47}" font-size="10" fill="${C.dim}" font-family="sans-serif" text-anchor="end">CANT</text>
  `;

  rows.forEach((p, i) => {
    const ry = y + headerH + i * ROW_H + 14;
    const medalColor = i === 0 ? C.rank1 : i === 1 ? C.rank2 : i === 2 ? C.rank3 : C.dim;
    const pos = i < 3 ? MEDALS[i] : String(i + 1);
    const val = decimals > 0 ? p._val.toFixed(decimals) : String(p._val);

    svg += `
      <text x="${x + 12}" y="${ry}" font-size="12" fill="${medalColor}" font-weight="bold" font-family="sans-serif">${pos}</text>
      <text x="${x + 48}" y="${ry}" font-size="12" fill="${C.text}" font-family="sans-serif">${escapeXml(p.Name)}</text>
      <text x="${x + W - 12}" y="${ry}" font-size="12" fill="${C.gold}" font-weight="bold" font-family="sans-serif" text-anchor="end">${val}</text>
    `;
  });

  return { svg, height: totalH };
}

serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname !== "/api/leaderboard") {
    return new Response("Habitica Leaderboard — visita /api/leaderboard", { status: 200 });
  }

  try {
    const [rankRes, leyRes] = await Promise.all([
      fetch(URL_RANKING),
      fetch(URL_LEYENDA),
    ]);

    const rankText = await rankRes.text();
    const leyText = await leyRes.text();

    const ranking = parseCSV(rankText);
    const leyenda = parseCSV(leyText);
    const leyendaNombre = leyenda[0]?.Nombre || "???";

    const topHabHoy = top5(ranking, "HabHoy");
    const topHabSem = top5(ranking, "HabSem");
    const topHist   = top5(ranking, "Hist");
    const topEsfSem = top5(ranking, "EsfSem");
    const topEsfMes = top5(ranking, "EsfMes");

    const misRow = ranking.find(
      (r) => parseFloat(r["MisDía"]) > 0 || parseFloat(r["MisSemana"]) > 0
    ) || {};
    const misDia = parseFloat(misRow["MisDía"])    || 0;
    const misSem = parseFloat(misRow["MisSemana"]) || 0;
    const misMes = parseFloat(misRow["MisMes"])    || 0;

    const hora = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago",
    });

    const W = 680;
    const PAD = 20;
    const COL_X1 = PAD;
    const COL_X2 = PAD + 330;
    let y1 = 90; // cursor columna izquierda
    let y2 = 90; // cursor columna derecha
    const GAP = 10;

    // Renderizar las 5 tablas
    const t1 = renderTable("HOY (SKILL)",            "⚡", topHabHoy, 0, COL_X1, y1);
    y1 += t1.height + GAP;
    const t2 = renderTable("SEMANA (SKILL)",          "📅", topHabSem, 0, COL_X1, y1);
    y1 += t2.height + GAP;
    const t3 = renderTable("HISTÓRICO (SKILL)",       "👑", topHist,   0, COL_X1, y1);
    y1 += t3.height + GAP;

    const t4 = renderTable("ESFUERZO SEMANAL (PTS)", "🔥", topEsfSem, 1, COL_X2, y2);
    y2 += t4.height + GAP;
    const t5 = renderTable("ESFUERZO MENSUAL (PTS)", "🏆", topEsfMes, 1, COL_X2, y2);
    y2 += t5.height + GAP;

    // Misiones
    const MIS_H = 100;
    const misY = y2;
    const barMaxW = 200;
    const misionSVG = `
      <rect x="${COL_X2}" y="${misY}" width="315" height="${MIS_H}" rx="10" fill="${C.bgCard}" stroke="${C.border}" stroke-width="1"/>
      <text x="${COL_X2 + 12}" y="${misY + 22}" font-size="14" fill="${C.gold}" font-weight="bold" font-family="sans-serif">⚔️ MISIONES COMPLETADAS</text>
      <line x1="${COL_X2 + 10}" y1="${misY + 32}" x2="${COL_X2 + 305}" y2="${misY + 32}" stroke="${C.border}" stroke-width="0.5"/>
      ${[["Día:", misDia, 50], ["Semana:", misSem, 200], ["Mes:", misMes, 800]].map(([label, val, max], i) => {
        const by = misY + 50 + i * 22;
        const bw = Math.min(barMaxW, (Number(val) / Number(max)) * barMaxW);
        return `
          <text x="${COL_X2 + 12}" y="${by}" font-size="11" fill="${C.dim}" font-family="sans-serif">${label}</text>
          <text x="${COL_X2 + 62}" y="${by}" font-size="11" fill="${C.gold}" font-weight="bold" font-family="sans-serif">${val}</text>
          <rect x="${COL_X2 + 90}" y="${by - 10}" width="${barMaxW}" height="9" rx="4" fill="#3a1a5a"/>
          <rect x="${COL_X2 + 90}" y="${by - 10}" width="${bw}" height="9" rx="4" fill="${C.green}"/>
        `;
      }).join("")}
    `;
    y2 += MIS_H + GAP;

    const totalH = Math.max(y1, y2) + 80;

    // Leyenda del mes
    const leyY = Math.max(y1, y2) + 8;
    const leyendaSVG = `
      <rect x="${PAD}" y="${leyY}" width="${W - PAD * 2}" height="44" rx="10" fill="${C.bgCard}" stroke="${C.gold}" stroke-width="1"/>
      <text x="${W / 2}" y="${leyY + 28}" font-size="16" fill="${C.gold}" font-weight="bold" font-family="sans-serif" text-anchor="middle">👑 LEYENDA DEL MES: ${escapeXml(leyendaNombre.toUpperCase())} 👑</text>
    `;

    // Footer
    const footerSVG = `
      <text x="${W / 2}" y="${leyY + 62}" font-size="10" fill="${C.dim}" font-family="sans-serif" text-anchor="middle">🕐 Sincronizado: ${hora}</text>
    `;

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH + 30}">
        <rect width="${W}" height="${totalH + 30}" fill="${C.bg}"/>
        <!-- Header -->
        <text x="${W / 2}" y="38" font-size="30" text-anchor="middle">👑</text>
        <text x="${W / 2}" y="72" font-size="20" fill="${C.gold}" font-weight="bold" font-family="sans-serif" text-anchor="middle" letter-spacing="3">LEADERBOARD</text>
        <!-- Tablas -->
        ${t1.svg}${t2.svg}${t3.svg}
        ${t4.svg}${t5.svg}
        ${misionSVG}
        ${leyendaSVG}
        ${footerSVG}
      </svg>
    `;

    // Convertir SVG a PNG
    const resvg = new Resvg(svgContent, { fitTo: { mode: "width", value: W } });
    const png = resvg.render().asPng();

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (err) {
    const errorSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="60">
      <rect width="600" height="60" fill="#1a0533"/>
      <text x="20" y="35" font-size="14" fill="#f8a100" font-family="sans-serif">⚠️ Error: ${escapeXml(String(err))}</text>
    </svg>`;
    return new Response(errorSVG, { headers: { "Content-Type": "image/svg+xml" } });
  }
});
```

Guarda con **"Commit changes"**.

---

### Paso 3 — Crear el proyecto en Deno Deploy

1. Ve a **[dash.deno.com](https://dash.deno.com)**
2. Haz clic en **"New Project"**
3. Elige **"Deploy from GitHub repository"**
4. Selecciona tu repositorio `habitica-leaderboard`
5. En **"Entry point"** escribe: `main.ts`
6. Haz clic en **"Deploy Project"**

---

### Paso 4 — Probar la URL

Deno Deploy te dará una URL como:
```
https://habitica-leaderboard-xxxx.deno.dev
```

Tu imagen estará en:
```
https://habitica-leaderboard-xxxx.deno.dev/api/leaderboard
