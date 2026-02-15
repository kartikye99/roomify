import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import {
    PROGRESS_INTERVAL_MS,
    PROGRESS_STEP,
    REDIRECT_DELAY_MS,
    MAX_UPLOAD_SIZE_BYTES,
    ALLOWED_IMAGE_TYPES,
} from "../lib/constants";

type UploadProps = {
    onComplete: (base64: string) => void;
};

type AuthContext = {
    isSignedIn: boolean;
};

const Upload: React.FC<UploadProps> = ({ onComplete }) => {
    const { isSignedIn } = useOutletContext<AuthContext>();

    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const progressIntervalRef = useRef<number | null>(null);
    const redirectTimeoutRef = useRef<number | null>(null);

    // 🔒 Clear timers safely
    const clearTimers = () => {
        if (progressIntervalRef.current !== null) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        if (redirectTimeoutRef.current !== null) {
            clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }
    };

    // 🧹 Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, []);

    const processFile = (file: File) => {
        if (!isSignedIn) return;

        // ✅ VALIDATION GUARD (runs first)
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setError("Only JPG and PNG images are allowed.");
            return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            setError("File size exceeds the maximum allowed limit.");
            return;
        }

        setError(null);
        clearTimers();

        setFile(file);
        setProgress(0);

        const reader = new FileReader();

        reader.onload = () => {
            const base64 = reader.result as string;

            progressIntervalRef.current = window.setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearTimers();

                        redirectTimeoutRef.current = window.setTimeout(() => {
                            onComplete(base64);
                        }, REDIRECT_DELAY_MS);

                        return 100;
                    }
                    return prev + PROGRESS_STEP;
                });
            }, PROGRESS_INTERVAL_MS);
        };

        reader.readAsDataURL(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        processFile(selectedFile);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (!droppedFile) return;
        processFile(droppedFile);
    };

    return (
        <div className="upload">
            {!file ? (
                <div
                    className={`dropzone ${isDragging ? "is-dragging" : ""}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        if (isSignedIn) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="drop-input"
                        accept=".jpg,.jpeg,.png"
                        disabled={!isSignedIn}
                        onChange={handleChange}
                    />

                    <div className="drop-content">
                        <div className="drop-icon">
                            <UploadIcon size={20} />
                        </div>

                        <p>
                            {isSignedIn
                                ? "Click to upload or drag and drop"
                                : "Sign in to upload files"}
                        </p>

                        <p className="help">Maximum file size 50 MB.</p>

                        {error && <p className="error">{error}</p>}
                    </div>
                </div>
            ) : (
                <div className="upload-status">
                    <div className="status-content">
                        <div className="status-icon">
                            {progress === 100 ? (
                                <CheckCircle2 className="check" />
                            ) : (
                                <ImageIcon className="image" />
                            )}
                        </div>

                        <h3>{file.name}</h3>

                        <div className="progress">
                            <div className="bar" style={{ width: `${progress}%` }} />
                            <p className="status-text">
                                {progress < 100
                                    ? "Analyzing Floor Plan..."
                                    : "Redirecting..."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Upload;
