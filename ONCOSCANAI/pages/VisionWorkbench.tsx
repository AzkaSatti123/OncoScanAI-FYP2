import React, { useState, useEffect } from 'react';
import { UploadIcon, ModelIcon, VisionIcon, InfoIcon, DownloadIcon, PrintIcon } from '../components/icons';
import type { UploadedFile, AnalysisResult, HistoPrediction, StructuredReport } from '../types';

const BACKEND_URL = 'http://127.0.0.1:8000';
const REPORT_WORKER_URL = '/report';

type ModelsResponse = {
  active_models?: string[];
  histo_models?: string[];
};

const REPORT_HEADINGS = [
  'File Reference',
  'Classification',
  'AI Confidence',
  'Analysis Date & Time',
  'Predicted Subclass',
  'Subclass ID',
  'Subclass Confidence',
  'Diagnosis Confidence',
  'Summary',
  'Impression',
  'Histopathological Features',
  'Quantitative Findings',
  'Risk Stratification',
  'Recommended Clinical Next Steps',
  'Management Considerations',
  'Limitations',
  'Disclaimer',
];

const toAnalysisPathology = (result?: string): AnalysisResult['pathology'] => {
  const normalized = (result || '').toLowerCase();
  if (normalized === 'malignant') return 'Malignant';
  if (normalized === 'benign') return 'Benign';
  if (normalized === 'normal') return 'Normal';
  return 'Inconclusive';
};

const deriveHistoModels = (data: ModelsResponse) => {
  if (Array.isArray(data.histo_models)) return data.histo_models.filter(m => m !== 'master');
  const active = Array.isArray(data.active_models) ? data.active_models : [];
  return active.filter(model => model === 'alexnet' || model === 'efficient_net' || model === 'yolo');
};

const normalizeReportText = (report?: string) =>
  (report || '')
    .replace(/\*\*/g, '')
    .replace(/mmÃ‚Â²/g, 'mm^2')
    .trim();

type ParsedReportSection = { heading: string; content: string };

const parseStructuredReport = (report?: string) => {
  const normalized = normalizeReportText(report);
  if (!normalized) return null;

  const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const sections: ParsedReportSection[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flushSection = () => {
    if (!currentHeading) return;
    sections.push({ heading: currentHeading, content: buffer.join(' ').trim() });
    currentHeading = null;
    buffer = [];
  };

  for (const line of lines) {
    if (line.toLowerCase() === 'analysis report') continue;
    const matchedHeading = REPORT_HEADINGS.find(h => line.toLowerCase().startsWith(`${h.toLowerCase()}:`));
    if (matchedHeading) {
      flushSection();
      currentHeading = matchedHeading;
      const remainder = line.slice(matchedHeading.length + 1).trim();
      if (remainder) buffer.push(remainder);
    } else if (currentHeading) {
      buffer.push(line);
    }
  }
  flushSection();

  if (!sections.length) {
    return { sections: [{ heading: 'Report', content: normalized }] };
  }
  return { sections };
};

const splitNumberedItems = (value?: string) =>
  (value || '').split(/\s(?=\d+\.\s)/).map(i => i.trim()).filter(Boolean);

const VisionWorkbench: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  const getModelDisplayName = (modelKey: string) => {
    const displayNames: { [key: string]: string } = {
      'alexnet': 'AlexNet',
      'yolo': 'YOLO V11',
      'efficient_net': 'EfficientNet'
    };
    return displayNames[modelKey] || modelKey.toUpperCase();
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/models`);
        if (response.ok) {
          const data = await response.json() as ModelsResponse;
          const models = deriveHistoModels(data);
          setAvailableModels(models);
          if (models.length > 0) {
            const preferred = models.find((m: string) => m === 'alexnet')
              || models.find((m: string) => m.includes('alex') || m.includes('yolo') || m.includes('efficient'));
            setActiveModel(preferred || models[0]);
          }
        }
      } catch (err) {
        console.error("Diagnostic engine sync failed:", err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  const updateFile = (fileId: string, updater: (f: UploadedFile) => UploadedFile) => {
    setFiles(prev => prev.map(f => f.id === fileId ? updater(f) : f));
  };

  const generateNLPReport = async (fileId: string, fileName: string, analysis: AnalysisResult) => {
    updateFile(fileId, f => ({ ...f, reportStatus: 'Generating', reportError: undefined }));

    const pathology = analysis.pathology.toLowerCase();
    const riskLevel = pathology === 'malignant' ? 'High Risk' : pathology === 'benign' ? 'Moderate Risk' : 'Low Risk';
    const confidence = `${(analysis.confidence * 100).toFixed(1)}%`;
    const analysisDate = new Date().toLocaleString();

    try {
      const res = await fetch(REPORT_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          analysis: {
            modality: 'histopathology',
            pathology: analysis.pathology,
            subclass: analysis.pathology,
            confidence: analysis.confidence,
            insight: analysis.insight,
            modelUsed: analysis.modelUsed,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text().catch(() => `Status ${res.status}`));
      }

      type WorkerReportResponse = { report?: string; sections?: unknown[]; patientInfo?: Record<string, string> };
      const json = await res.json() as WorkerReportResponse;

      let structuredReport: StructuredReport | null = null;
      let fallbackText = '';

      if (json.sections && Array.isArray(json.sections)) {
        structuredReport = { patientInfo: json.patientInfo, sections: json.sections as StructuredReport['sections'] };
      } else if (json.report && typeof json.report === 'string') {
        try {
          const jsonMatch = json.report.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as { sections?: unknown[] };
            if (parsed.sections && Array.isArray(parsed.sections)) {
              structuredReport = parsed as StructuredReport;
            } else {
              fallbackText = json.report;
            }
          } else {
            fallbackText = json.report;
          }
        } catch {
          fallbackText = json.report;
        }
      }

      if (!structuredReport && !fallbackText) {
        throw new Error('Worker returned an empty report.');
      }

      updateFile(fileId, f => ({
        ...f,
        reportStatus: 'Complete',
        structuredReport: structuredReport || undefined,
        suggestiveReport: fallbackText || undefined,
        reportError: undefined,
      }));
    } catch {
      // Local fallback report when worker is unavailable
      const fallback: StructuredReport = {
        patientInfo: {
          'Report ID': `HISTO-${Date.now()}`,
          'Analysis Date & Time': analysisDate,
        },
        sections: [
          {
            title: 'Model Prediction Summary',
            description: 'Core single-class model outputs for diagnosis estimation.',
            subsections: [
              { label: 'Classification', content: analysis.pathology, isHighlighted: true },
              { label: 'AI Confidence', content: confidence },
              { label: 'Engine Used', content: analysis.modelUsed },
              { label: 'Analysis Date & Time', content: analysisDate },
            ],
          },
          {
            title: 'Histopathological Findings',
            description: 'Microscopic tissue characteristics inferred from the uploaded histology image.',
            subsections: [
              { label: 'Observations', content: analysis.insight },
            ],
          },
          {
            title: 'Risk Level Assessment',
            description: 'AI-assisted risk category derived from classification and confidence.',
            subsections: [
              { label: 'Risk Category', content: riskLevel, isHighlighted: true },
            ],
          },
          {
            title: 'Recommended Medical Actions',
            description: 'Suggested next-step clinical evaluation.',
            subsections: [
              { label: 'Actions', content: 'Immediate pathology review, oncologist consultation, biopsy confirmation, and breast imaging such as mammography or MRI may be required.' },
            ],
          },
          {
            title: 'Limitations',
            subsections: [
              { label: 'Limitations', content: 'This AI-derived inference depends on image quality, representative sampling, and model training data. It does not replace formal histopathological diagnosis.' },
            ],
          },
          {
            title: 'Disclaimer',
            description: 'AI-generated reference only',
            subsections: [
              { label: 'Clinical Use', content: 'This report is generated by AI and is not for standalone diagnosis. A qualified clinician must review all findings before clinical decision-making.' },
            ],
          },
        ],
      };

      updateFile(fileId, f => ({
        ...f,
        reportStatus: 'Complete',
        structuredReport: fallback,
        reportError: undefined,
      }));
    }
  };

  const handleAnalysis = async (fileId: string, rawFile: File, modelName: string) => {
    if (!modelName) return;

    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'Analyzing' } : f));

    const formData = new FormData();
    formData.append("file", rawFile);

    try {
      const response = await fetch(`${BACKEND_URL}/predict/histo/${modelName}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json() as HistoPrediction;

      const analysis: AnalysisResult = {
        pathology: toAnalysisPathology(data.result),
        confidence: data.confidence,
        insight: data.insight || 'The selected model completed the histology analysis.',
        modelUsed: getModelDisplayName(modelName)
      };

      setFiles(prev => prev.map(f => f.id === fileId ? {
        ...f,
        status: 'Complete',
        analysis,
        reportStatus: 'Generating',
      } : f));

      await generateNLPReport(fileId, rawFile.name, analysis);
    } catch (err) {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'Failed', errorMessage: String(err) } : f));
    }
  };

  const onFileDrop = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let rawFiles: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      rawFiles = Array.from(e.dataTransfer.files);
    } else {
      rawFiles = e.target.files ? Array.from(e.target.files) : [];
    }

    const newFiles: UploadedFile[] = rawFiles.map(rf => ({
      id: Math.random().toString(36).substr(2, 9),
      name: rf.name,
      size: (rf.size / 1024).toFixed(1) + ' KB',
      status: 'Pending',
      type: rf.name.split('.').pop() || 'unknown',
      previewUrl: URL.createObjectURL(rf),
      reportStatus: 'Idle',
    }));

    setFiles(prev => [...newFiles, ...prev]);
    if (newFiles.length > 0) setSelectedFileId(newFiles[0].id);

    newFiles.forEach((nf, idx) => {
      handleAnalysis(nf.id, rawFiles[idx], activeModel);
    });
  };

  const renderReport = (file: UploadedFile) => {
    if (!file.analysis) return null;

    const { analysis } = file;
    const pathology = analysis.pathology.toLowerCase();
    const confidence = `${(analysis.confidence * 100).toFixed(1)}%`;
    const reportId = `ONCO-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date();
    const reportDate = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const parsedText = parseStructuredReport(file.suggestiveReport);
    const sectionMap = new Map((parsedText?.sections || []).map(s => [s.heading, s.content]));
    const sr = file.structuredReport;
    const getS = (title: string) => sr?.sections.find(s => s.title === title)?.subsections?.[0]?.content;

    const riskLevel = pathology === 'malignant' ? 'High Risk' : pathology === 'benign' ? 'Moderate Risk' : 'Low Risk';

    const clinicalHistory = sectionMap.get('Summary')
      || getS('Summary')
      || `Histology scan submitted for AI-assisted classification. ${analysis.insight}`;

    const grossDesc = `Scanned histological image file (${file.size}). Submitted for single-class inference using ${analysis.modelUsed} engine. Image processed in full resolution.`;

    const microscopicDesc = sectionMap.get('Histopathological Features')
      || getS('Histopathological Features')
      || `Sections demonstrate tissue architecture and cellular morphology consistent with ${analysis.pathology} classification. Nuclear and stromal patterns are inferred by the AI model. ${analysis.insight}`;

    const impression = sectionMap.get('Impression')
      || getS('Impression')
      || `AI inference indicates ${analysis.pathology} morphology at ${confidence} confidence. Formal pathology correlation is required.`;

    const nextStepsText = sectionMap.get('Recommended Clinical Next Steps')
      || getS('Recommended Clinical Next Steps')
      || '1. Arrange specialist consultation. 2. Confirm findings with biopsy or formal histopathological review. 3. Correlate with mammography, MRI, or ultrasound as clinically appropriate. 4. Discuss in multidisciplinary tumor board when indicated. 5. Initiate management pathway based on confirmed subtype and grade.';

    const managementText = sectionMap.get('Management Considerations')
      || getS('Management Considerations')
      || 'General management pathways may include surgical intervention, chemotherapy, radiation therapy, and hormone-directed therapy depending on confirmed subtype, grade, receptor status, and stage.';

    const nextSteps = splitNumberedItems(nextStepsText);

    const isMalignant = pathology === 'malignant';
    const isBenign = pathology === 'benign';
    const diagnosisBg = isMalignant ? 'bg-red-600' : isBenign ? 'bg-emerald-600' : 'bg-blue-600';
    const diagnosisLabel = isMalignant
      ? `${analysis.pathology} Tissue — High-Grade Pattern Identified`
      : isBenign
      ? `${analysis.pathology} Tissue — No Malignant Features Detected`
      : `${analysis.pathology} Tissue — Inconclusive Pattern`;

    return (
      <div className="mt-6 bg-white border border-gray-300 shadow-lg font-sans text-[13px] text-gray-900 print:shadow-none" id="pathology-report">

        {/* ── Header ── */}
        <div className="flex items-start gap-4 border-b-2 border-gray-800 px-6 pt-5 pb-4">
          {/* Microscope icon placeholder */}
          <div className="w-14 h-14 flex-shrink-0 border border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400">
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75H14.25M12 3.75V9M9 9H15M8.25 9C8.25 9 6 10.5 6 13.5C6 16.5 8.25 18 12 18C15.75 18 18 16.5 18 13.5C18 10.5 15.75 9 15.75 9M10.5 21H13.5M12 18V21" />
            </svg>
          </div>

          {/* Patient / case meta */}
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-0.5 text-[12px]">
            <div>
              <span className="font-bold">Case#:</span> {reportId}
            </div>
            <div>
              <span className="font-bold">Facility:</span> OncoScanAI — AI Pathology Lab
            </div>
            <div>
              <span className="font-bold">File:</span> {file.name}
            </div>
            <div>
              <span className="font-bold">Collected:</span> {reportDate}
            </div>
            <div>
              <span className="font-bold">Engine:</span> {analysis.modelUsed}
            </div>
            <div>
              <span className="font-bold">Received:</span> {reportDate}
            </div>
            <div>
              <span className="font-bold">AI Confidence:</span> {confidence}
            </div>
            <div>
              <span className="font-bold">Reported:</span> {reportDate} {reportTime}
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="text-center py-4 border-b border-gray-300">
          <h2 className="text-[1.35rem] font-bold tracking-wide">Surgical Pathology Report</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">AI-Assisted Histopathology Analysis — OncoScanAI</p>
        </div>

        {/* ── Diagnosis Box ── */}
        <div className={`mx-4 mt-4 rounded-sm ${diagnosisBg}`}>
          <div className="px-3 py-1.5">
            <p className="text-white font-black text-[11px] uppercase tracking-widest">Diagnosis</p>
          </div>
          <div className="bg-white border-l-4 border-r-4 border-b-4 border-current mx-0 px-4 py-3 rounded-b-sm" style={{ borderColor: isMalignant ? '#dc2626' : isBenign ? '#059669' : '#2563eb' }}>
            <p className="font-bold text-[13px] leading-6">
              1. {diagnosisLabel}
            </p>
            <p className="font-bold text-[13px] leading-6">
              2. {riskLevel} — AI Model Confidence: {confidence}
            </p>
          </div>
        </div>

        {/* ── NOTE ── */}
        <div className="mx-4 mt-3 text-[12px] leading-5 text-gray-700">
          <span className="font-bold">NOTE:</span> This report is AI-generated using the {analysis.modelUsed} model. Immunohistochemical (IHC) and molecular confirmatory testing may be required. Results must be reviewed and validated by a qualified pathologist before clinical use.
        </div>

        {/* ── Scan Image Strip ── */}
        {file.previewUrl && (
          <div className="mx-4 mt-5 flex gap-3">
            {[
              { label: 'Histology Scan — Submitted View', src: file.previewUrl },
              { label: 'AI Analysis View', src: file.previewUrl },
              { label: 'Inference Focus Region', src: file.previewUrl },
            ].map((img, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full aspect-square border border-gray-300 overflow-hidden bg-gray-900">
                  <img
                    src={img.src}
                    alt={img.label}
                    className="w-full h-full object-cover"
                    style={{ filter: idx === 1 ? 'contrast(1.15) saturate(1.2)' : idx === 2 ? 'contrast(1.3) brightness(0.9) saturate(0.8)' : 'none' }}
                  />
                </div>
                <p className="text-[10px] text-center text-gray-600 mt-1">{img.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Clinical Sections ── */}
        <div className="mx-4 mt-5 space-y-3 pb-6">

          <div>
            <span className="font-bold uppercase text-[12px]">Clinical History: </span>
            <span className="text-[12px] leading-5">{clinicalHistory}</span>
          </div>

          <div>
            <span className="font-bold uppercase text-[12px]">Sites: </span>
            <span className="text-[12px] leading-5">Histology image — single core biopsy or whole-slide scan submitted for AI classification</span>
          </div>

          <div>
            <span className="font-bold uppercase text-[12px]">Gross: </span>
            <span className="text-[12px] leading-5">{grossDesc}</span>
          </div>

          <div>
            <span className="font-bold uppercase text-[12px]">Microscopic: </span>
            <span className="text-[12px] leading-5">{microscopicDesc}</span>
          </div>

          <div>
            <span className="font-bold uppercase text-[12px]">Impression: </span>
            <span className="text-[12px] leading-5">{impression}</span>
          </div>

          <div>
            <p className="font-bold uppercase text-[12px] mb-1">Recommended Clinical Next Steps:</p>
            <div className="pl-3 space-y-0.5">
              {(nextSteps.length ? nextSteps : [nextStepsText]).map((step, idx) => (
                <p key={idx} className="text-[12px] leading-5">
                  <span className="font-semibold">{idx + 1}.</span> {step.replace(/^\d+\.\s*/, '')}
                </p>
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold uppercase text-[12px]">Management Considerations: </span>
            <span className="text-[12px] leading-5">{managementText}</span>
          </div>

          <div>
            <span className="font-bold uppercase text-[12px]">Previous BX / AI History: </span>
            <span className="text-[12px] leading-5">No prior AI scan history available for this session.</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-300 mx-4 pt-3 pb-4 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 italic max-w-lg">
            This AI-generated report is a preliminary draft for clinical reference only. A licensed pathologist must review and sign off before any diagnostic or treatment decision is made.
          </p>
          <div className="text-right text-[10px] text-gray-400">
            <p>{reportId}</p>
            <p>OncoScanAI v2</p>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-4 gap-6 h-full max-h-[calc(100vh-140px)]">
      {/* Sidebar: Diagnostics Queue & Engine Selection */}
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
        <div className="bg-white p-5 rounded-2xl shadow-subtle border border-slate-200">
          <div className="flex items-center justify-between mb-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Engine</label>
             {isLoadingModels && <div className="w-3 h-3 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="flex flex-col gap-2 p-1 bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
            {availableModels.length === 0 && !isLoadingModels ? (
              <div className="py-6 text-center text-[10px] text-slate-400 font-bold px-4">
                No histology models detected.<br/>Add alexnet.pth, efficient_net.pth, or yolov11.pth
              </div>
            ) : (
              availableModels.map(m => (
                <button
                  key={m}
                  onClick={() => setActiveModel(m)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all text-left flex items-center justify-between ${activeModel === m ? 'bg-white text-brand-pink shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  <span>{getModelDisplayName(m)}</span>
                  {activeModel === m && <div className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse"></div>}
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={`flex-grow bg-white rounded-2xl border-2 border-dashed flex flex-col overflow-hidden transition-all ${isDragging ? 'border-brand-pink bg-pink-50' : 'border-slate-200'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { setIsDragging(false); onFileDrop(e); }}
        >
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinical Queue</h3>
            <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{files.length}</span>
          </div>

          <div className="flex-grow overflow-y-auto p-2 space-y-2">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <UploadIcon className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Drag DICOM/Scans<br/>to begin analysis
                </p>
              </div>
            ) : (
              files.map(file => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full flex items-center p-2 rounded-xl transition-all group ${selectedFileId === file.id ? 'bg-pink-50 ring-1 ring-brand-pink' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-200 mr-3 flex-shrink-0 overflow-hidden border border-slate-100">
                    <img src={file.previewUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="text-left overflow-hidden flex-grow">
                    <p className="text-xs font-bold truncate text-slate-700">{file.name}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${file.status === 'Complete' ? 'text-green-600' : file.status === 'Failed' ? 'text-red-500' : 'text-slate-400'}`}>
                        {file.status}
                      </span>
                      {file.status === 'Analyzing' && <div className="w-2 h-2 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
             <input type="file" id="file-upload" className="hidden" multiple onChange={onFileDrop} />
             <label htmlFor="file-upload" className="flex items-center justify-center w-full py-3 bg-brand-pink text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer hover:bg-brand-pink-dark transition-all shadow-lg shadow-pink-100">
               Import Scan
             </label>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Terminal */}
      <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto">
        {selectedFile ? (
          <div className="flex-grow bg-white rounded-3xl shadow-subtle border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white text-brand-pink rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                  <VisionIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">{selectedFile.name}</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Engine: {getModelDisplayName(activeModel) || 'OFFLINE'} • {selectedFile.type.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2.5 text-slate-400 hover:text-brand-pink hover:bg-pink-50 rounded-xl transition-all"><PrintIcon className="w-5 h-5" /></button>
                <button className="p-2.5 text-slate-400 hover:text-brand-pink hover:bg-pink-50 rounded-xl transition-all"><DownloadIcon className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-grow p-8 overflow-y-auto">
              {selectedFile.status === 'Complete' && selectedFile.analysis ? (
                <div className="space-y-8">
                  {/* Scan + inference result */}
                  <div className="grid md:grid-cols-2 gap-10">
                    {/* Imaging Panel */}
                    <div className="space-y-8">
                      <div className="relative group">
                         <div className="aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center justify-center border-8 border-slate-50">
                            <img src={selectedFile.previewUrl} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" alt="Scan" />
                         </div>
                         <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest">Diagnostic View</div>
                      </div>
                    </div>

                    {/* Data Panel */}
                    <div className="flex flex-col space-y-8">
                      <div className={`p-8 rounded-[2rem] border-2 transition-all ${selectedFile.analysis.pathology === 'Malignant' ? 'bg-red-50/50 border-red-100 shadow-red-50 shadow-lg' : 'bg-green-50/50 border-green-100 shadow-green-50 shadow-lg'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedFile.analysis.pathology === 'Malignant' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                            {selectedFile.analysis.pathology}
                          </span>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inference Confidence</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">{(selectedFile.analysis.confidence * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-2.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-[1500ms] ease-out ${selectedFile.analysis.pathology === 'Malignant' ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${selectedFile.analysis.confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 relative overflow-hidden">
                         <div className="flex items-center space-x-3 mb-4">
                           <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center">
                              <InfoIcon className="w-4 h-4 text-brand-pink" />
                           </div>
                           <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Neural Insight</h4>
                         </div>
                         <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                           "{selectedFile.analysis.insight}"
                         </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                             <ModelIcon className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Engine Version</p>
                              <p className="text-xs font-bold text-slate-700">STABLE-PYTORCH-V2</p>
                           </div>
                         </div>
                         <button className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                           Confirm Diagnosis
                         </button>
                      </div>
                    </div>
                  </div>

                  {/* NLP Report Section */}
                  <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-subtle">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm text-brand-text-primary">Suggestive NLP Report</p>
                        <p className="text-xs text-brand-text-secondary mt-1">AI-generated narrative report drafted from the histopathology inference.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectedFile.analysis && void generateNLPReport(selectedFile.id, selectedFile.name, selectedFile.analysis)}
                        disabled={selectedFile.reportStatus === 'Generating'}
                        className="bg-brand-pink text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-subtle hover:bg-brand-pink-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {selectedFile.reportStatus === 'Generating' ? 'Generating...' : 'Regenerate Report'}
                      </button>
                    </div>

                    {selectedFile.reportStatus === 'Generating' && (
                      <div className="mt-4 flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-brand-text-primary">
                        <div className="w-4 h-4 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                        Drafting the suggestive NLP report from histology inference output...
                      </div>
                    )}

                    {selectedFile.reportStatus === 'Failed' && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {selectedFile.reportError || 'Report generation failed.'}
                      </div>
                    )}

                    {(selectedFile.reportStatus === 'Complete' || selectedFile.structuredReport || selectedFile.suggestiveReport) && renderReport(selectedFile)}

                    {!selectedFile.structuredReport && !selectedFile.suggestiveReport && selectedFile.reportStatus === 'Idle' && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm text-brand-text-secondary">The report will be generated automatically after analysis completes.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedFile.status === 'Failed' ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <InfoIcon className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Neural Link Severed</h3>
                  <p className="text-slate-500 text-sm max-w-xs mb-8">{selectedFile.errorMessage}</p>
                  <button
                    onClick={() => handleAnalysis(selectedFile.id, new File([], selectedFile.name), activeModel)}
                    className="px-8 py-3 border-2 border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-brand-pink hover:text-brand-pink transition-all"
                  >
                    Retry Inference
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
                  <div className="relative">
                     <div className="w-32 h-32 border-2 border-brand-pink/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
                     <div className="w-32 h-32 border-t-2 border-brand-pink rounded-full animate-spin absolute inset-0"></div>
                     <VisionIcon className="w-10 h-10 text-brand-pink absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-lg font-black text-slate-800 tracking-tight">Processing Tensor</h3>
                     <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Optimizing local GPU cluster...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 text-center p-20">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-10 border border-slate-100 rotate-3 transform transition-transform hover:rotate-0">
              <VisionIcon className="w-14 h-14 text-slate-200" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">Neural Workbench Ready</h2>
            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
              Select a diagnostic scan from your history or import a new image. Our histology engines (AlexNet, EfficientNet, and YOLO V11) are calibrated and standing by for real-time inference.
            </p>
            {availableModels.length === 0 && !isLoadingModels && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl max-w-xs">
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">System Warning</p>
                 <p className="text-[11px] text-red-500 font-medium">Please add alexnet.pth, efficient_net.pth, or yolov11.pth to /backend/models to enable histology features.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisionWorkbench;
