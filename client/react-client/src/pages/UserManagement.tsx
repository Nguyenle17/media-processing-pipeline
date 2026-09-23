import { useEffect, useState } from "react";
import Api from "../api/Api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Pagination from "../components/common/Pagination";
import Modal from "../components/common/Modal";

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
    const [deleteModal, setDeleteModal] = useState<string | null>(null);

    useEffect(() => {
        if (!search) fetchUsers(page);
    }, [page]);

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
        setActionLoading(id);
        setDeleteModal(null);
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

    return (
        <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Syne', sans-serif", color: '#fff' }}>
            <style>{`
                .action-btn { padding: 5px 11px; border-radius: 7px; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; border: 1px solid; transition: all 0.15s; font-weight: 500; }
                .action-btn:hover { opacity: 0.8; }
            `}</style>

            <Modal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                title="Delete User"
                description="Are you sure you want to delete this user? This action cannot be undone."
                onConfirm={() => deleteModal && deleteUser(deleteModal)}
                confirmText="Delete"
                danger={true}
            />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px' }}>
                <p className="vs-section-label">
                    // admin panel
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                    <div>
                        <h1 className="vs-section-title">User Management</h1>
                        <p style={{ fontSize: 13, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                            {pagination.total} total users
                        </p>
                    </div>
                    <button onClick={() => fetchUsers(page)} className="vs-btn vs-btn--ghost">
                        ↻ Refresh
                    </button>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div className="vs-filter-group" style={{ margin: 0 }}>
                        {([
                            { key: 'all',    label: `All (${counts.all})` },
                            { key: 'active', label: `Active (${counts.active})` },
                            { key: 'banned', label: `Banned (${counts.banned})` },
                            { key: 'admin',  label: `Admin (${counts.admin})` },
                        ] as const).map(f => (
                            <button key={f.key}
                                className={`vs-filter-btn ${filter === f.key ? 'active' : ''}`}
                                onClick={() => setFilter(f.key)}
                            >{f.label}</button>
                        ))}
                    </div>
                    <input
                        className="vs-search-input"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <LoadingSpinner size={32} color="#6366f1" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                            no users found
                        </div>
                    ) : (
                        <table className="vs-table">
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
                                                    <div className="vs-avatar" style={{ background: `${avatarColor}20`, color: avatarColor }}>
                                                        {u.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{u.email}</td>
                                            <td>
                                                <span className="vs-badge" style={{
                                                    background: u.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.12)',
                                                    color: u.role === 'admin' ? '#fcd34d' : '#a5b4fc',
                                                }}>{u.role}</span>
                                            </td>
                                            <td>
                                                <span className="vs-badge" style={{
                                                    background: u.isActivate ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                    color: u.isActivate ? '#6ee7b7' : '#fca5a5',
                                                }}>
                                                    {u.isActivate ? '● Active' : '● Banned'}
                                                </span>
                                            </td>
                                            <td>
                                                {isLoading ? (
                                                    <LoadingSpinner size={18} color="#6366f1" />
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
                                                        <button className="action-btn" onClick={() => setDeleteModal(u._id)}
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

                    {!search && pagination.totalPages > 1 && (
                        <Pagination 
                            page={page} 
                            totalPages={pagination.totalPages} 
                            onPageChange={setPage} 
                            delta={2} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
}