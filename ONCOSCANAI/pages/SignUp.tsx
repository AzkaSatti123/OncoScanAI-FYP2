import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Sign-up failed.';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: 'linear-gradient(135deg,#e8eaf6 0%,#f3e8ff 35%,#e8f4fd 65%,#fce7f3 100%)' }}>

      {/* Bokeh blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-50"
          style={{ background: 'radial-gradient(circle,#c084fc,transparent 65%)' }} />
        <div className="absolute top-[10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-3xl opacity-35"
          style={{ background: 'radial-gradient(circle,#93c5fd,transparent 65%)' }} />
        <div className="absolute bottom-[5%] right-[5%] w-[450px] h-[450px] rounded-full blur-3xl opacity-35"
          style={{ background: 'radial-gradient(circle,#a78bfa,transparent 65%)' }} />
      </div>

      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-black text-slate-900">
              OncoDetect <span className="font-light text-brand-pink">Pro</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-black text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Start your AI diagnostic journey</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border shadow-xl p-8"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.75)' }}>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full name */}
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition"
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-black text-white shadow-lg hover:opacity-90 disabled:opacity-60 transition-all"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-black text-brand-pink hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
