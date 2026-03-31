<script setup lang="ts">
import { computed, ref } from 'vue'

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

const activePdf = computed<PdfItem | null>(() => {
  if (!defaultPdf) {
    return null
  }

  return pdfList.find((item) => item.id === activePdfId.value) ?? defaultPdf
})

function handlePdfChange(pdf: PdfItem): void {
  activePdfId.value = pdf.id
}
</script>

<template>
  <div class="page">
    <section class="left-panel">
      <WebsitePreviewPanel />
    </section>

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
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border-right: 1px solid #ddd;
  background: #f8fafc;
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
