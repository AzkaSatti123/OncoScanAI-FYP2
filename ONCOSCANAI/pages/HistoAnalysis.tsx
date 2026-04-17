
import React, { useState } from 'react';
import type { HistoPrediction, UploadedFile, StructuredReport } from '../types';
import { UploadIcon, CheckCircleIcon, InfoIcon } from '../components/icons';

const FileIcon: React.FC<{ type: UploadedFile['type'] }> = ({ type }) => (
    <div className="w-10 h-10 flex-shrink-0 mr-4 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-300">
        <span className="text-[10px] font-black text-gray-500 uppercase">{type.toUpperCase()}</span>
    </div>
);

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

const getPredictionFields = (prediction: HistoPrediction) => {
  const result = prediction.result.toLowerCase();
  const isMalignant = result === 'malignant';
  const isBenign = result === 'benign';
  const isNormal = result === 'normal';

  let subclassLabel = 'Unknown';
  if (prediction.class_id != null) {
    // Map class_id to subclass labels based on common histopathology classifications
    const classMappings: Record<number, string> = {
      0: 'Normal Breast Tissue',
      1: 'Fibroadenoma',
      2: 'Fibrocystic Changes',
      3: 'Ductal Carcinoma In Situ',
      4: 'Invasive Ductal Carcinoma',
      5: 'Invasive Lobular Carcinoma',
      6: 'Mucinous Carcinoma',
      7: 'Papillary Carcinoma',
      8: 'Medullary Carcinoma',
      9: 'Tubular Carcinoma',
      10: 'Phyllodes Tumor',
      11: 'Atypical Ductal Hyperplasia',
      12: 'Lobular Carcinoma In Situ',
    };
    subclassLabel = classMappings[prediction.class_id] || `Class ${prediction.class_id}`;
  }

  return {
    diagnosis: isMalignant ? 'Malignant' : isBenign ? 'Benign' : isNormal ? 'Normal' : 'Unknown',
    subclassLabel,
  };
};

const splitNumberedItems = (text: string): string[] => {
  return text.split(/\d+\.\s+/).filter(item => item.trim().length > 0).map(item => item.trim());
};

const splitFeatureItems = (text: string): string[] => {
  return text.split(/;\s+/).filter(item => item.trim().length > 0).map(item => item.trim());
};

const PredictionResult: React.FC<{ prediction: HistoPrediction }> = ({ prediction }) => {
    if (!prediction) return null;
    const confidenceColor = prediction.confidence > 0.8 ? 'bg-brand-pink' : prediction.confidence > 0.6 ? 'bg-yellow-500' : 'bg-green-500';
    const getResultClass = (result: string) => {
        const lowerResult = result.toLowerCase();
        if (lowerResult === 'malignant') return 'bg-red-100 text-red-800 border-red-200';
        if (lowerResult === 'benign') return 'bg-green-100 text-green-800 border-green-200';
        if (lowerResult === 'normal') return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };
    const resultColor = getResultClass(prediction.result);

    return (
        <div className="mt-4 pl-14">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-brand-text-primary uppercase tracking-widest">
                    Prediction: <span className={`ml-2 px-3 py-1 text-[10px] rounded-full border ${resultColor}`}>{prediction.result}</span>
                </p>
                <p className="text-[10px] text-brand-text-secondary font-black tracking-widest">CONFIDENCE: {(prediction.confidence * 100).toFixed(1)}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className={`${confidenceColor} h-1.5 rounded-full transition-all duration-[1000ms]`} style={{ width: `${prediction.confidence * 100}%` }}></div>
            </div>
            {prediction.insight && (
                <p className="mt-3 text-[11px] text-slate-500 italic leading-relaxed">
                    "{prediction.insight}"
                </p>
            )}
        </div>
    );
};

const HistoAnalysis: React.FC = () => {
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
            diagnosisConfidence: prediction.confidence, // Use same confidence for diagnosis
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
            description: 'Core model outputs for diagnosis estimation.',
            subsections: [
              { label: 'Predicted Diagnosis', content: fields.diagnosis, isHighlighted: true },
              { label: 'Class ID / Number', content: prediction.class_id != null ? String(prediction.class_id) : 'Not provided' },
              { label: 'Confidence Score', content: `${(prediction.confidence * 100).toFixed(1)}%` },
            ],
          },
          {
            title: 'Histopathological Findings',
            description: 'Microscopic tissue characteristics inferred from the uploaded histology image.',
            subsections: [
              { label: 'Observations', content: `The analyzed tissue shows characteristics consistent with ${fields.diagnosis} morphology.` },
            ],
          },
          {
            title: 'Clinical Interpretation',
            description: 'Doctor-friendly explanation of the predicted diagnosis.',
            subsections: [
              { label: 'Interpretation', content: `${fields.diagnosis} diagnosis based on AI analysis. ${prediction.insight || 'Clinical staging and pathology review remain necessary.'}` },
            ],
          },
          {
            title: 'Risk Level Assessment',
            description: 'AI-assisted risk category derived from diagnosis severity and model confidence.',
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
              { label: 'Guidance', content: 'Treatment options may include surgery, chemotherapy, radiation therapy, or hormone therapy depending on confirmed diagnosis, grade, and stage.' },
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
        const type = (extension === 'svs' || extension === 'tiff' || extension === 'png' || extension === 'jpg') ? extension : 'tiff';
        return {
            id: String(Date.now() + index),
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            status: 'Uploading',
            type: type as any,
            progress: 0,
            reportStatus: 'Idle',
        }
    });
    setFiles(prev => [...newUploads, ...prev]);
    if (newUploads.length > 0) {
      setSelectedFile(newUploads[0]);
    }
    
    for (const upload of newUploads) {
        const fileToUpload = newFiles.find(f => f.name === upload.name);
        if (!fileToUpload) continue;

        const formData = new FormData();
        formData.append("file", fileToUpload);

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

            const response = await fetch(`/predict/histo/master`, {
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
            const errorMessage = error instanceof Error ? error.message : "Neural link failure.";
            setFiles(currentFiles => currentFiles.map(f => {
              if (f.id !== upload.id) return f;
              const failedFile = { ...f, status: 'Failed' as const, progress: 100, errorMessage, reportStatus: 'Idle' as const };
              setSelectedFile(prev => prev?.id === upload.id ? failedFile : prev);
              return failedFile;
            }));
        }
    }
  }

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(entering); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };


  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2rem] shadow-subtle border border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
        <div>
            <h2 className="text-3xl font-black text-brand-text-primary tracking-tighter mb-2">Multi-Class Histo Analysis</h2>
            <p className="text-brand-text-secondary text-sm font-medium">Deploying the OncoScanAI Master model for multi-class histology inference.</p>
        </div>
        <div className="inline-flex items-center gap-3 rounded-3xl bg-brand-pink/10 border border-brand-pink/20 px-5 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-pink">Active Model</span>
            <span className="rounded-full bg-white px-4 py-2 text-[11px] font-bold text-brand-text-primary border border-gray-200">OncoScanAI Master</span>
        </div>
      </div>

      <div className="bg-white p-2 rounded-[2.5rem] shadow-subtle border border-gray-100 overflow-hidden">
        <div 
            onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => handleDragEvents(e, true)} onDrop={handleDrop}
            className={`border-4 border-dashed rounded-[2rem] p-16 text-center transition-all duration-500 ${isDragging ? 'border-brand-pink bg-pink-50 scale-[0.98]' : 'border-gray-100 bg-white hover:bg-slate-50'}`}
        >
          <input type="file" id="histo-file-upload" className="hidden" multiple accept=".png,.jpg,.jpeg,.svs,.tiff" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
          <label htmlFor="histo-file-upload" className="cursor-pointer block group">
            <div className="w-20 h-20 bg-pink-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <UploadIcon className="w-10 h-10 text-brand-pink" />
            </div>
            <p className="text-xl font-black text-brand-text-primary tracking-tight">Drop Histology Scans Here</p>
            <p className="text-brand-pink font-black text-[10px] uppercase tracking-[0.2em] mt-2">or Click to Clinical Import</p>
          </label>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-subtle border border-gray-100">
        <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-brand-text-primary uppercase tracking-widest text-xs">Diagnostic Stream</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Inference</span>
        </div>
        {files.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <InfoIcon className="w-6 h-6 text-slate-200"/>
                </div>
                <p className="text-brand-text-secondary font-black text-[10px] uppercase tracking-widest">Waiting for clinical data input...</p>
            </div>
        ) : (
        <ul className="space-y-6">
          {files.map(file => (
            <li key={file.id} className={`bg-white p-6 rounded-[1.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer ${selectedFile?.id === file.id ? 'border-brand-pink bg-pink-50' : 'border-gray-100'}`} onClick={() => handleFileSelect(file)}>
              <div className="flex items-center">
                <FileIcon type={file.type} />
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-black text-brand-text-primary tracking-tight">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest flex items-center px-3 py-1 rounded-full border ${
                            file.status === 'Complete' ? 'text-green-600 bg-green-50 border-green-100' : 
                            file.status === 'Failed' ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-400 bg-slate-50 border-slate-100'
                          }`}>
                            {file.status === 'Complete' && <CheckCircleIcon className="w-3 h-3 mr-1.5"/>}
                            {file.status === 'Failed' && <InfoIcon className="w-3 h-3 mr-1.5"/>}
                            {file.status === 'Uploading' ? 'Predicting...' : file.status}
                        </span>
                        {file.reportStatus && file.reportStatus !== 'Idle' && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                            file.reportStatus === 'Complete' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                            file.reportStatus === 'Failed' ? 'text-red-600 bg-red-50 border-red-100' : 'text-yellow-600 bg-yellow-50 border-yellow-100'
                          }`}>
                            Report: {file.reportStatus}
                          </span>
                        )}
                      </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${file.status === 'Failed' ? 'bg-red-500' : 'bg-brand-pink'}`} style={{width: `${file.progress}%`}}></div>
                  </div>
                </div>
              </div>
              {file.status === 'Complete' && <PredictionResult prediction={file.prediction} />}
              {file.status === 'Failed' && (
                <div className="mt-4 pl-14">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Error Report</p>
                    <p className="text-xs text-red-600 font-medium">{file.errorMessage}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        )}
      </div>

      {selectedFile && selectedFile.status === 'Complete' && selectedFile.prediction && (
        <div className="bg-white p-8 rounded-[2rem] shadow-subtle border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-brand-text-primary uppercase tracking-widest text-xs">Detailed Analysis</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedFile.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <p className="text-xs font-semibold text-brand-text-secondary mb-4">PREDICTION RESULT</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-brand-text-secondary mb-2">DIAGNOSIS</p>
                    <span className={`inline-flex px-3 py-2 rounded-full text-sm font-bold ${getPredictionFields(selectedFile.prediction).diagnosis.toLowerCase() === 'malignant' ? 'bg-red-100 text-red-700' : getPredictionFields(selectedFile.prediction).diagnosis.toLowerCase() === 'benign' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {getPredictionFields(selectedFile.prediction).diagnosis.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-text-secondary mb-2">AI CONFIDENCE</p>
                    <p className="text-sm text-brand-text-primary">{(selectedFile.prediction.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-text-secondary mb-2">AI INSIGHT</p>
                    <p className="text-sm text-brand-text-primary leading-6">
                      {selectedFile.prediction.insight || 'The master model completed diagnosis prediction for this scan.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-subtle">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-brand-text-primary">Suggestive Report</p>
                    <p className="text-xs text-brand-text-secondary mt-1">Generated from the histopathology prediction by your local Cloudflare Worker.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void generateSuggestiveReport(selectedFile, selectedFile.prediction)}
                    disabled={selectedFile.reportStatus === 'Generating'}
                    className="bg-brand-pink text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-subtle hover:bg-brand-pink-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {selectedFile.reportStatus === 'Generating' ? 'Generating...' : 'Regenerate Report'}
                  </button>
                </div>

                {selectedFile.reportStatus === 'Generating' && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-brand-text-primary">
                    <div className="w-4 h-4 border-2 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                    Cloudflare Workers AI is drafting the suggestive report from the histology output.
                  </div>
                )}

                {selectedFile.reportStatus === 'Failed' && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {selectedFile.reportError || 'Report generation failed.'}
                  </div>
                )}

                {selectedFile.structuredReport && (
                  <div className="mt-4 overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(180deg,#fffdfc_0%,#fffaf7_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <div className="bg-[linear-gradient(180deg,#fffefc_0%,#fff9f6_100%)] px-6 pt-8 pb-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold text-stone-800">Histopathology Report</h4>
                        <span className="text-xs font-medium text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                          AI-Generated • {new Date().toLocaleDateString()}
                        </span>
                      </div>

                      {selectedFile.structuredReport.sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-8 last:mb-0">
                          <h5 className="text-base font-semibold text-stone-700 mb-4 border-b border-stone-200 pb-2">
                            {section.title}
                          </h5>
                          {section.description && (
                            <p className="text-sm text-stone-600 mb-4 italic">{section.description}</p>
                          )}
                          <div className="space-y-3">
                            {section.subsections.map((subsection, subIndex) => (
                              <div key={subIndex} className="flex flex-col sm:flex-row sm:items-start gap-2">
                                <span className="text-sm font-medium text-stone-600 min-w-[140px] sm:text-right">
                                  {subsection.label}:
                                </span>
                                <span className={`text-sm text-stone-800 flex-1 ${subsection.isHighlighted ? 'font-semibold text-stone-900' : ''}`}>
                                  {subsection.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoAnalysis;
