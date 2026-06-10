# US Stocks Watchlist 📈

เว็บ one-page ด้วย **Nuxt 2** แสดงรายการหุ้นสหรัฐฯ พร้อม **กรองตามหมวด พลังงาน · AI · GPU** และดึงราคา **เรียลไทม์จาก Yahoo Finance (ไม่ต้องใช้ API key)**

## คุณสมบัติ

- รายชื่อหุ้น US ที่คัดมา ~25 ตัว แบ่งหมวด (หนึ่งตัวอยู่ได้หลายหมวด เช่น NVDA เป็นทั้ง AI และ GPU)
- ปุ่มกรอง: ทั้งหมด / พลังงาน / AI / GPU + ช่องค้นหาชื่อ/สัญลักษณ์
- ราคา / การเปลี่ยนแปลง / % เปลี่ยนแปลง ระบายสีเขียว-แดงแบบแอปเทรด
- เรียกข้อมูลผ่าน **serverMiddleware** (ฝั่งเซิร์ฟเวอร์) + แคช 30 วินาที — ไม่ต้องตั้งค่า key ใด ๆ
- ธีมมืด รองรับมือถือ

## วิธีติดตั้งและรัน

```bash
# 1) ติดตั้ง dependencies
npm install

# 2) รันโหมด dev  (ถ้า PowerShell บล็อก ให้ใช้ npm.cmd run dev)
npm run dev
```

เปิด <http://localhost:3000> — ราคาจะขึ้นเองโดยไม่ต้องตั้งค่าอะไรเพิ่ม

### รันแบบ production

```bash
npm run build
npm run start
```

## โครงสร้างโปรเจกต์

```
├─ pages/index.vue        # หน้าเดียวทั้งหมด (UI + filter + ตาราง)
├─ api/stocks.js          # serverMiddleware ดึงราคาจาก Yahoo Finance
├─ data/stocks.js         # รายชื่อหุ้นที่คัดไว้ + หมวดหมู่
├─ assets/css/main.css    # ธีม/ตัวแปรสี global
└─ nuxt.config.js
```

## ปรับแต่ง

- **เพิ่ม/ลดหุ้น หรือเปลี่ยนหมวด**: แก้ไฟล์ [`data/stocks.js`](data/stocks.js) — แต่ละตัวมี `symbol`, `name`, `tags`
- **เพิ่มหมวดใหม่**: เพิ่มใน `CATEGORIES` (กำหนด `id`, `label`, `color`) แล้วใส่ `id` นั้นใน `tags` ของหุ้น

## หมายเหตุ

- แหล่งราคาคือ **Yahoo Finance** (unofficial endpoint) — ใช้ฟรี ไม่ต้องสมัคร/ไม่ต้องมี key แต่เป็น endpoint ที่ไม่เป็นทางการ จึงอาจมีการเปลี่ยนแปลงหรือจำกัดอัตราเรียกได้ ราคาเป็นแบบหน่วงเวลา (delayed) ไม่ใช่เรียลไทม์ระดับวินาที
- โปรเจกต์ตั้ง `NODE_OPTIONS=--openssl-legacy-provider` ใน scripts แล้ว เพื่อให้ Nuxt 2 (webpack 4) รันได้บน Node เวอร์ชันใหม่
- ข้อมูลราคาเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
