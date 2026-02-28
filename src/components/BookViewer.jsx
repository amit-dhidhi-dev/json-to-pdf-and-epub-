import React from 'react';

const BookViewer = ({ bookData, coverImageSrc, template = 'literary' }) => {
    // Generate a fixed "random" ISBN per component mount
    const [isbn] = React.useState(() => {
        return Math.random().toString(36).substring(2, 10).toUpperCase() + '-XX';
    });

    if (!bookData) return null;

    const {
        new_title = "Untitled",
        new_author = "Unknown Author",
        genre,
        themes = [],
        chapters = [],
        foreword,
        preface,
        acknowledgements
    } = bookData;

    // Split content by double newlines into paragraphs
    const renderContent = (content) => {
        if (!content) return null;
        return content.split('\n\n').map((paragraph, idx) => {
            if (!paragraph.trim()) return null;
            return <p key={idx}>{paragraph}</p>;
        });
    };


    return (
        <div className={`book-viewer theme-${template}`} id="book-export-container">
            <article className="book-page">

                {/* Cover Page */}
                {coverImageSrc && (
                    <section className="title-page cover-page" style={{ padding: 0 }}>
                        <img src={coverImageSrc} alt="Book Cover" style={{ width: '100%', height: 'auto', maxHeight: '100vh', objectFit: 'contain' }} />
                    </section>
                )}

                {/* Title Page */}
                <section className="title-page book-section" style={{ borderBottom: 'none' }}>
                    {genre && <div className="book-genre">{genre}</div>}
                    <h1 className="book-title">{new_title}</h1>
                    <h2 className="book-author">by {new_author}</h2>

                    {themes && themes.length > 0 && (
                        <div className="book-themes">
                            {themes.map((theme, idx) => (
                                <span key={idx} className="theme-tag">{theme}</span>
                            ))}
                        </div>
                    )}
                </section>

                {/* Copyright Page */}
                <section className="book-section copyright-page" style={{
                    pageBreakBefore: 'always',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '80vh',
                    fontSize: '0.9rem',
                    color: 'var(--ui-text)'
                }}>
                    <p>Copyright &copy; {new Date().getFullYear()} {new_author}</p>
                    <br />
                    <p>All rights reserved. No portion of this book may be reproduced, stored in a retrieval system, or transmitted in any form or by any means without prior written permission from the author.</p>
                    <br />
                    <p>This is a work of fiction. Names, characters, places, and incidents are either products of the author's imagination or are used fictitiously.</p>
                    <br />
                    <p>First published: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    <p>ISBN: {isbn}</p>
                </section>

                {/* Optional Front Matter */}
                {foreword && (
                    <section className="book-section">
                        <h3 className="section-label">Foreword</h3>
                        <div className="book-content">{renderContent(foreword)}</div>
                        <div className="ornament">***</div>
                    </section>
                )}

                {preface && (
                    <section className="book-section">
                        <h3 className="section-label">Preface</h3>
                        <div className="book-content">{renderContent(preface)}</div>
                        <div className="ornament">***</div>
                    </section>
                )}

                {/* Table of Contents */}
                {chapters.length > 0 && (
                    <section className="book-section toc-section">
                        <h2 className="section-title">Table of Contents</h2>
                        <ul className="toc-list" style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: '400px' }}>
                            {chapters.map((chapter, index) => (
                                <li key={index} style={{ marginBottom: '0.8rem', borderBottom: '1px dotted var(--ui-border)', display: 'flex', justifyContent: 'space-between' }}>
                                    <a href={`#chapter-${chapter.chapter_number}`} style={{ textDecoration: 'none', color: 'var(--accent-color)', fontWeight: '500' }}>
                                        Chapter {chapter.chapter_number}: {chapter.title || 'Untitled'}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <div className="ornament">***</div>
                    </section>
                )}

                {/* Chapters */}
                {chapters.map((chapter, index) => (
                    <section key={index} id={`chapter-${chapter.chapter_number}`} className="book-section">
                        <h3 className="section-label">Chapter {chapter.chapter_number}</h3>
                        {chapter.title && <h2 className="section-title">{chapter.title}</h2>}

                        <div className="book-content">
                            {renderContent(chapter.content)}
                        </div>

                        {index < chapters.length - 1 && <div className="ornament">***</div>}
                    </section>
                ))}

                {/* Back Matter */}
                {acknowledgements && (
                    <section className="book-section">
                        <div className="ornament">***</div>
                        <h3 className="section-label">Acknowledgements</h3>
                        <div className="book-content">{renderContent(acknowledgements)}</div>
                    </section>
                )}
            </article>
        </div>
    );
};

export default BookViewer;
