import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const revalidate = 0

// ================================================
// 🔧 CAMBIA ESTAS DOS URLs POR LAS TUYAS
// ================================================
const URL_RANKING    = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrPzqN4xJyotgaRxXL4HWSrCb-7MGOknVCQeJ9qTyUQgc97lFIo1m8v7QNETdAFIEmBh6pbdcWogdD/pub?gid=140176551&single=true&output=csv'
const URL_LEYENDA    = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrPzqN4xJyotgaRxXL4HWSrCb-7MGOknVCQeJ9qTyUQgc97lFIo1m8v7QNETdAFIEmBh6pbdcWogdD/pub?gid=1859981877&single=true&output=csv'
// ================================================

const COLORS = {
  bg:      '#1a0533',
  bgCard:  '#2a1045',
  border:  '#9441c8',
  gold:    '#f8a100',
  text:    '#e8d5f5',
  textDim: '#9b7db5',
  rank1:   '#FFD700',
  rank2:   '#C0C0C0',
  rank3:   '#CD7F32',
  green:   '#4caf50',
}

// Parsear CSV simple
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const obj = {}
    headers.forEach((h, i) => obj[h] = values[i] || '')
    return obj
  })
}

// Top 5 por columna
function top5(data, key) {
  return [...data]
    .map(r => ({ ...r, _val: parseFloat(r[key]) || 0 }))
    .sort((a, b) => b._val - a._val)
    .slice(0, 5)
}

export async function GET() {
  try {
    // Fetch de los dos CSVs
    const [rankRes, leyRes] = await Promise.all([
      fetch(URL_RANKING,  { cache: 'no-store' }),
      fetch(URL_LEYENDA,  { cache: 'no-store' }),
    ])

    const rankText = await rankRes.text()
    const leyText  = await leyRes.text()

    const ranking = parseCSV(rankText)
    const leyenda = parseCSV(leyText)

    // Leyenda del mes
    const leyendaNombre = leyenda[0]?.Nombre || '???'

    // Tops
    const topHabHoy = top5(ranking, 'HabHoy')
    const topHabSem = top5(ranking, 'HabSem')
    const topHist   = top5(ranking, 'Hist')
    const topEsfSem = top5(ranking, 'EsfSem')
    const topEsfMes = top5(ranking, 'EsfMes')

    // Misiones (busca la fila con datos)
    const misRow = ranking.find(r => parseFloat(r['MisDía']) > 0 || parseFloat(r['MisSemana']) > 0) || {}
    const misDia = parseFloat(misRow['MisDía'])    || 0
    const misSem = parseFloat(misRow['MisSemana']) || 0
    const misMes = parseFloat(misRow['MisMes'])    || 0

    // Hora actual
    const hora = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago'
    })

    const MEDAL = ['🥇', '🥈', '🥉']
    const COL_W = 310

    // Componente tabla reutilizable
    const Table = ({ title, icon, data, valKey, decimals = 0 }) => (
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: '10px 14px', marginBottom: 10, width: COL_W,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 18, marginRight: 8 }}>{icon}</span>
          <span style={{ color: COLORS.gold, fontWeight: 'bold', fontSize: 14 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', color: COLORS.textDim, fontSize: 10, marginBottom: 3, paddingBottom: 3, borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ width: 28 }}>POS</span>
          <span style={{ flex: 1 }}>USUARIO</span>
          <span style={{ width: 55, textAlign: 'right' }}>CANT</span>
        </div>
        {data.map((p, i) => {
          if (p._val === 0) return null
          const col = i === 0 ? COLORS.rank1 : i === 1 ? COLORS.rank2 : i === 2 ? COLORS.rank3 : COLORS.textDim
          return (
            <div key={p.Name + i} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', color: COLORS.text, fontSize: 12 }}>
              <span style={{ width: 28, color: col, fontWeight: 'bold' }}>{i < 3 ? MEDAL[i] : i + 1}</span>
              <span style={{ flex: 1 }}>{p.Name}</span>
              <span style={{ width: 55, textAlign: 'right', color: COLORS.gold, fontWeight: 'bold' }}>
                {decimals > 0 ? p._val.toFixed(decimals) : p._val}
              </span>
            </div>
          )
        })}
      </div>
    )

    return new ImageResponse(
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: COLORS.bg, width: 680, padding: '18px 20px',
        fontFamily: 'sans-serif',
      }}>

        {/* HEADER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 36 }}>👑</span>
          <span style={{ color: COLORS.gold, fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>LEADERBOARD</span>
        </div>

        {/* DOS COLUMNAS */}
        <div style={{ display: 'flex', gap: 14, width: '100%', justifyContent: 'center' }}>

          {/* COLUMNA IZQUIERDA */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Table title="HOY (SKILL)"       icon="⚡" data={topHabHoy} valKey="HabHoy" />
            <Table title="SEMANA (SKILL)"    icon="📅" data={topHabSem} valKey="HabSem" />
            <Table title="HISTÓRICO (SKILL)" icon="👑" data={topHist}   valKey="Hist"   />
          </div>

          {/* COLUMNA DERECHA */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Table title="ESFUERZO SEMANAL (PTS)" icon="🔥" data={topEsfSem} valKey="EsfSem" decimals={1} />
            <Table title="ESFUERZO MENSUAL (PTS)"  icon="🏆" data={topEsfMes} valKey="EsfMes" decimals={1} />

            {/* MISIONES */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 10, width: COL_W,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 18, marginRight: 8 }}>⚔️</span>
                <span style={{ color: COLORS.gold, fontWeight: 'bold', fontSize: 14 }}>MISIONES COMPLETADAS</span>
              </div>
              {[['Día:',    misDia, 50],
                ['Semana:', misSem, 200],
                ['Mes:',    misMes, 800]].map(([label, val, max]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ color: COLORS.textDim, fontSize: 11, width: 52 }}>{label}</span>
                  <span style={{ color: COLORS.gold,    fontSize: 11, width: 26, fontWeight: 'bold' }}>{val}</span>
                  <div style={{ flex: 1, background: '#3a1a5a', borderRadius: 4, height: 9, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (val / max) * 100)}%`,
                      background: COLORS.green, height: '100%', borderRadius: 4
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LEYENDA DEL MES */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: COLORS.bgCard, border: `1px solid ${COLORS.gold}`,
          borderRadius: 12, padding: '8px 20px', marginTop: 2, width: '100%',
        }}>
          <span style={{ fontSize: 20 }}>👑</span>
          <span style={{ color: COLORS.text, fontSize: 14, margin: '0 8px' }}>LEYENDA DEL MES:</span>
          <span style={{ color: COLORS.gold, fontWeight: 'bold', fontSize: 17 }}>{leyendaNombre.toUpperCase()}</span>
          <span style={{ fontSize: 20 }}>👑</span>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, color: COLORS.textDim, fontSize: 10 }}>
          <span style={{ marginRight: 5 }}>🕐</span>
          <span>Sincronizado: {hora}</span>
        </div>

      </div>,
      { width: 680 }
    )

  } catch (err) {
    return new ImageResponse(
      <div style={{ display: 'flex', background: '#1a0533', color: '#f8a100', padding: 30, fontSize: 16, fontFamily: 'sans-serif' }}>
        ⚠️ Error al generar imagen: {err.message}
      </div>,
      { width: 680, height: 80 }
    )
  }
}
