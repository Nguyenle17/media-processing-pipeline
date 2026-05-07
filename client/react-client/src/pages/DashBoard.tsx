import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Api from "../api/Api";

import {
    Users,
    UserCheck,
    UserX,
    Shield,
    ClipboardList,
    CheckCircle2,
    XCircle,
    Loader2,
    TimerReset,
    RefreshCw
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



export default function AdminDashboard() {
    const [info, setInfo] = useState<AdminInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const [timeFilter, setTimeFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || user.role !== 'admin') { navigate('/'); return; }
        fetchInfo();
    }, [timeFilter]);

    const fetchInfo = async () => {
        try {
            setLoading(true);
            const data = await Api.get(`/admin/info/${timeFilter}`);
            setInfo(data);
        } catch (e) {
            console.error(e);
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
    const STATS = info ? [
        { label: 'Total Users', value: info.totalUsers, color: '#6366f1', icon: Users },
        { label: 'Active', value: info.activeUsers, color: '#10b981', icon: UserCheck },
        { label: 'Banned', value: info.bannedUsers, color: '#ef4444', icon: UserX },
        { label: 'Admins', value: info.adminUsers, color: '#f59e0b', icon: Shield },
        { label: 'Total Jobs', value: info.totalJobs, color: '#8b5cf6', icon: ClipboardList },
        { label: 'Completed', value: info.totalJobsSuccess, color: '#10b981', icon: CheckCircle2 },
        { label: 'Failed', value: info.totalJobsFailed, color: '#ef4444', icon: XCircle },
        { label: 'Processing', value: info.totalJobsProcessing, color: '#f59e0b', icon: Loader2 },
        { label: 'Duration', value: formatTime(info.totalTime), color: '#06b6d4', icon: TimerReset },
    ] : [];

    const BARS = info ? [
        { label: 'Completed Jobs', value: info.totalJobsSuccess, total: info.totalJobs, color: '#10b981' },
        { label: 'Failed Jobs', value: info.totalJobsFailed, total: info.totalJobs, color: '#ef4444' },
        { label: 'Processing', value: info.totalJobsProcessing, total: info.totalJobs, color: '#f59e0b' },
        { label: 'Active Users', value: info.activeUsers, total: info.totalUsers, color: '#6366f1' },
        { label: 'Banned Users', value: info.bannedUsers, total: info.totalUsers, color: '#ef4444' },
        { label: 'Admin Users', value: info.adminUsers, total: info.totalUsers, color: '#f59e0b' },
    ] : [];

    const filters = [
        { value: 'all', label: 'All Time' },
        { value: '1d', label: '1 Day' },
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '1 Month' },
    ];

    return (
        <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#fff' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                .stat-card {
                    background: rgba(255,255,255,0.04);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px;
                    padding: 22px;
                    transition: all 0.25s ease;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.25);
                }

                .stat-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(99,102,241,0.35);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 18px;
                    margin-bottom: 32px;
                }

                .refresh-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(99,102,241,0.25);
                    background: rgba(99,102,241,0.08);
                    color: #c7d2fe;
                    cursor: pointer;
                }

                .filter-group {
                    display: flex;
                    gap: 10px;
                    padding: 6px;
                    width: fit-content;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 14px;
                    margin-bottom: 28px;
                }

                .filter-btn {
                    border: none;
                    outline: none;
                    background: transparent;
                    color: #71717a;
                    padding: 10px 16px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    font-family: 'Inter', sans-serif;
                }

                .filter-btn:hover {
                    color: #fff;
                    background: rgba(255,255,255,0.04);
                }

                .filter-btn.active {
                    background: linear-gradient(
                        135deg,
                        rgba(99,102,241,0.18),
                        rgba(139,92,246,0.18)
                    );
                    color: #fff;
                    border: 1px solid rgba(99,102,241,0.25);
                    box-shadow: 0 4px 14px rgba(99,102,241,0.15);
                }
                .spinner { width: 36px; height: 36px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
            `}</style>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px' }}>
                {/* Header */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                    // admin panel
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Dashboard</h1>
                    <button onClick={fetchInfo}
                        style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                        ↻ Refresh
                    </button>
                </div>
                <div className="filter-group">
                    {filters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setTimeFilter(filter.value)}
                            className={`filter-btn ${timeFilter === filter.value ? 'active' : ''}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <>
                        {/* Stat cards */}
                        <div className="stats-grid">
                            {STATS.map((s) => {
                                const Icon = s.icon;

                                return (
                                    <div key={s.label} className="stat-card">
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 18
                                        }}>
                                            <div style={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 12,
                                                background: `${s.color}15`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Icon size={20} color={s.color} />
                                            </div>
                                        </div>

                                        <div style={{
                                            fontSize: 12,
                                            color: '#71717a',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            marginBottom: 8
                                        }}>
                                            {s.label}
                                        </div>

                                        <div style={{
                                            fontSize: 30,
                                            fontWeight: 800,
                                            color: '#fff'
                                        }}>
                                            {s.value}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}