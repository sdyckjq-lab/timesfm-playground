import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";

export interface CsvData {
  columns: string[];
  numericColumns: string[];
  rows: Record<string, string>[];
  fileName: string;
  file: File;
}

interface UploadProps {
  csvData: CsvData | null;
  onUpload: (data: CsvData) => void;
  onRemove: () => void;
  valueColumn: string;
  onValueColumnChange: (col: string) => void;
  timeColumn: string;
  onTimeColumnChange: (col: string) => void;
}

export default function Upload({
  csvData,
  onUpload,
  onRemove,
  valueColumn,
  onValueColumnChange,
  timeColumn,
  onTimeColumnChange,
}: UploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 解析 CSV 文件
  const parseFile = useCallback(
    (file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[];
          const columns = results.meta.fields || [];
          // 检测数值列：至少有一行的值能转为数字
          const numericColumns = columns.filter((col) =>
            rows.some((row) => {
              const v = row[col];
              return v !== "" && v != null && !isNaN(Number(v));
            })
          );
          onUpload({ columns, numericColumns, rows, fileName: file.name, file });
        },
      });
    },
    [onUpload]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.endsWith(".csv")) return;
      parseFile(file);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // 已有数据时显示文件信息和列选择
  if (csvData) {
    return (
      <div className="card">
        <div className="card-title">Data</div>
        <div className="upload-file-info">
          <div className="upload-file-name">
            <span>{csvData.fileName}</span>
            <button className="upload-remove-btn" onClick={onRemove}>
              ✕
            </button>
          </div>

          <div className="select-group">
            <label>Value Column</label>
            <select
              value={valueColumn}
              onChange={(e) => onValueColumnChange(e.target.value)}
            >
              <option value="">-- 选择数值列 --</option>
              {csvData.numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label>Time Column (optional)</label>
            <select
              value={timeColumn}
              onChange={(e) => onTimeColumnChange(e.target.value)}
            >
              <option value="">-- 无 --</option>
              {csvData.columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // 无数据时显示拖拽上传区域
  return (
    <div className="card">
      <div className="card-title">Data</div>
      <div
        className={`upload-dropzone${dragging ? " dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="upload-dropzone-icon">↑</span>
        Drop CSV file or click to upload
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
