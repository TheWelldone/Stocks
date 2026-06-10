<template>
  <div class="page">
    <!-- Header -->
    <header class="hero">
      <div class="hero-inner">
        <div class="brand">
          <span class="logo">📈</span>
          <div>
            <h1>US Stocks Watchlist</h1>
            <p class="subtitle">หุ้นสหรัฐฯ แยกตามหมวด · วางแผนราคาซื้อ-ขาย · เรียงตามความนิยม</p>
          </div>
        </div>
        <button class="refresh" :disabled="loading" @click="load">
          <span v-if="loading" class="spin">↻</span>
          <span v-else>↻</span>
          {{ loading ? 'กำลังโหลด…' : 'รีเฟรช' }}
        </button>
      </div>
    </header>

    <main class="container">
      <div v-if="errorMsg" class="banner error">{{ errorMsg }}</div>

      <!-- แถบกรอง + ค้นหา -->
      <div class="toolbar">
        <div class="filters">
          <button
            v-for="c in categories"
            :key="c.id"
            :class="['chip', { active: activeCat === c.id }]"
            :style="activeCat === c.id ? { borderColor: c.color, color: c.color } : {}"
            @click="activeCat = c.id"
          >
            {{ c.label }}
            <span class="count">{{ countFor(c.id) }}</span>
          </button>
        </div>
        <div class="search-box">
          <input
            v-model="search"
            class="search"
            type="text"
            placeholder="ค้นหา ชื่อ หรือ สัญลักษณ์…"
          />
        </div>
      </div>

      <!-- ตัววางแผนราคา: กรอก % แล้วคำนวณราคาซื้อ/ขายจากราคาปัจจุบันของแต่ละหุ้น -->
      <div class="planner">
        <span class="planner-title">📐 วางแผนราคา</span>
        <label class="planner-field">
          <span>ราคาที่ต้องการซื้อ = ราคาปัจจุบัน − </span>
          <span class="num-input">
            <input type="number" min="0" step="0.5" v-model.number="buyPct" /> %
          </span>
        </label>
        <label class="planner-field">
          <span>ราคาที่ต้องการขาย = ราคาซื้อ + </span>
          <span class="num-input">
            <input type="number" min="0" step="0.5" v-model.number="sellPct" /> %
          </span>
        </label>
      </div>

      <!-- เมตา -->
      <div class="meta">
        <span>แสดง {{ filtered.length }} จาก {{ rows.length }} หุ้น</span>
        <span v-if="updatedLabel" class="updated">อัปเดตล่าสุด {{ updatedLabel }}</span>
      </div>

      <!-- ตาราง -->
      <div class="table-wrap">
        <table class="stock-table">
          <thead>
            <tr>
              <th class="th-sym">สัญลักษณ์</th>
              <th class="th-name">ชื่อบริษัท</th>
              <th class="th-tags">หมวด</th>
              <th class="num">ราคา (USD)</th>
              <th class="num">เปลี่ยนแปลง</th>
              <th class="num">% เปลี่ยนแปลง</th>
              <th class="num col-vol">มูลค่าซื้อขาย</th>
              <th class="num col-buy">ราคาซื้อ <span class="hd-pct">−{{ buyPct || 0 }}%</span></th>
              <th class="num col-sell">ราคาขาย <span class="hd-pct">+{{ sellPct || 0 }}%</span></th>
              <th class="num col-profit">กำไร / หุ้น</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in filtered"
              :key="s.symbol"
              class="row-selectable"
              :class="{ selected: selectedSymbol === s.symbol }"
              @click="selectedSymbol = s.symbol"
              @dblclick="openChartFor(s)"
            >
              <td class="th-sym">
                <span class="sym">{{ s.symbol }}</span>
              </td>
              <td class="th-name">{{ s.name }}</td>
              <td class="th-tags">
                <span
                  v-for="t in s.tags"
                  :key="t"
                  class="tag"
                  :style="{ color: tagColor(t), borderColor: tagColor(t) }"
                >
                  {{ tagLabel(t) }}
                </span>
              </td>
              <td class="num price">{{ fmtPrice(s.quote) }}</td>
              <td class="num" :class="dirClass(s.quote && s.quote.change)">
                {{ fmtChange(s.quote && s.quote.change) }}
              </td>
              <td class="num" :class="dirClass(s.quote && s.quote.percent)">
                <span class="pct-pill" :class="dirClass(s.quote && s.quote.percent)">
                  {{ fmtPercent(s.quote && s.quote.percent) }}
                </span>
              </td>
              <td class="num col-vol vol">{{ fmtTurnover(s.quote) }}</td>
              <td class="num col-buy buy">{{ fmtMoney(buyPrice(s.quote)) }}</td>
              <td class="num col-sell sell">{{ fmtMoney(sellPrice(s.quote)) }}</td>
              <td class="num col-profit profit">{{ fmtProfit(profit(s.quote)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- สถานะว่าง -->
      <div v-if="loading && !rows.length" class="empty">กำลังโหลดข้อมูล…</div>
      <div v-else-if="!filtered.length" class="empty">ไม่พบหุ้นที่ตรงกับเงื่อนไข</div>
    </main>

    <!-- ปุ่มแสดงกราฟแบบลอย (ติดตามการเลื่อนจอ) -->
    <button
      v-show="!showChart"
      class="graph-fab"
      :class="{ ready: selectedSymbol }"
      :disabled="!selectedSymbol"
      :title="selectedSymbol ? 'แสดงกราฟ ' + selectedSymbol : 'คลิกเลือกหุ้นในตารางก่อน'"
      @click="openChart"
    >
      <span class="fab-icon">📈</span>
      <span class="fab-text">แสดงกราฟ<span v-if="selectedSymbol"> · {{ selectedSymbol }}</span></span>
    </button>

    <footer class="foot">
      ข้อมูลราคาเพื่อการศึกษาเท่านั้น · ดึงผ่าน Yahoo Finance · สร้างด้วย Nuxt 2
    </footer>

    <!-- Popup กราฟราคา -->
    <div v-if="showChart && chartStock" class="modal-overlay" @click.self="closeChart">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">
            <span class="modal-sym">{{ chartStock.symbol }}</span>
            <span class="modal-name">{{ chartStock.name }}</span>
          </div>
          <div v-if="chartStock.quote" class="modal-price">
            <span class="price">{{ fmtPrice(chartStock.quote) }}</span>
            <span
              class="pct-pill"
              :class="dirClass(chartStock.quote.percent)"
            >{{ fmtPercent(chartStock.quote.percent) }}</span>
          </div>
          <button class="modal-close" @click="closeChart" aria-label="ปิด">×</button>
        </div>

        <div class="modal-ranges">
          <button
            v-for="r in ranges"
            :key="r.id"
            :class="['range-btn', { active: chartRange === r.id }]"
            @click="setRange(r.id)"
          >
            {{ r.label }}
          </button>
          <div class="mode-group">
            <button
              :class="['range-btn', { active: chartMode === 'candle' }]"
              @click="chartMode = 'candle'"
            >
              🕯 แท่งเทียน
            </button>
            <button
              :class="['range-btn', { active: chartMode === 'line' }]"
              @click="chartMode = 'line'"
            >
              ➴ เส้น
            </button>
          </div>
        </div>

        <div class="modal-body">
          <div v-if="chartLoading" class="chart-state">กำลังโหลดกราฟ…</div>
          <div v-else-if="chartError" class="chart-state err">{{ chartError }}</div>

          <!-- โหมดแท่งเทียนรายวัน: แรงซื้อ/แรงขาย + แนวโน้ม -->
          <template v-else-if="chartMode === 'candle' && candleGeom">
            <div class="insight-row">
              <span class="trend-badge" :class="trend">{{ trendLabel }}</span>
              <div v-if="pressure" class="pressure">
                <span class="p-buy">แรงซื้อ {{ pressure.buyPct.toFixed(0) }}%</span>
                <div class="p-bar">
                  <div class="p-fill" :style="{ width: pressure.buyPct + '%' }"></div>
                </div>
                <span class="p-sell">แรงขาย {{ pressure.sellPct.toFixed(0) }}%</span>
              </div>
            </div>
            <svg class="chart-svg" :viewBox="`0 0 ${candleGeom.W} ${candleGeom.H}`">
              <path v-if="candleGeom.sma50" :d="candleGeom.sma50" class="sma sma50" />
              <path v-if="candleGeom.sma20" :d="candleGeom.sma20" class="sma sma20" />
              <g v-for="cd in candleGeom.candles" :key="cd.key" :class="cd.up ? 'cup' : 'cdown'">
                <line :x1="cd.cx" :x2="cd.cx" :y1="cd.yH" :y2="cd.yL" class="wick" />
                <rect :x="cd.bx" :width="cd.bw" :y="cd.yB" :height="cd.bh" class="body" />
                <rect :x="cd.bx" :width="cd.bw" :y="cd.vy" :height="cd.vh" class="volbar" />
              </g>
            </svg>
            <div class="chart-legend">
              <span class="lg lg20">— SMA20</span>
              <span class="lg lg50">— SMA50</span>
              <span class="lg">แท่งละ 1 วัน · แถวล่าง = ปริมาณซื้อขาย</span>
            </div>
            <div class="chart-axis">
              <span>สูงสุด {{ candleGeom.max.toFixed(2) }}</span>
              <span class="chart-range-label">{{ rangeLabel }}</span>
              <span>ต่ำสุด {{ candleGeom.min.toFixed(2) }}</span>
            </div>
            <div class="chart-dates">
              <span>{{ fmtDate(candleGeom.first.t) }}</span>
              <span
                :class="candleGeom.last.c >= candleGeom.first.c ? 'up' : 'down'"
              >{{ candleGeom.last.c >= candleGeom.first.c ? '▲' : '▼' }} {{ chartPeriodPct }}</span>
              <span>{{ fmtDate(candleGeom.last.t) }}</span>
            </div>
          </template>

          <template v-else-if="chartGeom">
            <svg
              class="chart-svg"
              :class="chartGeom.up ? 'up' : 'down'"
              :viewBox="`0 0 ${chartGeom.W} ${chartGeom.H}`"
            >
              <path :d="chartGeom.area" class="chart-area" />
              <path :d="chartGeom.line" class="chart-line" />
            </svg>
            <div class="chart-axis">
              <span>สูงสุด {{ chartGeom.max.toFixed(2) }}</span>
              <span class="chart-range-label">{{ rangeLabel }}</span>
              <span>ต่ำสุด {{ chartGeom.min.toFixed(2) }}</span>
            </div>
            <div class="chart-dates">
              <span>{{ fmtDate(chartGeom.first.t) }}</span>
              <span
                :class="chartGeom.up ? 'up' : 'down'"
              >{{ chartGeom.up ? '▲' : '▼' }} {{ chartPeriodPct }}</span>
              <span>{{ fmtDate(chartGeom.last.t) }}</span>
            </div>
          </template>

          <!-- การวิเคราะห์อัตโนมัติจากอินดิเคเตอร์ -->
          <div v-if="!chartLoading && !chartError && analysis" class="analysis">
            <div class="analysis-head">
              <span class="analysis-title">การวิเคราะห์ทางเทคนิค</span>
              <span class="verdict" :class="analysis.overall.cls">{{ analysis.overall.label }}</span>
            </div>
            <div class="signal-grid">
              <div v-for="sig in analysis.signals" :key="sig.name" class="signal-card">
                <div class="sig-name">{{ sig.name }}</div>
                <div class="sig-value" :class="sig.cls">{{ sig.value }}</div>
                <div class="sig-note">{{ sig.note }}</div>
              </div>
            </div>
            <div class="analysis-disclaimer">
              * สรุปอัตโนมัติจากอินดิเคเตอร์ของช่วงเวลาที่เลือก เพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import stocksData from '~/data/stocks';

const { CATEGORIES, STOCKS } = stocksData

export default {
  name: 'IndexPage',
  data() {
    return {
      categories: CATEGORIES,
      // เริ่มต้นด้วยรายชื่อหุ้น (ยังไม่มีราคา) เพื่อให้หน้าแสดงทันทีก่อนโหลดเสร็จ
      rows: STOCKS.map((s) => ({ ...s, quote: null })),
      activeCat: 'all',
      search: '',
      buyPct: 15, // % ที่ลดจากราคาปัจจุบัน → ราคาที่ต้องการซื้อ
      sellPct: 5, // % ที่บวกจากราคาซื้อ → ราคาที่ต้องการขาย
      loading: false,
      errorMsg: '',
      updatedAt: null,
      // --- เลือกหุ้น + popup กราฟ ---
      selectedSymbol: null,
      showChart: false,
      chartStock: null,
      chartRange: '6mo',
      chartMode: 'candle', // 'candle' = แท่งเทียนรายวัน, 'line' = กราฟเส้น
      chartPoints: [],
      chartLoading: false,
      chartError: '',
      ranges: [
        { id: '1mo', label: '1 เดือน' },
        { id: '3mo', label: '3 เดือน' },
        { id: '6mo', label: '6 เดือน' },
        { id: '1y', label: '1 ปี' }
      ]
    }
  },
  computed: {
    filtered() {
      const q = this.search.trim().toLowerCase()
      // มูลค่าซื้อขาย (ราคา × ปริมาณ) ใช้เป็นตัวชี้ความนิยม — มากสุดขึ้นก่อน
      const turnover = (s) =>
        s.quote && s.quote.price != null && s.quote.volume != null
          ? s.quote.price * s.quote.volume
          : -1
      return this.rows
        .filter((s) => {
          const inCat = this.activeCat === 'all' || s.tags.includes(this.activeCat)
          if (!inCat) return false
          if (!q) return true
          return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
        })
        .sort((a, b) => turnover(b) - turnover(a))
    },
    updatedLabel() {
      if (!this.updatedAt) return ''
      const d = new Date(this.updatedAt)
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },
    rangeLabel() {
      const r = this.ranges.find((x) => x.id === this.chartRange)
      return r ? r.label : this.chartRange
    },
    // คำนวณ path ของกราฟ SVG จากราคาย้อนหลัง
    chartGeom() {
      const pts = this.chartPoints
      if (!pts || pts.length < 2) return null
      const W = 680
      const H = 280
      const padX = 6
      const padY = 18
      const cs = pts.map((p) => p.c)
      const min = Math.min.apply(null, cs)
      const max = Math.max.apply(null, cs)
      const span = max - min || 1
      const n = pts.length
      const x = (i) => padX + (i / (n - 1)) * (W - 2 * padX)
      const y = (c) => padY + (1 - (c - min) / span) * (H - 2 * padY)
      const line = pts
        .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`)
        .join(' ')
      const area = `${line} L${x(n - 1).toFixed(1)} ${(H - padY).toFixed(1)} L${x(0).toFixed(
        1
      )} ${(H - padY).toFixed(1)} Z`
      return {
        line,
        area,
        min,
        max,
        W,
        H,
        first: pts[0],
        last: pts[n - 1],
        up: pts[n - 1].c >= pts[0].c
      }
    },
    chartPeriodPct() {
      const g = this.chartGeom
      if (!g) return ''
      const diff = ((g.last.c - g.first.c) / g.first.c) * 100
      return (diff > 0 ? '+' : '') + diff.toFixed(2) + '%'
    },
    // เรขาคณิตกราฟแท่งเทียนรายวัน + แท่งปริมาณ + เส้น SMA
    candleGeom() {
      const pts = this.chartPoints
      if (!pts || pts.length < 2 || pts[0].o == null) return null
      const W = 680
      const H = 320
      const padX = 8
      const priceTop = 14
      const priceBottom = 230
      const volTop = 246
      const volBottom = 314
      const n = pts.length
      const min = Math.min.apply(null, pts.map((p) => p.l))
      const max = Math.max.apply(null, pts.map((p) => p.h))
      const span = max - min || 1
      const maxV = Math.max.apply(null, pts.map((p) => p.v)) || 1
      const x = (i) => padX + ((i + 0.5) / n) * (W - 2 * padX)
      const y = (v) => priceTop + (1 - (v - min) / span) * (priceBottom - priceTop)
      const bw = Math.max(1, Math.min(9, ((W - 2 * padX) / n) * 0.65))
      const candles = pts.map((p, i) => {
        const vh = Math.max(1, (p.v / maxV) * (volBottom - volTop))
        return {
          key: p.t,
          up: p.c >= p.o,
          cx: +x(i).toFixed(1),
          bx: +(x(i) - bw / 2).toFixed(1),
          bw: +bw.toFixed(1),
          yH: +y(p.h).toFixed(1),
          yL: +y(p.l).toFixed(1),
          yB: +Math.min(y(p.o), y(p.c)).toFixed(1),
          bh: +Math.max(1, Math.abs(y(p.o) - y(p.c))).toFixed(1),
          vy: +(volBottom - vh).toFixed(1),
          vh: +vh.toFixed(1)
        }
      })
      return {
        W,
        H,
        candles,
        min,
        max,
        sma20: this.smaPath(20, x, y),
        sma50: this.smaPath(50, x, y),
        first: pts[0],
        last: pts[n - 1]
      }
    },
    // แรงซื้อ/แรงขาย = สัดส่วนปริมาณซื้อขายของวันปิดบวก vs วันปิดลบ ในช่วงที่ดู
    pressure() {
      const pts = this.chartPoints
      if (!pts || !pts.length || pts[0].o == null) return null
      let buy = 0
      let sell = 0
      pts.forEach((p) => {
        if (p.c >= p.o) buy += p.v || 0
        else sell += p.v || 0
      })
      const total = buy + sell
      if (!total) return null
      return { buyPct: (buy / total) * 100, sellPct: (sell / total) * 100 }
    },
    // แนวโน้ม: ราคาเทียบ SMA20 + ความชัน SMA20 (ช่วงสั้นใช้ราคาแรก-สุดท้าย)
    trend() {
      const pts = this.chartPoints
      if (!pts || pts.length < 2) return null
      const n = pts.length
      if (n >= 21) {
        const sma = this.smaSeries(20)
        const last = sma[n - 1]
        const back = sma[n - 6] != null ? sma[n - 6] : sma[n - 2]
        const price = pts[n - 1].c
        if (price > last && last >= back) return 'up'
        if (price < last && last <= back) return 'down'
        return 'side'
      }
      const diff = ((pts[n - 1].c - pts[0].c) / pts[0].c) * 100
      if (diff > 2) return 'up'
      if (diff < -2) return 'down'
      return 'side'
    },
    trendLabel() {
      if (this.trend === 'up') return '📈 แนวโน้ม ขาขึ้น'
      if (this.trend === 'down') return '📉 แนวโน้ม ขาลง'
      return '↔ แนวโน้ม ไซด์เวย์'
    },
    // สรุปการวิเคราะห์จาก RSI / MACD / ATR / แท่งเทียน + ให้คะแนนรวม
    analysis() {
      const pts = this.chartPoints
      if (!pts || pts.length < 2 || pts[0].o == null) return null
      const closes = pts.map((p) => p.c)
      const last = pts[pts.length - 1]
      const rsi = this.calcRSI(closes, 14)
      const macd = this.calcMACD(closes)
      const atr = this.calcATR(pts, 14)
      const pat = this.detectPattern(pts)

      let score = 0
      if (this.trend === 'up') score += 1
      else if (this.trend === 'down') score -= 1
      if (macd) score += macd.hist >= 0 ? 1 : -1
      if (rsi != null) {
        if (rsi < 30) score += 1
        else if (rsi > 70) score -= 1
      }
      if (pat) {
        if (pat.dir === 'up') score += 1
        else if (pat.dir === 'down') score -= 1
      }
      if (this.pressure) {
        if (this.pressure.buyPct > 55) score += 0.5
        else if (this.pressure.sellPct > 55) score -= 0.5
      }

      const overall =
        score >= 2
          ? { label: 'โน้มเอียงทางบวก', cls: 'up' }
          : score <= -2
            ? { label: 'โน้มเอียงทางลบ', cls: 'down' }
            : { label: 'เป็นกลาง / รอสัญญาณ', cls: 'side' }

      const signals = [
        {
          name: 'RSI (14)',
          value: rsi != null ? rsi.toFixed(1) : 'ข้อมูลไม่พอ',
          note:
            rsi == null
              ? ''
              : rsi > 70
                ? 'โอเวอร์บอท — เสี่ยงย่อ'
                : rsi < 30
                  ? 'โอเวอร์โซลด์ — ลุ้นเด้ง'
                  : 'ปกติ',
          cls: rsi == null ? '' : rsi > 70 ? 'down' : rsi < 30 ? 'up' : 'side'
        },
        {
          name: 'MACD',
          value: macd ? (macd.hist >= 0 ? 'เหนือ Signal' : 'ใต้ Signal') : 'ข้อมูลไม่พอ',
          note: macd
            ? macd.crossUp
              ? 'เพิ่งตัดขึ้น (สัญญาณซื้อ)'
              : macd.crossDown
                ? 'เพิ่งตัดลง (สัญญาณขาย)'
                : macd.hist >= 0
                  ? 'โมเมนตัมบวก'
                  : 'โมเมนตัมลบ'
            : '',
          cls: macd ? (macd.hist >= 0 ? 'up' : 'down') : ''
        },
        {
          name: 'ATR (14)',
          value: atr != null ? atr.toFixed(2) : 'ข้อมูลไม่พอ',
          note: atr != null ? 'Stop แนะนำ ~' + (last.c - 2 * atr).toFixed(2) : '',
          cls: 'side'
        },
        {
          name: 'แท่งเทียนล่าสุด',
          value: pat ? pat.name : 'ไม่มีรูปแบบเด่น',
          note: pat
            ? pat.dir === 'up'
              ? 'สัญญาณกลับขึ้น'
              : pat.dir === 'down'
                ? 'สัญญาณกลับลง'
                : 'ลังเล'
            : '',
          cls: pat ? (pat.dir === 'up' ? 'up' : pat.dir === 'down' ? 'down' : 'side') : ''
        }
      ]
      return { overall, signals }
    }
  },
  mounted() {
    this.load()
    window.addEventListener('keydown', this.onKey)
  },
  methods: {
    async load() {
      this.loading = true
      this.errorMsg = ''
      try {
        const res = await fetch('/api/stocks')
        const json = await res.json()
        if (Array.isArray(json.stocks)) {
          this.rows = json.stocks
        }
        if (json.reason === 'FETCH_ERROR') {
          this.errorMsg = 'ดึงข้อมูลราคาไม่สำเร็จ: ' + (json.message || 'unknown error')
        }
        this.updatedAt = json.updatedAt || null
      } catch (e) {
        this.errorMsg = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ' + (e.message || e)
      } finally {
        this.loading = false
      }
    },
    countFor(catId) {
      if (catId === 'all') return this.rows.length
      return this.rows.filter((s) => s.tags.includes(catId)).length
    },
    tagLabel(id) {
      const c = this.categories.find((x) => x.id === id)
      return c ? c.label : id
    },
    tagColor(id) {
      const c = this.categories.find((x) => x.id === id)
      return c ? c.color : '#8b95a7'
    },
    fmtPrice(quote) {
      if (!quote || quote.price == null || quote.price === 0) return '—'
      return quote.price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },
    fmtChange(v) {
      if (v == null) return '—'
      const sign = v > 0 ? '+' : ''
      return sign + v.toFixed(2)
    },
    fmtPercent(v) {
      if (v == null) return '—'
      const sign = v > 0 ? '+' : ''
      return sign + v.toFixed(2) + '%'
    },
    fmtMoney(v) {
      if (v == null) return '—'
      return v.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },
    fmtTurnover(quote) {
      if (!quote || quote.price == null || quote.volume == null) return '—'
      const t = quote.price * quote.volume
      if (t >= 1e9) return '$' + (t / 1e9).toFixed(2) + 'B'
      if (t >= 1e6) return '$' + (t / 1e6).toFixed(1) + 'M'
      if (t >= 1e3) return '$' + (t / 1e3).toFixed(0) + 'K'
      return '$' + t.toFixed(0)
    },
    buyPrice(quote) {
      if (!quote || quote.price == null) return null
      const p = Number(this.buyPct) || 0
      return quote.price * (1 - p / 100)
    },
    sellPrice(quote) {
      const b = this.buyPrice(quote)
      if (b == null) return null
      const p = Number(this.sellPct) || 0
      return b * (1 + p / 100)
    },
    // กำไรต่อหุ้น = ราคาขาย − ราคาซื้อ
    profit(quote) {
      const b = this.buyPrice(quote)
      const s = this.sellPrice(quote)
      if (b == null || s == null) return null
      return s - b
    },
    fmtProfit(v) {
      if (v == null) return '—'
      return (v >= 0 ? '+' : '') + v.toFixed(2)
    },
    dirClass(v) {
      if (v == null) return ''
      if (v > 0) return 'up'
      if (v < 0) return 'down'
      return ''
    },
    fmtDate(ms) {
      return new Date(ms).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
      })
    },
    // ค่าเฉลี่ยเคลื่อนที่อย่างง่ายของราคาปิด (null จนกว่าจะครบ period)
    smaSeries(period) {
      const closes = this.chartPoints.map((p) => p.c)
      const out = new Array(closes.length).fill(null)
      let sum = 0
      for (let i = 0; i < closes.length; i++) {
        sum += closes[i]
        if (i >= period) sum -= closes[i - period]
        if (i >= period - 1) out[i] = sum / period
      }
      return out
    },
    smaPath(period, x, y) {
      if (this.chartPoints.length < period) return null
      const sma = this.smaSeries(period)
      let d = ''
      sma.forEach((v, i) => {
        if (v == null) return
        d += (d ? ' L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)
      })
      return d || null
    },
    // --- ฟังก์ชันคำนวณอินดิเคเตอร์ (ใช้ closes / OHLC จาก chartPoints) ---
    calcRSI(closes, period) {
      if (closes.length < period + 1) return null
      let gain = 0
      let loss = 0
      for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1]
        if (d >= 0) gain += d
        else loss -= d
      }
      let avgG = gain / period
      let avgL = loss / period
      for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1]
        avgG = (avgG * (period - 1) + (d > 0 ? d : 0)) / period
        avgL = (avgL * (period - 1) + (d < 0 ? -d : 0)) / period
      }
      if (avgL === 0) return 100
      return 100 - 100 / (1 + avgG / avgL)
    },
    calcEMA(values, period) {
      const k = 2 / (period + 1)
      let ema = values[0]
      const out = [ema]
      for (let i = 1; i < values.length; i++) {
        ema = values[i] * k + ema * (1 - k)
        out.push(ema)
      }
      return out
    },
    calcMACD(closes) {
      if (closes.length < 26) return null
      const e12 = this.calcEMA(closes, 12)
      const e26 = this.calcEMA(closes, 26)
      const macdLine = closes.map((_, i) => e12[i] - e26[i])
      const signal = this.calcEMA(macdLine, 9)
      const i = closes.length - 1
      const hist = macdLine[i] - signal[i]
      const prevHist = i >= 1 ? macdLine[i - 1] - signal[i - 1] : hist
      return {
        macd: macdLine[i],
        signal: signal[i],
        hist,
        crossUp: prevHist <= 0 && hist > 0,
        crossDown: prevHist >= 0 && hist < 0
      }
    },
    calcATR(pts, period) {
      if (pts.length < period + 1) return null
      const tr = []
      for (let i = 1; i < pts.length; i++) {
        const pc = pts[i - 1].c
        tr.push(Math.max(pts[i].h - pts[i].l, Math.abs(pts[i].h - pc), Math.abs(pts[i].l - pc)))
      }
      let atr = 0
      for (let i = 0; i < period; i++) atr += tr[i]
      atr /= period
      for (let i = period; i < tr.length; i++) atr = (atr * (period - 1) + tr[i]) / period
      return atr
    },
    detectPattern(pts) {
      const n = pts.length
      if (n < 2) return null
      const c = pts[n - 1]
      const p = pts[n - 2]
      const body = Math.abs(c.c - c.o)
      const range = c.h - c.l || 1
      const upper = c.h - Math.max(c.o, c.c)
      const lower = Math.min(c.o, c.c) - c.l
      if (p.c < p.o && c.c > c.o && c.c >= p.o && c.o <= p.c)
        return { name: 'Bullish Engulfing', dir: 'up' }
      if (p.c > p.o && c.c < c.o && c.o >= p.c && c.c <= p.o)
        return { name: 'Bearish Engulfing', dir: 'down' }
      if (body > 0 && lower >= 2 * body && upper <= body) return { name: 'Hammer (ค้อน)', dir: 'up' }
      if (body > 0 && upper >= 2 * body && lower <= body)
        return { name: 'Shooting Star (ดาวตก)', dir: 'down' }
      if (body <= 0.1 * range) return { name: 'Doji', dir: 'neutral' }
      return null
    },
    openChart() {
      if (!this.selectedSymbol) return
      const s = this.rows.find((x) => x.symbol === this.selectedSymbol)
      if (s) this.openChartFor(s)
    },
    openChartFor(s) {
      this.selectedSymbol = s.symbol
      this.chartStock = s
      this.showChart = true
      this.loadHistory()
    },
    closeChart() {
      this.showChart = false
    },
    setRange(r) {
      if (this.chartRange === r) return
      this.chartRange = r
      this.loadHistory()
    },
    async loadHistory() {
      if (!this.chartStock) return
      this.chartLoading = true
      this.chartError = ''
      this.chartPoints = []
      try {
        const res = await fetch(
          `/api/history?symbol=${encodeURIComponent(this.chartStock.symbol)}&range=${this.chartRange}`
        )
        const json = await res.json()
        if (!json.ok) throw new Error(json.message || 'โหลดกราฟไม่สำเร็จ')
        this.chartPoints = json.points || []
        if (!this.chartPoints.length) this.chartError = 'ไม่มีข้อมูลกราฟสำหรับช่วงนี้'
      } catch (e) {
        this.chartError = 'โหลดกราฟไม่สำเร็จ: ' + (e.message || e)
      } finally {
        this.chartLoading = false
      }
    },
    onKey(e) {
      if (e.key === 'Escape' && this.showChart) this.closeChart()
    }
  },
  beforeDestroy() {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKey)
  }
}
</script>

<style scoped>
.page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Header */
.hero {
  background: linear-gradient(180deg, #141a28 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
}
.hero-inner {
  max-width: 1340px;
  margin: 0 auto;
  padding: 22px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.logo {
  font-size: 34px;
  line-height: 1;
}
.brand h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.subtitle {
  margin: 2px 0 0;
  color: var(--text-dim);
  font-size: 13px;
}
.refresh {
  background: var(--bg-elev-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.refresh:hover:not(:disabled) {
  background: #242a3c;
  border-color: #2f3650;
}
.refresh:disabled {
  opacity: 0.6;
  cursor: default;
}
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Container */
.container {
  width: 100%;
  max-width: 1340px;
  margin: 0 auto;
  padding: 20px;
  flex: 1;
}

/* Banners */
.banner {
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13.5px;
  line-height: 1.6;
  margin-bottom: 16px;
}
.banner code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 12.5px;
}
.banner.warn {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.35);
  color: #fde68a;
}
.banner.error {
  background: rgba(234, 57, 67, 0.1);
  border: 1px solid rgba(234, 57, 67, 0.35);
  color: #fca5a5;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  background: var(--bg-elev);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover {
  color: var(--text);
}
.chip.active {
  background: var(--bg-elev-2);
  font-weight: 600;
}
.chip .count {
  display: inline-block;
  margin-left: 6px;
  font-size: 11.5px;
  opacity: 0.7;
}
.search {
  background: var(--bg-elev);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 14px;
  min-width: 240px;
  outline: none;
  transition: border-color 0.15s;
}
.search::placeholder {
  color: var(--text-dim);
}
.search:focus {
  border-color: var(--accent);
}

/* Price planner */
.planner {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  font-size: 13.5px;
}
.planner-title {
  font-weight: 700;
  color: var(--text);
}
.planner-field {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
}
.num-input {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text);
}
.num-input input {
  width: 64px;
  background: var(--bg-elev-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 14px;
  text-align: right;
  outline: none;
  transition: border-color 0.15s;
}
.num-input input:focus {
  border-color: var(--accent);
}

/* Meta */
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-dim);
  font-size: 12.5px;
  margin-bottom: 8px;
}

/* Table */
.table-wrap {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow-x: auto;
}
.stock-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
  font-size: 14px;
}
/* ความกว้างขั้นต่ำของแต่ละคอลัมน์ เพื่อไม่ให้บีบ */
.th-sym {
  min-width: 84px;
}
.th-tags {
  min-width: 150px;
}
.stock-table thead th.num {
  min-width: 116px;
}
.col-vol {
  min-width: 124px;
}
.stock-table thead th {
  text-align: left;
  color: var(--text-dim);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.stock-table tbody td {
  padding: 13px 16px;
  border-bottom: 1px solid rgba(35, 40, 56, 0.6);
  vertical-align: middle;
}
.stock-table tbody tr:last-child td {
  border-bottom: none;
}
.stock-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sym {
  font-weight: 700;
  letter-spacing: 0.01em;
}
.th-name {
  color: var(--text-dim);
  min-width: 170px;
  white-space: nowrap;
}
.price {
  font-weight: 600;
}
.tag {
  display: inline-block;
  border: 1px solid;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  margin-right: 5px;
  opacity: 0.9;
}
.up {
  color: var(--up);
}
.down {
  color: var(--down);
}
.pct-pill {
  display: inline-block;
  min-width: 74px;
  text-align: right;
  border-radius: 6px;
  padding: 3px 8px;
  font-weight: 600;
}
.pct-pill.up {
  background: rgba(22, 199, 132, 0.12);
}
.pct-pill.down {
  background: rgba(234, 57, 67, 0.12);
}

/* คอลัมน์มูลค่าซื้อขาย + วางแผนราคาซื้อ/ขาย */
.vol {
  color: var(--text-dim);
}
.buy {
  color: #60a5fa;
  font-weight: 600;
}
.sell {
  color: var(--up);
  font-weight: 600;
}
.hd-pct {
  font-weight: 700;
  text-transform: none;
}
.col-buy {
  border-left: 1px solid rgba(96, 165, 250, 0.18);
}

/* Empty / footer */
.empty {
  text-align: center;
  color: var(--text-dim);
  padding: 40px 0;
  font-size: 14px;
}
.foot {
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
  padding: 24px 20px 30px;
}

/* ปุ่มแสดงกราฟแบบลอย (fixed — ติดตามการเลื่อนจอ) */
.graph-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-elev-2);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: not-allowed;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  transition: transform 0.18s, box-shadow 0.18s, background 0.18s, color 0.18s;
}
.graph-fab .fab-icon {
  font-size: 17px;
  line-height: 1;
}
.graph-fab:disabled {
  opacity: 0.6;
}
.graph-fab.ready {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  cursor: pointer;
}
.graph-fab.ready:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.45);
}

/* คอลัมน์กำไร/หุ้น */
.profit {
  color: var(--up);
  font-weight: 700;
}
.col-profit {
  border-left: 1px solid rgba(22, 199, 132, 0.18);
}

/* เลือกแถวได้ */
.row-selectable {
  cursor: pointer;
}
.stock-table tbody tr.selected {
  background: rgba(59, 130, 246, 0.12) !important;
  box-shadow: inset 3px 0 0 var(--accent);
}

/* Modal / popup กราฟ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 6, 12, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}
.modal {
  width: 100%;
  max-width: 1080px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}
.modal-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.modal-sym {
  font-size: 20px;
  font-weight: 700;
}
.modal-name {
  color: var(--text-dim);
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.modal-price {
  display: flex;
  align-items: center;
  gap: 10px;
}
.modal-price .price {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.modal-close {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.modal-close:hover {
  color: var(--text);
}
.modal-ranges {
  display: flex;
  gap: 8px;
  padding: 12px 18px 0;
}
.range-btn {
  background: var(--bg-elev-2);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.range-btn:hover {
  color: var(--text);
}
.range-btn.active {
  color: #fff;
  border-color: var(--accent);
  background: rgba(59, 130, 246, 0.18);
}
.modal-body {
  padding: 16px 18px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* แผงการวิเคราะห์ทางเทคนิค */
.analysis {
  margin-top: 16px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}
.analysis-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.analysis-title {
  font-weight: 700;
  font-size: 14px;
}
.verdict {
  padding: 5px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
}
.verdict.up {
  color: var(--up);
  background: rgba(22, 199, 132, 0.12);
}
.verdict.down {
  color: var(--down);
  background: rgba(234, 57, 67, 0.12);
}
.verdict.side {
  color: #fbbf24;
  background: rgba(234, 179, 8, 0.12);
}
.signal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.signal-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}
.sig-name {
  color: var(--text-dim);
  font-size: 11.5px;
  margin-bottom: 4px;
}
.sig-value {
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.sig-value.up {
  color: var(--up);
}
.sig-value.down {
  color: var(--down);
}
.sig-value.side {
  color: var(--text);
}
.sig-note {
  color: var(--text-dim);
  font-size: 11.5px;
  margin-top: 3px;
}
.analysis-disclaimer {
  color: var(--text-dim);
  font-size: 10.5px;
  margin-top: 12px;
}
.chart-state {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-size: 14px;
}
.chart-state.err {
  color: #fca5a5;
}
.chart-svg {
  display: block;
  width: 100%;
  height: auto;
}
.chart-line {
  fill: none;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.chart-svg.up .chart-line {
  stroke: var(--up);
}
.chart-svg.down .chart-line {
  stroke: var(--down);
}
.chart-svg.up .chart-area {
  fill: rgba(22, 199, 132, 0.12);
}
.chart-svg.down .chart-area {
  fill: rgba(234, 57, 67, 0.12);
}
.chart-axis,
.chart-dates {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-dim);
  font-size: 12px;
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}
.chart-range-label {
  font-weight: 600;
}
.chart-dates .up {
  color: var(--up);
  font-weight: 600;
}
.chart-dates .down {
  color: var(--down);
  font-weight: 600;
}

/* สลับโหมดกราฟ เส้น/แท่งเทียน */
.mode-group {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* แท่งเทียน + แท่งปริมาณซื้อขาย */
.cup .body,
.cup .volbar {
  fill: var(--up);
}
.cup .wick {
  stroke: var(--up);
}
.cdown .body,
.cdown .volbar {
  fill: var(--down);
}
.cdown .wick {
  stroke: var(--down);
}
.wick {
  stroke-width: 1;
}
.volbar {
  opacity: 0.35;
}
.sma {
  fill: none;
  stroke-width: 1.5;
  opacity: 0.9;
}
.sma20 {
  stroke: #f59e0b;
}
.sma50 {
  stroke: #3b82f6;
}
.chart-legend {
  display: flex;
  gap: 14px;
  font-size: 11.5px;
  color: var(--text-dim);
  margin-top: 6px;
}
.lg20 {
  color: #f59e0b;
}
.lg50 {
  color: #3b82f6;
}

/* ป้ายแนวโน้ม + แถบแรงซื้อ/แรงขาย */
.insight-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.trend-badge {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.trend-badge.up {
  color: var(--up);
  background: rgba(22, 199, 132, 0.12);
}
.trend-badge.down {
  color: var(--down);
  background: rgba(234, 57, 67, 0.12);
}
.trend-badge.side {
  color: #fbbf24;
  background: rgba(234, 179, 8, 0.12);
}
.pressure {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 240px;
  font-size: 12.5px;
}
.p-buy {
  color: var(--up);
  font-weight: 600;
  white-space: nowrap;
}
.p-sell {
  color: var(--down);
  font-weight: 600;
  white-space: nowrap;
}
.p-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(234, 57, 67, 0.45);
  overflow: hidden;
}
.p-fill {
  height: 100%;
  background: var(--up);
}

@media (max-width: 640px) {
  .th-name,
  .col-vol {
    display: none;
  }
  .planner {
    font-size: 12.5px;
  }
  .graph-fab {
    right: 16px;
    bottom: 16px;
    padding: 14px;
  }
  .graph-fab .fab-text {
    display: none;
  }
  .brand h1 {
    font-size: 19px;
  }
  .search {
    min-width: 0;
    flex: 1;
  }
  .search-box {
    flex: 1;
  }
}
</style>
