// serverMiddleware: GET /api/history?symbol=NVDA&range=6mo
// ดึงราคาย้อนหลังจาก Yahoo Finance สำหรับวาดกราฟใน popup

const CACHE_MS = 60 * 1000 // แคชต่อ (symbol|range) 60 วินาที
const cache = new Map()

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// range ที่อนุญาต → interval ที่เหมาะสม
const RANGES = {
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1d',
  '5y': '1wk'
}

function send(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

module.exports = async function (req, res) {
  let symbol, range
  try {
    const u = new URL(req.url, 'http://localhost')
    symbol = (u.searchParams.get('symbol') || '').trim().toUpperCase()
    range = u.searchParams.get('range') || '6mo'
  } catch (e) {
    return send(res, 400, { ok: false, message: 'พารามิเตอร์ไม่ถูกต้อง' })
  }

  if (!symbol || !/^[A-Z.\-]{1,12}$/.test(symbol)) {
    return send(res, 400, { ok: false, message: 'symbol ไม่ถูกต้อง' })
  }
  const interval = RANGES[range] || '1d'
  if (!RANGES[range]) range = '6mo'

  const cacheKey = `${symbol}|${range}`
  const now = Date.now()
  const hit = cache.get(cacheKey)
  if (hit && now - hit.time < CACHE_MS) {
    return send(res, 200, { ...hit.data, cached: true })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=${interval}&range=${range}`
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!r.ok) throw new Error(`Yahoo ${r.status}`)
    const j = await r.json()
    const result = j && j.chart && j.chart.result && j.chart.result[0]
    if (!result) throw new Error('ไม่พบข้อมูล')

    const ts = result.timestamp || []
    const quote = result.indicators && result.indicators.quote && result.indicators.quote[0]
    const closes = (quote && quote.close) || []
    const opens = (quote && quote.open) || []
    const highs = (quote && quote.high) || []
    const lows = (quote && quote.low) || []
    const vols = (quote && quote.volume) || []
    // ส่ง OHLCV ครบ สำหรับวาดแท่งเทียน + แท่งปริมาณซื้อขาย
    const points = ts
      .map((t, i) => ({
        t: t * 1000,
        o: opens[i],
        h: highs[i],
        l: lows[i],
        c: closes[i],
        v: vols[i] != null ? vols[i] : 0
      }))
      .filter((p) => p.c != null && p.o != null && p.h != null && p.l != null)

    const data = {
      ok: true,
      symbol,
      range,
      currency: (result.meta && result.meta.currency) || 'USD',
      points
    }
    cache.set(cacheKey, { time: now, data })
    return send(res, 200, { ...data, cached: false })
  } catch (e) {
    return send(res, 500, { ok: false, symbol, range, message: String(e.message || e) })
  }
}
