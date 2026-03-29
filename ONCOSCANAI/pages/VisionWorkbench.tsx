import React, { useState, useEffect } from 'react';
import { UploadIcon, ModelIcon, VisionIcon, InfoIcon, DownloadIcon, PrintIcon } from '../components/icons';
import type { UploadedFile, AnalysisResult } from '../types';

const BACKEND_URL = 'http://127.0.0.1:8000';

type ModelsResponse = {
  active_models?: string[];
  histo_models?: string[];
};

const deriveHistoModels = (data: ModelsResponse) => {
  if (Array.isArray(data.histo_models)) return data.histo_models;
  const active = Array.isArray(data.active_models) ? data.active_models : [];
  return active.filter(model => model === 'alexnet' || model === 'efficient_net' || model === 'yolo');
};

const VisionWorkbench: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Map model keys to display names
  const getModelDisplayName = (modelKey: string) => {
    const displayNames: { [key: string]: string } = {
      'alexnet': 'AlexNet',
      'yolo': 'YOLO V11',
      'efficient_net': 'EfficientNet'
    };
    return displayNames[modelKey] || modelKey.toUpperCase();
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  // Sync available diagnostic engines on initialization
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/models`);
        if (response.ok) {
          const data = await response.json() as ModelsResponse;
          const models = deriveHistoModels(data);
          setAvailableModels(models);
          // Auto-select preferred engine
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

      const data = await response.json();
      
      const analysis: AnalysisResult = {
        pathology: data.result as any,
        confidence: data.confidence,
        insight: data.insight,
        modelUsed: getModelDisplayName(modelName)
      };

      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'Complete', analysis } : f));
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
      previewUrl: URL.createObjectURL(rf)
    }));

    setFiles(prev => [...newFiles, ...prev]);
    if (newFiles.length > 0) setSelectedFileId(newFiles[0].id);

    newFiles.forEach((nf, idx) => {
      handleAnalysis(nf.id, rawFiles[idx], activeModel);
    });
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
      <div className="lg:col-span-3 flex flex-col gap-6">
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

            <div className="flex-grow p-8 overflow-y-auto grid md:grid-cols-2 gap-10">
              {/* Imaging Panel */}
              <div className="space-y-8">
                <div className="relative group">
                   <div className="aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center justify-center border-8 border-slate-50">
                      <img src={selectedFile.previewUrl} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" alt="Scan" />
                      {selectedFile.status === 'Analyzing' && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center">
                          <div className="w-16 h-16 border-4 border-brand-pink border-t-transparent rounded-full animate-spin mb-6"></div>
                          <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Running Neural Pass...</p>
                        </div>
                      )}
                   </div>
                   <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest">Diagnostic View</div>
                </div>


              </div>

              {/* Data Panel */}
              <div className="flex flex-col">
                {selectedFile.status === 'Complete' && selectedFile.analysis ? (
                  <div className="space-y-8 h-full flex flex-col">
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

                    <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
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
