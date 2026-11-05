import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
    AudioLines,
    History,
    Languages,
    LogOut,
    Menu,
    Settings,
    ShieldCheck,
    Users,
    Volume2,
    X,
} from "lucide-react";

export default function Header() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useClickOutside(dropdownRef, () => setIsOpen(false));

    useEffect(() => {
        setIsOpen(false);
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    const isAdmin = user?.role === 'admin';

    const navLinks = isAdmin
        ? [
            { to: '/dashboard', label: 'Dashboard', icon: AudioLines },
            { to: '/users-management', label: 'Users', icon: Users },
            { to: '/admin-role-update', label: 'Roles', icon: ShieldCheck },
        ]
        : [
            { to: '/', label: 'Home', icon: AudioLines },
            { to: '/translate', label: 'Translate', icon: Languages },
            { to: '/extract-audio', label: 'Extract Audio', icon: Volume2 },
        ];

    const menuItems = isAdmin
        ? []
        : [
            { to: '/history', icon: History, label: 'Translation history' },
            { to: '/tts-history', icon: Volume2, label: 'Voice history' },
            { to: '/settings', icon: Settings, label: 'Settings' },
        ];

    const isActive = (path: string) =>
        path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

    const handleSignOut = () => {
        setIsOpen(false);
        setMobileMenuOpen(false);
        logout();
        navigate('/');
    };

    return (
        <header className="vs-header">
            <div className="vs-container">
                <div className="vs-header-inner">
                    <Link to="/" className="vs-brand" aria-label="VideoSub home">
                        <span className="vs-brand-mark"><AudioLines size={18} /></span>
                        <span className="vs-brand-name">VideoSub</span>
                    </Link>

                    <nav className="vs-nav" aria-label="Primary">
                        {navLinks.map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className={`vs-nav-link ${isActive(to) ? 'is-active' : ''}`}
                                aria-current={isActive(to) ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="vs-header-actions" ref={dropdownRef}>
                        {user ? (
                            <>
                                <button
                                    type="button"
                                    className="vs-avatar-btn"
                                    onClick={() => setIsOpen((open) => !open)}
                                    aria-haspopup="menu"
                                    aria-expanded={isOpen}
                                    aria-label="Account menu"
                                >
                                    {user.name ? user.name[0].toUpperCase() : 'U'}
                                </button>
                                {isOpen && (
                                    <div className="vs-dropdown" role="menu">
                                        <div className="vs-dropdown-user">
                                            <div className="vs-dropdown-user-name">{user.name || 'User'}</div>
                                            <div className="vs-dropdown-user-email">{user.email || ''}</div>
                                        </div>
                                        {menuItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Link key={item.to} to={item.to} className="vs-dropdown-item" role="menuitem">
                                                    <Icon size={16} strokeWidth={1.8} />
                                                    <span>{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                        {menuItems.length > 0 && <div className="vs-dropdown-divider" />}
                                        <button type="button" className="vs-dropdown-item vs-dropdown-item--danger" role="menuitem" onClick={handleSignOut}>
                                            <LogOut size={16} strokeWidth={1.8} />
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="vs-header-auth">
                                <Link to="/login" className="vs-btn vs-btn--ghost vs-btn--sm">Log in</Link>
                                <Link to="/register" className="vs-btn vs-btn--primary vs-btn--sm">Create account</Link>
                            </div>
                        )}

                        <button
                            type="button"
                            className="vs-mobile-toggle"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="mobile-navigation"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <nav id="mobile-navigation" className="vs-mobile-nav" aria-label="Mobile">
                        {navLinks.map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className={`vs-nav-link ${isActive(to) ? 'is-active' : ''}`}
                                aria-current={isActive(to) ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        ))}

                        {user && menuItems.length > 0 && (
                            <>
                                <span className="vs-mobile-nav__label">Account</span>
                                {menuItems.map(({ to, label }) => (
                                    <Link key={to} to={to} className="vs-nav-link">{label}</Link>
                                ))}
                            </>
                        )}

                        {user ? (
                            <div className="vs-mobile-nav__actions">
                                <button type="button" className="vs-btn vs-btn--ghost vs-btn--block" onClick={handleSignOut}>
                                    <LogOut size={16} /> Sign out
                                </button>
                            </div>
                        ) : (
                            <div className="vs-mobile-nav__actions">
                                <Link to="/login" className="vs-btn vs-btn--ghost vs-btn--block">Log in</Link>
                                <Link to="/register" className="vs-btn vs-btn--primary vs-btn--block">Create account</Link>
                            </div>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
}
