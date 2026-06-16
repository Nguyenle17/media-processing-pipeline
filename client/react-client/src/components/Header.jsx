import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    History,
    FolderKanban,
    Languages,
    Settings,
} from "lucide-react";


export default function Header() {
    const { user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    let navLinks = null;
    let menuItems = null;

    if (user && user.role === 'admin') {
        navLinks = [
            { to: '/Dashboard', label: 'Dashboard' },
            { to: '/Users-management', label: 'User Management' },
            { to: '/Admin-role-update', label: 'Update Role' },
        ];

        menuItems = [];
    }
    else {
        navLinks = [
            { to: '/', label: 'Home' },
            { to: '/translate', label: 'Translate' },
            { to: '/extract-audio', label: 'Extract Audio' },
            { to: '/features', label: 'Features' },
        ];

        menuItems = [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/history', icon: History, label: 'History' },
            { to: '/projects', icon: FolderKanban, label: 'My Videos' },
            { to: '/translate', icon: Languages, label: 'Translate' },
            { to: '/settings', icon: Settings, label: 'Settings' },
        ];
    }


    const isActive = (path) => location.pathname === path;

    return (
        <>
            <style>{`
                .header-nav {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    background: rgba(10,10,15,0.85);
                    backdrop-filter: blur(16px);
                    border-bottom: 1px solid rgba(99,102,241,0.12);
                    font-family: 'Syne', sans-serif;
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
                    display: flex; align-items: center; gap: 4px;
                    list-style: none; margin: 0; padding: 0;
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
                .avatar {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 13px; font-weight: 700; color: #fff;
                    cursor: pointer; transition: all 0.2s;
                    border: 2px solid rgba(99,102,241,0.3);
                    flex-shrink: 0;
                }
                .avatar:hover { border-color: #6366f1; box-shadow: 0 0 16px rgba(99,102,241,0.4); }
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
                    font-family: 'Syne', sans-serif; font-weight: 500;
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
                .dropdown-user-email { font-size: 11px; color: #52525b; margin-top: 2px; font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .auth-btns { display: flex; gap: 8px; align-items: center; }
                .btn-login {
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 13px; font-weight: 600;
                    background: rgba(99,102,241,0.15);
                    border: 1px solid rgba(99,102,241,0.3);
                    color: #a5b4fc; cursor: pointer;
                    text-decoration: none;
                    transition: all 0.15s;
                    font-family: 'Syne', sans-serif;
                }
                .btn-login:hover { background: rgba(99,102,241,0.3); color: #fff; }
                .btn-register {
                    padding: 6px 14px; border-radius: 8px;
                    font-size: 13px; font-weight: 600;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border: none; color: #fff; cursor: pointer;
                    text-decoration: none;
                    transition: all 0.15s;
                    font-family: 'Syne', sans-serif;
                    box-shadow: 0 4px 16px rgba(99,102,241,0.25);
                }
                .btn-register:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
            `}</style>

            <nav className="header-nav">
                <div className="header-inner">
                    {/* Logo */}
                    <Link to="/" className="logo">
                        <div className="logo-icon">▶</div>
                        <span className="logo-text">VideoSub</span>
                    </Link>

                    {/* Nav links */}
                    <ul className="nav-links">
                        {navLinks.map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className={`nav-link ${isActive(to) ? 'active' : ''}`}>
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} ref={dropdownRef}>
                        {user ? (
                            <>
                                <div className="avatar" onClick={() => setIsOpen(!isOpen)}>
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
                                        <div className="dropdown-divider" />
                                        <button className="dropdown-item danger" onClick={() => { setIsOpen(false); logout(); navigate('/'); }}>
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="auth-btns">
                                <Link to="/login" className="btn-login">Login</Link>
                                <Link to="/register" className="btn-register">Register</Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Spacer */}
            <div style={{ height: 64 }} />
        </>
    );
}