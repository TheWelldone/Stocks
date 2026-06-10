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

// ระบุช่วงตลาดปัจจุบันจาก currentTradingPeriod (เวลาเป็น epoch วินาที)
function currentSession(ctp) {
  if (!ctp) return 'closed'
  const now = Math.floor(Date.now() / 1000)
  if (ctp.pre && now >= ctp.pre.start && now < ctp.pre.end) return 'pre'
  if (ctp.regular && now >= ctp.regular.start && now < ctp.regular.end) return 'regular'
  if (ctp.post && now >= ctp.post.start && now < ctp.post.end) return 'post'
  return 'closed'
}

async function fetchQuote(symbol) {
  // intraday 5 นาที + includePrePost เพื่อให้ได้ราคา pre-market / after-hours ด้วย
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=5m&range=1d&includePrePost=true`
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) throw new Error(`Yahoo ${r.status} for ${symbol}`)
  const j = await r.json()
  const result = j && j.chart && j.chart.result && j.chart.result[0]
  const meta = result && result.meta
  if (!meta || meta.regularMarketPrice == null) throw new Error(`No data for ${symbol}`)

  const price = meta.regularMarketPrice
  const prevClose = meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose
  const change = prevClose != null ? price - prevClose : null
  const percent = prevClose ? (change / prevClose) * 100 : null

  // ราคานอกเวลา = จุด intraday ล่าสุด (รวมช่วง pre/post) + เทียบฐานตามช่วงตลาด
  const closes =
    (result.indicators && result.indicators.quote && result.indicators.quote[0] &&
      result.indicators.quote[0].close) || []
  let extPrice = null
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) {
      extPrice = closes[i]
      break
    }
  }
  const session = currentSession(meta.currentTradingPeriod)
  let extPercent = null
  if (extPrice != null) {
    // pre-market เทียบกับ previous close, after-hours/ปิด เทียบกับราคาปิดล่าสุด
    if (session === 'pre' && prevClose) extPercent = ((extPrice - prevClose) / prevClose) * 100
    else if ((session === 'post' || session === 'closed') && price)
      extPercent = ((extPrice - price) / price) * 100
  }

  return {
    price,
    change,
    percent,
    high: meta.regularMarketDayHigh != null ? meta.regularMarketDayHigh : null,
    low: meta.regularMarketDayLow != null ? meta.regularMarketDayLow : null,
    prevClose: prevClose != null ? prevClose : null,
    volume: meta.regularMarketVolume != null ? meta.regularMarketVolume : null,
    currency: meta.currency || 'USD',
    session,
    extPrice,
    extPercent
  }
}

// ช่วงตลาดรวม (ใช้ค่าจากหุ้นตัวแรกที่ดึงได้ เพราะตลาด US เปลี่ยนพร้อมกัน)
function marketSessionOf(stocks) {
  const q = (stocks.find((s) => s.quote && s.quote.session) || {}).quote
  return q ? q.session : 'closed'
}

module.exports = async function (req, res) {
  const now = Date.now()
  if (cache.data && now - cache.time < CACHE_MS) {
    return send(res, 200, {
      ok: true,
      cached: true,
      source: 'yahoo',
      updatedAt: cache.time,
      marketSession: marketSessionOf(cache.data),
      stocks: cache.data
    })
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
    return send(res, 200, {
      ok: true,
      cached: false,
      source: 'yahoo',
      updatedAt: now,
      marketSession: marketSessionOf(stocks),
      stocks
    })
  } catch (e) {
    return send(res, 500, { ok: false, reason: 'FETCH_ERROR', message: String(e.message || e) })
  }
}
