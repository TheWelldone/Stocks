// รายชื่อหุ้น US ที่คัดมา พร้อม tag หมวดหมู่
// หนึ่งหุ้นอยู่ได้หลายหมวด เช่น NVDA เป็นทั้ง AI, GPU และ Semiconductor
// ไฟล์นี้เขียนเป็น CommonJS เพื่อให้ใช้ได้ทั้งฝั่ง serverMiddleware (Node) และฝั่ง Vue (webpack)

const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด', color: '#8b95a7' },
  { id: 'energy', label: 'พลังงาน', color: '#22c55e' },
  { id: 'ai', label: 'AI', color: '#a855f7' },
  { id: 'gpu', label: 'GPU', color: '#3b82f6' },
  { id: 'semi', label: 'Semiconductor', color: '#f59e0b' },
  { id: 'nuclear', label: 'Nuclear / SMR', color: '#14b8a6' },
  { id: 'quantum', label: 'Quantum', color: '#ec4899' },
  { id: 'cyber', label: 'Cybersecurity', color: '#6366f1' },
  { id: 'defense', label: 'Defense', color: '#65a30d' }
]

const STOCKS = [
  // --- พลังงาน (Energy) ---
  { symbol: 'XOM', name: 'Exxon Mobil', tags: ['energy'] },
  { symbol: 'CVX', name: 'Chevron', tags: ['energy'] },
  { symbol: 'COP', name: 'ConocoPhillips', tags: ['energy'] },
  { symbol: 'SLB', name: 'Schlumberger', tags: ['energy'] },
  { symbol: 'OXY', name: 'Occidental Petroleum', tags: ['energy'] },
  { symbol: 'EOG', name: 'EOG Resources', tags: ['energy'] },
  { symbol: 'NEE', name: 'NextEra Energy', tags: ['energy'] },
  { symbol: 'ENPH', name: 'Enphase Energy', tags: ['energy'] },
  { symbol: 'FSLR', name: 'First Solar', tags: ['energy'] },

  // --- AI ---
  { symbol: 'MSFT', name: 'Microsoft', tags: ['ai'] },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', tags: ['ai'] },
  { symbol: 'META', name: 'Meta Platforms', tags: ['ai'] },
  { symbol: 'AMZN', name: 'Amazon', tags: ['ai'] },
  { symbol: 'PLTR', name: 'Palantir Technologies', tags: ['ai'] },
  { symbol: 'AI', name: 'C3.ai', tags: ['ai'] },
  { symbol: 'SNOW', name: 'Snowflake', tags: ['ai'] },
  { symbol: 'CRM', name: 'Salesforce', tags: ['ai'] },

  // --- GPU / ชิปประมวลผล (เป็น Semiconductor ด้วย) ---
  { symbol: 'NVDA', name: 'NVIDIA', tags: ['ai', 'gpu', 'semi'] },
  { symbol: 'AMD', name: 'Advanced Micro Devices', tags: ['ai', 'gpu', 'semi'] },
  { symbol: 'AVGO', name: 'Broadcom', tags: ['ai', 'gpu', 'semi'] },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', tags: ['ai', 'gpu', 'semi'] },
  { symbol: 'MU', name: 'Micron Technology', tags: ['ai', 'gpu', 'semi'] },
  { symbol: 'ARM', name: 'Arm Holdings', tags: ['ai', 'gpu', 'semi'] },
  { symbol: 'INTC', name: 'Intel', tags: ['gpu', 'semi'] },
  { symbol: 'QCOM', name: 'Qualcomm', tags: ['gpu', 'semi'] },

  // --- Semiconductor (อุปกรณ์/วัตถุดิบ/อนาล็อก ที่ไม่ใช่ GPU) ---
  { symbol: 'ASML', name: 'ASML Holding', tags: ['semi', 'ai'] },
  { symbol: 'AMAT', name: 'Applied Materials', tags: ['semi'] },
  { symbol: 'LRCX', name: 'Lam Research', tags: ['semi'] },
  { symbol: 'TXN', name: 'Texas Instruments', tags: ['semi'] },
  { symbol: 'MRVL', name: 'Marvell Technology', tags: ['semi', 'ai'] },

  // --- Nuclear / SMR (พลังงานนิวเคลียร์ป้อน AI) ---
  { symbol: 'SMR', name: 'NuScale Power', tags: ['nuclear'] },
  { symbol: 'OKLO', name: 'Oklo', tags: ['nuclear'] },
  { symbol: 'NNE', name: 'Nano Nuclear Energy', tags: ['nuclear'] },
  { symbol: 'BWXT', name: 'BWX Technologies', tags: ['nuclear', 'defense'] },
  { symbol: 'D', name: 'Dominion Energy', tags: ['nuclear', 'energy'] },

  // --- Quantum Computing ---
  { symbol: 'IONQ', name: 'IonQ', tags: ['quantum'] },
  { symbol: 'RGTI', name: 'Rigetti Computing', tags: ['quantum'] },
  { symbol: 'QUBT', name: 'Quantum Computing Inc.', tags: ['quantum'] },
  { symbol: 'QBTS', name: 'D-Wave Quantum', tags: ['quantum'] },

  // --- Cybersecurity ---
  { symbol: 'PANW', name: 'Palo Alto Networks', tags: ['cyber'] },
  { symbol: 'CRWD', name: 'CrowdStrike', tags: ['cyber'] },
  { symbol: 'ZS', name: 'Zscaler', tags: ['cyber'] },
  { symbol: 'FTNT', name: 'Fortinet', tags: ['cyber'] },

  // --- Defense (กลุ่มกลาโหม) ---
  { symbol: 'LMT', name: 'Lockheed Martin', tags: ['defense'] },
  { symbol: 'GD', name: 'General Dynamics', tags: ['defense'] },
  { symbol: 'RTX', name: 'RTX Corporation', tags: ['defense'] },
  { symbol: 'NOC', name: 'Northrop Grumman', tags: ['defense'] },
  { symbol: 'LHX', name: 'L3Harris Technologies', tags: ['defense'] }
]

module.exports = { CATEGORIES, STOCKS }
