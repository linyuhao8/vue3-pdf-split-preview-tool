# vue-pdf-split

這個專案的重點頁面是 `/preview`，畫面分成左右兩欄：

- 左側：網站內容預覽
- 右側：PDF 選擇列 + PDF 預覽區

---

## 快速開始

```sh
npm install
npm run dev
```

開啟：

```txt
http://localhost:5173/preview
```

---

## 目前最重要的檔案

- [src/views/PreviewPage.vue](src/views/PreviewPage.vue)
  頁面主控，管理 PDF 清單與目前選中的 PDF
- [src/components/preview/PdfToolbar.vue](src/components/preview/PdfToolbar.vue)
  右上 PDF 切換區
- [src/components/preview/PdfPreviewPanel.vue](src/components/preview/PdfPreviewPanel.vue)
  PDF.js 載入與渲染核心
- [src/components/preview/WebsitePreviewPanel.vue](src/components/preview/WebsitePreviewPanel.vue)
  左側假網站內容

---

## 畫面結構圖

```text
/preview
├─ left-panel
│  └─ WebsitePreviewPanel
└─ right-panel
   ├─ right-toolbar
   │  └─ PdfToolbar
   └─ right-viewer
      └─ PdfPreviewPanel
```

---

## 資料流

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
-> 重新載入並顯示新 PDF
```

---

## PDF 是怎麼來的

PDF 檔案放在：

```txt
src/assets/pdfs
```

程式會用 `import.meta.glob()` 自動收集資料夾內的所有 PDF，所以之後新增 PDF 不用再手動改 `pdfList`。

流程：

```text
新增 PDF 到 src/assets/pdfs
-> Vite 重新編譯
-> PreviewPage 自動收到新的 PDF 清單
-> PdfToolbar 自動多出新選項
```

---

## PDF 預覽流程圖

```text
進入 /preview
-> PreviewPage 建立 pdfList
-> 決定預設 activePdf
-> PdfPreviewPanel 收到 pdfUrl
-> loadPdf(url)
   -> 清掉舊狀態
   -> fetch PDF
   -> getDocument({ data })
   -> 建立 pageStates
   -> nextTick()
   -> 先渲染前 3 頁
   -> 建立 IntersectionObserver
-> 往下捲時再 lazy render 後面的頁面
```

---

## 主要 function 說明

### `PreviewPage.vue`

- `handlePdfChange(pdf)`
  當使用者切換 PDF 時，更新目前選中的 PDF id。

### `PdfToolbar.vue`

- `handleClick(pdf)`
  按下某個 PDF 按鈕時，把該 PDF 往上層送出去。

- `handleSelect(value)`
  使用下拉選單切換時，找出對應 PDF，並往上層送出去。

### `PdfPreviewPanel.vue`

- `loadPdf(url)`
  PDF 載入主流程。會先清掉上一份 PDF，再抓新 PDF，建立頁面狀態，最後開始渲染。

- `renderPage(pageNumber, token)`
  負責把某一頁真正畫到 canvas 上。

- `setupObserver(token)`
  建立 `IntersectionObserver`，當頁面快進入可視區時才渲染，減少一次畫太多頁。

- `clearRenderState()`
  清除舊的 render 狀態，避免切換 PDF 時殘留上一份資料。

- `destroyCurrentDocument()`
  銷毀上一份 PDF.js document，避免記憶體與狀態殘留。

- `getCanvasElement(pageNumber)`
  根據頁碼找到對應的 canvas DOM。

- `setPageRendered(pageNumber)`
  將某一頁標記成「已經畫完」，讓 placeholder 消失。

---

## 為什麼之前會卡在 `Rendering...`

不是路徑錯，而是 render 時機錯。

舊流程是：

```text
pageStates 建好
-> canvas 還沒真的出現在 DOM
-> renderPage() 太早執行
-> 找不到 canvas
-> rendered 沒變 true
-> 一直停在 Rendering...
```

現在修正後是：

```text
先建立 pageStates
-> nextTick()
-> canvas 已經出現在 DOM
-> 再開始 render 前 3 頁
```

---

## 如果之後要改成 API

現在是：

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

到時候主要只需要改 `PreviewPage.vue` 取得 `pdfList` 的方式，`PdfToolbar.vue` 和 `PdfPreviewPanel.vue` 幾乎可以不動。
