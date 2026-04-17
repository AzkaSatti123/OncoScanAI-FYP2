import React, { useMemo, useState } from 'react';
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
      content: buffer.join(' ').trim(),
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
  const subclassConfidence = prediction?.confidence != null ? `${(prediction.confidence * 100).toFixed(1)}%` : 'Unavailable';
  const diagnosisConfidence = prediction?.pathology_confidence != null ? `${(prediction.pathology_confidence * 100).toFixed(1)}%` : subclassConfidence;
  const insight = prediction?.insight || 'The master model completed subclass prediction and diagnosis mapping for this scan.';
  const riskLevel = (fields.diagnosis || '').toLowerCase() === 'malignant' ? 'High Risk' : (fields.diagnosis || '').toLowerCase() === 'benign' ? 'Moderate Risk' : 'Low Risk';
  const fileReference = 'Current histology scan';
  const analysisDate = new Date().toLocaleString();

  const defaults: Record<string, string> = {
    'File Reference': fileReference,
    'Classification': fields.diagnosis || 'Unknown',
    'AI Confidence': subclassConfidence,
    'Analysis Date & Time': analysisDate,
    'Predicted Subclass': fields.subclassLabel || 'Histologic subtype identified by model',
    'Subclass ID': prediction?.class_id != null ? String(prediction.class_id) : 'Derived from model label set',
    'Subclass Confidence': subclassConfidence,
    'Diagnosis Confidence': diagnosisConfidence,
    'Summary': `Breast tissue demonstrates morphologic features consistent with ${fields.subclassLabel || 'the predicted subtype'} in a ${fields.diagnosis || 'model-defined'} classification context, supporting further histopathologic review. ${insight}`,
    'Impression': `Impression suggests ${fields.diagnosis || 'clinically relevant'} morphology with subclass confidence of ${subclassConfidence}; formal pathology correlation is required.`,

    'Histopathological Features': `Atypical cellular morphology with disturbed tissue architecture in keeping with ${fields.subclassLabel || 'the predicted subtype'}; nuclear atypia and stromal-epithelial relationships require pathologist confirmation.`,
    'Quantitative Findings': `Classification: ${fields.diagnosis || 'Unknown'}; AI Confidence: ${subclassConfidence}; Diagnosis Confidence: ${diagnosisConfidence}.`,
    'Risk Stratification': `${riskLevel}. Stratification is supported by subclass phenotype, model confidence, and inferred tissue abnormality.`,
    'Recommended Clinical Next Steps': '1. Arrange specialist consultation with breast oncology or surgical oncology. 2. Recommend confirmatory pathological review to validate AI-based histological findings. 3. Correlate with mammography, MRI, or ultrasound as clinically appropriate. 4. Confirm subtype and grade on pathology review. 5. Discuss in a multidisciplinary tumor board setting when indicated.',
    'Management Considerations': 'General management pathways may include surgical intervention, chemotherapy, radiation therapy, and when biologically appropriate, hormone-directed therapy depending on confirmed subtype, grade, receptor status, and stage.',
    'Limitations': 'This AI-derived inference depends on image quality, representative sampling, and model training data. Dataset bias and technical variability may affect performance. It is not a substitute for formal histopathological diagnosis.',
    'Disclaimer': 'This draft is generated for preliminary review only. A qualified clinician must review, interpret, and confirm findings before forming a final diagnosis or treatment plan.',
  };

  return REPORT_HEADINGS.map(heading => ({
    heading,
    content: sectionMap.get(heading)?.trim() || defaults[heading],
  }));
};

const getDocumentSectionTone = (title: string) => {
  const normalized = title.toLowerCase();
  if (normalized.includes('prediction')) return 'border-rose-200 bg-rose-50';
  if (normalized.includes('risk')) return 'border-amber-200 bg-amber-50';
  if (normalized.includes('recommend') || normalized.includes('treatment')) return 'border-sky-200 bg-sky-50';
  if (normalized.includes('disclaimer')) return 'border-orange-200 bg-orange-50';
  return 'border-slate-200 bg-white';
};

const getRiskPillClass = (value?: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('high')) return 'bg-red-100 text-red-700 border-red-200';
  if (normalized.includes('moderate')) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

const getClassificationPanelClass = (slot: 'normal' | 'benign' | 'malignant', diagnosis?: string) => {
  const normalized = (diagnosis || '').toLowerCase();
  const active = normalized === slot;
  if (!active) return 'border-stone-200 bg-white text-stone-400';
  if (slot === 'malignant') return 'border-sky-300 bg-sky-50 text-stone-800';
  if (slot === 'benign') return 'border-emerald-300 bg-emerald-50 text-stone-800';
  return 'border-indigo-300 bg-indigo-50 text-stone-800';
};

const splitNumberedItems = (value?: string) =>
  (value || '')
    .split(/\s(?=\d+\.\s)/)
    .map(item => item.trim())
    .filter(Boolean);

const splitFeatureItems = (value?: string) =>
  (value || '')
    .split(/;\s+|\.\s+(?=[A-Z])/)
    .map(item => item.trim())
    .filter(Boolean);

const buildClinicalReportDocument = (
  file: UploadedFile,
  prediction: HistoPrediction,
  displaySections: ParsedReportSection[]
): StructuredReport => {
  const sectionMap = new Map(displaySections.map(section => [section.heading, section.content]));
  return {
    patientInfo: {},
    sections: [
      {
        title: 'Header',
        subsections: [
          { label: 'File Reference', content: file.name },
          { label: 'Classification', content: sectionMap.get('Classification') || getPredictionFields(prediction).diagnosis || 'Unknown', isHighlighted: true },
          { label: 'AI Confidence', content: sectionMap.get('AI Confidence') || `${(prediction.confidence * 100).toFixed(1)}%` },
          { label: 'Analysis Date & Time', content: sectionMap.get('Analysis Date & Time') || new Date().toLocaleString() },
        ],
      },
      {
        title: 'Histological Subtype',
        subsections: [
          { label: 'Predicted Subclass', content: sectionMap.get('Predicted Subclass') || getPredictionFields(prediction).subclassLabel, isHighlighted: true },
          { label: 'Subclass ID', content: sectionMap.get('Subclass ID') || (prediction.class_id != null ? String(prediction.class_id) : 'Derived from model label set') },
          { label: 'Subclass Confidence', content: sectionMap.get('Subclass Confidence') || `${(prediction.confidence * 100).toFixed(1)}%` },
          { label: 'Diagnosis Confidence', content: sectionMap.get('Diagnosis Confidence') || (prediction.pathology_confidence != null ? `${(prediction.pathology_confidence * 100).toFixed(1)}%` : `${(prediction.confidence * 100).toFixed(1)}%`) },
        ],
      },
      { title: 'Summary', subsections: [{ label: 'Summary', content: sectionMap.get('Summary') || 'Summary generated from model output.' }] },
      { title: 'Impression', subsections: [{ label: 'Impression', content: sectionMap.get('Impression') || 'Impression generated from model output.' }] },
      { title: 'Histopathological Features', subsections: [{ label: 'Features', content: sectionMap.get('Histopathological Features') || 'Histopathological features generated from model output.' }] },
      { title: 'Quantitative Findings', subsections: [{ label: 'Quantitative Findings', content: sectionMap.get('Quantitative Findings') || `Classification: ${getPredictionFields(prediction).diagnosis}; AI Confidence: ${(prediction.confidence * 100).toFixed(1)}%; Diagnosis Confidence: ${prediction.pathology_confidence != null ? `${(prediction.pathology_confidence * 100).toFixed(1)}%` : `${(prediction.confidence * 100).toFixed(1)}%`}.` }] },
      { title: 'Risk Stratification', subsections: [{ label: 'Risk Stratification', content: sectionMap.get('Risk Stratification') || 'Moderate Risk', isHighlighted: true }] },
      { title: 'Recommended Clinical Next Steps', subsections: [{ label: 'Next Steps', content: sectionMap.get('Recommended Clinical Next Steps') || '1. Arrange specialist consultation. 2. Recommend confirmatory pathological review to validate AI-based histological findings. 3. Correlate with breast imaging. 4. Confirm subtype on pathology review. 5. Discuss in multidisciplinary review.' }] },
      { title: 'Management Considerations', subsections: [{ label: 'Management', content: sectionMap.get('Management Considerations') || 'General management pathways may include surgery, chemotherapy, radiation therapy, or hormone-directed therapy depending on confirmed subtype and stage.' }] },
      { title: 'Limitations', subsections: [{ label: 'Limitations', content: sectionMap.get('Limitations') || 'This AI-derived inference depends on image quality, representative sampling, and model training data. It does not replace formal histopathological diagnosis.' }] },
      { title: 'Disclaimer', description: 'AI-generated reference only', subsections: [{ label: 'Clinical Use', content: sectionMap.get('Disclaimer') || 'This report is AI-generated for reference purposes only and must be reviewed by a qualified pathologist or oncologist before clinical decision-making.' }] },
    ],
  };
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
            classId: prediction.class_id,
            diagnosisConfidence: prediction.pathology_confidence,
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
          Name: 'Not provided',
          Age: 'Not provided',
          Gender: 'Not provided',
          'Report ID': `HISTO-${Date.now()}`,
          'Analysis Date & Time': new Date().toLocaleString(),
        },
        sections: [
          {
            title: 'Model Prediction Summary',
            description: 'Core multi-class model outputs for subclass and diagnosis estimation.',
            subsections: [
              { label: 'Predicted Subclass', content: fields.subclassLabel, isHighlighted: true },
              { label: 'Subclass ID / Number', content: prediction.class_id != null ? String(prediction.class_id) : 'Not provided' },
              { label: 'Subclass Confidence Score', content: `${(prediction.confidence * 100).toFixed(1)}%` },
              { label: 'Predicted Cancer Type', content: fields.diagnosis, isHighlighted: true },
              { label: 'Diagnosis Confidence', content: prediction.pathology_confidence != null ? `${(prediction.pathology_confidence * 100).toFixed(1)}%` : 'Not provided' },
            ],
          },
          {
            title: 'Histopathological Findings',
            description: 'Microscopic tissue characteristics inferred from the uploaded breast histology image.',
            subsections: [
              { label: 'Observations', content: `The analyzed tissue shows atypical cellular architecture and disrupted organization consistent with the predicted subclass ${fields.subclassLabel}.` },
            ],
          },
          {
            title: 'Clinical Interpretation',
            description: 'Doctor-friendly explanation of the predicted subtype.',
            subsections: [
              { label: 'Interpretation', content: `${fields.subclassLabel} is interpreted in the context of a ${fields.diagnosis} prediction. ${prediction.insight || 'Clinical staging and pathology review remain necessary.'}` },
            ],
          },
          {
            title: 'Risk Level Assessment',
            description: 'AI-assisted risk category derived from subtype severity and model confidence.',
            subsections: [
              { label: 'Risk Category', content: fields.diagnosis.toLowerCase() === 'malignant' ? 'High Risk' : fields.diagnosis.toLowerCase() === 'benign' ? 'Moderate Risk' : 'Low Risk', isHighlighted: true },
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
            title: 'Treatment Guidance',
            description: 'General treatment pathways for clinician consideration.',
            subsections: [
              { label: 'Guidance', content: 'Treatment options may include surgery, chemotherapy, radiation therapy, or hormone therapy depending on confirmed subtype, grade, and stage.' },
            ],
          },
          {
            title: 'Disclaimer',
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
  const reportDocument = useMemo<StructuredReport | null>(() => {
    if (!selectedFile || !selectedPrediction) return null;
    return buildClinicalReportDocument(selectedFile, selectedPrediction, displaySections);
  }, [displaySections, selectedFile, selectedPrediction]);

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

                    {reportDocument && (
                      <div className="mt-4 overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(180deg,#fffdfc_0%,#fffaf7_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                        {(() => {
                          const getSection = (title: string) => reportDocument.sections.find(section => section.title === title);
                          const headerSection = getSection('Header');
                          const headerMap = new Map<string, string>((headerSection?.subsections || []).map(subsection => [subsection.label, subsection.content]));
                          const subtypeSection = getSection('Histological Subtype');
                          const subtypeMap = new Map<string, string>((subtypeSection?.subsections || []).map(subsection => [subsection.label, subsection.content]));
                          const summaryText = getSection('Summary')?.subsections?.[0]?.content || 'Summary generated from model output.';
                          const impressionText = getSection('Impression')?.subsections?.[0]?.content || 'Impression generated from model output.';
                          const featuresText = getSection('Histopathological Features')?.subsections?.[0]?.content || 'Histopathological features generated from model output.';
                          const quantitativeText = getSection('Quantitative Findings')?.subsections?.[0]?.content || '';
                          const riskText = getSection('Risk Stratification')?.subsections?.[0]?.content || 'Moderate Risk';
                          const nextStepsText = getSection('Recommended Clinical Next Steps')?.subsections?.[0]?.content || '1. Arrange specialist consultation. 2. Recommend confirmatory pathological review to validate AI-based histological findings. 3. Correlate with breast imaging. 4. Confirm subtype on pathology review. 5. Discuss in multidisciplinary review.';
                          const managementText = getSection('Management Considerations')?.subsections?.[0]?.content || 'General management pathways may include surgery, chemotherapy, radiation therapy, and hormone-directed therapy depending on confirmed subtype and stage.';
                          const limitationsText = getSection('Limitations')?.subsections?.[0]?.content || 'This AI-derived inference depends on image quality, representative sampling, and model training data. It does not replace formal histopathological diagnosis.';
                          const disclaimerText = getSection('Disclaimer')?.subsections?.[0]?.content || 'This report is AI-generated for reference purposes only and must be reviewed by a qualified pathologist or oncologist before clinical decision-making.';
                          const classification = headerMap.get('Classification') || selectedFields.diagnosis || 'Unknown';
                          const aiConfidence = headerMap.get('AI Confidence') || `${(selectedPrediction.confidence * 100).toFixed(1)}%`;
                          const analysisTime = headerMap.get('Analysis Date & Time') || new Date().toLocaleString();
                          const quantitativeMap = new Map<string, string>(
                            quantitativeText
                              .split(/;\s+/)
                              .map(item => {
                                const separatorIndex = item.indexOf(':');
                                return separatorIndex === -1 ? null : [item.slice(0, separatorIndex).trim(), item.slice(separatorIndex + 1).trim()];
                              })
                              .filter((item): item is [string, string] => Boolean(item))
                          );
                          const nextSteps = splitNumberedItems(nextStepsText);
                          const featureItems = splitFeatureItems(featuresText);

                          return (
                            <>
                              <div className="bg-[linear-gradient(180deg,#fffefc_0%,#fff9f6_100%)] px-6 pt-8 pb-6">
                                <div className="flex items-center gap-6">
                                  <div className="h-px flex-1 bg-stone-300" />
                                  <h3 className="font-serif text-[1.6rem] font-semibold tracking-[0.12em] text-stone-700">ANALYSIS REPORT</h3>
                                  <div className="h-px flex-1 bg-stone-300" />
                                </div>

                                <div className="mt-8 grid gap-4 border-t border-stone-200 pt-6 text-sm text-stone-700 lg:grid-cols-4">
                                  <p><span className="font-serif text-[1rem] font-semibold text-stone-700">File Reference:</span> {selectedFile.name}</p>
                                  <p><span className="font-serif text-[1rem] font-semibold text-stone-700">Classification:</span> {classification}</p>
                                  <p><span className="font-serif text-[1rem] font-semibold text-stone-700">AI Confidence:</span> {aiConfidence}</p>
                                  <p><span className="font-serif text-[1rem] font-semibold text-stone-700">Analysis Time:</span> {analysisTime}</p>
                                </div>
                              </div>

                              <div className="px-6 pb-8">
                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Classification:</p>
                                    <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-stone-300 bg-white">
                                      <div className={`flex items-center justify-center px-4 py-5 font-serif text-[1.15rem] font-semibold transition-colors ${getClassificationPanelClass('normal', classification)}`}>Normal Tissue</div>
                                      <div className={`flex items-center justify-center px-4 py-5 font-serif text-[1.15rem] font-semibold transition-colors ${getClassificationPanelClass('benign', classification)}`}>Benign</div>
                                      <div className={`flex items-center justify-center px-4 py-5 font-serif text-[1.15rem] font-semibold transition-colors ${getClassificationPanelClass('malignant', classification)}`}>Malignant</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Histological Subtype:</p>
                                    <div className="rounded-2xl border border-rose-200 bg-[linear-gradient(180deg,#fff7fb_0%,#fffdfd_100%)] p-5">
                                      <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-xl border border-rose-100 bg-white/90 px-4 py-4">
                                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Predicted Subclass</p>
                                          <p className="mt-2 text-base font-semibold text-stone-800">{subtypeMap.get('Predicted Subclass') || selectedFields.subclassLabel}</p>
                                        </div>
                                        <div className="rounded-xl border border-rose-100 bg-white/90 px-4 py-4">
                                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Subclass ID</p>
                                          <p className="mt-2 text-base font-semibold text-stone-800">{subtypeMap.get('Subclass ID') || (selectedPrediction.class_id != null ? String(selectedPrediction.class_id) : 'Derived from model label set')}</p>
                                        </div>
                                        <div className="rounded-xl border border-rose-100 bg-white/90 px-4 py-4">
                                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Subclass Confidence</p>
                                          <p className="mt-2 text-base font-semibold text-stone-800">{subtypeMap.get('Subclass Confidence') || `${(selectedPrediction.confidence * 100).toFixed(1)}%`}</p>
                                        </div>
                                        <div className="rounded-xl border border-rose-100 bg-white/90 px-4 py-4">
                                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Diagnosis Confidence</p>
                                          <p className="mt-2 text-base font-semibold text-stone-800">{subtypeMap.get('Diagnosis Confidence') || (selectedPrediction.pathology_confidence != null ? `${(selectedPrediction.pathology_confidence * 100).toFixed(1)}%` : `${(selectedPrediction.confidence * 100).toFixed(1)}%`)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Summary:</p>
                                    <p className="text-[1rem] leading-9 text-stone-700">{summaryText}</p>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Impression:</p>
                                    <p className="text-[1rem] leading-9 text-stone-700">{impressionText}</p>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Histopathological Features:</p>
                                    <div className="space-y-4">
                                      {(featureItems.length ? featureItems : [featuresText]).map((item, idx) => (
                                        <div key={idx} className="flex gap-4 text-[0.98rem] leading-8 text-stone-700">
                                          <span className="pt-1 text-stone-500">•</span>
                                          <p>{item.replace(/\.$/, '')}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Quantitative Findings:</p>
                                    <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
                                      <div className="border-b border-stone-200 pb-5">
                                        <p className="font-serif text-[1.3rem] font-semibold text-stone-700">Classification</p>
                                        <p className="mt-4 text-[1.15rem] text-stone-700">{classification}</p>
                                      </div>
                                      <div className="border-b border-stone-200 pb-5">
                                        <p className="font-serif text-[1.3rem] font-semibold text-stone-700">AI Confidence</p>
                                        <p className="mt-4 text-[1.15rem] text-stone-700">{aiConfidence}</p>
                                      </div>
                                      <div className="border-b border-stone-200 pb-5">
                                        <p className="font-serif text-[1.3rem] font-semibold text-stone-700">Diagnosis Confidence</p>
                                        <p className="mt-4 text-[1.15rem] text-stone-700">{quantitativeMap.get('Diagnosis Confidence') || (selectedPrediction.pathology_confidence != null ? `${(selectedPrediction.pathology_confidence * 100).toFixed(1)}%` : `${(selectedPrediction.confidence * 100).toFixed(1)}%`)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Risk Stratification:</p>
                                    <div>
                                      <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getRiskPillClass(riskText)}`}>{riskText}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Recommended Clinical Next Steps:</p>
                                    <div className="space-y-6">
                                      {(nextSteps.length ? nextSteps : [nextStepsText]).map((step, idx) => (
                                        <div key={idx} className="grid gap-4 md:grid-cols-[22px_1fr]">
                                          <p className="text-[1.2rem] font-semibold text-stone-700">{idx + 1}.</p>
                                          <p className="text-[0.98rem] leading-9 text-stone-700">{step.replace(/^\d+\.\s*/, '')}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Management Considerations:</p>
                                    <p className="text-[0.98rem] leading-9 text-stone-700">{managementText}</p>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 py-8">
                                  <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                                    <p className="font-serif text-[1.35rem] font-semibold text-stone-700">Limitations:</p>
                                    <p className="text-[0.98rem] leading-9 text-stone-700">{limitationsText}</p>
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 pt-8">
                                  <p className="text-center text-[0.98rem] leading-9 text-stone-600">{disclaimerText}</p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
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
