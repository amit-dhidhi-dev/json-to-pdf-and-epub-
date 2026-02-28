import React, { useState } from 'react'
import JSONUploader from './components/JSONUploader'
import BookViewer from './components/BookViewer'
import { Library, FileText, BookOpen, Palette } from 'lucide-react'
import { generateEpub } from './utils/epubExporter'

const TEMPLATES = [
  { id: 'literary', label: '📖 Literary' },
  { id: 'thriller', label: '🔪 Thriller' },
  { id: 'romance', label: '🌹 Romance' },
  { id: 'academic', label: '🎓 Academic' },
  { id: 'nonfiction', label: '📊 Non-Fiction' },
]

const A4_W_MM = 210
const A4_H_MM = 297
const MARGIN_MM = 14
const PAGE_H_MM = A4_H_MM - MARGIN_MM * 2  // 269 mm usable height

/**
 * Given a canvas and a target cut row (in canvas pixels),
 * scan upward to find the nearest row that is ALL white (blank interline space).
 * Returns ≤ targetPx. Falls back to targetPx if nothing found.
 */
function findSafeBreakRow(canvas, targetPx, maxLookback = 80) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const low = Math.max(0, targetPx - maxLookback)

  for (let y = targetPx; y >= low; y--) {
    const { data } = ctx.getImageData(0, y, w, 1)
    let allWhite = true
    for (let i = 0; i < data.length; i += 4) {
      // If any pixel is not near-white, this row contains text/ink
      if (data[i] < 230 || data[i + 1] < 230 || data[i + 2] < 230) {
        allWhite = false
        break
      }
    }
    if (allWhite) return y
  }
  return targetPx  // fallback
}

async function renderSection(section, html2canvas) {
  return html2canvas(section, {
    scale: 1.0,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })
}

async function generatePDFSectionBySection(filename) {
  const { jsPDF } = await import('jspdf')
  const html2canvas = (await import('html2canvas')).default

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = A4_W_MM - MARGIN_MM * 2   // 182 mm usable width

  const container = document.getElementById('book-export-container')
  if (!container) throw new Error('Book container not found')

  const sections = Array.from(
    container.querySelectorAll('.cover-page, .book-section')
  )
  if (sections.length === 0) throw new Error('No book sections found')

  let firstPage = true
  let currentPage = 1
  const chapterPageMap = {}
  const tocPageNum = { value: null }

  for (const section of sections) {
    const canvas = await renderSection(section, html2canvas)
    const imgW = canvas.width
    const imgH = canvas.height
    const ratio = pageW / imgW          // mm per canvas-px
    const maxPxPerPage = Math.round(PAGE_H_MM / ratio)  // canvas-px that fill one page
    const sId = section.id

    // Slice canvas into pages using smart whitespace-aware breaks
    let srcY = 0         // canvas-px from where we start reading next slice
    let isFirstSlice = true

    while (srcY < imgH) {
      if (!firstPage) { pdf.addPage(); currentPage++ }
      firstPage = false

      // Track section pages AFTER addPage so currentPage is correct
      if (isFirstSlice) {
        if (sId && sId.startsWith('chapter-')) {
          const num = parseInt(sId.split('-')[1], 10)
          if (!isNaN(num)) chapterPageMap[num] = currentPage
        }
        if (section.classList.contains('toc-section')) tocPageNum.value = currentPage
        isFirstSlice = false
      }

      const rawEnd = srcY + maxPxPerPage   // ideal cut point

      let cutPx
      if (rawEnd >= imgH) {
        cutPx = imgH   // last slice — take everything remaining
      } else {
        cutPx = findSafeBreakRow(canvas, rawEnd)
      }

      const sliceH = cutPx - srcY
      if (sliceH <= 0) break   // safety guard

      const slice = document.createElement('canvas')
      slice.width = imgW
      slice.height = sliceH
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, imgW, sliceH)
      ctx.drawImage(canvas, 0, -srcY)

      const imgData = slice.toDataURL('image/jpeg', 0.80)
      const sliceMM = sliceH * ratio
      pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, pageW, sliceMM)

      srcY = cutPx   // advance to where we cut
    }
  }

  // ── Add TOC hyperlink annotations ───────────────────────────
  if (tocPageNum.value !== null) {
    const tocSec = container.querySelector('.toc-section')
    if (tocSec) {
      const tocLinks = tocSec.querySelectorAll('a[href^="#chapter-"]')
      if (tocLinks.length > 0) {
        const tocCanvas = await renderSection(tocSec, html2canvas)
        const tocRatio = pageW / tocCanvas.width
        const contRect = tocSec.getBoundingClientRect()

        pdf.setPage(tocPageNum.value)
        tocLinks.forEach(link => {
          const chapNum = parseInt(link.getAttribute('href').replace('#chapter-', ''), 10)
          const targetPg = chapterPageMap[chapNum]
          if (!targetPg) return

          const r = link.getBoundingClientRect()
          const relX = (r.left - contRect.left) * tocRatio
          const relY = (r.top - contRect.top) * tocRatio

          pdf.link(
            MARGIN_MM + relX,
            MARGIN_MM + relY,
            r.width * tocRatio,
            r.height * tocRatio,
            { pageNumber: targetPg }
          )
        })
      }
    }
  }

  pdf.save(filename)
}

function App() {
  const [bookData, setBookData] = useState(null)
  const [coverImageSrc, setCoverImageSrc] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [template, setTemplate] = useState('literary')

  const handleDataLoaded = (data, cover) => { setBookData(data); setCoverImageSrc(cover) }
  const handleReset = () => { setBookData(null); setCoverImageSrc(null) }

  const downloadPDF = async () => {
    try {
      setIsExporting(true)
      await new Promise(r => setTimeout(r, 200))
      await generatePDFSectionBySection(`${bookData.new_title || 'book'}.pdf`)
    } catch (err) {
      console.error('PDF Export failed:', err)
      alert(`PDF generation failed: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const downloadEPUB = async () => {
    try {
      setIsExporting(true)
      await generateEpub(bookData, coverImageSrc)
    } catch (err) {
      console.error('EPUB Export failed:', err)
      alert('EPUB generation failed.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <Library size={24} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
          NovaScript Formatter
        </div>
        <div className="actions">
          {bookData ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="template-selector">
                <Palette size={16} style={{ color: 'var(--accent-color)' }} />
                <select value={template} onChange={e => setTemplate(e.target.value)}
                  disabled={isExporting} className="template-select">
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <button className="btn" onClick={handleReset} disabled={isExporting}>Close Book</button>
              <button className="btn" onClick={downloadPDF} disabled={isExporting}>
                <FileText size={16} />
                {isExporting ? 'Generating…' : 'PDF'}
              </button>
              <button className="btn btn-primary" onClick={downloadEPUB} disabled={isExporting}>
                <BookOpen size={16} />
                {isExporting ? 'Generating…' : 'EPUB'}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!bookData ? (
          <JSONUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <BookViewer bookData={bookData} coverImageSrc={coverImageSrc} template={template} />
        )}
      </main>
    </>
  )
}

export default App
