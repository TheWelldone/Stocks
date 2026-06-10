export default {
  // โหมด SSR + server target เพื่อให้ serverMiddleware (/api/stocks) ทำงาน
  ssr: true,
  target: 'server',

  head: {
    title: 'US Stocks Watchlist — พลังงาน · AI · GPU',
    htmlAttrs: { lang: 'th' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: 'รายการหุ้นสหรัฐฯ กรองตามหมวด พลังงาน AI GPU พร้อมราคาเรียลไทม์'
      }
    ],
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap'
      }
    ]
  },

  css: ['~/assets/css/main.css'],

  // พร็อกซีเรียกข้อมูลหุ้นฝั่งเซิร์ฟเวอร์ (ดึงจาก Yahoo Finance)
  serverMiddleware: [
    { path: '/api/stocks', handler: '~/api/stocks.js' },
    { path: '/api/history', handler: '~/api/history.js' }
  ],

  // เปิด auto-import components (Nuxt 2.13+)
  components: true,

  build: {}
}
