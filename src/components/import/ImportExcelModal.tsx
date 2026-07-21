import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, FileText, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiUpload } from "@/services/api";
import { STANDARD_HARDWARE_CATEGORIES } from "@/lib/asset-categories";
import * as XLSX from "xlsx";

const ALLOWED_TYPES = [".xlsx", ".xls", ".csv", ".pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function isExcelFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "xlsx" || ext === "xls" || ext === "csv";
}

interface SkippedRow {
  row: number;
  reason: string;
}

interface ImportResult {
  inserted: number;
  skipped: SkippedRow[];
  assets: any[];
}

interface ImportExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (assets: any[]) => void;
}

export function ImportExcelModal({ open, onOpenChange, onSuccess }: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    const columns = ["Asset Name", "Category", "Brand", "Model", "Serial Number", "Purchase Date", "Warranty Expiry Date", "Status"];
    const sampleData = [{
      "Asset Name": "Dell Latitude 5540",
      "Category": "Laptop",
      "Brand": "Dell",
      "Model": "Latitude 5540",
      "Serial Number": "SN1234567890",
      "Purchase Date": "2026-01-15",
      "Warranty Expiry Date": "2028-01-15",
      "Status": "Available",
    }];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: columns });
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    const categoryWs = XLSX.utils.json_to_sheet(
      STANDARD_HARDWARE_CATEGORIES.map((category) => ({ Category: category }))
    );
    XLSX.utils.book_append_sheet(wb, categoryWs, "Allowed Categories");
    XLSX.writeFile(wb, "asset_import_sample.xlsx");
  };

  const resetState = useCallback(() => {
    setFile(null);
    setDragOver(false);
    setUploading(false);
    setProgress(0);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    if (!uploading) {
      resetState();
      onOpenChange(false);
    }
  }, [uploading, resetState, onOpenChange]);

  const validateFile = (selectedFile: File): boolean => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_TYPES.includes("." + ext)) {
      setError(`Invalid file format. Accepted formats: ${ALLOWED_TYPES.join(", ")}`);
      return false;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}.`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setResult(null);
    if (!validateFile(selectedFile)) return;
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = isExcelFile(file) ? "/asset-manager/bulk" : "/asset-manager/import/pdf";
      const response = await apiUpload(endpoint, formData);

      clearInterval(progressInterval);
      setProgress(100);

      const data = (response as any)?.data ?? response;

      if (isExcelFile(file)) {
        const inserted = data?.inserted ?? data?.imported ?? (Array.isArray(data?.assets) ? data.assets.length : 0);
        const skipped: SkippedRow[] = data?.skipped ?? data?.errors ?? [];
        const assets: any[] = data?.assets ?? [];

        setResult({ inserted, skipped, assets });
      } else {
        setResult({
          inserted: 1,
          skipped: [],
          assets: data?.asset ? [data.asset] : [],
        });
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || "Upload failed. Please try again.");
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!result || result.skipped.length === 0) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      result.skipped.map((s) => ({ "Row Number": s.row, Reason: s.reason }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "Skipped Rows");
    XLSX.writeFile(wb, "import_error_report.xlsx");
  };

  const handleCancel = () => {
    if (!uploading) {
      resetState();
      onOpenChange(false);
    }
  };

  const handleCloseResult = () => {
    onSuccess(result?.assets ?? []);
    resetState();
    onOpenChange(false);
  };

  const isPdf = file && !isExcelFile(file);
  const showResult = result !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading && !o) handleClose(); }}>
      <DialogContent className="sm:max-w-xl">
        {!showResult ? (
          <>
            <DialogHeader>
              <DialogTitle>Import Assets</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && !file && fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {isPdf ? (
                      <FileText className="h-8 w-8 text-destructive shrink-0" />
                    ) : (
                      <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
                    )}
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm truncate max-w-[250px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resetState(); }}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop your file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: .xlsx, .xls, .csv, .pdf
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                className="hidden"
                onChange={handleFileChange}
              />

              {!file && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleDownloadSample}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample Excel
                  </Button>
                </div>
              )}

              {isPdf && file && !uploading && (
                <p className="text-sm text-center text-muted-foreground">
                  PDF selected successfully.
                </p>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {isPdf ? "Uploading PDF..." : "Importing assets..."}
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isPdf ? "PDF Uploaded Successfully" : "Imported Successfully"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <p className="text-lg font-semibold">
                  {isPdf
                    ? "PDF Uploaded Successfully"
                    : `Imported Successfully`}
                </p>
              </div>

              {!isPdf && (
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-2xl font-bold text-success">{result?.inserted ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Inserted Assets</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-2xl font-bold text-destructive">{result?.skipped.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Skipped Rows</p>
                  </div>
                </div>
              )}

              {result && result.skipped.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Skipped Rows Details</p>
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {result.skipped.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">Row {s.row}:</span> {s.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleDownloadErrorReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Error Report
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleCloseResult}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
