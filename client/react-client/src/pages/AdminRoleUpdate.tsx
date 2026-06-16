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

const ROLES = ['user', 'admin'] as const;
type Role = typeof ROLES[number];

const roleConfig: Record<Role, { color: string; bg: string; border: string }> = {
    user: { color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
    admin: { color: '#fcd34d', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
};

export default function AdminRoleUpdate() {
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, totalPages: 1, page: 1, limit: 10 });
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filterRole, setFilterRole] = useState<'all' | Role>('all');
    const [confirmModal, setConfirmModal] = useState<{ user: User; newRole: Role } | null>(null);

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
            setPagination({ total: data.total, totalPages: data.totalPages, page: data.page, limit: data.limit });
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

    const updateRole = async (user: User, newRole: Role) => {
        console.log("Updating role for user:", user._id, "to role:", newRole);
        setActionLoading(user._id);
        setConfirmModal(null);

        try {
            const res = await Api.patch(`/admin/user/${user._id}/role`, { role: newRole });
            console.log("role updated:", res);

            setUsers(prev =>
                prev.map(u =>
                    u._id === user._id ? { ...u, role: newRole } : u
                )
            );
        } catch (err) {
            console.error("update role error:", err);
            alert("Update role failed");
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = users.filter(u =>
        filterRole === 'all' ? true : u.role === filterRole
    );

    const counts = {
        all: users.length,
        user: users.filter(u => u.role === 'user').length,
        admin: users.filter(u => u.role === 'admin').length,
    };

    const pageRange = () => {
        const delta = 2;
        const start = Math.max(1, page - delta);
        const end = Math.min(pagination.totalPages, page + delta);
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
                .role-btn { padding: 5px 12px; border-radius: 7px; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; border: 1px solid; transition: all 0.15s; font-weight: 500; }
                .role-btn:hover { opacity: 0.8; transform: translateY(-1px); }
                .role-btn.current { opacity: 0.4; cursor: default; transform: none !important; }
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

                /* Modal */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
                .modal { background: #111118; border: 1px solid rgba(99,102,241,0.2); border-radius: 16px; padding: 28px; width: 360px; }
                .modal-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
                .modal-desc { font-size: 13px; color: #71717a; font-family: 'JetBrains Mono', monospace; margin-bottom: 24px; line-height: 1.6; }
                .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
                .modal-btn { padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Syne', sans-serif; border: 1px solid; transition: all 0.15s; }
            `}</style>

            {/* Confirm Modal */}
            {confirmModal && (
                <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Change Role</div>
                        <div className="modal-desc">
                            Change <strong style={{ color: '#fff' }}>{confirmModal.user.name}</strong>'s role from{' '}
                            <span style={{ color: roleConfig[confirmModal.user.role as Role]?.color || '#a5b4fc' }}>
                                {confirmModal.user.role}
                            </span>{' '}→{' '}
                            <span style={{ color: roleConfig[confirmModal.newRole].color }}>
                                {confirmModal.newRole}
                            </span>?
                            {confirmModal.newRole === 'admin' && (
                                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: '#fcd34d', fontSize: 12 }}>
                                    ⚠ This user will have full admin access.
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="modal-btn"
                                onClick={() => setConfirmModal(null)}
                                style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#71717a' }}>
                                Cancel
                            </button>
                            <button className="modal-btn"
                                onClick={() => updateRole(confirmModal.user, confirmModal.newRole)}
                                style={{
                                    background: roleConfig[confirmModal.newRole].bg,
                                    borderColor: roleConfig[confirmModal.newRole].border,
                                    color: roleConfig[confirmModal.newRole].color,
                                }}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px' }}>
                {/* Header */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                    // admin panel
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>Role Management</h1>
                        <p style={{ fontSize: 13, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                            {pagination.total} total users · {counts.admin} admins · {counts.user} users
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
                            { key: 'all', label: `All (${counts.all})` },
                            { key: 'user', label: `Users (${counts.user})` },
                            { key: 'admin', label: `Admins (${counts.admin})` },
                        ] as const).map(f => (
                            <button key={f.key}
                                className={`filter-btn ${filterRole === f.key ? 'active' : ''}`}
                                onClick={() => setFilterRole(f.key)}
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
                                    <th>Current Role</th>
                                    <th>Status</th>
                                    <th>Change Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const isLoading = actionLoading === u._id;
                                    const avatarColor = u.role === 'admin' ? '#f59e0b' : '#6366f1';
                                    const cfg = roleConfig[u.role as Role] ?? roleConfig.user;

                                    return (
                                        <tr key={u._id}>
                                            {/* User */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div className="avatar" style={{ background: `${avatarColor}20`, color: avatarColor }}>
                                                        {u.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td style={{ color: '#71717a', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                                                {u.email}
                                            </td>

                                            {/* Current role */}
                                            <td>
                                                <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
                                                    {u.role === 'admin' ? '' : ''} {u.role}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td>
                                                <span className="badge" style={{
                                                    background: u.isActivate ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                    color: u.isActivate ? '#6ee7b7' : '#fca5a5',
                                                }}>
                                                    {u.isActivate ? '● Active' : '● Banned'}
                                                </span>
                                            </td>

                                            {/* Role buttons */}
                                            <td>
                                                {isLoading ? (
                                                    <div className="spinner-sm" style={{ width: 18, height: 18 }} />
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {ROLES.map(role => {
                                                            const isCurrent = u.role === role;
                                                            const rc = roleConfig[role];
                                                            return (
                                                                <button key={role}
                                                                    className={`role-btn ${isCurrent ? 'current' : ''}`}
                                                                    disabled={isCurrent}
                                                                    onClick={() => updateRole(u, role)}
                                                                    style={{
                                                                        background: isCurrent ? rc.bg : 'transparent',
                                                                        borderColor: isCurrent ? rc.border : 'rgba(255,255,255,0.1)',
                                                                        color: isCurrent ? rc.color : '#52525b',
                                                                    }}>
                                                                    {isCurrent ? ' ' : ''}{role}
                                                                </button>
                                                            );
                                                        })}
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
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button className="page-btn" disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}>←</button>

                            {pageRange().map(p => (
                                <button key={p}
                                    className={`page-btn ${page === p ? 'active' : ''}`}
                                    onClick={() => setPage(p)}>{p}</button>
                            ))}

                            <button className="page-btn" disabled={page === pagination.totalPages}
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}>→</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}