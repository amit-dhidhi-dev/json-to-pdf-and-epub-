import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateEpub = async (bookData, coverImageSrc) => {
  const {
    new_title = "Untitled",
    new_author = "Unknown Author",
    genre = "Fiction",
    chapters = [],
    foreword,
    preface,
    acknowledgements
  } = bookData;

  const zip = new JSZip();

  // 1. mimetype (Must be uncompressed, first file in archive)
  zip.file("mimetype", "application/epub+zip");

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file("META-INF/container.xml", containerXml);

  const oebps = zip.folder("OEBPS");

  // CSS
  const css = `
    body { font-family: 'Lora', Georgia, serif; line-height: 1.6; padding: 2% 5%; text-align: justify; }
    h1, h2, h3 { font-family: 'Playfair Display', serif; text-align: center; }
    .title-page { text-align: center; margin-top: 20%; }
    p { margin-bottom: 1em; text-indent: 1.5em; }
    p:first-of-type { text-indent: 0; }
    .cover-image { width: 100%; height: auto; max-height: 100vh; object-fit: contain; }
  `;
  oebps.file("style.css", css);

  // Chapters & Sections HTML Generation
  const htmlFiles = [];
  const manifestItems = [];
  const spineItems = [];
  let navPointId = 1;
  const navPoints = [];

  const addHtmlFile = (filename, title, htmlContent) => {
    const fullHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
    oebps.file(filename, fullHtml);
    htmlFiles.push(filename);
    const id = filename.replace('.xhtml', '');
    manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);

    // Add to TOC
    navPoints.push(`
      <navPoint id="navPoint-${navPointId}" playOrder="${navPointId}">
        <navLabel><text>${title}</text></navLabel>
        <content src="${filename}"/>
      </navPoint>
    `);
    navPointId++;
  };

  const renderContent = (ctnt) => {
    if (!ctnt) return '';
    return ctnt.split('\\n\\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('\\n');
  };

  // Process Cover
  if (coverImageSrc) {
    try {
      // Extract base64 part if it's a data URL
      const base64Data = coverImageSrc.split(',')[1];
      let extension = 'jpg';
      let mediaType = 'image/jpeg';
      if (coverImageSrc.includes('image/png')) {
        extension = 'png';
        mediaType = 'image/png';
      }

      const coverFileName = `cover.${extension}`;
      oebps.file(coverFileName, base64Data, { base64: true });
      manifestItems.push(`<item id="cover-image" href="${coverFileName}" media-type="${mediaType}" properties="cover-image"/>`);

      addHtmlFile('cover.xhtml', 'Cover', `<div style="text-align: center; padding: 0; margin: 0;"><img class="cover-image" src="${coverFileName}" alt="Cover"/></div>`);

      // Mark the first file as cover in spine
      spineItems[0] = `<itemref idref="cover" linear="yes"/>`;
    } catch (e) {
      console.warn("Could not process cover image for EPUB", e);
    }
  }

  // Title Page
  const titleHtml = `
    <div class="title-page">
      <h2>${genre}</h2>
      <h1>${new_title}</h1>
      <h3>by ${new_author}</h3>
    </div>
  `;
  addHtmlFile('title.xhtml', 'Title Page', titleHtml);

  // Copyright Page
  const currentYear = new Date().getFullYear();
  const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const fakeIsbn = Math.random().toString(36).substring(2, 10).toUpperCase() + '-XX';

  const copyrightHtml = `
  <div style="text-align: center; margin-top: 20%; font-size: 0.9em; color: #555;">
    <p>Copyright &copy; ${currentYear} ${new_author}</p>
    <br />
    <p>All rights reserved. No portion of this book may be reproduced, stored in a retrieval system, or transmitted in any form or by any means without prior written permission from the author.</p>
    <br />
    <p>This is a work of fiction. Names, characters, places, and incidents are either products of the author's imagination or are used fictitiously.</p>
    <br />
    <p>First published: ${currentMonthYear}</p>
    <p>ISBN: ${fakeIsbn}</p>
  </div>
`;
  addHtmlFile('copyright.xhtml', 'Copyright', copyrightHtml);

  if (foreword) addHtmlFile('foreword.xhtml', 'Foreword', `<h2>Foreword</h2>${renderContent(foreword)}`);
  if (preface) addHtmlFile('preface.xhtml', 'Preface', `<h2>Preface</h2>${renderContent(preface)}`);

  // TOC HTML Page (for Spine)
  let tocHtmlContent = `<h2 style="text-align: center; margin-bottom: 2em;">Table of Contents</h2>`;
  tocHtmlContent += `<ul style="list-style-type: none; padding: 0; text-align: center;">`;
  chapters.forEach((chap) => {
    tocHtmlContent += `<li style="margin-bottom: 1em;">
            <a href="chapter_${chap.chapter_number}.xhtml" style="text-decoration: none; color: inherit;">
                Chapter ${chap.chapter_number}${chap.title ? `: ${chap.title}` : ''}
            </a>
        </li>`;
  });
  tocHtmlContent += `</ul>`;
  addHtmlFile('toc_page.xhtml', 'Table of Contents', tocHtmlContent);

  // Spine Configuration overrides (manually ensuring priority)
  // spineItems array was populated chronologically via addHtmlFile calls.
  // The current order is: [cover (if any), title, copyright, foreword?, preface?, toc_page, chapters..., acknowledgements?]
  // We already replace [0] with 'cover' specifically if cover exists.

  // Chapters
  chapters.forEach((chap) => {
    const chTitle = chap.title ? `<h2>${chap.title}</h2>` : '';
    const chNum = `<h3>Chapter ${chap.chapter_number}</h3>`;
    const chHtml = chNum + chTitle + renderContent(chap.content);
    addHtmlFile(`chapter_${chap.chapter_number}.xhtml`, `Chapter ${chap.chapter_number}`, chHtml);
  });

  if (acknowledgements) addHtmlFile('acknowledgements.xhtml', 'Acknowledgements', `<h2>Acknowledgements</h2>${renderContent(acknowledgements)}`);

  // TOC.ncx
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${new_title}</text></docTitle>
  <navMap>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`;
  oebps.file("toc.ncx", ncx);
  manifestItems.push(`<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`);

  // content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${new_title}</dc:title>
    <dc:creator opf:role="aut">${new_author}</dc:creator>
    <dc:language>en-US</dc:language>
    <dc:identifier id="BookId">urn:uuid:12345</dc:identifier>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css" />
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  oebps.file("content.opf", opf);

  // Generate and save
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  saveAs(blob, `${new_title.replace(/\s+/g, '_')}.epub`);
};
