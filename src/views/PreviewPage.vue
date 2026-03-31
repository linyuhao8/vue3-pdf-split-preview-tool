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

const pdfModules = import.meta.glob('../assets/pdfs/*.pdf', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

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

// Keep all page-level state here and only pass data down via props.
const defaultPdf = pdfList[0] ?? null
const activePdfId = ref<number | null>(defaultPdf?.id ?? null)
const isDragging = ref<boolean>(false)

function getInitialLeftPanelWidth(): number {
  if (typeof window === 'undefined') {
    return 560
  }

  return Math.round(window.innerWidth * 0.55)
}

const leftPanelWidth = ref<number>(getInitialLeftPanelWidth())

const activePdf = computed<PdfItem | null>(() => {
  if (!defaultPdf) {
    return null
  }

  return pdfList.find((item) => item.id === activePdfId.value) ?? defaultPdf
})

function handlePdfChange(pdf: PdfItem): void {
  activePdfId.value = pdf.id
}

function handlePointerMove(event: PointerEvent): void {
  if (!isDragging.value) {
    return
  }

  const minWidth = 320
  const maxWidth = window.innerWidth - 320
  leftPanelWidth.value = Math.min(Math.max(event.clientX, minWidth), maxWidth)
}

function handlePointerUp(): void {
  isDragging.value = false
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

function handleResizeStart(event: PointerEvent): void {
  isDragging.value = true
  event.preventDefault()

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

onBeforeUnmount(() => {
  handlePointerUp()
})
</script>

<template>
  <div class="page">
    <section class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
      <WebsitePreviewPanel />
    </section>

    <div
      class="panel-resizer"
      :class="{ 'panel-resizer-active': isDragging }"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      @pointerdown="handleResizeStart"
    />

    <section class="right-panel">
      <div class="right-toolbar">
        <PdfToolbar :pdf-list="pdfList" :active-id="activePdfId ?? -1" @change="handlePdfChange" />
      </div>

      <div class="right-viewer">
        <PdfPreviewPanel v-if="activePdf" :pdf-url="activePdf.url" />
        <div v-else class="empty-state">No PDF files found in `src/assets/pdfs`.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
}

.panel-resizer {
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
