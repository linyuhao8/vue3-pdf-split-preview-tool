# vue-pdf-split

## English

This project is a Vue 3 + Vite + Vuetify + TypeScript demo for a split preview page at `/preview`.

It contains:

- A left website preview panel
- A resizable divider in the middle
- A right PDF toolbar and PDF preview panel
- PDF.js canvas rendering with lazy loading

### Quick Start

```sh
npm install
npm run dev
```

Open:

```txt
http://localhost:5173/preview
```

### Main Files

- [src/views/PreviewPage.vue](src/views/PreviewPage.vue)
  Main page controller, layout, PDF list, active PDF state
- [src/components/preview/PdfToolbar.vue](src/components/preview/PdfToolbar.vue)
  PDF selection UI
- [src/components/preview/PdfPreviewPanel.vue](src/components/preview/PdfPreviewPanel.vue)
  PDF.js loading and rendering logic
- [src/components/preview/WebsitePreviewPanel.vue](src/components/preview/WebsitePreviewPanel.vue)
  Mock website content for the left panel

### Layout Diagram

```text
/preview
├─ left-panel
│  └─ WebsitePreviewPanel
├─ panel-resizer
└─ right-panel
   ├─ right-toolbar
   │  └─ PdfToolbar
   └─ right-viewer
      └─ PdfPreviewPanel
```

### Data Flow

```text
PreviewPage
├─ pdfList
├─ activePdfId
├─ activePdf
├─ PdfToolbar
│  └─ emit('change', pdf)
└─ PdfPreviewPanel
   └─ props.pdfUrl
```

Flow:

```text
User selects a PDF
-> PdfToolbar emits change
-> PreviewPage updates activePdfId
-> activePdf changes
-> PdfPreviewPanel receives a new pdfUrl
-> PDF is loaded and rendered again
```

### Where PDFs Come From

PDF files are auto-discovered from:

```txt
src/assets/pdfs
```

The project uses:

```ts
import.meta.glob('../assets/pdfs/*.pdf', {
  eager: true,
  import: 'default',
  query: '?url',
})
```

So when you add a new PDF into `src/assets/pdfs`, it appears automatically in the toolbar.

### PDF Rendering Flow

```text
Enter /preview
-> PreviewPage builds pdfList
-> PreviewPage decides activePdf
-> PdfPreviewPanel receives pdfUrl
-> loadPdf(url)
   -> clear old state
   -> fetch PDF
   -> getDocument({ data })
   -> create pageStates
   -> nextTick()
   -> render first 3 pages
   -> setup IntersectionObserver
-> remaining pages are lazy rendered on scroll
```

### Main Functions

#### `PreviewPage.vue`

- `handlePdfChange(pdf)`
  Updates the active PDF id after the toolbar emits a new PDF.

#### `PdfToolbar.vue`

- `handleClick(pdf)`
  Emits the clicked PDF item upward.

- `handleSelect(value)`
  Emits the selected PDF item from the dropdown.

#### `PdfPreviewPanel.vue`

- `loadPdf(url)`
  Main PDF loading flow. Clears old state, fetches the new file, creates page state, and starts rendering.

- `renderPage(pageNumber, token)`
  Renders one PDF page into one canvas.

- `setupObserver(token)`
  Creates an `IntersectionObserver` to lazy render pages near the viewport.

- `clearRenderState()`
  Clears previous rendering state when switching PDFs.

- `destroyCurrentDocument()`
  Destroys the previous PDF.js document instance.

- `getCanvasElement(pageNumber)`
  Finds the real canvas element for the target page.

- `setPageRendered(pageNumber)`
  Marks a page as rendered so its placeholder disappears.

### Future API Version

Current source:

```text
src/assets/pdfs
-> import.meta.glob()
-> pdfList
```

Future source:

```text
API
-> fetch('/api/pdfs')
-> pdfList
```

Only `PreviewPage.vue` should need major changes when switching to an API source.

---

## 中文

這個專案是 Vue 3 + Vite + Vuetify + TypeScript 的 PDF 分割預覽範例，主要頁面在 `/preview`。

畫面包含：

- 左側網站內容預覽
- 中間可拖曳分隔條
- 右側 PDF 工具列與 PDF 預覽區
- 使用 PDF.js 將 PDF 畫到 canvas

### 快速開始

```sh
npm install
npm run dev
```

開啟：

```txt
http://localhost:5173/preview
```

### 核心檔案

- [src/views/PreviewPage.vue](src/views/PreviewPage.vue)
  頁面主控、版面、PDF 清單、目前選中的 PDF
- [src/components/preview/PdfToolbar.vue](src/components/preview/PdfToolbar.vue)
  PDF 選擇介面
- [src/components/preview/PdfPreviewPanel.vue](src/components/preview/PdfPreviewPanel.vue)
  PDF.js 載入與渲染核心
- [src/components/preview/WebsitePreviewPanel.vue](src/components/preview/WebsitePreviewPanel.vue)
  左側網站假內容

### 畫面結構圖

```text
/preview
├─ left-panel
│  └─ WebsitePreviewPanel
├─ panel-resizer
└─ right-panel
   ├─ right-toolbar
   │  └─ PdfToolbar
   └─ right-viewer
      └─ PdfPreviewPanel
```

### 資料流

```text
PreviewPage
├─ pdfList
├─ activePdfId
├─ activePdf
├─ PdfToolbar
│  └─ emit('change', pdf)
└─ PdfPreviewPanel
   └─ props.pdfUrl
```

流程：

```text
使用者選 PDF
-> PdfToolbar emit change
-> PreviewPage 更新 activePdfId
-> activePdf 改變
-> PdfPreviewPanel 收到新的 pdfUrl
-> 重新載入並渲染 PDF
```

### PDF 從哪裡來

PDF 檔案會從這裡自動收集：

```txt
src/assets/pdfs
```

程式使用：

```ts
import.meta.glob('../assets/pdfs/*.pdf', {
  eager: true,
  import: 'default',
  query: '?url',
})
```

所以你只要把新的 PDF 放進 `src/assets/pdfs`，工具列就會自動出現。

### PDF 載入流程

```text
進入 /preview
-> PreviewPage 建立 pdfList
-> PreviewPage 決定 activePdf
-> PdfPreviewPanel 收到 pdfUrl
-> loadPdf(url)
   -> 清掉舊狀態
   -> fetch PDF
   -> getDocument({ data })
   -> 建立 pageStates
   -> nextTick()
   -> 先渲染前 3 頁
   -> 建立 IntersectionObserver
-> 後續頁面在捲動時 lazy render
```

### 主要 function

#### `PreviewPage.vue`

- `handlePdfChange(pdf)`
  當工具列送出新 PDF 時，更新目前選中的 PDF id。

#### `PdfToolbar.vue`

- `handleClick(pdf)`
  點按鈕時，把選中的 PDF 往上層送出去。

- `handleSelect(value)`
  用下拉選單切換時，把選中的 PDF 往上層送出去。

#### `PdfPreviewPanel.vue`

- `loadPdf(url)`
  PDF 載入主流程。會先清掉上一份 PDF，再抓新 PDF、建立頁面狀態並開始渲染。

- `renderPage(pageNumber, token)`
  把某一頁 PDF 畫到對應的 canvas。

- `setupObserver(token)`
  建立 `IntersectionObserver`，接近可視區時才渲染頁面。

- `clearRenderState()`
  清掉前一份 PDF 的渲染狀態。

- `destroyCurrentDocument()`
  銷毀前一份 PDF.js document。

- `getCanvasElement(pageNumber)`
  找出指定頁碼對應的 canvas DOM。

- `setPageRendered(pageNumber)`
  標記某一頁已渲染完成，讓 placeholder 消失。

### 之後如果改成 API

現在：

```text
src/assets/pdfs
-> import.meta.glob()
-> pdfList
```

之後可以改成：

```text
API
-> fetch('/api/pdfs')
-> pdfList
```

到時候主要只需要改 `PreviewPage.vue` 取得 `pdfList` 的方式，`PdfToolbar.vue` 和 `PdfPreviewPanel.vue` 幾乎不用大改。
