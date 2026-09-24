import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
    History,
    FolderKanban,
    Languages,
    Settings,
    Menu,
    X
} from "lucide-react";

export default function Header() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useClickOutside(dropdownRef, () => setIsOpen(false));

    let navLinks = [];
    let menuItems = [];

    if (user && user.role === 'admin') {
        navLinks = [
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/users-management', label: 'User Management' },
            { to: '/admin-role-update', label: 'Update Role' },
        ];
        menuItems = [];
    } else {
        navLinks = [
            { to: '/', label: 'Home' },
            { to: '/translate', label: 'Translate' },
            { to: '/extract-audio', label: 'Extract Audio' },
        ];
        menuItems = [
            { to: '/history', icon: History, label: 'History' },
            { to: '/projects', icon: FolderKanban, label: 'My Videos' },
            { to: '/translate', icon: Languages, label: 'Translate' },
            { to: '/settings', icon: Settings, label: 'Settings' },
        ];
    }

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <style>{`
                .header-nav {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    background: rgba(10,10,15,0.85);
                    backdrop-filter: blur(16px);
                    border-bottom: 1px solid rgba(99,102,241,0.12);
                    font-family: 'Inter', 'Segoe UI', sans-serif;
                }
                .header-inner {
                    max-width: 1200px; margin: 0 auto;
                    padding: 0 32px; height: 64px;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .logo {
                    display: flex; align-items: center; gap: 8px;
                    text-decoration: none; flex-shrink: 0;
                }
                .logo-icon {
                    width: 32px; height: 32px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px;
                }
                .logo-text {
                    font-size: 18px; font-weight: 800;
                    background: linear-gradient(135deg, #a5b4fc, #e879f9);
                    -webkit-background-clip: text; background-clip: text;
                    color: transparent;
                }
                .nav-links {
                    display: none; align-items: center; gap: 4px;
                    list-style: none; margin: 0; padding: 0;
                }
                @media (min-width: 768px) {
                    .nav-links { display: flex; }
                }
                .nav-link {
                    padding: 6px 12px; border-radius: 8px;
                    font-size: 13px; font-weight: 600;
                    color: #71717a; text-decoration: none;
                    transition: all 0.15s; white-space: nowrap;
                    letter-spacing: 0.01em;
                }
                .nav-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
                .nav-link.active {
                    color: #a5b4fc;
                    background: rgba(99,102,241,0.15);
                    border: 1px solid rgba(99,102,241,0.25);
                }
                .dropdown {
                    position: absolute; top: calc(100% + 8px); right: 0;
                    width: 200px;
                    background: #111118;
                    border: 1px solid rgba(99,102,241,0.2);
                    border-radius: 12px; padding: 6px;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
                    animation: dropIn 0.15s ease;
                }
                @keyframes dropIn { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
                .dropdown-item {
                    display: flex; align-items: center; gap: 8px;
                    padding: 8px 12px; border-radius: 8px;
                    font-size: 13px; color: #a1a1aa;
                    text-decoration: none; cursor: pointer;
                    transition: all 0.15s; border: none;
                    background: transparent; width: 100%;
                    font-family: 'Inter', 'Segoe UI', sans-serif; font-weight: 500;
                }
                .dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
                .dropdown-item.danger:hover { background: rgba(239,68,68,0.1); color: #f87171; }
                .dropdown-divider {
                    height: 1px; background: rgba(255,255,255,0.06);
                    margin: 4px 0;
                }
                .dropdown-user {
                    padding: 12px 16px 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 4px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .dropdown-user-name { font-size: 13px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .dropdown-user-email { font-size: 11px; color: #52525b; margin-top: 2px; font-family: 'Inter', 'Segoe UI', sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .auth-btns { display: flex; gap: 8px; align-items: center; }
                
                .mobile-menu-btn {
                    display: block;
                    background: transparent;
                    border: none;
                    color: #fff;
                    cursor: pointer;
                }
                @media (min-width: 768px) {
                    .mobile-menu-btn { display: none; }
                }
                .mobile-nav {
                    display: flex;
                    flex-direction: column;
                    background: #111118;
                    position: absolute;
                    top: 64px; left: 0; right: 0;
                    padding: 16px;
                    border-bottom: 1px solid rgba(99,102,241,0.2);
                }
            `}</style>

            <nav className="header-nav">
                <div className="header-inner">
                    <Link to="/" className="logo">
                        <div className="logo-icon">▶</div>
                        <span className="logo-text">VideoSub</span>
                    </Link>

                    <ul className="nav-links">
                        {navLinks.map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className={`nav-link ${isActive(to) ? 'active' : ''}`}>
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} ref={dropdownRef}>
                        {user ? (
                            <>
                                <div className="vs-avatar" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
                                    {user.name ? user.name[0].toUpperCase() : 'U'}
                                </div>
                                {isOpen && (
                                    <div className="dropdown">
                                        <div className="dropdown-user">
                                            <div className="dropdown-user-name">{user.name || 'User'}</div>
                                            <div className="dropdown-user-email">{user.email || ''}</div>
                                        </div>
                                        {menuItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Link to={item.to} key={item.to} className="dropdown-item" onClick={() => setIsOpen(false)}>
                                                    <Icon size={18} strokeWidth={2} />
                                                    <span>{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                        {menuItems.length > 0 && <div className="dropdown-divider" />}
                                        <button className="dropdown-item danger" onClick={() => { setIsOpen(false); logout(); navigate('/'); }}>
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="auth-btns nav-links">
                                <Link to="/login" className="vs-btn vs-btn--ghost" style={{ padding: '6px 14px' }}>Login</Link>
                                <Link to="/register" className="vs-btn vs-btn--primary" style={{ padding: '6px 14px' }}>Register</Link>
                            </div>
                        )}
                        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <div className="mobile-nav">
                        {navLinks.map(({ to, label }) => (
                            <Link key={to} to={to} className={`nav-link ${isActive(to) ? 'active' : ''}`} style={{ padding: '12px' }} onClick={() => setMobileMenuOpen(false)}>
                                {label}
                            </Link>
                        ))}
                        {!user && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                <Link to="/login" className="vs-btn vs-btn--ghost" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                                <Link to="/register" className="vs-btn vs-btn--primary" onClick={() => setMobileMenuOpen(false)}>Register</Link>
                            </div>
                        )}
                    </div>
                )}
            </nav>
            <div style={{ height: 64 }} />
        </>
    );
}
