// serverMiddleware: GET /api/stocks
// ดึงราคาหุ้นจาก Yahoo Finance (chart endpoint) ฝั่งเซิร์ฟเวอร์ — ไม่ต้องใช้ API key
// แล้วรวมกับ metadata ที่คัดไว้ใน data/stocks.js
// Node 18+ มี global fetch ในตัว จึงไม่ต้องลง node-fetch
//
// หมายเหตุ: Yahoo เป็น unofficial endpoint — ต้องส่ง User-Agent ไม่งั้นโดนบล็อก
// และอาจมีการเปลี่ยนแปลง/จำกัดอัตราเรียกได้ในอนาคต

const { STOCKS } = require('../data/stocks')

const CACHE_MS = 30 * 1000 // แคชในหน่วยความจำ 30 วินาที กันยิงถี่เกินตอนรีโหลด
let cache = { time: 0, data: null }

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function send(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=1d`
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) throw new Error(`Yahoo ${r.status} for ${symbol}`)
  const j = await r.json()
  const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta
  if (!meta || meta.regularMarketPrice == null) throw new Error(`No data for ${symbol}`)

  const price = meta.regularMarketPrice
  const prevClose = meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose
  const change = prevClose != null ? price - prevClose : null
  const percent = prevClose ? (change / prevClose) * 100 : null

  return {
    price,
    change,
    percent,
    high: meta.regularMarketDayHigh != null ? meta.regularMarketDayHigh : null,
    low: meta.regularMarketDayLow != null ? meta.regularMarketDayLow : null,
    prevClose: prevClose != null ? prevClose : null,
    volume: meta.regularMarketVolume != null ? meta.regularMarketVolume : null,
    currency: meta.currency || 'USD'
  }
}

module.exports = async function (req, res) {
  const now = Date.now()
  if (cache.data && now - cache.time < CACHE_MS) {
    return send(res, 200, { ok: true, cached: true, source: 'yahoo', updatedAt: cache.time, stocks: cache.data })
  }

  try {
    const stocks = await Promise.all(
      STOCKS.map(async (s) => {
        try {
          const quote = await fetchQuote(s.symbol)
          return { ...s, quote }
        } catch (e) {
          // หุ้นตัวใดดึงไม่ได้ ก็ปล่อย quote เป็น null ไม่ให้พังทั้งหน้า
          return { ...s, quote: null, error: String(e.message || e) }
        }
      })
    )
    cache = { time: now, data: stocks }
    return send(res, 200, { ok: true, cached: false, source: 'yahoo', updatedAt: now, stocks })
  } catch (e) {
    return send(res, 500, { ok: false, reason: 'FETCH_ERROR', message: String(e.message || e) })
  }
}
