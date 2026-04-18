import React from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────
   BACKGROUND — soft lavender/pink bokeh
───────────────────────────────────────── */
const PageBackground: React.FC = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    {/* base gradient */}
    <div className="absolute inset-0"
      style={{ background: 'linear-gradient(135deg,#e8eaf6 0%,#f3e8ff 35%,#e8f4fd 65%,#fce7f3 100%)' }} />
    {/* bokeh circles */}
    <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-40"
      style={{ background: 'radial-gradient(circle,#c084fc 0%,transparent 70%)' }} />
    <div className="absolute top-[5%] right-[-8%] w-[400px] h-[400px] rounded-full opacity-30"
      style={{ background: 'radial-gradient(circle,#60a5fa 0%,transparent 70%)' }} />
    <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full opacity-25"
      style={{ background: 'radial-gradient(circle,#f9a8d4 0%,transparent 70%)' }} />
    <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full opacity-30"
      style={{ background: 'radial-gradient(circle,#a78bfa 0%,transparent 70%)' }} />
    <div className="absolute bottom-[-5%] left-[15%] w-[300px] h-[300px] rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle,#67e8f9 0%,transparent 70%)' }} />
  </div>
);

/* ─────────────────────────────────────────
   NAV
───────────────────────────────────────── */
const Nav: React.FC = () => (
  <nav className="sticky top-0 z-50 border-b border-white/40"
    style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(18px)' }}>
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
          style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="text-[1.1rem] font-black tracking-tight text-slate-900">
          OncoDetect <span className="text-brand-pink font-light">Pro</span>
        </span>
      </div>
      {/* right */}
      <Link to="/dashboard"
        className="px-5 py-2 text-sm font-black text-white rounded-full shadow-md transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
        SignUp / Login
      </Link>
    </div>
  </nav>
);

/* ─────────────────────────────────────────
   STAT PILL
───────────────────────────────────────── */
const StatPill: React.FC<{ value: string; label: string; icon: React.ReactNode }> = ({ value, label, icon }) => (
  <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm border border-white/70 rounded-2xl px-4 py-2.5 shadow-sm">
    <span className="text-brand-pink flex-shrink-0">{icon}</span>
    <div>
      <p className="text-[13px] font-black text-slate-900 leading-tight">{value}</p>
      <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   HERO AI PREVIEW CARD
───────────────────────────────────────── */
const HeroCard: React.FC = () => (
  <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/80 p-5 w-full max-w-[440px]">
    {/* two panels */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      {/* Original */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mb-2 pl-0.5">Original Image</p>
        <div className="rounded-2xl overflow-hidden bg-slate-900" style={{ aspectRatio: '1' }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg/640px-Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg"
            alt="Histopathology original"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      {/* Heatmap */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mb-2 pl-0.5">AI Detection (Heatmap)</p>
        <div className="rounded-2xl overflow-hidden bg-slate-900 relative" style={{ aspectRatio: '1' }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg/640px-Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg"
            alt="AI heatmap"
            className="w-full h-full object-cover"
            style={{ filter: 'saturate(0.6) brightness(0.75)' }}
          />
          {/* heatmap overlay — warm orange-red radial */}
          <div className="absolute inset-0 rounded-2xl"
            style={{ background: 'radial-gradient(ellipse at 58% 42%, rgba(255,90,0,0.82) 0%, rgba(255,180,0,0.55) 30%, rgba(0,120,255,0.25) 60%, transparent 80%)' }} />
        </div>
      </div>
    </div>

    {/* Result row */}
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white"
        style={{ background: 'linear-gradient(90deg,#10b981,#059669)' }}>
        +Prediction Result
      </span>
      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500 text-white ml-auto">Malignant</span>
    </div>
    <p className="text-[15px] font-black text-slate-900 leading-tight">Invasive Ductal Carcinoma</p>
    <p className="text-[12px] font-bold mt-1" style={{ color: '#ec4899' }}>Confidence: 96.87%</p>
    <div className="mt-2 h-2 rounded-full overflow-hidden bg-slate-100">
      <div className="h-full rounded-full" style={{ width: '96.87%', background: 'linear-gradient(90deg,#ec4899,#f97316)' }} />
    </div>
  </div>
);

/* ─────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────── */
interface FCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
  btnLabel: string;
  btnPink?: boolean;
}
const FeatureCard: React.FC<FCardProps> = ({ icon, title, desc, to, btnLabel, btnPink = true }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/70 shadow-md p-5 flex flex-col gap-3 hover:shadow-xl hover:-translate-y-1 transition-all">
    <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">{icon}</div>
    <div>
      <h3 className="text-[13px] font-black text-slate-900">{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{desc}</p>
    </div>
    <div className="flex flex-col gap-2 mt-auto">
      <Link to={to}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide text-white transition-all hover:opacity-90"
        style={{ background: btnPink ? 'linear-gradient(135deg,#ec4899,#a855f7)' : '#334155' }}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {btnLabel}
      </Link>
      <Link to={to} className="text-center text-[10px] font-bold text-slate-400 hover:text-brand-pink transition-colors">
        Learn More &rsaquo;
      </Link>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   HOW-IT-WORKS CARD
───────────────────────────────────────── */
const HowCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/70 shadow-md p-5 flex flex-col gap-4">
    <h3 className="text-[13px] font-black text-slate-800">{title}</h3>
    {children}
  </div>
);

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
const LandingPage: React.FC = () => (
  <div className="min-h-screen font-sans relative">
    <PageBackground />
    <Nav />

    <main className="relative">

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-14 items-center">

        {/* LEFT */}
        <div>
          {/* badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-5 text-brand-pink"
            style={{ background: 'rgba(236,72,153,0.12)' }}>
            AI-Powered Breast Cancer Diagnosis
          </div>

          <h1 className="text-5xl lg:text-[3.6rem] font-black leading-[1.06] text-slate-900">
            Precision Diagnostics<br />
            for <span style={{ color: '#ec4899' }}>Modern Oncology.</span>
          </h1>

          <p className="mt-5 text-[14px] text-slate-600 leading-relaxed max-w-lg">
            Deep learning analyses histopathology images with pinpoint accuracy, enabling early and accurate breast cancer detection.
          </p>

          {/* stat pills */}
          <div className="mt-7 flex flex-wrap gap-3">
            <StatPill value="95.42%" label="Model Accuracy"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
            <StatPill value="< 2 Seconds" label="Precision Time"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
            <StatPill value="7,909" label="Images Validated"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M9 21V9"/></svg>} />
          </div>

          {/* CTA */}
          <div className="mt-7 flex items-center gap-4">
            <Link to="/dashboard/vision-workbench"
              className="flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-black text-white shadow-xl hover:shadow-2xl hover:opacity-90 transition-all"
              style={{ background: '#1e293b' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Upload Scan
            </Link>
            <Link to="/dashboard"
              className="px-7 py-3 rounded-full text-[13px] font-black text-slate-800 bg-white/90 border border-white shadow-md hover:shadow-lg transition-all">
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

        {/* RIGHT — preview card */}
        <div className="flex justify-center lg:justify-end">
          <HeroCard />
        </div>
      </section>

      {/* ══════════════ WHY STANDS OUT ══════════════ */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-[1.85rem] font-black text-slate-900">
            Why <span style={{ color: '#ec4899' }}>OncoDetect Pro</span> Stands Out
          </h2>
          <p className="mt-2 text-[12.5px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            Utilizing cutting-edge AI to transform pathologist diagnostics and accelerate cancer detection. Whether:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureCard
            title="Uni HistoAnalysis"
            desc="Focused on single-class histopathology detection."
            to="/dashboard/vision-workbench"
            btnLabel="Run Uni Analysis"
            icon={
              <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.379 2.711H4.178c-1.409 0-2.38-1.712-1.379-2.711L4.2 15.3"/>
              </svg>
            }
          />
          <FeatureCard
            title="MultiClass HistoAnalysis"
            desc="Advanced multi-class tissue classification."
            to="/dashboard/multi-class-histo"
            btnLabel="Run Multi-Class Analysis"
            icon={
              <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="12" cy="17" r="3"/>
                <line x1="7" y1="10" x2="12" y2="14" strokeLinecap="round"/>
                <line x1="17" y1="10" x2="12" y2="14" strokeLinecap="round"/>
              </svg>
            }
          />
          <FeatureCard
            title="Ultrasound Analysis"
            desc="Specialized AI tools for ultrasound imagery."
            to="/dashboard/ultrasound-analysis"
            btnLabel="Analyze Ultrasound"
            icon={
              <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 8a5 5 0 0110 0M5 12a7 7 0 0114 0"/>
              </svg>
            }
          />
          <FeatureCard
            title="Patients Records"
            desc="Secure access to patient database and scan history."
            to="/dashboard/patient-data"
            btnLabel="View Records"
            btnPink={false}
            icon={
              <svg className="w-6 h-6" style={{ color: '#ec4899' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
            }
          />
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section className="py-20" style={{ background: 'rgba(255,255,255,0.25)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">How It Works</p>
            <p className="text-[12.5px] text-slate-500 max-w-md mx-auto leading-relaxed">
              Works best, retrained, to examine comprehensive propathologist diagnostics, and accelerate cancer detection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Step 1 */}
            <HowCard title="Upload Image">
              <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60 flex flex-col items-center justify-center py-8 gap-3">
                {/* mini histology thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-pink-200 shadow-sm">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg/640px-Histology_of_invasive_ductal_carcinoma_of_the_breast_7.jpg"
                    alt="sample" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <svg className="w-3.5 h-3.5 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  Choose Image
                </div>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed mt-2">
                Drop a histopathology image or browse your local files to begin analysis.
              </p>
            </HowCard>

            {/* Step 2 */}
            <HowCard title="AI Analysis">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(236,72,153,0.2)' }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(168,85,247,0.15))' }}>
                    <svg className="w-9 h-9 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.379 2.711H4.178c-1.409 0-2.38-1.712-1.379-2.711L4.2 15.3"/>
                    </svg>
                  </div>
                </div>
                <p className="text-[12px] font-black text-slate-700">Analyze Ultrasound</p>
                <p className="text-[10.5px] text-slate-400">This only takes a few seconds</p>
              </div>
            </HowCard>

            {/* Step 3 */}
            <HowCard title="Get Diagnosis">
              <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#0f172a' }}>
                <p className="text-[10px] text-slate-400">Diagnosis: IDE</p>
                <p className="text-[14px] font-black text-white">
                  Confidence: <span style={{ color: '#ec4899' }}>96.87%</span>
                </p>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '96.87%', background: 'linear-gradient(90deg,#ec4899,#f97316)' }} />
                </div>
                <p className="text-[9.5px] text-slate-500 leading-relaxed pt-1">
                  Patient: Diagnose your histopathology scan for a clinical report.
                </p>
              </div>
            </HowCard>
          </div>
        </div>
      </section>

      {/* ══════════════ RESEARCH-BACKED ══════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-[1.85rem] font-black text-slate-900">Research-Backed &amp; Clinically Validated</h2>
          <p className="mt-2 text-[12.5px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            Utilizing cutting-edge AI to transform pathologer diagnostics and accelerate cancer detection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Model Performance */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/70 shadow-md p-6">
            <h3 className="text-[13px] font-black text-slate-800 mb-4">Model Performance</h3>
            <div className="overflow-auto">
              <table className="w-full text-[10.5px] border-collapse">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100">
                    {['Trigger','Accatdb','Guernbas','Getbom','Boenbas'].map(h => (
                      <th key={h} className="py-1.5 px-1 text-center font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {[[3,4,6,7,8],[5,5,4,1,14]].map((row, ri) => (
                    <tr key={ri} className="border-b border-slate-50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-1.5 px-1 text-center font-semibold">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/dashboard"
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-90"
              style={{ background: '#1e293b' }}>
              Road Atrang ↑
            </Link>
          </div>

          {/* Model Meallysis */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/70 shadow-md p-6 flex flex-col items-center text-center">
            <h3 className="text-[13px] font-black text-slate-800">Model Meallysis</h3>
            <p className="text-[9.5px] text-slate-400 mt-1 mb-5 leading-relaxed">
              Dee-go-it 2rt Bereas · Ayenten-Matchtion · Matri-boes · Actiors Tusets
            </p>
            <p className="font-black leading-none" style={{ fontSize: '3.5rem', color: '#ec4899' }}>
              95.42<span style={{ fontSize: '1.8rem' }}>%</span>
            </p>
            <Link to="/dashboard/multi-class-histo"
              className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Run Multi-Class Analysis
            </Link>
          </div>

          {/* Dataset & Research */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/70 shadow-md p-6">
            <h3 className="text-[13px] font-black text-slate-800 mb-4">Dataset &amp; Research</h3>
            <ul className="space-y-2.5 text-[12px] text-slate-600">
              {[
                'BreakHis Dataset',
                '40×, 100×, 200×, 400× magnification',
                'Train / Test — validated pathology sets',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-black mt-0.5 flex-shrink-0" style={{ color: '#ec4899' }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/dashboard"
              className="mt-6 inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-brand-pink transition-colors">
              Learn More &rsaquo;
            </Link>
          </div>
        </div>
      </section>
    </main>

    {/* ── FOOTER ── */}
    <footer className="py-10 text-center text-[11.5px] text-slate-400 border-t border-white/40"
      style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(12px)' }}>
      <p className="font-black text-slate-700 text-[14px] mb-1">
        OncoDetect <span style={{ color: '#ec4899' }}>Pro</span>
      </p>
      <p>© {new Date().getFullYear()} OncoDetect Medical Systems. For professional clinical use only.</p>
    </footer>
  </div>
);

export default LandingPage;
