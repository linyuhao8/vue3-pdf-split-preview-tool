<script setup lang="ts">
// 左側網站預覽的欄位定義，用來模擬真實後台表格。
const columns = [
  'Campaign',
  'Owner',
  'Region',
  'Language',
  'Status',
  'Audience',
  'Traffic',
  'Revenue',
  'Conversion',
  'Updated At',
]

// 建立較寬的假資料表，方便測試水平捲動是否只發生在左側預覽區。
const rows = Array.from({ length: 24 }, (_, index) => {
  const sequence = index + 1

  return {
    id: sequence,
    campaign: `Spring Launch ${sequence.toString().padStart(2, '0')}`,
    owner: `Team ${String.fromCharCode(65 + (index % 6))}`,
    region: ['TW', 'JP', 'US', 'EU'][index % 4],
    language: ['ZH-TW', 'JA', 'EN', 'DE'][index % 4],
    status: ['Draft', 'Review', 'Live'][index % 3],
    audience: `${1200 + sequence * 75}`,
    traffic: `${32000 + sequence * 830}`,
    revenue: `$${(18000 + sequence * 920).toLocaleString()}`,
    conversion: `${(1.8 + sequence * 0.12).toFixed(2)}%`,
    updatedAt: `2026-03-${((sequence % 28) + 1).toString().padStart(2, '0')} 14:${(sequence % 6) * 10}`,
  }
})

// 建立較長的文章段落，方便測試垂直捲動是否只發生在左側預覽區。
const articleSections = Array.from({ length: 12 }, (_, index) => {
  const sectionNumber = index + 1

  return {
    title: `Section ${sectionNumber}`,
    body:
      'This mock paragraph simulates a real website module with dense copy, descriptive labels, and enough text to verify long-form scrolling behavior inside the left preview panel.',
  }
})
</script>

<template>
  <div class="website-preview">
    <!-- 首屏摘要區，模擬一般網站首頁常見的 banner / hero 區塊。 -->
    <section class="hero-section">
      <p class="eyebrow">Marketing Site Preview</p>
      <h1 class="hero-title">Quarterly campaign dashboard with long and wide content</h1>
      <p class="hero-text">
        This panel intentionally contains a lot of content and an extra-wide data table so we can
        verify both vertical and horizontal scrolling without affecting the page body.
      </p>
    </section>

    <!-- 摘要數據卡片，讓左側畫面看起來更像真實商業頁面。 -->
    <section class="stats-strip">
      <article class="stat-card">
        <span class="stat-label">Visitors</span>
        <strong class="stat-value">128,420</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Leads</span>
        <strong class="stat-value">7,532</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Orders</span>
        <strong class="stat-value">2,184</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Satisfaction</span>
        <strong class="stat-value">94.6%</strong>
      </article>
    </section>

    <!-- 寬表格區，重點是測試橫向捲動與 min-width 設定。 -->
    <section class="content-section">
      <div class="section-heading">
        <h2>Wide Planning Table</h2>
        <p>Use horizontal scroll here to test wide-content behavior.</p>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.campaign }}</td>
              <td>{{ row.owner }}</td>
              <td>{{ row.region }}</td>
              <td>{{ row.language }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.audience }}</td>
              <td>{{ row.traffic }}</td>
              <td>{{ row.revenue }}</td>
              <td>{{ row.conversion }}</td>
              <td>{{ row.updatedAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 長內容區，重點是測試縱向捲動與連續區塊閱讀感。 -->
    <section class="content-section">
      <div class="section-heading">
        <h2>Long Editorial Content</h2>
        <p>Use vertical scroll here to verify long-page behavior.</p>
      </div>

      <article v-for="section in articleSections" :key="section.title" class="article-card">
        <h3>{{ section.title }}</h3>
        <p>{{ section.body }}</p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae justo nisi. Curabitur
          feugiat ligula sed aliquet ultricies. Integer finibus sem vitae arcu luctus, ac tempor
          augue faucibus. Suspendisse potenti. Duis non luctus lacus, id fermentum ipsum.
        </p>
        <p>
          Cras imperdiet urna at tellus vestibulum, sed tristique purus pretium. Integer vel luctus
          libero. Morbi suscipit, orci non posuere suscipit, risus sem cursus lorem, id luctus
          ipsum nibh in lectus. Vestibulum hendrerit lorem at odio pulvinar tempor.
        </p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.website-preview {
  /* 整體故意做得比左欄常見寬度更寬，讓水平捲動更容易被測到。 */
  min-width: 1280px;
  padding: 24px;
  color: #0f172a;
}

.hero-section {
  padding: 28px;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(14, 116, 144, 0.12), rgba(30, 64, 175, 0.08)),
    #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

.hero-title {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
}

.hero-text {
  max-width: 760px;
  margin-top: 12px;
  font-size: 15px;
  color: #475569;
}

.stats-strip {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.stat-card {
  flex: 1;
  min-width: 220px;
  padding: 20px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  display: block;
  margin-top: 10px;
  font-size: 28px;
  font-weight: 800;
}

.content-section {
  margin-top: 28px;
  padding: 24px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.section-heading p {
  margin-top: 6px;
  color: #64748b;
}

.table-scroll {
  /* 只讓表格區自己負責水平捲動，避免破壞外層 layout。 */
  overflow-x: auto;
  margin-top: 18px;
}

.data-table {
  /* 故意比容器更寬，確保會出現 horizontal scroll。 */
  width: 100%;
  min-width: 1440px;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.data-table th {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
}

.article-card + .article-card {
  margin-top: 20px;
}

.article-card h3 {
  margin-bottom: 10px;
  font-size: 22px;
  font-weight: 700;
}

.article-card p + p {
  margin-top: 10px;
}
</style>
