import { useEffect, useState } from "react";
import Api from "../api/Api";

type User = {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActivate: boolean;
};

type PaginationInfo = {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
};

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, totalPages: 1, page: 1, limit: 10 });
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'admin'>('all');

    // Fetch khi page thay đổi
    useEffect(() => {
        if (!search) fetchUsers(page);
    }, [page]);

    // Debounce search
    useEffect(() => {
        if (searchTimeout) clearTimeout(searchTimeout);
        if (!search) { fetchUsers(1); setPage(1); return; }

        const t = setTimeout(() => searchUsers(), 400);
        setSearchTimeout(t);
        return () => clearTimeout(t);
    }, [search]);

    const fetchUsers = async (currentPage: number) => {
        setLoading(true);
        try {
            const data = await Api.get(`/admin/users?page=${currentPage}&limit=${limit}`);
            setUsers(data.users.map((u: any) => ({
                _id: u._id, name: u.name, email: u.email,
                role: u.role, isActivate: u.isActivate,
            })));
            setPagination({
                total: data.total,
                totalPages: data.totalPages,
                page: data.page,
                limit: data.limit,
            });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const searchUsers = async () => {
        setLoading(true);
        try {
            const data = await Api.get(`/admin/users/search/${encodeURIComponent(search)}`);
            setUsers(data.map((u: any) => ({
                _id: u._id, name: u.name, email: u.email,
                role: u.role, isActivate: u.isActivate,
            })));

            setPagination(prev => ({ ...prev, totalPages: 1, page: 1 }));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const deleteUser = async (id: string) => {
        if (!confirm("Delete this user?")) return;
        setActionLoading(id);
        try {
            await Api.delete(`/admin/user/${id}`);
            setUsers(prev => prev.filter(u => u._id !== id));
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const toggleBan = async (user: User) => {
        setActionLoading(user._id);
        try {
            await Api.patch(`/admin/user/${user._id}/${user.isActivate ? 'ban' : 'unban'}`, {});
            setUsers(prev => prev.map(u =>
                u._id === user._id ? { ...u, isActivate: !u.isActivate } : u
            ));
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const filtered = users.filter(u => {
        if (filter === 'active') return u.isActivate;
        if (filter === 'banned') return !u.isActivate;
        if (filter === 'admin')  return u.role === 'admin';
        return true;
    });

    const counts = {
        all:    users.length,
        active: users.filter(u => u.isActivate).length,
        banned: users.filter(u => !u.isActivate).length,
        admin:  users.filter(u => u.role === 'admin').length,
    };

    // Page range
    const pageRange = () => {
        const delta = 2;
        const start = Math.max(1, page - delta);
        const end   = Math.min(pagination.totalPages, page + delta);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    return (
        <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Syne', sans-serif", color: '#fff' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                .filter-btn { padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'JetBrains Mono', monospace; transition: all 0.15s; border: 1px solid; }
                .filter-btn.active { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
                .filter-btn:not(.active) { background: transparent; border-color: rgba(255,255,255,0.08); color: #52525b; }
                .table { width: 100%; border-collapse: collapse; }
                .table th { padding: 11px 16px; text-align: left; font-size: 10px; color: #52525b; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .table td { padding: 13px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
                .table tbody tr:hover td { background: rgba(255,255,255,0.02); }
                .badge { padding: 3px 9px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
                .action-btn { padding: 5px 11px; border-radius: 7px; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; border: 1px solid; transition: all 0.15s; font-weight: 500; }
                .action-btn:hover { opacity: 0.8; }
                .page-btn { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-family: 'JetBrains Mono', monospace; cursor: pointer; border: 1px solid; transition: all 0.15s; }
                .page-btn.active { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
                .page-btn:not(.active) { background: transparent; border-color: rgba(255,255,255,0.08); color: #71717a; }
                .page-btn:not(.active):hover { border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
                .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .spinner-sm { border: 2px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
                .search-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #fff; font-size: 13px; font-family: 'JetBrains Mono', monospace; outline: none; transition: border-color 0.2s; width: 280px; }
                .search-input:focus { border-color: rgba(99,102,241,0.4); }
                .search-input::placeholder { color: #3f3f46; }
                .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
            `}</style>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px' }}>
                {/* Header */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                    // admin panel
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>User Management</h1>
                        <p style={{ fontSize: 13, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                            {pagination.total} total users
                        </p>
                    </div>
                    <button onClick={() => fetchUsers(page)}
                        style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                        ↻ Refresh
                    </button>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {([
                            { key: 'all',    label: `All (${counts.all})` },
                            { key: 'active', label: `Active (${counts.active})` },
                            { key: 'banned', label: `Banned (${counts.banned})` },
                            { key: 'admin',  label: `Admin (${counts.admin})` },
                        ] as const).map(f => (
                            <button key={f.key}
                                className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                                onClick={() => setFilter(f.key)}
                            >{f.label}</button>
                        ))}
                    </div>
                    <input
                        className="search-input"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <div className="spinner-sm" style={{ width: 32, height: 32 }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                            no users found
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const isLoading = actionLoading === u._id;
                                    const avatarColor = u.role === 'admin' ? '#f59e0b' : '#6366f1';
                                    return (
                                        <tr key={u._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div className="avatar" style={{ background: `${avatarColor}20`, color: avatarColor }}>
                                                        {u.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{u.email}</td>
                                            <td>
                                                <span className="badge" style={{
                                                    background: u.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.12)',
                                                    color: u.role === 'admin' ? '#fcd34d' : '#a5b4fc',
                                                }}>{u.role}</span>
                                            </td>
                                            <td>
                                                <span className="badge" style={{
                                                    background: u.isActivate ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                    color: u.isActivate ? '#6ee7b7' : '#fca5a5',
                                                }}>
                                                    {u.isActivate ? '● Active' : '● Banned'}
                                                </span>
                                            </td>
                                            <td>
                                                {isLoading ? (
                                                    <div className="spinner-sm" style={{ width: 18, height: 18 }} />
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="action-btn" onClick={() => toggleBan(u)}
                                                            style={{
                                                                background: u.isActivate ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                borderColor: u.isActivate ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                                                                color: u.isActivate ? '#fca5a5' : '#6ee7b7',
                                                            }}>
                                                            {u.isActivate ? ' Ban ' : ' Unban '}
                                                        </button>
                                                        <button className="action-btn" onClick={() => deleteUser(u._id)}
                                                            style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}>
                                                            🗑 Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination + footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <span style={{ fontSize: 12, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>
                        showing {filtered.length} / {pagination.total} users
                    </span>

                    {/* Pagination */}
                    {!search && pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button className="page-btn"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >←</button>

                            {pageRange().map(p => (
                                <button key={p}
                                    className={`page-btn ${page === p ? 'active' : ''}`}
                                    onClick={() => setPage(p)}
                                >{p}</button>
                            ))}

                            <button className="page-btn"
                                disabled={page === pagination.totalPages}
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            >→</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}