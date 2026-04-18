
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon, BellIcon } from '../icons';

const Header: React.FC = () => {
    const location = useLocation();
    const navigate  = useNavigate();
    const { user }  = useAuth();

    const handleSignOut = async () => {
        await signOut(auth);
        navigate('/login');
    };
    
    const getTitle = () => {
        const path = location.pathname.replace('/dashboard', '').replace(/^\/+/, '');
        if (path === '') return 'Dashboard';

        const overrides: Record<string, string> = {
            'vision-workbench': 'Uni HistoAnalysis',
            'multi-class-histo': 'Multi-Class HistoAnalysis',
        };

        if (overrides[path]) return overrides[path];

        return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <header className="h-20 bg-brand-surface border-b border-gray-200 flex-shrink-0 flex items-center justify-between px-6 md:px-8">
            <h1 className="text-2xl font-bold text-brand-text-primary">{getTitle()}</h1>
            <div className="flex items-center space-x-6">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Search patients, reports..."
                        className="pl-10 pr-4 py-2 w-64 bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink-light focus:border-transparent transition"
                    />
                </div>
                <button className="relative text-gray-500 hover:text-brand-text-primary transition-colors">
                    <BellIcon className="w-6 h-6"/>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-pink opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-pink"></span>
                    </span>
                </button>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow"
                        style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-brand-text-primary leading-tight">
                            {user?.displayName ?? user?.email ?? 'User'}
                        </p>
                        <p className="text-xs text-brand-text-secondary">Oncologist</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-brand-pink hover:bg-pink-50 transition-all border border-slate-200"
                    title="Sign out">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </header>
    );
};

export default Header;
