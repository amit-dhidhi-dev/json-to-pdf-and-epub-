# 📖 NovaScript Book Formatter

A fully offline web application that converts JSON book data into beautifully formatted **PDF** and **EPUB** files. No server needed — everything runs in your browser.

---

## ✨ Features

- 📂 Upload a JSON file and (optionally) a cover image
- 🎨 Choose from **5 design templates**: Literary, Thriller, Romance, Academic, Non-Fiction
- 📄 Export to **PDF** with clickable Table of Contents
- 📚 Export to **EPUB** with workable TOC and copyright page
- 🔒 100% client-side — your data never leaves your device

---

## 📋 JSON Format

Your JSON file must follow this structure:

```json
{
  "new_title": "My Book Title",
  "new_author": "Author Name",
  "genre": "Fiction",
  "themes": ["Love", "Redemption"],
  "foreword": "Optional foreword text...",
  "preface": "Optional preface text...",
  "acknowledgements": "Optional acknowledgements text...",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Chapter Title",
      "content": "Full chapter text goes here.\n\nSeparate paragraphs with a blank line (double newline)."
    },
    {
      "chapter_number": 2,
      "title": "The Next Chapter",
      "content": "More content..."
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `new_title` | string | ✅ | Book title |
| `new_author` | string | ✅ | Author name |
| `genre` | string | ❌ | Genre label shown on title page |
| `themes` | string[] | ❌ | Theme tags shown on title page |
| `foreword` | string | ❌ | Foreword text (shown before chapters) |
| `preface` | string | ❌ | Preface text (shown before chapters) |
| `acknowledgements` | string | ❌ | Acknowledgements (shown at end) |
| `chapters` | array | ✅ | List of chapter objects |
| `chapters[].chapter_number` | number | ✅ | Chapter number |
| `chapters[].title` | string | ❌ | Chapter title |
| `chapters[].content` | string | ✅ | Chapter body text (use `\n\n` for paragraph breaks) |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder — just open `index.html` in any browser.

---

## 🧰 Tech Stack

- **React + Vite** — UI framework
- **jsPDF + html2canvas** — PDF generation (section-by-section rendering)
- **JSZip + FileSaver** — EPUB generation
- **Lucide React** — Icons
