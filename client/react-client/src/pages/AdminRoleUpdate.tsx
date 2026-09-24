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

    return (
        <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Syne', sans-serif", color: '#fff' }}>
            <style>{`
                .role-btn { padding: 5px 12px; border-radius: 7px; font-size: 11px; font-family: 'Inter', 'Segoe UI', sans-serif; cursor: pointer; border: 1px solid; transition: all 0.15s; font-weight: 500; }
                .role-btn:hover { opacity: 0.8; transform: translateY(-1px); }
                .role-btn.current { opacity: 0.4; cursor: default; transform: none !important; }
            `}</style>

            <Modal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                title="Change Role"
                description={confirmModal ? (
                    <>
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
                    </>
                ) : ""}
                onConfirm={() => confirmModal && updateRole(confirmModal.user, confirmModal.newRole)}
                confirmText="Confirm"
            />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px' }}>
                <p className="vs-section-label">
                    // admin panel
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                    <div>
                        <h1 className="vs-section-title">Role Management</h1>
                        <p style={{ fontSize: 13, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                            {pagination.total} total users · {counts.admin} admins · {counts.user} users
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
                            { key: 'all', label: `All (${counts.all})` },
                            { key: 'user', label: `Users (${counts.user})` },
                            { key: 'admin', label: `Admins (${counts.admin})` },
                        ] as const).map(f => (
                            <button key={f.key}
                                className={`vs-filter-btn ${filterRole === f.key ? 'active' : ''}`}
                                onClick={() => setFilterRole(f.key)}
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
                                                    <div className="vs-avatar" style={{ background: `${avatarColor}20`, color: avatarColor }}>
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
                                                <span className="vs-badge" style={{ background: cfg.bg, color: cfg.color }}>
                                                    {u.role}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td>
                                                <span className="vs-badge" style={{
                                                    background: u.isActivate ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                    color: u.isActivate ? '#6ee7b7' : '#fca5a5',
                                                }}>
                                                    {u.isActivate ? '● Active' : '● Banned'}
                                                </span>
                                            </td>

                                            {/* Role buttons */}
                                            <td>
                                                {isLoading ? (
                                                    <LoadingSpinner size={18} color="#6366f1" />
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {ROLES.map(role => {
                                                            const isCurrent = u.role === role;
                                                            const rc = roleConfig[role];
                                                            return (
                                                                <button key={role}
                                                                    className={`role-btn ${isCurrent ? 'current' : ''}`}
                                                                    disabled={isCurrent}
                                                                    onClick={() => setConfirmModal({ user: u, newRole: role })}
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
