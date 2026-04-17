
import React, { useEffect, useState } from 'react';
import type { AnalysisResult, UploadedFile } from '../types';
import { UploadIcon, ModelIcon, LiveIcon, VisionIcon, InfoIcon } from '../components/icons';
// --- Helper Functions ---

type ModelsResponse = {
  active_models?: string[];
  ultrasound_models?: string[];
};

const deriveUltrasoundModels = (json: ModelsResponse) => {
  if (Array.isArray(json.ultrasound_models)) return json.ultrasound_models;
  const active = Array.isArray(json.active_models) ? json.active_models : [];
  return active.filter(model => model === 'best_model' || model === 'best_seg');
};

type CombinedInferenceResponse = {
  result?: string;
  confidence?: number | string;
  insight?: string;
  engine?: string;
  classification_engine?: string;
  segmentation_engine?: string;
  heatmap_url?: string;
  mask?: string;
  segmentation_mask?: string;
  mask_pixel_count?: number | string;
  mask_area_mm2?: number | string;
  mask_type?: string;
};

type WorkerReportResponse = {
  report?: string;
};

const REPORT_WORKER_URL = '/report';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Fix: Add 'Inconclusive' to pathology union for full coverage of AnalysisResult.pathology
const getPathologyBadgeClass = (pathology: 'Benign' | 'Malignant' | 'Normal' | 'Inconclusive') => {
    switch (pathology) {
        case 'Malignant': return 'bg-red-100 text-red-700';
        case 'Benign': return 'bg-green-100 text-green-700';
        case 'Normal': return 'bg-blue-100 text-blue-700';
        case 'Inconclusive': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

// Fix: Add 'Inconclusive' to pathology union
const getPathologyTextClass = (pathology: 'Benign' | 'Malignant' | 'Normal' | 'Inconclusive') => {
    switch (pathology) {
        case 'Malignant': return 'text-red-600';
        case 'Benign': return 'text-green-600';
        case 'Normal': return 'text-blue-600';
        case 'Inconclusive': return 'text-gray-600';
        default: return 'text-gray-600';
    }
};


// --- Child Components ---

const AnalysisStatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs text-brand-text-secondary font-medium">{title}</p>
        <p className="text-xl font-semibold text-brand-text-primary mt-1">{value}</p>
    </div>
);

const normalizePathology = (value?: string): AnalysisResult['pathology'] => {
  const normalized = (value || 'Inconclusive').trim().toLowerCase();
  if (normalized === 'malignant') return 'Malignant';
  if (normalized === 'benign') return 'Benign';
  if (normalized === 'normal') return 'Normal';
  return 'Inconclusive';
};

const normalizeReportText = (report?: string) =>
  (report || '')
    .replace(/\*\*/g, '')
    .replace(/mmÂ²/g, 'mm^2')
    .trim();

// --- Main Component ---

const UploadScans: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [backendModels, setBackendModels] = useState<string[] | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const canRunInference = Array.isArray(backendModels) && backendModels.length > 0;

  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/models');
        if (!res.ok) {
          const text = await res.text().catch(() => `Status ${res.status}`);
          throw new Error(text || `Backend error (${res.status})`);
        }
        const json = await res.json() as ModelsResponse;
        if (isMounted) {
          setBackendModels(deriveUltrasoundModels(json));
          setBackendError(null);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setBackendError(msg);
          setBackendModels([]);
        }
      }
    };
    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileSelect = (file: UploadedFile) => {
    if (file.status === 'Complete' || file.status === 'Failed') setSelectedFile(file);
  };

  const updateUploadedFile = (fileId: string, updater: (file: UploadedFile) => UploadedFile) => {
    setFiles(cur => cur.map(file => (file.id === fileId ? updater(file) : file)));
    setSelectedFile(prev => (prev && prev.id === fileId ? updater(prev) : prev));
  };

  const generateSuggestiveReport = async (fileObj: UploadedFile, analysis: AnalysisResult) => {
    updateUploadedFile(fileObj.id, file => ({
      ...file,
      reportStatus: 'Generating',
      reportError: undefined,
    }));

    try {
      const res = await fetch(REPORT_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileObj.name,
          analysis: {
            pathology: analysis.pathology,
            confidence: analysis.confidence,
            insight: analysis.insight,
            pixels: analysis.pixels,
            area: analysis.area,
            modelUsed: analysis.modelUsed,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => `Status ${res.status}`);
        throw new Error(text || `Report generation failed (${res.status})`);
      }

      const json = await res.json() as WorkerReportResponse;
      const report = normalizeReportText(json.report);

      if (!report) {
        throw new Error('Cloudflare Worker returned an empty report.');
      }

      updateUploadedFile(fileObj.id, file => ({
        ...file,
        reportStatus: 'Complete',
        suggestiveReport: report,
        reportError: undefined,
      }));
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const msg = rawMsg === 'Failed to fetch'
        ? 'Could not reach the local Cloudflare Worker at /report. Make sure `wrangler dev` is running for `backend/cf-report-worker`.'
        : rawMsg;
      updateUploadedFile(fileObj.id, file => ({
        ...file,
        reportStatus: 'Failed',
        reportError: msg,
      }));
    }
  };

  const runBestModelInference = async (fileObj: UploadedFile, fileBlob: File) => {
    const form = new FormData();
    form.append('file', fileBlob);

    setFiles(cur => cur.map(f => f.id === fileObj.id ? { ...f, status: 'Analyzing' } : f));
    setSelectedFile(prev => prev && prev.id === fileObj.id ? { ...fileObj, status: 'Analyzing' } : prev);

    try {
      const res = await fetch('http://127.0.0.1:8000/predict/ultrasound/combined', {
        method: 'POST',
        body: form
      });

      if (!res.ok) {
        const text = await res.text().catch(() => `Status ${res.status}`);
        throw new Error(text || `Inference failed (${res.status})`);
      }

      const json = await res.json() as CombinedInferenceResponse;

      // Map backend response to AnalysisResult shape. Prefer backend-provided values.
      const analysis: AnalysisResult = {
        pathology: normalizePathology(json.result),
        confidence: typeof json.confidence === 'number' ? json.confidence : Number(json.confidence) || 0,
        insight: json.insight || '',
        modelUsed: json.engine || 'BEST_MODEL',
        classificationEngine: json.classification_engine || undefined,
        segmentationEngine: json.segmentation_engine || undefined,
        heatmapUrl: json.heatmap_url || undefined,
        // Backend should return 'mask' which may be a data URL (base64) or a URL to an overlay image
        segmentationMask: json.mask || json.segmentation_mask || undefined,
        // Backend-provided numeric values (do not recompute on frontend unless absent)
        pixels: typeof json.mask_pixel_count === 'number' ? json.mask_pixel_count : (json.mask_pixel_count ? Number(json.mask_pixel_count) : undefined),
        area: typeof json.mask_area_mm2 === 'number' ? json.mask_area_mm2 : (json.mask_area_mm2 ? Number(json.mask_area_mm2) : undefined),
        maskType: json.mask_type || undefined
      };

      const completedFile: UploadedFile = {
        ...fileObj,
        status: 'Complete',
        analysis,
        reportStatus: 'Generating',
        reportError: undefined,
      };

      setFiles(cur => cur.map(f => f.id === fileObj.id ? completedFile : f));
      setSelectedFile(prev => (!prev || prev.id === fileObj.id ? completedFile : prev));
      void generateSuggestiveReport(completedFile, analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFiles(cur => cur.map(f => f.id === fileObj.id ? ({ ...f, status: 'Failed', errorMessage: msg } as UploadedFile) : f));
      setSelectedFile(prev => prev && prev.id === fileObj.id ? ({ ...fileObj, status: 'Failed', errorMessage: msg } as UploadedFile) : prev);
    }
  };

  const handleFileDrop = async (droppedFiles: File[]) => {
    if (!canRunInference) {
      const errMsg = backendError
        ? `Backend check failed: ${backendError}`
        : 'No backend models are loaded. Kindly add your models to backend/models and restart the server.';
      const failedUploads: UploadedFile[] = Array.from(droppedFiles).map((file, index) => ({
        id: String(Date.now() + index),
        name: file.name,
        size: formatBytes(file.size),
        status: 'Failed',
        errorMessage: errMsg,
        type: (file.name.split('.').pop() as any) || 'png',
        previewUrl: URL.createObjectURL(file),
      }));
      setFiles(prev => [...failedUploads, ...prev]);
      if (failedUploads.length > 0) setSelectedFile(failedUploads[0]);
      return;
    }

    const newUploads: UploadedFile[] = Array.from(droppedFiles).map((file, index) => ({
      id: String(Date.now() + index),
      name: file.name,
      size: formatBytes(file.size),
      status: 'Pending',
      type: (file.name.split('.').pop() as any) || 'png',
      previewUrl: URL.createObjectURL(file),
      reportStatus: 'Idle',
    }));

    setFiles(prev => [...newUploads, ...prev]);
    if (newUploads.length > 0) setSelectedFile(newUploads[0]);

    // Start inference for each uploaded file
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i];
      const fileBlob = droppedFiles.find(f => f.name === upload.name) as File;
      if (!fileBlob) continue;
      // Run ultrasound classification inference
      await runBestModelInference(upload, fileBlob);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFileDrop(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className="space-y-6 h-full">
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-pink-50 to-fuchsia-50 p-6 rounded-2xl shadow-subtle border border-pink-100">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-pink/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -left-10 w-32 h-32 bg-fuchsia-200/40 rounded-full blur-2xl"></div>
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">UltrasoundAnalysis</h1>
          <p className="text-sm md:text-base text-slate-600 mt-2">Deploying multimodal models for accurate lesion classification.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
        {(backendError || (backendModels && backendModels.length === 0)) && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded-lg">
            <p className="text-sm font-semibold">Models Missing</p>
            <p className="text-xs mt-1">
              {backendError
                ? `Backend check failed: ${backendError}`
                : 'No backend models are loaded. Kindly add your models to backend/models and restart the server.'}
            </p>
          </div>
        )}

        <div 
          onDragEnter={(e) => handleDragEvents(e, true)}
          onDragLeave={(e) => handleDragEvents(e, false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`relative flex-grow flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-subtle border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-brand-blue bg-blue-50' : 'border-gray-200'}`}
        >
          <input type="file" id="vision-upload" className="hidden" multiple onChange={(e) => e.target.files && handleFileDrop(Array.from(e.target.files))} />
          <label htmlFor="vision-upload" className="text-center cursor-pointer">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <UploadIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-semibold text-brand-text-primary mt-4">Drop Ultrasound Scan Here</p>
            <p className="text-xs text-brand-text-secondary mt-1">PNG, JPG, DICOM (Max 500MB)</p>
          </label>
        </div>

        <div className="flex-shrink-0 bg-white p-4 rounded-lg shadow-subtle border border-gray-200">
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="font-semibold text-brand-text-primary text-sm">Scan Queue</h3>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{files.length} Files</span>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {files.map(file => (
              <li 
                key={file.id} 
                onClick={() => handleFileSelect(file)}
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedFile?.id === file.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                {/* Fix: Use previewUrl instead of imageUrl */}
                <img src={file.previewUrl} alt={file.name} className="w-10 h-10 rounded-md object-cover mr-3"/>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-brand-text-primary truncate">{file.name}</p>
                  <p className="text-xs text-brand-text-secondary">{file.size}</p>
                </div>
                {file.status === 'Analyzing' && <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>}
                {file.status === 'Complete' && file.analysis && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getPathologyBadgeClass(file.analysis.pathology)}`}>
                    {file.analysis.pathology.toUpperCase()}
                  </span>
                )}
                 {file.status === 'Failed' && (
                    <div className="relative group flex items-center cursor-help">
                        <span className="text-xs font-bold text-red-500">Failed</span>
                        <InfoIcon className="w-4 h-4 text-red-500 ml-1" />
                        <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {file.errorMessage || 'An unknown error occurred.'}
                        </div>
                    </div>
                 )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-subtle border border-gray-200 flex flex-col">
        {selectedFile ? (
            <>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center"><VisionIcon className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-brand-text-primary">Vision Diagnostic Analysis</h2>
                        <div className="flex items-center gap-4 text-xs mt-1 text-brand-text-secondary">
                          <span className="flex items-center gap-1.5"><ModelIcon className="w-3.5 h-3.5"/> MODELS: {selectedFile.analysis?.modelUsed || 'BEST_MODEL + BEST_SEG'}</span>
                          <span className="flex items-center gap-1.5 text-green-600 font-medium"><LiveIcon className="w-3.5 h-3.5"/> LIVE INFERENCE</span>
                        </div>
                        {selectedFile.analysis && (
                          <div className="mt-2 text-[11px] text-brand-text-secondary space-y-1">
                            <p>Classification Engine: {selectedFile.analysis.classificationEngine || 'N/A'}</p>
                            <p>Segmentation Engine: {selectedFile.analysis.segmentationEngine || 'N/A'}</p>
                          </div>
                        )}
                    </div>
                </div>
                {selectedFile.status === 'Complete' && selectedFile.analysis &&
                <div className="text-right">
                    <p className="text-xs text-brand-text-secondary font-semibold">PATHOLOGY</p>
                    <p className={`text-lg font-bold ${getPathologyTextClass(selectedFile.analysis.pathology)}`}>{selectedFile.analysis.pathology.toUpperCase()}</p>
                </div>
                }
            </div>

            {selectedFile.status === 'Complete' && selectedFile.analysis ? (
            <>
            <div className="grid grid-cols-2 gap-6 my-6 flex-grow">
                <div className="flex flex-col">
                    <p className="text-xs font-semibold text-brand-text-secondary mb-2 text-center">ORIGINAL SCAN</p>
                    {/* Original scan (no overlay) */}
                    <div className="flex-grow bg-gray-900 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                        <img src={selectedFile.previewUrl} alt="Original Scan" className="max-w-full max-h-full object-contain"/>
                    </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-xs font-semibold text-brand-text-secondary mb-2 text-center">SEGMENTATION OVERLAY</p>
                  <div className="flex-grow bg-gray-900 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                    <img src={selectedFile.previewUrl} alt="Scan" className="max-w-full max-h-full object-contain" />
                    {/* Show backend-generated overlay image (if present) as a separate view */}
                    {selectedFile.analysis?.segmentationMask ? (
                      <img src={selectedFile.analysis.segmentationMask} alt="Segmentation Overlay" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" style={{mixBlendMode: 'screen'}} />
                    ) : null}
                  </div>
                </div>
            </div>

                <div className="grid grid-cols-3 gap-4">
                  <AnalysisStatCard title="AI CONFIDENCE" value={`${(selectedFile.analysis.confidence * 100).toFixed(1)}%`} />
                  <AnalysisStatCard title="TUMOUR AREA" value={selectedFile.analysis.area != null ? `${selectedFile.analysis.area.toFixed(2)} mm^2` : 'N/A'} />
                  <AnalysisStatCard title="TUMOUR PIXELS" value={selectedFile.analysis.pixels != null ? `${selectedFile.analysis.pixels} PX` : 'N/A'} />
                </div>

            <div className="mt-6 bg-blue-50 border-l-4 border-brand-blue text-brand-text-primary p-4 rounded-r-lg">
                <p className="font-semibold text-sm">Radiologist Insight:</p>
                {/* Fix: Use insight property as defined in AnalysisResult */}
                <p className="text-sm mt-1">{selectedFile.analysis.insight}</p>
            </div>

            {/* ── IMAGING CENTER REPORT ── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Radiology Report</h3>
                <div className="flex items-center gap-3">
                  {selectedFile.reportStatus === 'Generating' && (
                    <span className="text-[10px] font-bold text-brand-pink animate-pulse uppercase tracking-widest">Generating…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void generateSuggestiveReport(selectedFile, selectedFile.analysis!)}
                    disabled={selectedFile.reportStatus === 'Generating'}
                    className="bg-brand-pink text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-brand-pink-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {selectedFile.reportStatus === 'Generating' ? 'Generating...' : 'Regenerate Report'}
                  </button>
                </div>
              </div>

              {selectedFile.reportStatus === 'Failed' && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {selectedFile.reportError || 'Report generation failed.'}
                </div>
              )}

              {/* Report document */}
              {(() => {
                const a = selectedFile.analysis!;
                const now = new Date();
                const reportDate = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const reportId = `US-${Date.now().toString(36).toUpperCase()}`;

                const isMalignant = a.pathology === 'Malignant';
                const isBenign    = a.pathology === 'Benign';
                const isNormal    = a.pathology === 'Normal';

                const accentColor  = isMalignant ? '#1e3a5f' : isBenign ? '#1e3a5f' : '#1e3a5f';
                const diagBadgeBg  = isMalignant ? '#dc2626' : isBenign ? '#16a34a' : '#2563eb';
                const confPct      = a.confidence * 100;
                const confBarColor = confPct < 40 ? '#dc2626' : confPct <= 80 ? '#f59e0b' : '#16a34a';
                const confLabel    = confPct < 40 ? 'Low' : confPct <= 80 ? 'Moderate' : 'High';

                const findings = selectedFile.suggestiveReport
                  ? selectedFile.suggestiveReport.replace(/\*\*/g, '').trim()
                  : `Ultrasound imaging of the submitted scan demonstrates findings consistent with ${a.pathology.toLowerCase()} pathology. ${a.insight || ''} ${a.area != null ? `Estimated lesion area: ${a.area.toFixed(2)} mm².` : ''} ${a.pixels != null ? `Segmented pixel count: ${a.pixels} px.` : ''}`.trim();

                const impression = isMalignant
                  ? `Findings are suspicious for malignancy. Urgent clinical correlation and biopsy are strongly recommended.`
                  : isBenign
                  ? `Findings are consistent with a benign lesion. Routine follow-up imaging is advised.`
                  : isNormal
                  ? `No significant pathological abnormality identified. Routine follow-up as clinically indicated.`
                  : `Findings are inconclusive. Additional imaging and clinical correlation are recommended.`;

                return (
                  <div className="bg-white border-2 border-gray-300 shadow-xl font-sans text-[13px] text-gray-900" id="us-report">

                    {/* ── CLINIC HEADER ── */}
                    <div style={{ backgroundColor: accentColor }} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Clinic logo / icon */}
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-blue-200">
                          <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-black text-[1.1rem] tracking-wide">OncoScanAI Imaging Center</p>
                          <p className="text-blue-200 text-[11px]">AI-Assisted Radiology & Diagnostic Imaging</p>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-blue-100 space-y-0.5">
                        <p>📞 +92-XXX-XXXXXXX</p>
                        <p>🌐 oncoscanai.health</p>
                        <p>✉ reports@oncoscanai.health</p>
                        <p className="text-white font-bold mt-1">24/7 Services</p>
                      </div>
                    </div>

                    {/* ── PATIENT INFO STRIP ── */}
                    <div className="border-b-2 border-gray-300 px-6 py-3 grid grid-cols-3 gap-4 text-[11.5px] bg-gray-50">
                      <div><span className="font-bold">Patient File:</span> {selectedFile.name}</div>
                      <div><span className="font-bold">Report ID:</span> {reportId}</div>
                      <div><span className="font-bold">Date:</span> {reportDate} {reportTime}</div>
                      <div><span className="font-bold">Modality:</span> Ultrasound</div>
                      <div><span className="font-bold">Engine:</span> {a.modelUsed || 'OncoScanAI Best Model'}</div>
                      <div><span className="font-bold">Pathology:</span> <span className="font-black" style={{ color: diagBadgeBg }}>{a.pathology.toUpperCase()}</span></div>
                    </div>

                    {/* ── REPORT TITLE ── */}
                    <div className="text-center py-3 border-b border-gray-200">
                      <h2 className="text-[1.25rem] font-black tracking-widest uppercase" style={{ color: accentColor }}>Ultrasound Analysis Report</h2>
                      <p className="text-[10.5px] text-gray-500 mt-0.5">AI-Assisted Lesion Detection & Segmentation · OncoScanAI</p>
                    </div>

                    <div className="px-6 pt-5 pb-6 space-y-5">

                      {/* ── DIAGNOSIS BADGE + CONFIDENCE BAR ── */}
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 px-5 py-2 rounded text-white font-black text-[12px] uppercase tracking-widest" style={{ backgroundColor: diagBadgeBg }}>
                          {a.pathology}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">AI Confidence</span>
                            <span className="text-[11px] font-black" style={{ color: confBarColor }}>{confPct.toFixed(1)}% — {confLabel}</span>
                          </div>
                          <div className="h-3 w-64 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${confPct}%`, backgroundColor: confBarColor }} />
                          </div>
                        </div>
                      </div>

                      {/* ── SCAN IMAGE IN REPORT ── */}
                      {selectedFile.previewUrl && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-full h-36 bg-gray-900 border border-gray-400 overflow-hidden">
                              <img src={selectedFile.previewUrl} alt="Original Scan" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Original Ultrasound Scan</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-full h-36 bg-gray-900 border border-gray-400 overflow-hidden relative">
                              <img src={selectedFile.previewUrl} alt="Segmentation" className="w-full h-full object-cover" style={{ filter: 'contrast(1.2) saturate(1.1)' }} />
                              {a.segmentationMask && (
                                <img src={a.segmentationMask} alt="Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ mixBlendMode: 'screen' }} />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Segmentation Overlay</p>
                          </div>
                        </div>
                      )}

                      {/* ── FINDINGS ── */}
                      <div>
                        <p className="font-black uppercase text-[11.5px] tracking-widest mb-1" style={{ color: accentColor }}>Findings:</p>
                        <p className="text-[12px] leading-6 text-gray-800">{findings}</p>
                      </div>

                      {/* ── QUANTITATIVE ── */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'AI Confidence',  value: `${confPct.toFixed(1)}%` },
                          { label: 'Lesion Area',     value: a.area   != null ? `${a.area.toFixed(2)} mm²`  : 'N/A' },
                          { label: 'Lesion Pixels',   value: a.pixels != null ? `${a.pixels} px`            : 'N/A' },
                        ].map(c => (
                          <div key={c.label} className="border border-gray-200 rounded p-3 bg-gray-50">
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">{c.label}</p>
                            <p className="text-base font-black text-gray-800 mt-0.5">{c.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* ── IMPRESSION ── */}
                      <div>
                        <p className="font-black uppercase text-[11.5px] tracking-widest mb-1" style={{ color: accentColor }}>Impression:</p>
                        <p className="text-[12px] leading-6 text-gray-800">{impression}</p>
                      </div>

                      {/* ── SIGNATURE BLOCK ── */}
                      <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-6">
                        <div>
                          <div className="h-8 border-b border-gray-400 mb-1 flex items-end">
                            <span className="text-[11px] italic text-gray-400">AI-generated — pending pathologist review</span>
                          </div>
                          <p className="text-[11px] font-bold text-gray-700">Dr. AI Radiologist (OncoScanAI)</p>
                          <p className="text-[10px] text-gray-500">MBBS, FCPS Radiology</p>
                          <p className="text-[10px] text-gray-500">OncoScanAI Imaging Center</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-gray-700">Verified By</p>
                          <div className="h-8 border-b border-gray-400 mb-1" />
                          <p className="text-[10px] text-gray-500">Authorized Radiologist Signature</p>
                          <p className="text-[10px] text-gray-500">Stamp &amp; Date Required</p>
                        </div>
                      </div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div style={{ backgroundColor: accentColor }} className="px-6 py-2 flex items-center justify-between">
                      <p className="text-blue-200 text-[10px] italic">This report is AI-generated for preliminary reference only. A licensed radiologist must review before clinical use.</p>
                      <p className="text-white text-[10px] font-mono">{reportId} · OncoScanAI v2</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            </>
            ) : selectedFile.status === 'Failed' ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full mb-4">
                  <InfoIcon className="w-8 h-8 text-red-600"/>
                </div>
                <h3 className="text-lg font-semibold text-red-700 mt-4">Analysis Failed</h3>
                <p className="text-brand-text-secondary max-w-md mt-2 bg-gray-100 p-3 rounded-md border border-gray-200 text-left">
                  <strong>Error details from the server:</strong>
                  <code className="block bg-gray-200 p-2 rounded mt-2 text-red-900 text-xs whitespace-pre-wrap">
                    {selectedFile.errorMessage || 'No specific error message was returned.'}
                  </code>
                </p>
              </div>
            ) : (
             <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-lg font-semibold text-brand-text-primary mt-4">Analyzing Scan...</h3>
                <p className="text-brand-text-secondary max-w-xs mt-1">The AI model is currently processing the scan. This may take a moment.</p>
            </div>
            )}
            </>
        ) : (
             <div className="flex flex-col items-center justify-center h-full text-center">
                <VisionIcon className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-brand-text-primary">Select a scan</h3>
                <p className="text-brand-text-secondary max-w-xs mt-1">Upload a new scan or select one from the queue to view the detailed AI analysis here.</p>
            </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default UploadScans;
