import React from 'react';
import { Link } from 'react-router-dom';

// Histopathology breast tissue image (H&E stained — matches provided sample)
const HISTO_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/' +
  'Lobular_carcinoma_in_situ_-_high_mag.jpg/640px-Lobular_carcinoma_in_situ_-_high_mag.jpg';

/* ─── Bokeh background ─── */
const BG: React.FC = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0"
      style={{ background: 'linear-gradient(160deg,#dde9f8 0%,#ede4f5 30%,#f5eaf8 55%,#dde9f8 80%,#e8f0fb 100%)' }} />
    <div className="absolute -top-32 -left-20 w-[580px] h-[580px] rounded-full blur-3xl opacity-60"
      style={{ background: 'radial-gradient(circle,#c4b5fd 0%,transparent 65%)' }} />
    <div className="absolute -top-10 right-[-80px] w-[420px] h-[420px] rounded-full blur-3xl opacity-40"
      style={{ background: 'radial-gradient(circle,#93c5fd 0%,transparent 65%)' }} />
    <div className="absolute top-[45%] left-[25%] w-[380px] h-[380px] rounded-full blur-3xl opacity-35"
      style={{ background: 'radial-gradient(circle,#f9a8d4 0%,transparent 65%)' }} />
    <div className="absolute bottom-[5%] right-[8%] w-[500px] h-[500px] rounded-full blur-3xl opacity-40"
      style={{ background: 'radial-gradient(circle,#a5b4fc 0%,transparent 65%)' }} />
    <div className="absolute bottom-[-60px] left-[10%] w-[350px] h-[350px] rounded-full blur-3xl opacity-25"
      style={{ background: 'radial-gradient(circle,#67e8f9 0%,transparent 65%)' }} />
  </div>
);

/* ─── Glass card wrapper ─── */
const Glass: React.FC<{ className?: string; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ className = '', children, style }) => (
    <div
      className={`rounded-2xl border shadow-md ${className}`}
      style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.75)', ...style }}>
      {children}
    </div>
  );

/* ─── Stat pill ─── */
const Stat: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => (
  <Glass className="flex items-center gap-2.5 px-4 py-2.5">
    <span className="text-brand-pink flex-shrink-0">{icon}</span>
    <div className="leading-tight">
      <p className="text-[13px] font-black text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  </Glass>
);

/* ─── Hero preview card ─── */
const HeroCard: React.FC = () => (
  <Glass className="p-4 w-full max-w-[430px]" style={{ borderRadius: '1.5rem' }}>
    {/* two image panels */}
    <div className="grid grid-cols-2 gap-2.5 mb-3">
      {[
        { label: 'ORIGINAL IMAGE', filter: 'none', overlay: null },
        {
          label: 'AI DETECTION (HEATMAP)',
          filter: 'brightness(0.7) saturate(0.5)',
          overlay: 'radial-gradient(ellipse at 60% 40%, rgba(255,80,0,0.85) 0%, rgba(255,180,0,0.6) 28%, rgba(0,80,220,0.3) 55%, transparent 75%)',
        },
      ].map(({ label, filter, overlay }) => (
        <div key={label}>
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.18em] mb-1.5 pl-0.5">{label}</p>
          <div className="relative rounded-xl overflow-hidden bg-slate-900" style={{ aspectRatio: '1' }}>
            <img src={HISTO_IMG} alt={label}
              className="w-full h-full object-cover"
              style={{ filter }} />
            {overlay && (
              <div className="absolute inset-0"
                style={{ background: overlay, borderRadius: 'inherit' }} />
            )}
          </div>
        </div>
      ))}
    </div>

    {/* prediction row */}
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
        style={{ background: 'linear-gradient(90deg,#10b981,#059669)' }}>
        +Prediction Result
      </span>
      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500 text-white">Malignant</span>
    </div>
    <p className="text-[15px] font-black text-slate-900 leading-snug">Invasive Ductal Carcinoma</p>
    <p className="text-[12px] font-bold mt-0.5" style={{ color: '#ec4899' }}>Confidence: 96.87%</p>
    <div className="mt-2 h-[6px] rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: '96.87%', background: 'linear-gradient(90deg,#ec4899,#f97316)' }} />
    </div>
  </Glass>
);

/* ─── Feature card ─── */
const FCard: React.FC<{
  icon: React.ReactNode; title: string; desc: string;
  to: string; btnLabel: string; btnStyle?: React.CSSProperties;
}> = ({ icon, title, desc, to, btnLabel, btnStyle }) => (
  <Glass className="p-5 flex flex-col gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(236,72,153,0.1)' }}>
      {icon}
    </div>
    <div>
      <h3 className="text-[13.5px] font-black text-slate-900 mb-0.5">{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
    <div className="mt-auto flex flex-col gap-2">
      <Link to={to}
        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide text-white hover:opacity-90 transition-all"
        style={btnStyle ?? { background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {btnLabel}
      </Link>
      <Link to={to} className="text-center text-[10px] font-bold text-slate-400 hover:text-brand-pink transition-colors">
        Learn More &rsaquo;
      </Link>
    </div>
  </Glass>
);

/* ─── ICON helpers ─── */
const IconMicroscope = () => (
  <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.379 2.711H4.178c-1.409 0-2.38-1.712-1.379-2.711L4.2 15.3" />
  </svg>
);
const IconNodes = () => (
  <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7">
    <circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="7" r="2.5" /><circle cx="12" cy="17" r="2.5" />
    <line x1="7" y1="9.5" x2="12" y2="14.5" strokeLinecap="round" />
    <line x1="17" y1="9.5" x2="12" y2="14.5" strokeLinecap="round" />
  </svg>
);
const IconWave = () => (
  <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 8a5 5 0 0110 0M5 12a7 7 0 0114 0" />
  </svg>
);
const IconFolder = () => (
  <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
const LandingPage: React.FC = () => (
  <div className="min-h-screen font-sans relative overflow-x-hidden">
    <BG />

    {/* ══ NAV ══ */}
    <nav className="sticky top-0 z-50 border-b"
      style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.5)' }}>
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-[1.1rem] font-black tracking-tight text-slate-900">
            OncoDetect <span className="font-light" style={{ color: '#ec4899' }}>Pro</span>
          </span>
        </div>
        <Link to="/dashboard"
          className="px-5 py-2 rounded-full text-[12.5px] font-black text-white shadow-md hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
          SignUp / Login
        </Link>
      </div>
    </nav>

    <main>

      {/* ══ HERO ══ */}
      <section className="max-w-7xl mx-auto px-6 pt-14 pb-16 grid lg:grid-cols-2 gap-12 items-center">

        {/* left */}
        <div>
          {/* badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full text-[9.5px] font-black uppercase tracking-[0.18em] mb-5"
            style={{ background: 'rgba(236,72,153,0.13)', color: '#ec4899' }}>
            AI-Powered Breast Cancer Diagnosis
          </div>

          <h1 className="text-[3.2rem] lg:text-[3.8rem] font-black leading-[1.05] text-slate-900">
            Precision Diagnostics<br />
            for <span style={{ color: '#ec4899' }}>Modern Oncology.</span>
          </h1>

          <p className="mt-5 text-[13.5px] text-slate-600 leading-relaxed max-w-[480px]">
            Deep learning analyses histopathology images with pinpoint accuracy, enabling early and accurate breast cancer detection.
          </p>

          {/* stats */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Stat value="95.42%" label="Model Accuracy"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <Stat value="< 2 Seconds" label="Precision Time"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
            <Stat value="7,909" label="Images Validated"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M9 21V9" /></svg>} />
          </div>

          {/* CTA */}
          <div className="mt-7 flex items-center gap-4 flex-wrap">
            <Link to="/dashboard/vision-workbench"
              className="flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-black text-white shadow-xl hover:opacity-90 transition-all"
              style={{ background: '#1e293b' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Scan
            </Link>
            <Link to="/dashboard"
              className="px-7 py-3 rounded-full text-[13px] font-black text-slate-800 shadow-md hover:shadow-lg transition-all border"
              style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.8)' }}>
              Try Demo
            </Link>
          </div>

          {/* trusted */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[11,22,33].map(i => (
                <img key={i} src={`https://i.pravatar.cc/60?u=dr${i}`}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Trusted by <span className="font-black text-slate-800">1,200+</span> Specialists Worldwide
            </p>
          </div>
        </div>

        {/* right */}
        <div className="flex justify-center lg:justify-end">
          <HeroCard />
        </div>
      </section>

      {/* ══ WHY STANDS OUT ══ */}
      <section className="py-16" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[1.9rem] font-black text-slate-900">
              Why <span style={{ color: '#ec4899' }}>OncoDetect Pro</span> Stands Out
            </h2>
            <p className="mt-2 text-[12px] text-slate-500 max-w-md mx-auto leading-relaxed">
              Utilizing cutting-edge AI to transform pathologist diagnostics and accelerate cancer detection. Whether:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FCard icon={<IconMicroscope />} title="Uni HistoAnalysis"
              desc="Focused on single-class histopathology detection."
              to="/dashboard/vision-workbench" btnLabel="Run Uni Analysis" />
            <FCard icon={<IconNodes />} title="MultiClass HistoAnalysis"
              desc="Advanced multi-class tissue classification."
              to="/dashboard/multi-class-histo" btnLabel="Run Multi-Class Analysis" />
            <FCard icon={<IconWave />} title="Ultrasound Analysis"
              desc="Specialized AI tools for ultrasound imagery."
              to="/dashboard/ultrasound-analysis" btnLabel="Analyze Ultrasound" />
            <FCard icon={<IconFolder />} title="Patients Records"
              desc="Secure access to patient database and scan history."
              to="/dashboard/patient-data" btnLabel="View Records"
              btnStyle={{ background: '#334155' }} />
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400 mb-2">
              How <span style={{ color: '#ec4899' }}>It Works</span>
            </p>
            <p className="text-[12px] text-slate-500 max-w-md mx-auto leading-relaxed">
              Works best, retrained, to examine comprehensive propathologist diagnostics, and accelerate cancer detection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Step 1 — Upload Image with actual histo thumbnail */}
            <Glass className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.12)' }}>
                  <svg className="w-4 h-4" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-[13px] font-black text-slate-800">Upload Image</h3>
              </div>

              {/* histopathology image preview in upload box */}
              <div className="border-2 border-dashed rounded-xl overflow-hidden"
                style={{ borderColor: 'rgba(203,213,225,0.8)', background: 'rgba(248,250,252,0.7)' }}>
                <div className="w-full" style={{ aspectRatio: '4/3' }}>
                  <img src={HISTO_IMG} alt="Histopathology sample"
                    className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 border-t"
                  style={{ borderColor: 'rgba(203,213,225,0.6)' }}>
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12V9a8 8 0 0116 0v3" />
                  </svg>
                  <span className="text-[10px] font-bold text-slate-500">Choose Image</span>
                </div>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Dropify has importevent histopathology image or #Iscenary your pointcation.
              </p>
            </Glass>

            {/* Step 2 — AI Analysis */}
            <Glass className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.12)' }}>
                  <svg className="w-4 h-4" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-[13px] font-black text-slate-800">AI Analysis</h3>
              </div>

              <div className="flex flex-col items-center justify-center py-6 gap-4">
                {/* animated molecule / pulse */}
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ background: 'radial-gradient(circle,#ec4899,#a855f7)' }} />
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.18),rgba(168,85,247,0.18))' }}>
                    {/* three overlapping spheres */}
                    <div className="relative w-14 h-14">
                      <div className="absolute top-0 left-2 w-6 h-6 rounded-full opacity-80"
                        style={{ background: 'linear-gradient(135deg,#f9a8d4,#ec4899)' }} />
                      <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full opacity-70"
                        style={{ background: 'linear-gradient(135deg,#c4b5fd,#a855f7)' }} />
                      <div className="absolute bottom-1 right-0 w-5 h-5 rounded-full opacity-75"
                        style={{ background: 'linear-gradient(135deg,#93c5fd,#60a5fa)' }} />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[12.5px] font-black text-slate-700">Analyze Ultrasound</p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">This only takes a few seconds</p>
                </div>
              </div>
            </Glass>

            {/* Step 3 — Get Diagnosis */}
            <Glass className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.12)' }}>
                  <svg className="w-4 h-4" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-[13px] font-black text-slate-800">Get Diagnosis</h3>
              </div>

              <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#0f172a' }}>
                <p className="text-[10px] text-slate-400 font-medium">Diognsis: IDE</p>
                <p className="text-[15px] font-black text-white leading-tight">
                  Confidence: <span style={{ color: '#ec4899' }}>96.87%</span>
                </p>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: '96.87%', background: 'linear-gradient(90deg,#ec4899,#f97316)' }} />
                </div>
                <p className="text-[9.5px] text-slate-500 leading-relaxed pt-1">
                  Patient: Diagnose your histopathologie for a brownie in clip. Colid disease image corporate unitskiehanted.
                </p>
              </div>
            </Glass>
          </div>
        </div>
      </section>

      {/* ══ RESEARCH-BACKED ══ */}
      <section className="py-16" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[1.9rem] font-black text-slate-900">Research-Backed &amp; Clinically Validated</h2>
            <p className="mt-2 text-[12px] text-slate-500 max-w-xl mx-auto leading-relaxed">
              Utilizing cutting-edge AI to transform pathologer diagnostics and accabrate cancer detection. Inbrde tops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Model Performance */}
            <Glass className="p-6">
              <h3 className="text-[13px] font-black text-slate-800 mb-4">Model Performance</h3>
              <table className="w-full text-[10.5px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Trigger','Accatdb','Guernbas','Getbom','Boenbas'].map(h => (
                      <th key={h} className="py-1.5 px-0.5 text-center font-bold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([[3,4,6,7,8],[5,5,4,1,14]] as number[][]).map((row, ri) => (
                    <tr key={ri} className="border-b border-slate-50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-1.5 px-0.5 text-center font-semibold text-slate-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link to="/dashboard"
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black text-white hover:opacity-90 transition-all"
                style={{ background: '#1e293b' }}>
                Road Atrang ↑
              </Link>
            </Glass>

            {/* Model Meallysis */}
            <Glass className="p-6 flex flex-col items-center text-center">
              <h3 className="text-[13px] font-black text-slate-800">Model Meallysis</h3>
              <p className="text-[9.5px] text-slate-400 mt-1 mb-6 leading-relaxed max-w-[200px]">
                Dee-go-it 2rt Bereas · Ayenten-Matchtion · Matri-boes · Actiors Tusets
              </p>
              <p className="font-black leading-none" style={{ fontSize: '3.8rem', color: '#ec4899' }}>
                95.42<span style={{ fontSize: '1.9rem' }}>%</span>
              </p>
              <Link to="/dashboard/multi-class-histo"
                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black text-white hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Multi-Class Analysis
              </Link>
            </Glass>

            {/* Dataset & Research */}
            <Glass className="p-6">
              <h3 className="text-[13px] font-black text-slate-800 mb-4">Dataset &amp; Research</h3>
              <ul className="space-y-2.5">
                {[
                  'BreakHis Dataset',
                  '40×, 100×, 200×, 400× magnification',
                  'Train / Test — validated pathology sets',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
                    <span className="font-black flex-shrink-0 mt-0.5" style={{ color: '#ec4899' }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/dashboard"
                className="mt-6 inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-brand-pink transition-colors">
                Learn More &rsaquo;
              </Link>
            </Glass>
          </div>
        </div>
      </section>
    </main>

    {/* ── FOOTER ── */}
    <footer className="py-10 text-center border-t"
      style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
      <p className="text-[14px] font-black text-slate-800 mb-1">
        OncoDetect <span style={{ color: '#ec4899' }}>Pro</span>
      </p>
      <p className="text-[11px] text-slate-400">
        © {new Date().getFullYear()} OncoDetect Medical Systems. For professional clinical use only.
      </p>
    </footer>
  </div>
);

export default LandingPage;
