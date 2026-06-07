"use client";

import { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess: (datasetId: string) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".json")) {
      setStatus("error");
      setErrorMessage("Unsupported file type. Please upload a CSV, Excel, or JSON file.");
      return;
    }

    setFile(selectedFile);
    setStatus("uploading");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://localhost:8000/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await res.json();
      setStatus("success");
      onUploadSuccess(data.id);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to upload file to DataSherlock backend.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`relative w-full rounded-lg border border-dashed p-8 md:p-12 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
          dragActive
            ? "border-blue-500 bg-blue-50/50"
            : file && status === "success"
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-400"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={status === "idle" ? onButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleChange}
        />

        {status === "idle" && (
          <>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mb-3.5">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Drag & Drop your dataset here
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Supports CSV, Excel (XLSX, XLS), or JSON up to 50MB
            </p>
            <button
              onClick={onButtonClick}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all shadow-sm"
            >
              Browse Files
            </button>
          </>
        )}

        {status === "uploading" && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-800">Uploading '{file?.name}'...</p>
            <p className="text-xs text-slate-400 mt-1">Deploying multi-agent data profiling checks in the background.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-4">
            <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600 mb-3 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Analysis Pipeline Triggered!</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Successfully uploaded **{file?.name}**.
            </p>
            <button
              onClick={() => {
                setFile(null);
                setStatus("idle");
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Upload another file
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-4">
            <div className="p-2.5 rounded-full bg-red-100 text-red-600 mb-3 border border-red-200">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-red-700">Upload Incomplete</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">{errorMessage}</p>
            <button
              onClick={() => {
                setFile(null);
                setStatus("idle");
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
