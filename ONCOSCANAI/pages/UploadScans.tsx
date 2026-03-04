
import React, { useEffect, useState } from 'react';
import type { UploadedFile } from '../types';
import { UploadIcon, ModelIcon, LiveIcon, VisionIcon, InfoIcon } from '../components/icons';
// --- Helper Functions ---

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
        const json = await res.json();
        if (isMounted) {
          setBackendModels(Array.isArray(json.active_models) ? json.active_models : []);
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

      const json = await res.json();

      // Map backend response to AnalysisResult shape. Prefer backend-provided values.
      const analysis = {
        pathology: (json.result || 'Inconclusive').charAt(0).toUpperCase() + (json.result || 'Inconclusive').slice(1),
        confidence: typeof json.confidence === 'number' ? json.confidence : Number(json.confidence) || 0,
        insight: json.insight || '',
        modelUsed: json.engine || 'BEST_MODEL',
        heatmapUrl: json.heatmap_url || undefined,
        // Backend should return 'mask' which may be a data URL (base64) or a URL to an overlay image
        segmentationMask: json.mask || json.segmentation_mask || undefined,
        // Backend-provided numeric values (do not recompute on frontend unless absent)
        pixels: typeof json.mask_pixel_count === 'number' ? json.mask_pixel_count : (json.mask_pixel_count ? Number(json.mask_pixel_count) : undefined),
        area: typeof json.mask_area_mm2 === 'number' ? json.mask_area_mm2 : (json.mask_area_mm2 ? Number(json.mask_area_mm2) : undefined),
        maskType: json.mask_type || undefined
      } as any;

      setFiles(cur => cur.map(f => f.id === fileObj.id ? ({ ...f, status: 'Complete', analysis } as UploadedFile) : f));
      setSelectedFile(prev => prev && prev.id === fileObj.id ? ({ ...fileObj, status: 'Complete', analysis } as UploadedFile) : ({ ...fileObj, status: 'Complete', analysis }));
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
    }));

    setFiles(prev => [...newUploads, ...prev]);
    if (newUploads.length > 0) setSelectedFile(newUploads[0]);

    // Start inference for each uploaded file
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i];
      const fileBlob = droppedFiles.find(f => f.name === upload.name) as File;
      if (!fileBlob) continue;
      // Run combined inference (classification from best_model.pth + masks from best.pt)
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
                          <span className="flex items-center gap-1.5"><ModelIcon className="w-3.5 h-3.5"/> MODEL: {selectedFile.analysis?.modelUsed || 'YOLO'}</span>
                          <span className="flex items-center gap-1.5 text-green-600 font-medium"><LiveIcon className="w-3.5 h-3.5"/> LIVE INFERENCE</span>
                        </div>
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
                  <AnalysisStatCard title="TUMOUR AREA" value={selectedFile.analysis.area != null ? `${selectedFile.analysis.area.toFixed(2)} mm²` : 'N/A'} />
                  <AnalysisStatCard title="TUMOUR PIXELS" value={selectedFile.analysis.pixels != null ? `${selectedFile.analysis.pixels} PX` : 'N/A'} />
                </div>

            <div className="mt-6 bg-blue-50 border-l-4 border-brand-blue text-brand-text-primary p-4 rounded-r-lg">
                <p className="font-semibold text-sm">Radiologist Insight:</p>
                {/* Fix: Use insight property as defined in AnalysisResult */}
                <p className="text-sm mt-1">{selectedFile.analysis.insight}</p>
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
