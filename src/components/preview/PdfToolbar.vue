<script setup lang="ts">
type PdfItem = {
  id: number
  name: string
  url: string
}

// 這個元件不自己管理狀態，所有資料都從父層傳進來。
const props = defineProps<{
  pdfList: PdfItem[]
  activeId: number
}>()

// 使用者選到新的 PDF 時，只往外 emit，實際 state 更新交給父層處理。
const emit = defineEmits<{
  (e: 'change', pdf: PdfItem): void
}>()

function handleClick(pdf: PdfItem): void {
  // 快速按鈕點擊後，直接把選中的 PDF 回傳給父層。
  emit('change', pdf)
}

function handleSelect(value: number | null): void {
  // 下拉選單回來的是 id，所以要先從清單中找回完整的 PdfItem。
  const target = props.pdfList.find((item) => item.id === value)

  if (target) {
    emit('change', target)
  }
}
</script>

<template>
  <div class="toolbar-shell">
    <!-- 左側說明區，讓使用者知道這一排是 PDF 切換工具列。 -->
    <div class="toolbar-title-group">
      <div class="toolbar-title">Choose PDF</div>
      <div class="toolbar-subtitle">Switch files from the dropdown or quick buttons.</div>
    </div>

    <!-- 下拉選單適合 PDF 多的情境，避免按鈕列過長。 -->
    <div class="toolbar-select">
      <v-select
        :items="props.pdfList"
        :model-value="props.activeId"
        density="compact"
        hide-details
        item-title="name"
        item-value="id"
        label="PDF file"
        variant="outlined"
        @update:model-value="handleSelect"
      />
    </div>

    <!-- 快速按鈕列適合常用文件切換，active 項目會有高亮樣式。 -->
    <div class="toolbar-list">
      <button
        v-for="pdf in props.pdfList"
        :key="pdf.id"
        :class="['toolbar-button', { 'toolbar-button-active': pdf.id === props.activeId }]"
        type="button"
        @click="handleClick(pdf)"
      >
        {{ pdf.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-shell {
  /* 工具列本身可以超出右欄寬度，讓外層負責水平捲動。 */
  height: 100%;
  min-width: max-content;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: linear-gradient(90deg, #ffffff, #f8fafc);
}

.toolbar-title-group {
  flex: 0 0 auto;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.toolbar-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
}

.toolbar-select {
  /* 固定一段寬度給下拉選單，避免被按鈕列擠壓得太小。 */
  flex: 0 0 240px;
}

.toolbar-list {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: max-content;
}

.toolbar-button {
  /* 使用原生 button，比單純文字標籤更像「可點擊切換」的控制項。 */
  flex: 0 0 auto;
  min-width: 108px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.toolbar-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.toolbar-button-active {
  border-color: #1976d2;
  background: #1976d2;
  color: #ffffff;
}
</style>
