import React from 'react';
import { Link } from 'react-router-dom';

/* ── tiny reusable pieces ── */
const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-brand-pink text-[10px] font-black uppercase tracking-widest">
    {children}
  </span>
);

const StatPill: React.FC<{ value: string; label: string; icon: React.ReactNode }> = ({ value, label, icon }) => (
  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-sm border border-white/60">
    <span className="text-brand-pink">{icon}</span>
    <div>
      <p className="text-sm font-black text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 font-medium">{label}</p>
    </div>
  </div>
);

/* ── Feature card used in "Why Stands Out" ── */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
  btnLabel: string;
  btnColor?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc, to, btnLabel, btnColor = 'bg-brand-pink' }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all p-6 flex flex-col gap-4">
    <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h3 className="text-[15px] font-black text-slate-900 mb-1">{title}</h3>
      <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
    <div className="flex flex-col gap-2 mt-auto">
      <Link to={to}
        className={`${btnColor} text-white text-[11px] font-black uppercase tracking-widest py-2.5 px-4 rounded-xl text-center hover:opacity-90 transition-all flex items-center justify-center gap-2`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {btnLabel}
      </Link>
      <Link to={to} className="text-[11px] font-bold text-slate-500 hover:text-brand-pink transition-colors text-center">
        Learn More &rsaquo;
      </Link>
    </div>
  </div>
);

/* ── How It Works step ── */
const HowStep: React.FC<{ num: string; title: string; desc: string; children: React.ReactNode }> = ({ num, title, desc, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <span className="w-7 h-7 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black flex items-center justify-center">{num}</span>
      <h3 className="text-[14px] font-black text-slate-800">{title}</h3>
    </div>
    <div className="flex-1">{children}</div>
    <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
const LandingPage: React.FC = () => (
  <div className="min-h-screen font-sans text-slate-900 overflow-x-hidden"
    style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fdf0f8 40%, #eff6ff 100%)' }}>

    {/* ── NAV ── */}
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-pink rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight">OncoDetect <span className="text-brand-pink font-light">Pro</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm font-bold text-slate-600 hover:text-brand-pink transition-colors hidden md:block">Dashboard</Link>
          <Link to="/dashboard"
            className="px-5 py-2 bg-brand-pink text-white text-sm font-black rounded-full hover:bg-brand-pink-dark transition-all shadow-md shadow-pink-200">
            Sign Up / Login
          </Link>
        </div>
      </div>
    </nav>

    <main>
      {/* ══ HERO ══ */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        {/* background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div className="z-10">
            <Badge>AI-Powered Breast Cancer Diagnosis</Badge>
            <h1 className="mt-5 text-5xl lg:text-6xl font-black leading-[1.08] text-slate-900">
              Precision Diagnostics<br />for <span className="text-brand-pink">Modern Oncology.</span>
            </h1>
            <p className="mt-5 text-[15px] text-slate-600 leading-relaxed max-w-lg">
              Deep learning analyses histopathology images with pinpoint accuracy, enabling early and accurate breast cancer detection.
            </p>

            {/* Stat pills */}
            <div className="mt-8 flex flex-wrap gap-3">
              <StatPill value="95.42%" label="Model Accuracy"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <StatPill value="< 2 Seconds" label="Precision Time"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
              <StatPill value="7,909" label="Images Validated"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>} />
            </div>

            {/* CTA buttons */}
            <div className="mt-8 flex items-center gap-4">
              <Link to="/dashboard/vision-workbench"
                className="flex items-center gap-2 px-7 py-3 bg-slate-900 text-white font-black text-sm rounded-full hover:bg-black transition-all shadow-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Scan
              </Link>
              <Link to="/dashboard"
                className="px-7 py-3 bg-white text-slate-800 font-black text-sm rounded-full hover:bg-slate-50 transition-all shadow-md border border-slate-200">
                Try Demo
              </Link>
            </div>

            {/* Trusted by */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <img key={i} src={`https://i.pravatar.cc/60?u=doc${i}`}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
                ))}
              </div>
              <p className="text-[12px] text-slate-500">Trusted by <span className="font-black text-slate-900">1,200+</span> Specialists Worldwide</p>
            </div>
          </div>

          {/* Right — AI Detection preview card */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -top-8 -right-8 w-72 h-72 bg-brand-pink/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 w-full max-w-md">
              {/* two-panel image header */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                <div className="relative">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">Original Image</div>
                  <div className="bg-gray-900 rounded-xl overflow-hidden aspect-square">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg/640px-Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg"
                      alt="Histopathology" className="w-full h-full object-cover opacity-90" />
                  </div>
                </div>
                <div className="relative">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">AI Detection (Heatmap)</div>
                  <div className="bg-gray-900 rounded-xl overflow-hidden aspect-square relative">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg/640px-Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg"
                      alt="Heatmap" className="w-full h-full object-cover opacity-70"
                      style={{ filter: 'hue-rotate(180deg) saturate(2) contrast(1.3)' }} />
                    {/* heatmap overlay */}
                    <div className="absolute inset-0 rounded-xl"
                      style={{ background: 'radial-gradient(circle at 60% 40%, rgba(255,80,0,0.6) 0%, rgba(255,180,0,0.3) 40%, transparent 70%)' }} />
                  </div>
                </div>
              </div>

              {/* Result card */}
              <div className="mt-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prediction Result</span>
                  <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-black rounded-full">Malignant</span>
                </div>
                <p className="text-[15px] font-black text-slate-900">Invasive Ductal Carcinoma</p>
                <p className="text-[12px] text-brand-pink font-bold mt-0.5">Confidence: 96.87%</p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-pink to-red-500" style={{ width: '96.87%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHY STANDS OUT ══ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-slate-900">
              Why <span className="text-brand-pink">OncoDetect Pro</span> Stands Out
            </h2>
            <p className="mt-3 text-[13px] text-slate-500 max-w-xl mx-auto leading-relaxed">
              Utilizing cutting-edge AI to transform pathologist diagnostics and accelerate cancer detection. Whether:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="Uni HistoAnalysis"
              desc="Focused on single-class histopathology detection."
              to="/dashboard/vision-workbench"
              btnLabel="Run Uni Analysis"
              icon={<svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6l2 4h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2l2-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100 6 3 3 0 000-6z" />
              </svg>}
            />
            <FeatureCard
              title="MultiClass HistoAnalysis"
              desc="Advanced multi-class tissue classification."
              to="/dashboard/multi-class-histo"
              btnLabel="Run Multi-Class Analysis"
              icon={<svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <circle cx="7" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><circle cx="12" cy="17" r="3" />
              </svg>}
            />
            <FeatureCard
              title="Ultrasound Analysis"
              desc="Specialized AI tools for ultrasound imagery."
              to="/dashboard/ultrasound-analysis"
              btnLabel="Analyze Ultrasound"
              icon={<svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 8a5 5 0 0110 0M5 12a7 7 0 0114 0" />
              </svg>}
            />
            <FeatureCard
              title="Patients Records"
              desc="Secure access to patient database and scan history."
              to="/dashboard/patient-data"
              btnLabel="View Records"
              btnColor="bg-slate-700"
              icon={<svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>}
            />
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg,#fff0f8 0%,#f0f4ff 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-pink mb-2">How It Works</p>
            <p className="text-[13px] text-slate-500 max-w-lg mx-auto leading-relaxed">
              Works best, retrained, to exameate comprehensive propathologist diagnostics, and accelerate cancer detection. Essentially using and reteach ditlients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowStep num="1" title="Upload Image" desc="Dropify has importevent histopathology image or #Iscenary your pointcation.">
              <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-[11px] font-black text-slate-600">Choose Image</p>
              </div>
            </HowStep>

            <HowStep num="2" title="AI Analysis" desc="This only takes a few seconds">
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="relative w-20 h-20">
                  <div className="w-20 h-20 rounded-full border-4 border-brand-pink/20 animate-ping absolute inset-0" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-pink/20 to-purple-200/40 flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.379 2.711H4.178c-1.409 0-2.38-1.712-1.379-2.711L4.2 15.3" />
                    </svg>
                  </div>
                </div>
                <p className="text-[12px] font-bold text-slate-600">Analyze Ultrasound</p>
              </div>
            </HowStep>

            <HowStep num="3" title="Get Diagnosis" desc="Patient Daogo your histopathologie bin a brownie in clip Colid disease image corporate unitskiehanted.">
              <div className="bg-slate-900 rounded-xl p-4 space-y-2">
                <p className="text-[11px] text-slate-400">Diognsis: IDE</p>
                <p className="text-[15px] font-black text-white">Confidence: <span className="text-brand-pink">96.87%</span></p>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-pink to-orange-400" style={{ width: '96.87%' }} />
                </div>
              </div>
            </HowStep>
          </div>
        </div>
      </section>

      {/* ══ RESEARCH-BACKED ══ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-slate-900">Research-Backed &amp; Clinically Validated</h2>
            <p className="mt-3 text-[13px] text-slate-500 max-w-xl mx-auto leading-relaxed">
              Utilizing cutting-edgy AI to transform pathologer diagnostics and accebrate cancer detection. Inbrde tops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Model Performance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-[13px] font-black text-slate-800 mb-4">Model Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-center">
                  <thead>
                    <tr className="text-slate-400 font-bold">
                      <th className="py-1">Trigger</th><th>Accatdb</th><th>Guernbas</th><th>Getbom</th><th>Boenbas</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 font-semibold">
                    <tr><td className="py-1">3</td><td>4</td><td>6</td><td>7</td><td>8</td></tr>
                    <tr><td>5</td><td>5</td><td>4</td><td>1</td><td>14</td></tr>
                  </tbody>
                </table>
              </div>
              <Link to="/dashboard"
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all">
                Road Atrang ↑
              </Link>
            </div>

            {/* Model Meallysis */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
              <h3 className="text-[13px] font-black text-slate-800 mb-1">Model Meallysis</h3>
              <p className="text-[10px] text-slate-400 mb-4">Dee-go-it 2rt Bereas · Ayenten-Matchtion · Matri-boes · Actiors Tusets</p>
              <p className="text-5xl font-black text-brand-pink leading-none">95.42<span className="text-2xl">%</span></p>
              <Link to="/dashboard/multi-class-histo"
                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-brand-pink text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-pink-dark transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Multi-Class Analysis
              </Link>
            </div>

            {/* Dataset & Research */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-[13px] font-black text-slate-800 mb-4">Dataset &amp; Research</h3>
              <ul className="space-y-2 text-[12px] text-slate-600">
                <li className="flex items-start gap-2"><span className="text-brand-pink font-black mt-0.5">•</span>Dreatlits Dataset</li>
                <li className="flex items-start gap-2"><span className="text-brand-pink font-black mt-0.5">•</span>40%, 200%, 200%, 400%</li>
                <li className="flex items-start gap-2 text-slate-400"><span className="font-black mt-0.5">•</span>From / to — removed as former</li>
              </ul>
              <Link to="/dashboard"
                className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-black text-slate-600 hover:text-brand-pink transition-colors">
                Learn More &rsaquo;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>

    {/* ── FOOTER ── */}
    <footer className="py-10 border-t border-slate-100 text-center text-[12px] text-slate-400"
      style={{ background: 'linear-gradient(135deg,#f8f9ff 0%,#fff0f8 100%)' }}>
      <p className="font-black text-slate-700 mb-1">OncoDetect <span className="text-brand-pink">Pro</span></p>
      <p>© {new Date().getFullYear()} OncoDetect Medical Systems. For professional clinical use only.</p>
    </footer>
  </div>
);

export default LandingPage;
