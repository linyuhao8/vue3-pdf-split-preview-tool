<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import PdfPreviewPanel from '@/components/preview/PdfPreviewPanel.vue'
import PdfToolbar from '@/components/preview/PdfToolbar.vue'
import WebsitePreviewPanel from '@/components/preview/WebsitePreviewPanel.vue'

type PdfItem = {
  id: number
  name: string
  url: string
}

// 自動收集 src/assets/pdfs 底下所有 PDF，避免每新增檔案都要手動維護清單。
const pdfModules = import.meta.glob('../assets/pdfs/*.pdf', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

// 把 Vite 收集到的檔案物件轉成畫面可用的 PdfItem 陣列。
const pdfList: PdfItem[] = Object.entries(pdfModules)
  .map(([path, url], index) => {
    const segments = path.split('/')
    const fileName = segments[segments.length - 1] ?? `pdf-${index + 1}.pdf`

    return {
      id: index + 1,
      name: fileName,
      url,
    }
  })
  .sort((left, right) => left.name.localeCompare(right.name))

// 所有頁面層級 state 都集中在這裡，子元件只透過 props / emits 溝通。
const defaultPdf = pdfList[0] ?? null
const activePdfId = ref<number | null>(defaultPdf?.id ?? null)
const isDragging = ref<boolean>(false)

function getInitialLeftPanelWidth(): number {
  // 初始寬度預設抓視窗的 55vw，讓左側一進來就有比較大的預覽空間。
  if (typeof window === 'undefined') {
    return 560
  }

  return Math.round(window.innerWidth * 0.55)
}

const leftPanelWidth = ref<number>(getInitialLeftPanelWidth())

const activePdf = computed<PdfItem | null>(() => {
  // 根據目前 activePdfId 找出真正要顯示的 PDF 物件。
  if (!defaultPdf) {
    return null
  }

  return pdfList.find((item) => item.id === activePdfId.value) ?? defaultPdf
})

function handlePdfChange(pdf: PdfItem): void {
  // 由工具列回傳選中的 PDF，這裡只負責更新主 state。
  activePdfId.value = pdf.id
}

function handlePointerMove(event: PointerEvent): void {
  // 拖曳分隔條時，根據滑鼠位置動態更新左欄寬度。
  if (!isDragging.value) {
    return
  }

  // 加上最小 / 最大寬度，避免其中一欄被拖到幾乎看不到。
  const minWidth = 320
  const maxWidth = window.innerWidth - 320
  leftPanelWidth.value = Math.min(Math.max(event.clientX, minWidth), maxWidth)
}

function handlePointerUp(): void {
  // 放開滑鼠後，停止拖曳並移除全域事件。
  isDragging.value = false
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

function handleResizeStart(event: PointerEvent): void {
  // 按下分隔條時開始監聽全域 pointermove / pointerup。
  isDragging.value = true
  event.preventDefault()

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

onBeforeUnmount(() => {
  // 元件離開前，保險性地清掉拖曳監聽。
  handlePointerUp()
})
</script>

<template>
  <div class="page">
    <!-- 左側網站內容預覽區，寬度會跟著拖曳分隔條改變。 -->
    <section class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
      <WebsitePreviewPanel />
    </section>

    <!-- 中間拖曳條，使用 pointer 事件控制左右欄比例。 -->
    <div
      class="panel-resizer"
      :class="{ 'panel-resizer-active': isDragging }"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      @pointerdown="handleResizeStart"
    />

    <!-- 右側固定由工具列與 PDF 預覽區組成。 -->
    <section class="right-panel">
      <div class="right-toolbar">
        <PdfToolbar :pdf-list="pdfList" :active-id="activePdfId ?? -1" @change="handlePdfChange" />
      </div>

      <div class="right-viewer">
        <PdfPreviewPanel v-if="activePdf" :pdf-url="activePdf.url" />
        <!-- 如果目前沒有任何 PDF，就顯示空狀態提示。 -->
        <div v-else class="empty-state">No PDF files found in `src/assets/pdfs`.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  /* 整頁使用 flex 做左右分割，並且禁止 body 層級捲動。 */
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.left-panel {
  /* 左欄寬度由 inline style 控制，不使用 flex 平分。 */
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
}

.panel-resizer {
  /* 中間拖曳條本身不伸縮，只提供固定熱區給使用者拖曳。 */
  flex: 0 0 8px;
  position: relative;
  cursor: col-resize;
  background: linear-gradient(180deg, #e2e8f0, #cbd5e1);
}

.panel-resizer::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 48px;
  border-radius: 999px;
  background: rgba(71, 85, 105, 0.45);
  transform: translate(-50%, -50%);
}

.panel-resizer-active {
  background: linear-gradient(180deg, #93c5fd, #60a5fa);
}

.right-panel {
  /* 右欄吃掉剩餘空間，並切成工具列 + viewer 上下結構。 */
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #eef2f7;
}

.right-toolbar {
  flex: 0 0 64px;
  min-height: 64px;
  border-bottom: 1px solid #ddd;
  overflow-x: auto;
  overflow-y: hidden;
  background: #fff;
}

.right-viewer {
  /* PDF 區自己的捲動發生在這裡，不讓整頁 body scroll。 */
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.empty-state {
  padding: 24px;
  color: #475569;
}
</style>
