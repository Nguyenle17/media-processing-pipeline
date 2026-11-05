import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Api from "../api/Api";
import LoadingSpinner from "../components/common/LoadingSpinner";

import {
    AlertCircle,
    CheckCircle2,
    ClipboardList,
    Loader2,
    RefreshCw,
    Shield,
    TimerReset,
    UserCheck,
    Users,
    UserX,
    XCircle,
} from "lucide-react";

type AdminInfo = {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    adminUsers: number;
    totalJobs: number;
    totalJobsSuccess: number;
    totalJobsFailed: number;
    totalJobsProcessing: number;
    totalTime: number | null;
};

type Tone = 'accent' | 'success' | 'warning' | 'danger';

const iconTone: Record<Tone, string> = {
    accent: 'vs-text-accent',
    success: 'vs-text-success',
    warning: 'vs-text-warning',
    danger: 'vs-text-danger',
};

export default function AdminDashboard() {
    const [info, setInfo] = useState<AdminInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const [timeFilter, setTimeFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || user.role !== 'admin') { navigate('/'); return; }
        fetchInfo();
    }, [timeFilter, user, navigate]);

    const fetchInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await Api.get(`/admin/info/${timeFilter}`);
            setInfo(data);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Could not load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number | null) => {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const pct = (val?: number, total?: number) =>
        total ? Math.round((val ?? 0) / total * 100) : 0;

    const userStats = info ? [
        { label: 'Total users', value: info.totalUsers, tone: 'accent' as Tone, icon: Users },
        { label: 'Active', value: info.activeUsers, tone: 'success' as Tone, icon: UserCheck },
        { label: 'Banned', value: info.bannedUsers, tone: 'danger' as Tone, icon: UserX },
        { label: 'Admins', value: info.adminUsers, tone: 'warning' as Tone, icon: Shield },
    ] : [];

    const jobStats = info ? [
        { label: 'Total jobs', value: info.totalJobs, tone: 'accent' as Tone, icon: ClipboardList },
        { label: 'Completed', value: info.totalJobsSuccess, tone: 'success' as Tone, icon: CheckCircle2 },
        { label: 'Failed', value: info.totalJobsFailed, tone: 'danger' as Tone, icon: XCircle },
        { label: 'Processing', value: info.totalJobsProcessing, tone: 'warning' as Tone, icon: Loader2 },
        { label: 'Processing time', value: formatTime(info.totalTime), tone: 'accent' as Tone, icon: TimerReset },
    ] : [];

    const userHealth = info ? [
        { label: 'Active users', value: pct(info.activeUsers, info.totalUsers), color: 'var(--vs-success)' },
        { label: 'Banned users', value: pct(info.bannedUsers, info.totalUsers), color: 'var(--vs-danger)' },
        { label: 'Admin users', value: pct(info.adminUsers, info.totalUsers), color: 'var(--vs-warning)' },
    ] : [];

    const jobHealth = info ? [
        { label: 'Completed', value: pct(info.totalJobsSuccess, info.totalJobs), color: 'var(--vs-success)' },
        { label: 'Failed', value: pct(info.totalJobsFailed, info.totalJobs), color: 'var(--vs-danger)' },
        { label: 'Processing', value: pct(info.totalJobsProcessing, info.totalJobs), color: 'var(--vs-warning)' },
    ] : [];

    const filters = [
        { value: 'all', label: 'All time' },
        { value: '1d', label: '1 day' },
        { value: '7d', label: '7 days' },
        { value: '30d', label: '30 days' },
    ];

    const renderStats = (stats: typeof userStats) => stats.map((stat) => {
        const Icon = stat.icon;
        return (
            <div key={stat.label} className="vs-stat-card">
                <div className="vs-stat-head">
                    <span className={`vs-stat-icon ${iconTone[stat.tone]}`}><Icon size={16} /></span>
                </div>
                <div className="vs-stat-label">{stat.label}</div>
                <div className="vs-stat-value">{stat.value}</div>
            </div>
        );
    });

    const renderHealth = (title: string, rows: typeof userHealth) => (
        <div className="vs-panel">
            <div className="vs-panel-header">
                <div className="vs-panel-header__group">
                    <span className="vs-panel-dot" />
                    <h2 className="vs-panel-title">{title}</h2>
                </div>
            </div>
            <div className="vs-panel-body">
                {rows.map((row) => (
                    <div key={row.label} className="vs-meter">
                        <span style={{ width: 96, flexShrink: 0 }}>{row.label}</span>
                        <span className="vs-meter__track">
                            <span className="vs-meter__fill" style={{ display: 'block', width: `${row.value}%`, background: row.color }} />
                        </span>
                        <span className="vs-meter__value">{row.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="vs-page fade-in">
            <div className="vs-container">
                <div className="vs-page-head">
                    <div className="vs-page-head__text">
                        <span className="vs-page-kicker">Admin</span>
                        <h1 className="vs-page-title">Dashboard</h1>
                        <p className="vs-page-desc">Usage and processing health across the workspace.</p>
                    </div>
                    <button onClick={fetchInfo} className="vs-btn vs-btn--secondary">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className="vs-toolbar">
                    <div className="vs-filter-group" role="group" aria-label="Time range">
                        {filters.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setTimeFilter(filter.value)}
                                className={`vs-filter-btn ${timeFilter === filter.value ? 'active' : ''}`}
                                aria-pressed={timeFilter === filter.value}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="vs-error-banner" role="alert">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                        <LoadingSpinner size={34} />
                    </div>
                ) : info ? (
                    <div aria-live="polite">
                        <div className="vs-stat-grid">{renderStats(userStats)}</div>
                        <div className="vs-stat-grid">{renderStats(jobStats)}</div>

                        <div className="vs-studio-grid">
                            {renderHealth('User status', userHealth)}
                            {renderHealth('Job health', jobHealth)}
                        </div>
                    </div>
                ) : (
                    <div className="vs-empty">
                        <ClipboardList size={30} />
                        <p>No dashboard data available.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
