import React, { useState } from 'react';
import type { HistoPrediction, UploadedFile, StructuredReport } from '../types';
import { UploadIcon, CheckCircleIcon, InfoIcon, ModelIcon, LiveIcon, VisionIcon } from '../components/icons';

type WorkerReportResponse = {
  report?: string;
  patientInfo?: Record<string, string>;
  sections?: any[];
  raw?: any;
};

type ErrorResponse = {
  detail?: string;
};

type ParsedReportSection = {
  heading: string;
  content: string;
};

const REPORT_WORKER_URL = '/report';
const REPORT_HEADINGS = [
  'Predicted Subclass',
  'Diagnosis Group',
  'Confidence',
  'Model Insight',
  'Potential Causes',
  'Lifestyle Advice',
  'Dietary Recommendations',
  'Clinical Recommendations',
  'Disclaimer',
];

const getDiagnosisBadgeClass = (diagnosis?: string) => {
  const value = (diagnosis || 'unknown').toLowerCase();
  if (value === 'malignant') return 'bg-red-100 text-red-700';
  if (value === 'benign') return 'bg-green-100 text-green-700';
  if (value === 'normal') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};

const getDiagnosisTextClass = (diagnosis?: string) => {
  const value = (diagnosis || 'unknown').toLowerCase();
  if (value === 'malignant') return 'text-red-600';
  if (value === 'benign') return 'text-green-600';
  if (value === 'normal') return 'text-blue-600';
  return 'text-gray-600';
};

const AnalysisStatCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <p className="text-xs text-brand-text-secondary font-medium">{title}</p>
    <p className="text-xl font-semibold text-brand-text-primary mt-1">{value}</p>
  </div>
);

const getPredictionFields = (prediction?: HistoPrediction) => {
  const subclass = prediction?.subclass_prediction || prediction?.subclass || prediction?.result || 'unknown';
  const diagnosis = prediction?.diagnosis_prediction || prediction?.diagnosis || prediction?.pathology_group || 'unknown';
  return {
    subclass,
    subclassLabel: subclass.replace(/_/g, ' '),
    diagnosis,
  };
};

const normalizeReportText = (report?: string) =>
  (report || '')
    .replace(/\*\*/g, '')
    .replace(/mmÃ‚Â²/g, 'mm^2')
    .trim();

const parseStructuredReport = (report?: string) => {
  const normalized = normalizeReportText(report);
  if (!normalized) return null;

  const lines = normalized
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  let title = 'Analysis Report';
  const sections: ParsedReportSection[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flushSection = () => {
    if (!currentHeading) return;
    sections.push({
      heading: currentHeading,
      content: buffer.join(' ').trim() || 'Not provided',
    });
    currentHeading = null;
    buffer = [];
  };

  for (const line of lines) {
    if (line.toLowerCase() === 'analysis report') {
      title = line;
      continue;
    }

    const matchedHeading = REPORT_HEADINGS.find(heading =>
      line.toLowerCase().startsWith(`${heading.toLowerCase()}:`)
    );

    if (matchedHeading) {
      flushSection();
      currentHeading = matchedHeading;
      const remainder = line.slice(matchedHeading.length + 1).trim();
      if (remainder) buffer.push(remainder);
      continue;
    }

    if (currentHeading) {
      buffer.push(line);
    }
  }

  flushSection();

  if (!sections.length) {
    return {
      title,
      sections: [{ heading: 'Report', content: normalized }],
    };
  }

  return { title, sections };
};

const buildDisplaySections = (prediction: HistoPrediction | undefined, parsedReport: { sections: ParsedReportSection[] } | null) => {
  const fields = getPredictionFields(prediction);
  const sectionMap = new Map((parsedReport?.sections || []).map(section => [section.heading, section.content]));
  const confidence = prediction?.confidence != null ? `${(prediction.confidence * 100).toFixed(1)}%` : 'Not provided';
  const insight = prediction?.insight || 'The master model completed subclass prediction and diagnosis mapping for this scan.';

  const defaults: Record<string, string> = {
    'Predicted Subclass': fields.subclassLabel || 'Not provided',
    'Diagnosis Group': fields.diagnosis || 'Not provided',
    'Confidence': confidence,
    'Model Insight': insight,
    'Potential Causes': `The AI-identified subclass ${fields.subclassLabel || 'Not provided'} may be associated with ${fields.diagnosis || 'unknown'} histopathologic patterns. Clinical correlation is required.`,
    'Lifestyle Advice': 'Maintain general wellness habits and follow physician guidance while awaiting clinical review.',
    'Dietary Recommendations': 'Use balanced, non-prescriptive nutritional support as advised by the treating clinician.',
    'Clinical Recommendations': 'Recommend pathology review, clinicopathologic correlation, and physician follow-up before any final interpretation.',
    'Disclaimer': 'This draft is generated for preliminary review only. A qualified clinician must review, interpret, and confirm findings before forming a final diagnosis or treatment plan.',
  };

  return REPORT_HEADINGS.map(heading => ({
    heading,
    content: sectionMap.get(heading)?.trim() || defaults[heading],
  }));
};

const MultiClassHistoAnalysis: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: UploadedFile) => {
    setSelectedFile(file);
  };

  const updateUploadedFile = (fileId: string, updater: (file: UploadedFile) => UploadedFile) => {
    setFiles(cur => cur.map(file => (file.id === fileId ? updater(file) : file)));
    setSelectedFile(prev => (prev && prev.id === fileId ? updater(prev) : prev));
  };

  const generateSuggestiveReport = async (fileObj: UploadedFile, prediction: HistoPrediction) => {
    const fields = getPredictionFields(prediction);
    console.log('[Report] Starting report generation for:', fileObj.name, fields);

    updateUploadedFile(fileObj.id, file => ({
      ...file,
      reportStatus: 'Generating',
      reportError: undefined,
    }));

    try {
      console.log('[Report] Fetching from:', REPORT_WORKER_URL);
      const res = await fetch(REPORT_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileObj.name,
          analysis: {
            modality: 'histopathology',
            pathology: fields.diagnosis,
            subclass: fields.subclassLabel,
            confidence: prediction.confidence,
            insight: prediction.insight,
            modelUsed: 'OncoScanAI Master',
          },
        }),
      });

      console.log('[Report] Response received:', res.status, res.ok);
      
      if (!res.ok) {
        const text = await res.text().catch(() => `Status ${res.status}`);
        console.log('[Report] Error response:', text);
        throw new Error(text || `Report generation failed (${res.status})`);
      }

      const json = await res.json() as WorkerReportResponse;
      console.log('[Report] Response JSON:', json);
      
      let structuredReport: StructuredReport | null = null;
      let fallbackText = '';

      // Check if response already has structured report data
      if (json.sections && Array.isArray(json.sections)) {
        structuredReport = {
          patientInfo: json.patientInfo,
          sections: json.sections,
        };
        console.log('[Report] Using structured sections');
      } else if (json.report && typeof json.report === 'string') {
        // Try to parse report field as JSON
        try {
          const jsonMatch = json.report.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.sections && Array.isArray(parsed.sections)) {
              structuredReport = parsed;
              console.log('[Report] Parsed structured report from string');
            } else {
              fallbackText = json.report;
              console.log('[Report] Using report as fallback text');
            }
          } else {
            fallbackText = json.report;
            console.log('[Report] No JSON found in report, using as text');
          }
        } catch (e) {
          fallbackText = json.report;
          console.log('[Report] JSON parsing failed, using as text');
        }
      }

      if (!structuredReport && !fallbackText) {
        throw new Error('Cloudflare Worker returned an empty report.');
      }

      console.log('[Report] Updating file with report, status=Complete');
      updateUploadedFile(fileObj.id, file => ({
        ...file,
        reportStatus: 'Complete',
        structuredReport: structuredReport || undefined,
        suggestiveReport: fallbackText || JSON.stringify(structuredReport),
        reportError: undefined,
      }));
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const msg = rawMsg === 'Failed to fetch'
        ? 'Could not reach the local Cloudflare Worker at /report. Make sure `wrangler dev` is running for `backend/cf-report-worker`.'
        : rawMsg;
      console.error('[Report] Error:', msg);

      // Generate basic local fallback if worker fails
      console.log('[Report] Generating local fallback report');
      const fallbackReport: StructuredReport = {
        patientInfo: {
          file: fileObj.name,
          model: 'OncoScanAI Master',
          analysisTime: new Date().toISOString(),
        },
        sections: [
          {
            title: 'Classification & Findings',
            subsections: [
              { label: 'Predicted Subclass', content: fields.subclassLabel },
              { label: 'Diagnosis Group', content: fields.diagnosis },
              { label: 'Confidence', content: `${(prediction.confidence * 100).toFixed(1)}%` },
              { label: 'Model Insight', content: prediction.insight || 'Analysis completed' },
            ],
          },
          {
            title: 'Important Disclaimer',
            description: 'AI-generated reference only',
            subsections: [
              { label: 'Clinical Use', content: 'This report is generated by AI and is not for standalone diagnosis. A qualified clinician must review all findings.' },
            ],
          },
        ],
      };

      updateUploadedFile(fileObj.id, file => ({
        ...file,
        reportStatus: 'Complete',
        structuredReport: fallbackReport,
        reportError: undefined,
      }));
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    const newUploads: UploadedFile[] = newFiles.map((file, index) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const type = (extension === 'svs' || extension === 'tiff' || extension === 'png' || extension === 'jpg' || extension === 'jpeg') ? extension : 'tiff';
      return {
        id: String(Date.now() + index),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        status: 'Uploading',
        type: type as any,
        progress: 0,
        previewUrl: URL.createObjectURL(file),
        reportStatus: 'Idle',
      };
    });

    setFiles(prev => [...newUploads, ...prev]);
    if (newUploads.length > 0) {
      setSelectedFile(newUploads[0]);
    }

    for (const upload of newUploads) {
      const fileToUpload = newFiles.find(f => f.name === upload.name);
      if (!fileToUpload) continue;

      const formData = new FormData();
      formData.append('file', fileToUpload);

      try {
        const progressInterval = setInterval(() => {
          setFiles(currentFiles => currentFiles.map(f => {
            if (f.id === upload.id && (f.progress || 0) < 90) {
              const updated = { ...f, progress: Math.min((f.progress || 0) + 10, 90) };
              setSelectedFile(prev => prev?.id === upload.id ? updated : prev);
              return updated;
            }
            return f;
          }));
        }, 100);

        const response = await fetch('/predict/histo/master', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch((): ErrorResponse => ({ detail: `Inference failed: ${response.statusText}` })) as ErrorResponse;
          throw new Error(errorData.detail || 'Analysis failed');
        }

        const result = await response.json() as HistoPrediction;
        const completedFile = { ...upload, status: 'Complete' as const, progress: 100, prediction: result, reportStatus: 'Generating' as const, reportError: undefined };
        setFiles(currentFiles => currentFiles.map(f => {
          if (f.id !== upload.id) return f;
          setSelectedFile(prev => prev?.id === upload.id ? completedFile : prev);
          return completedFile;
        }));
        await generateSuggestiveReport(completedFile, result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Neural link failure.';
        setFiles(currentFiles => currentFiles.map(f => {
          if (f.id !== upload.id) return f;
          const updated = { ...f, status: 'Failed', progress: 100, errorMessage } as UploadedFile;
          setSelectedFile(prev => prev?.id === upload.id ? updated : prev);
          return updated;
        }));
      }
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(entering);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const selectedPrediction = selectedFile?.prediction;
  const selectedFields = getPredictionFields(selectedPrediction);
  const parsedReport = parseStructuredReport(selectedFile?.suggestiveReport);
  const displaySections = buildDisplaySections(selectedPrediction, parsedReport);

  return (
    <div className="space-y-6 h-full">
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-pink-50 to-fuchsia-50 p-6 rounded-2xl shadow-subtle border border-pink-100">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-pink/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -left-10 w-32 h-32 bg-fuchsia-200/40 rounded-full blur-2xl"></div>
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Multi-Class Histoanalysis</h1>
          <p className="text-sm md:text-base text-slate-600 mt-2">Deploying the OncoScanAI Master model for subclass prediction and diagnosis mapping.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative flex-grow flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-subtle border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-brand-pink bg-pink-50' : 'border-gray-200'}`}
          >
            <input
              type="file"
              id="histo-file-upload"
              className="hidden"
              multiple
              accept=".png,.jpg,.jpeg,.svs,.tiff"
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
            <label htmlFor="histo-file-upload" className="text-center cursor-pointer">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <UploadIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold text-brand-text-primary mt-4">Drop Histology Scan Here</p>
              <p className="text-xs text-brand-text-secondary mt-1">PNG, JPG, TIFF, SVS</p>
            </label>
          </div>

          <div className="flex-shrink-0 bg-white p-4 rounded-lg shadow-subtle border border-gray-200">
            <div className="flex justify-between items-center mb-3 px-2">
              <h3 className="font-semibold text-brand-text-primary text-sm">Scan Queue</h3>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{files.length} Files</span>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {files.map(file => {
                const fields = getPredictionFields(file.prediction);
                return (
                  <li
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedFile?.id === file.id ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                  >
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="w-10 h-10 rounded-md object-cover mr-3" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gray-100 mr-3"></div>
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-brand-text-primary truncate">{file.name}</p>
                      <p className="text-xs text-brand-text-secondary">{file.size}</p>
                    </div>
                    {file.status === 'Uploading' && <div className="w-4 h-4 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>}
                    {file.status === 'Complete' && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getDiagnosisBadgeClass(fields.diagnosis)}`}>
                        {fields.diagnosis.toUpperCase()}
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
                );
              })}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-subtle border border-gray-200 flex flex-col min-h-[540px]">
          {selectedFile ? (
            <>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-100 text-brand-pink rounded-lg flex items-center justify-center">
                    <VisionIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-brand-text-primary">Multi-Class Histology Analysis</h2>
                    <div className="flex items-center gap-4 text-xs mt-1 text-brand-text-secondary">
                      <span className="flex items-center gap-1.5"><ModelIcon className="w-3.5 h-3.5" /> MODEL: ONCOSCANAI MASTER</span>
                      <span className="flex items-center gap-1.5 text-green-600 font-medium"><LiveIcon className="w-3.5 h-3.5" /> LIVE INFERENCE</span>
                    </div>
                  </div>
                </div>
                {selectedFile.status === 'Complete' && (
                  <div className="text-right">
                    <p className="text-xs text-brand-text-secondary font-semibold">DIAGNOSIS</p>
                    <p className={`text-lg font-bold ${getDiagnosisTextClass(selectedFields.diagnosis)}`}>{selectedFields.diagnosis.toUpperCase()}</p>
                  </div>
                )}
              </div>

              {selectedFile.status === 'Complete' && selectedPrediction ? (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 my-6 flex-grow">
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold text-brand-text-secondary mb-2 text-center">UPLOADED SCAN</p>
                      <div className="flex-grow bg-gray-900 rounded-lg flex items-center justify-center p-2 relative overflow-hidden min-h-[260px]">
                        {selectedFile.previewUrl ? (
                          <img src={selectedFile.previewUrl} alt={selectedFile.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <div className="text-gray-400 text-sm">Preview unavailable</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <p className="text-xs font-semibold text-brand-text-secondary mb-2 text-center">DETAILED RESULT</p>
                      <div className="flex-grow bg-gray-50 rounded-lg border border-gray-200 p-6 flex flex-col justify-center">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-brand-text-secondary mb-2">SUBCLASS</p>
                            <span className="inline-flex px-3 py-2 rounded-full text-sm font-bold border bg-gray-100 text-gray-800 border-gray-200">
                              {selectedFields.subclassLabel}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-brand-text-secondary mb-2">DIAGNOSIS</p>
                            <span className={`inline-flex px-3 py-2 rounded-full text-sm font-bold ${getDiagnosisBadgeClass(selectedFields.diagnosis)}`}>
                              {selectedFields.diagnosis.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-brand-text-secondary mb-2">AI INSIGHT</p>
                            <p className="text-sm text-brand-text-primary leading-6">
                              {selectedPrediction.insight || 'The master model completed subclass prediction and diagnosis mapping for this scan.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnalysisStatCard title="SUBCLASS CONFIDENCE" value={`${(selectedPrediction.confidence * 100).toFixed(1)}%`} />
                    <AnalysisStatCard title="DIAGNOSIS CONFIDENCE" value={selectedPrediction.pathology_confidence != null ? `${(selectedPrediction.pathology_confidence * 100).toFixed(1)}%` : 'N/A'} />
                    <AnalysisStatCard title="PREDICTED CLASS ID" value={selectedPrediction.class_id != null ? String(selectedPrediction.class_id) : 'N/A'} />
                  </div>

                  <div className="mt-6 bg-white border border-gray-200 p-5 rounded-lg shadow-subtle">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm text-brand-text-primary">Suggestive Report</p>
                        <p className="text-xs text-brand-text-secondary mt-1">Generated from the histopathology prediction by your local Cloudflare Worker.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void generateSuggestiveReport(selectedFile, selectedPrediction)}
                        disabled={selectedFile.reportStatus === 'Generating'}
                        className="bg-brand-pink text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-subtle hover:bg-brand-pink-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {selectedFile.reportStatus === 'Generating' ? 'Generating...' : 'Regenerate Report'}
                      </button>
                    </div>

                    {selectedFile.reportStatus === 'Generating' && (
                      <div className="mt-4 flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-brand-text-primary">
                        <div className="w-4 h-4 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                        Cloudflare Workers AI is drafting the suggestive report from the multi-class histology output.
                      </div>
                    )}

                    {selectedFile.reportStatus === 'Failed' && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {selectedFile.reportError || 'Report generation failed.'}
                      </div>
                    )}

                    {selectedFile.structuredReport && (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="border-b border-slate-200 bg-white px-5 py-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-lg font-bold text-slate-900">Analysis Report</p>
                              <p className="mt-1 text-sm text-slate-600">
                                Structured AI-generated histopathology analysis
                              </p>
                            </div>
                            {selectedFile.structuredReport.patientInfo && (
                              <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                {Object.entries(selectedFile.structuredReport.patientInfo).map(([key, value]) => (
                                  <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="font-semibold text-slate-800">{key}:</span> {value}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 p-5 md:grid-cols-2">
                          {selectedFile.structuredReport.sections.map(section => {
                            const isDisclaimer = section.title.toLowerCase().includes('disclaimer');
                            return (
                              <div
                                key={section.title}
                                className={`rounded-xl border p-5 ${isDisclaimer ? 'border-amber-200 bg-amber-50 md:col-span-2' : 'border-slate-200 bg-white'}`}
                              >
                                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDisclaimer ? 'text-amber-700' : 'text-slate-500'}`}>
                                  {section.title}
                                </p>
                                {section.description && (
                                  <p className={`mt-2 text-sm leading-5 ${isDisclaimer ? 'text-amber-800' : 'text-slate-600'}`}>
                                    {section.description}
                                  </p>
                                )}
                                {section.subsections && (
                                  <div className="mt-4 space-y-3">
                                    {section.subsections.map((subsection, idx) => (
                                      <div key={idx} className="grid gap-2 md:grid-cols-[140px_1fr]">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                          {subsection.label}
                                        </p>
                                        <p className={`text-sm leading-6 ${isDisclaimer ? 'text-amber-900' : 'text-slate-700'}`}>
                                          {subsection.content}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedFile.suggestiveReport && !selectedFile.structuredReport && (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="border-b border-slate-200 bg-white px-5 py-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-lg font-bold text-slate-900">{parsedReport?.title || 'Analysis Report'}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                Template-style summary generated from the multi-class histopathology result.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <span className="font-semibold text-slate-800">File:</span> {selectedFile.name}
                              </div>
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <span className="font-semibold text-slate-800">Model:</span> OncoScanAI Master
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 p-5 md:grid-cols-2">
                          {displaySections.map(section => {
                            const isDisclaimer = section.heading.toLowerCase() === 'disclaimer';
                            return (
                              <div
                                key={section.heading}
                                className={`rounded-xl border p-4 ${isDisclaimer ? 'border-amber-200 bg-amber-50 md:col-span-2' : 'border-slate-200 bg-white'}`}
                              >
                                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDisclaimer ? 'text-amber-700' : 'text-slate-500'}`}>
                                  {section.heading}
                                </p>
                                <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${isDisclaimer ? 'text-amber-900' : 'text-slate-700'}`}>
                                  {section.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {!parsedReport && (
                          <div className="border-t border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Raw Worker Output</p>
                            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-text-primary font-sans">
                              {selectedFile.suggestiveReport}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {!selectedFile.structuredReport && !selectedFile.suggestiveReport && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {selectedFile.reportStatus === 'Idle' && (
                          <p className="text-sm text-brand-text-secondary">The report will be generated automatically after analysis.</p>
                        )}
                        {selectedFile.reportStatus === 'Generating' && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-brand-text-primary">Generating report...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : selectedFile.status === 'Failed' ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full mb-4">
                    <InfoIcon className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-700 mt-4">Analysis Failed</h3>
                  <p className="text-sm text-brand-text-secondary mt-2 max-w-md">{selectedFile.errorMessage || 'The model could not analyze this scan.'}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mb-4">
                    <div className="w-6 h-6 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-text-primary mt-4">Processing Scan</h3>
                  <p className="text-sm text-brand-text-secondary mt-2 max-w-md">The master model is predicting the subclass first and then deriving the diagnosis.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mb-4">
                <VisionIcon className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-brand-text-primary mt-4">Select a scan</h3>
              <p className="text-sm text-brand-text-secondary mt-2 max-w-md">Upload a new scan or select one from the queue to view the detailed AI analysis here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiClassHistoAnalysis;
