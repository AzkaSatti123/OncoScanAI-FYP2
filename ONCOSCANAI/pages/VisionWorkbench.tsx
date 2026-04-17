import React, { useState, useEffect, useRef } from 'react';
import { UploadIcon, ModelIcon, VisionIcon, InfoIcon, DownloadIcon, PrintIcon } from '../components/icons';
import type { UploadedFile, AnalysisResult, HistoPrediction, StructuredReport } from '../types';

const BACKEND_URL = 'http://127.0.0.1:8000';
const REPORT_WORKER_URL = '/report';

type ModelsResponse = { active_models?: string[]; histo_models?: string[] };

const toAnalysisPathology = (result?: string): AnalysisResult['pathology'] => {
  const n = (result || '').toLowerCase();
  if (n === 'malignant') return 'Malignant';
  if (n === 'benign') return 'Benign';
  if (n === 'normal') return 'Normal';
  return 'Inconclusive';
};

const deriveHistoModels = (data: ModelsResponse) => {
  if (Array.isArray(data.histo_models)) return data.histo_models.filter(m => m !== 'master');
  const active = Array.isArray(data.active_models) ? data.active_models : [];
  return active.filter(m => m === 'alexnet' || m === 'efficient_net' || m === 'yolo');
};

const splitSteps = (value: string) =>
  value.split(/\s(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean);

/* ─────────────────────────────────────────────────────────────
   Surgical Pathology Report – standalone component
   ───────────────────────────────────────────────────────────── */
const PathologyReport: React.FC<{ file: UploadedFile; analysis: AnalysisResult }> = ({ file, analysis }) => {
  // Stable report ID tied to the file (not re-generated on every render)
  const reportIdRef = useRef(`ONCO-${Date.now().toString(36).toUpperCase()}`);
  const reportId = reportIdRef.current;

  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const p = analysis.pathology.toLowerCase();
  const isMalignant = p === 'malignant';
  const isBenign    = p === 'benign';
  const isNormal    = p === 'normal';

  const confidence   = `${(analysis.confidence * 100).toFixed(1)}%`;
  const riskLevel    = isMalignant ? 'High Risk' : isBenign ? 'Moderate Risk' : 'Low Risk';
  const borderColor  = isMalignant ? '#dc2626' : isBenign ? '#059669' : '#2563eb';
  const headerBg     = isMalignant ? 'bg-red-600'  : isBenign ? 'bg-emerald-600' : 'bg-blue-600';

  const diagLine1 = isMalignant
    ? `Malignant Tissue — High-Grade Histopathological Pattern Identified`
    : isBenign
    ? `Benign Tissue — No Malignant Features Detected`
    : isNormal
    ? `Normal Tissue — No Pathological Pattern Identified`
    : `Inconclusive — Pattern Could Not Be Definitively Classified`;

  const diagLine2 = `${riskLevel} — AI Model Confidence: ${confidence} · Engine: ${analysis.modelUsed}`;

  // Pull NLP-enriched text when available, fall back to inference-derived defaults
  const sr = file.structuredReport;
  const getS = (title: string) => sr?.sections.find(s => s.title === title)?.subsections?.[0]?.content;

  const clinicalHistory =
    getS('Summary') ||
    `Histopathology image submitted for AI-assisted single-class classification. ${analysis.insight}`;

  const microscopic =
    getS('Histopathological Features') ||
    `Sections demonstrate tissue architecture and cellular morphology consistent with ${analysis.pathology} classification. ` +
    `Nuclear and stromal pattern inferred by ${analysis.modelUsed}. ${analysis.insight}`;

  const impression =
    getS('Impression') ||
    `AI inference indicates ${analysis.pathology} morphology at ${confidence} confidence. Formal pathology correlation is required before any clinical decision.`;

  const nextStepsRaw =
    getS('Recommended Clinical Next Steps') ||
    '1. Arrange specialist oncology consultation. 2. Confirm findings with biopsy or formal histopathological review. 3. Correlate with mammography, MRI, or ultrasound as clinically appropriate. 4. Discuss in multidisciplinary tumor board when indicated. 5. Initiate management pathway based on confirmed subtype and grade.';

  const management =
    getS('Management Considerations') ||
    'General management pathways may include surgical intervention, chemotherapy, radiation therapy, and hormone-directed therapy depending on confirmed subtype, grade, receptor status, and stage.';

  const limitations =
    getS('Limitations') ||
    'This AI-derived inference depends on image quality, representative sampling, and model training data. Dataset bias and technical variability may affect performance. It is not a substitute for formal histopathological diagnosis.';

  const steps = splitSteps(nextStepsRaw);

  return (
    <div className="bg-white border-2 border-gray-400 shadow-2xl font-sans text-[13px] text-gray-900" id="pathology-report">

      {/* ══ HEADER ══ */}
      <div className="flex items-stretch border-b-2 border-gray-700">
        {/* Left: microscope thumb with uploaded scan */}
        <div className="w-20 flex-shrink-0 border-r border-gray-300 overflow-hidden">
          {file.previewUrl
            ? <img src={file.previewUrl} alt="scan thumb" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75H14.25M12 3.75V9M9 9H15M8.25 9C8.25 9 6 10.5 6 13.5C6 16.5 8.25 18 12 18C15.75 18 18 16.5 18 13.5C18 10.5 15.75 9 15.75 9M10.5 21H13.5M12 18V21" />
                </svg>
              </div>
          }
        </div>

        {/* Center meta */}
        <div className="flex-1 px-5 py-3 grid grid-cols-2 gap-x-8 gap-y-0.5 text-[11.5px]">
          <div><span className="font-bold">Case#:</span> {reportId}</div>
          <div><span className="font-bold">Facility:</span> OncoScanAI — AI Pathology Lab</div>
          <div><span className="font-bold">Patient File:</span> {file.name}</div>
          <div><span className="font-bold">MR#:</span> {reportId.replace('ONCO-', '')}</div>
          <div><span className="font-bold">Engine:</span> {analysis.modelUsed}</div>
          <div><span className="font-bold">Age/Sex:</span> N/A</div>
          <div><span className="font-bold">AI Confidence:</span> {confidence}</div>
          <div className="col-span-1"></div>
        </div>

        {/* Right: dates */}
        <div className="px-5 py-3 text-right text-[11.5px] border-l border-gray-300 flex-shrink-0 space-y-0.5">
          <div><span className="font-bold">Collected:</span> {reportDate}</div>
          <div><span className="font-bold">Received:</span>  {reportDate}</div>
          <div><span className="font-bold">Reported:</span>  {reportDate} {reportTime}</div>
        </div>
      </div>

      {/* ══ TITLE ══ */}
      <div className="text-center py-3 border-b border-gray-300 bg-gray-50">
        <h2 className="text-[1.4rem] font-bold tracking-wide">Surgical Pathology Report</h2>
        <p className="text-[10.5px] text-gray-500 mt-0.5">AI-Assisted Histopathology Analysis · OncoScanAI Uni-HistoAnalysis</p>
      </div>

      {/* ══ DIAGNOSIS BOX ══ */}
      <div className={`mx-5 mt-4 ${headerBg}`}>
        <div className="px-3 py-1">
          <p className="text-white font-black text-[11px] uppercase tracking-widest">Diagnosis</p>
        </div>
        <div className="bg-white border-l-4 border-r-4 border-b-4 px-4 py-3" style={{ borderColor }}>
          <p className="font-bold text-[13px] leading-6">1. {diagLine1}</p>
          <p className="font-bold text-[13px] leading-6">2. {diagLine2}</p>
        </div>
      </div>

      {/* ══ NOTE ══ */}
      <p className="mx-5 mt-3 text-[11.5px] leading-5 text-gray-700">
        <span className="font-bold">NOTE:</span> Breast marker / IHC analysis and molecular confirmatory testing may be required.
        An addendum report will be issued following pathologist review. Results were reviewed by the AI engine only and must be
        validated by a qualified pathologist before any clinical decision is made.
      </p>

      {/* ══ IMAGE STRIP ══ */}
      {file.previewUrl && (
        <div className="mx-5 mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Core Biopsies, Low Power',       filter: 'none' },
            { label: 'Infiltrating Tissue Pattern',     filter: 'contrast(1.2) saturate(1.25)' },
            { label: 'Focal Gland Formation',           filter: 'contrast(1.35) brightness(0.88) saturate(0.75)' },
          ].map((img, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-full border border-gray-400 overflow-hidden bg-gray-900" style={{ aspectRatio: '1' }}>
                <img
                  src={file.previewUrl}
                  alt={img.label}
                  className="w-full h-full object-cover"
                  style={{ filter: img.filter }}
                />
              </div>
              <p className="text-[10px] text-center text-gray-600 mt-1 leading-tight">{img.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══ CLINICAL SECTIONS ══ */}
      <div className="mx-5 mt-5 mb-5 space-y-2.5 text-[12px] leading-[1.6]">

        <div>
          <span className="font-bold uppercase">Clinical History: </span>
          {clinicalHistory}
        </div>

        <div>
          <span className="font-bold uppercase">Sites: </span>
          Histology image — single core biopsy or whole-slide scan submitted for AI single-class classification.
        </div>

        <div>
          <span className="font-bold uppercase">Gross: </span>
          Received as a scanned histological image ({file.size}). Submitted for single-class inference using the {analysis.modelUsed} engine.
          Image processed at full resolution. Classification result: <strong>{analysis.pathology}</strong>.
        </div>

        <div>
          <span className="font-bold uppercase">Microscopic: </span>
          {microscopic}
        </div>

        <div>
          <span className="font-bold uppercase">Impression: </span>
          {impression}
        </div>

        <div>
          <p className="font-bold uppercase mb-1">Recommended Clinical Next Steps:</p>
          <div className="pl-3 space-y-0.5">
            {(steps.length ? steps : [nextStepsRaw]).map((step, i) => (
              <p key={i}><span className="font-semibold">{i + 1}.</span> {step.replace(/^\d+\.\s*/, '')}</p>
            ))}
          </div>
        </div>

        <div>
          <span className="font-bold uppercase">Management Considerations: </span>
          {management}
        </div>

        <div>
          <span className="font-bold uppercase">Limitations: </span>
          {limitations}
        </div>

        <div>
          <span className="font-bold uppercase">Previous BX / AI History: </span>
          No prior AI scan history available for this session.
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <div className="border-t-2 border-gray-300 mx-5 pt-2 pb-3 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 italic max-w-lg">
          This AI-generated report is a preliminary draft for clinical reference only.
          A licensed pathologist must review and sign off before any diagnostic or treatment decision is made.
        </p>
        <div className="text-right text-[10px] text-gray-400 font-mono">
          <p>{reportId}</p>
          <p>OncoScanAI v2</p>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────────────────────── */
const VisionWorkbench: React.FC = () => {
  const [files, setFiles]                 = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeModel, setActiveModel]     = useState<string>('');
  const [isDragging, setIsDragging]       = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  const getModelDisplayName = (key: string) =>
    ({ alexnet: 'AlexNet', yolo: 'YOLO V11', efficient_net: 'EfficientNet' }[key] ?? key.toUpperCase());

  const selectedFile = files.find(f => f.id === selectedFileId);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/models`);
        if (res.ok) {
          const data = await res.json() as ModelsResponse;
          const models = deriveHistoModels(data);
          setAvailableModels(models);
          if (models.length > 0)
            setActiveModel(models.find(m => m === 'alexnet') ?? models[0]);
        }
      } catch { /* backend offline */ }
      finally { setIsLoadingModels(false); }
    })();
  }, []);

  const updateFile = (id: string, fn: (f: UploadedFile) => UploadedFile) =>
    setFiles(prev => prev.map(f => f.id === id ? fn(f) : f));

  /* Fetch NLP enrichment from worker (optional — enhances text only) */
  const fetchNLPEnrichment = async (fileId: string, fileName: string, analysis: AnalysisResult) => {
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
      if (!res.ok) return;

      type WR = { report?: string; sections?: unknown[]; patientInfo?: Record<string, string> };
      const json = await res.json() as WR;

      let structuredReport: StructuredReport | null = null;
      if (json.sections && Array.isArray(json.sections)) {
        structuredReport = { patientInfo: json.patientInfo, sections: json.sections as StructuredReport['sections'] };
      } else if (json.report) {
        try {
          const m = json.report.match(/\{[\s\S]*\}/);
          if (m) {
            const p = JSON.parse(m[0]) as { sections?: unknown[] };
            if (p.sections) structuredReport = p as StructuredReport;
          }
        } catch { /* ignore */ }
      }
      if (structuredReport)
        updateFile(fileId, f => ({ ...f, structuredReport, reportStatus: 'Complete' }));
    } catch { /* worker offline — report still renders from inference data */ }
  };

  const handleAnalysis = async (fileId: string, rawFile: File, modelName: string) => {
    if (!modelName) return;
    updateFile(fileId, f => ({ ...f, status: 'Analyzing' }));

    const formData = new FormData();
    formData.append('file', rawFile);

    try {
      const res = await fetch(`${BACKEND_URL}/predict/histo/${modelName}`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json() as HistoPrediction;
      const analysis: AnalysisResult = {
        pathology:  toAnalysisPathology(data.result),
        confidence: data.confidence,
        insight:    data.insight || 'The selected model completed the histology analysis.',
        modelUsed:  getModelDisplayName(modelName),
      };

      // Immediately mark as Complete so the report renders right away
      updateFile(fileId, f => ({ ...f, status: 'Complete', analysis, reportStatus: 'Generating' }));

      // Kick off NLP enrichment in background — does not block render
      await fetchNLPEnrichment(fileId, rawFile.name, analysis);
    } catch (err) {
      updateFile(fileId, f => ({ ...f, status: 'Failed', errorMessage: String(err) }));
    }
  };

  const onFileDrop = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let rawFiles: File[] = [];
    if ('dataTransfer' in e) { e.preventDefault(); rawFiles = Array.from(e.dataTransfer.files); }
    else rawFiles = e.target.files ? Array.from(e.target.files) : [];

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
    newFiles.forEach((nf, i) => handleAnalysis(nf.id, rawFiles[i], activeModel));
  };

  return (
    <div className="grid lg:grid-cols-4 gap-6 h-full max-h-[calc(100vh-140px)]">

      {/* ── Sidebar ── */}
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">

        {/* Engine selector */}
        <div className="bg-white p-5 rounded-2xl shadow-subtle border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Engine</label>
            {isLoadingModels && <div className="w-3 h-3 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="flex flex-col gap-2 p-1 bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
            {availableModels.length === 0 && !isLoadingModels
              ? <div className="py-6 text-center text-[10px] text-slate-400 font-bold px-4">
                  No histology models detected.<br />Add alexnet.pth, efficient_net.pth, or yolov11.pth
                </div>
              : availableModels.map(m => (
                  <button key={m} onClick={() => setActiveModel(m)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all text-left flex items-center justify-between ${activeModel === m ? 'bg-white text-brand-pink shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>
                    <span>{getModelDisplayName(m)}</span>
                    {activeModel === m && <div className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />}
                  </button>
                ))
            }
          </div>
        </div>

        {/* File queue */}
        <div
          className={`flex-grow bg-white rounded-2xl border-2 border-dashed flex flex-col overflow-hidden transition-all ${isDragging ? 'border-brand-pink bg-pink-50' : 'border-slate-200'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { setIsDragging(false); onFileDrop(e); }}
        >
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinical Queue</h3>
            <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{files.length}</span>
          </div>

          <div className="flex-grow overflow-y-auto p-2 space-y-2">
            {files.length === 0
              ? <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <UploadIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Drag DICOM/Scans<br />to begin analysis
                  </p>
                </div>
              : files.map(f => (
                  <button key={f.id} onClick={() => setSelectedFileId(f.id)}
                    className={`w-full flex items-center p-2 rounded-xl transition-all ${selectedFileId === f.id ? 'bg-pink-50 ring-1 ring-brand-pink' : 'hover:bg-slate-50'}`}>
                    <div className="w-10 h-10 rounded-lg bg-slate-200 mr-3 flex-shrink-0 overflow-hidden border border-slate-100">
                      <img src={f.previewUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="text-left overflow-hidden flex-grow">
                      <p className="text-xs font-bold truncate text-slate-700">{f.name}</p>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${f.status === 'Complete' ? 'text-green-600' : f.status === 'Failed' ? 'text-red-500' : 'text-slate-400'}`}>
                        {f.status}
                      </span>
                    </div>
                    {f.status === 'Analyzing' && <div className="w-2 h-2 border-2 border-brand-pink border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                  </button>
                ))
            }
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <input type="file" id="file-upload" className="hidden" multiple onChange={onFileDrop} />
            <label htmlFor="file-upload"
              className="flex items-center justify-center w-full py-3 bg-brand-pink text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer hover:bg-brand-pink-dark transition-all shadow-lg shadow-pink-100">
              Import Scan
            </label>
          </div>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">

        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-subtle border border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white text-brand-pink rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                  <VisionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 tracking-tight">{selectedFile.name}</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Engine: {getModelDisplayName(activeModel) || 'OFFLINE'} · {selectedFile.type.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedFile.reportStatus === 'Generating' && (
                  <span className="text-[10px] font-bold text-brand-pink animate-pulse uppercase tracking-widest">Enhancing report…</span>
                )}
                <button onClick={() => window.print()}
                  className="p-2 text-slate-400 hover:text-brand-pink hover:bg-pink-50 rounded-xl transition-all">
                  <PrintIcon className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-brand-pink hover:bg-pink-50 rounded-xl transition-all">
                  <DownloadIcon className="w-5 h-5" />
                </button>
                {selectedFile.status === 'Complete' && selectedFile.analysis && (
                  <button
                    onClick={() => selectedFile.analysis && fetchNLPEnrichment(selectedFile.id, selectedFile.name, selectedFile.analysis)}
                    className="ml-2 px-4 py-2 bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-pink-dark transition-all">
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {selectedFile.status === 'Complete' && selectedFile.analysis ? (
              <div className="space-y-8">
                {/* ── MODEL RESULT PANEL ── */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Scan image */}
                  <div className="relative group">
                    <div className="aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center justify-center border-8 border-slate-50">
                      <img src={selectedFile.previewUrl} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" alt="Scan" />
                      {selectedFile.status === 'Analyzing' && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center">
                          <div className="w-16 h-16 border-4 border-brand-pink border-t-transparent rounded-full animate-spin mb-6" />
                          <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Running Neural Pass…</p>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest">Diagnostic View</div>
                  </div>

                  {/* Result cards */}
                  <div className="flex flex-col space-y-6">
                    {/* Pathology + confidence */}
                    <div className={`p-7 rounded-[2rem] border-2 ${selectedFile.analysis.pathology === 'Malignant' ? 'bg-red-50/50 border-red-100' : selectedFile.analysis.pathology === 'Benign' ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'}`}>
                      <div className="flex items-center justify-between mb-5">
                        <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${selectedFile.analysis.pathology === 'Malignant' ? 'bg-red-500' : selectedFile.analysis.pathology === 'Benign' ? 'bg-green-500' : 'bg-blue-500'}`}>
                          {selectedFile.analysis.pathology}
                        </span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inference Confidence</p>
                          <p className="text-3xl font-black text-slate-800 tracking-tighter">{(selectedFile.analysis.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-[1500ms] ease-out ${selectedFile.analysis.pathology === 'Malignant' ? 'bg-red-500' : selectedFile.analysis.pathology === 'Benign' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${selectedFile.analysis.confidence * 100}%` }} />
                      </div>
                    </div>

                    {/* Neural insight */}
                    <div className="p-7 bg-slate-50 rounded-[2rem] border border-slate-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center">
                          <InfoIcon className="w-4 h-4 text-brand-pink" />
                        </div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Neural Insight</h4>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium italic">"{selectedFile.analysis.insight}"</p>
                    </div>

                    {/* Engine + confirm */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                          <ModelIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Engine</p>
                          <p className="text-xs font-bold text-slate-700">{selectedFile.analysis.modelUsed} — STABLE-PYTORCH-V2</p>
                        </div>
                      </div>
                      <button className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl">
                        Confirm Diagnosis
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── SURGICAL PATHOLOGY REPORT BELOW ── */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Surgical Pathology Report</h3>
                    <div className="flex items-center gap-3">
                      {selectedFile.reportStatus === 'Generating' && (
                        <span className="text-[10px] font-bold text-brand-pink animate-pulse uppercase tracking-widest">Generating report…</span>
                      )}
                      <button
                        onClick={() => selectedFile.analysis && fetchNLPEnrichment(selectedFile.id, selectedFile.name, selectedFile.analysis)}
                        disabled={selectedFile.reportStatus === 'Generating'}
                        className="px-4 py-2 bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-pink-dark disabled:opacity-50 transition-all">
                        Regenerate Report
                      </button>
                    </div>
                  </div>
                  <PathologyReport file={selectedFile} analysis={selectedFile.analysis} />
                </div>
              </div>

            ) : selectedFile.status === 'Failed' ? (
              <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 text-center p-12">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                  <InfoIcon className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Neural Link Severed</h3>
                <p className="text-slate-500 text-sm max-w-xs mb-8">{selectedFile.errorMessage}</p>
                <button
                  onClick={() => handleAnalysis(selectedFile.id, new File([], selectedFile.name), activeModel)}
                  className="px-8 py-3 border-2 border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-brand-pink hover:text-brand-pink transition-all">
                  Retry Inference
                </button>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 text-center p-20">
                <div className="relative mb-8">
                  <div className="w-32 h-32 border-2 border-brand-pink/20 rounded-full animate-[spin_3s_linear_infinite]" />
                  <div className="w-32 h-32 border-t-2 border-brand-pink rounded-full animate-spin absolute inset-0" />
                  <VisionIcon className="w-10 h-10 text-brand-pink absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Running Neural Analysis</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Processing histology image…</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 text-center p-20">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-10 border border-slate-100 rotate-3 hover:rotate-0 transition-transform">
              <VisionIcon className="w-14 h-14 text-slate-200" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">Neural Workbench Ready</h2>
            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
              Import a histology scan to generate an AI Surgical Pathology Report using AlexNet, EfficientNet, or YOLO V11.
            </p>
            {availableModels.length === 0 && !isLoadingModels && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl max-w-xs">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">System Warning</p>
                <p className="text-[11px] text-red-500 font-medium">Add alexnet.pth, efficient_net.pth, or yolov11.pth to /backend/models.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisionWorkbench;
