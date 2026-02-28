import React, { useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

const JSONUploader = ({ onDataLoaded }) => {
    const [bookJson, setBookJson] = useState(null);
    const [coverSrc, setCoverSrc] = useState(null);
    const [fileName, setFileName] = useState("");

    const handleJsonUpload = (file) => {
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                setBookJson(json);
            } catch (err) {
                alert("Invalid JSON file. Please upload a correctly formatted book JSON.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    const handleImageUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setCoverSrc(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleProceed = () => {
        if (bookJson) {
            onDataLoaded(bookJson, coverSrc);
        }
    };

    const onDropJson = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/json") handleJsonUpload(file);
        else alert("Please upload a .json file");
    }, []);

    const onDropImage = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) handleImageUpload(file);
        else alert("Please upload an image file");
    }, []);

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

    return (
        <div className="uploader-container" style={{ flexDirection: 'column', gap: '2rem' }}>

            <div style={{ display: 'flex', gap: '2rem', width: '100%', maxWidth: '800px' }}>
                <label
                    className="drop-zone"
                    onDrop={onDropJson} onDragOver={prevent}
                    style={{ flex: 1, borderColor: bookJson ? 'var(--accent-color)' : '' }}
                >
                    <UploadCloud className="drop-icon" />
                    <div>
                        <h2>JSON Data</h2>
                        <p>{fileName || "Drag & Drop Book JSON"}</p>
                    </div>
                    <input type="file" accept=".json" className="file-input" onChange={(e) => handleJsonUpload(e.target.files[0])} />
                </label>

                <label
                    className="drop-zone"
                    onDrop={onDropImage} onDragOver={prevent}
                    style={{ flex: 1, padding: coverSrc ? '0' : '4rem 2rem', overflow: 'hidden' }}
                >
                    {coverSrc ? (
                        <img src={coverSrc} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <>
                            <ImageIcon className="drop-icon" style={{ animation: 'none' }} />
                            <div>
                                <h2>Cover Image</h2>
                                <p>Optional (JPG/PNG)</p>
                            </div>
                        </>
                    )}
                    <input type="file" accept="image/*" className="file-input" onChange={(e) => handleImageUpload(e.target.files[0])} />
                </label>
            </div>

            <button
                className="btn btn-primary"
                onClick={handleProceed}
                disabled={!bookJson}
                style={{ fontSize: '1.2rem', padding: '1rem 3rem', opacity: bookJson ? 1 : 0.5 }}
            >
                Open Formatting Engine
            </button>

        </div>
    );
};

export default JSONUploader;
