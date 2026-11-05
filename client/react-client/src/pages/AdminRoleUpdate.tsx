import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, RefreshCw, Shield, User } from "lucide-react";
import Api from "../api/Api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Pagination from "../components/common/Pagination";
import Modal from "../components/common/Modal";
import SearchInput from "../components/common/SearchInput";

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

const roleMeta: Record<Role, { label: string; icon: typeof Shield }> = {
    user: { label: 'User', icon: User },
    admin: { label: 'Admin', icon: Shield },
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
    const [error, setError] = useState<string | null>(null);

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
        setError(null);
        try {
            const data = await Api.get(`/admin/users?page=${currentPage}&limit=${limit}`);
            setUsers(data.users.map((u: any) => ({
                _id: u._id, name: u.name, email: u.email,
                role: u.role, isActivate: u.isActivate,
            })));
            setPagination({ total: data.total, totalPages: data.totalPages, page: data.page, limit: data.limit });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Could not load users.');
        }
        finally { setLoading(false); }
    };

    const searchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await Api.get(`/admin/users/search/${encodeURIComponent(search)}`);
            setUsers(data.map((u: any) => ({
                _id: u._id, name: u.name, email: u.email,
                role: u.role, isActivate: u.isActivate,
            })));
            setPagination(prev => ({ ...prev, totalPages: 1, page: 1 }));
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Search failed.');
        }
        finally { setLoading(false); }
    };

    const updateRole = async (user: User, newRole: Role) => {
        setActionLoading(user._id);
        setConfirmModal(null);
        setError(null);

        try {
            await Api.patch(`/admin/user/${user._id}/role`, { role: newRole });
            setUsers(prev =>
                prev.map(u =>
                    u._id === user._id ? { ...u, role: newRole } : u
                )
            );
        } catch (err) {
            console.error("update role error:", err);
            setError(err instanceof Error ? err.message : 'Could not update this user\'s role.');
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
        <div className="vs-page fade-in">
            <Modal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                title="Change role"
                description={confirmModal ? (
                    <>
                        Change <strong style={{ color: 'var(--vs-text)' }}>{confirmModal.user.name}</strong>'s role from{' '}
                        <span className={`vs-badge ${confirmModal.user.role === 'admin' ? 'vs-badge--warning' : 'vs-badge--accent'}`}>
                            {confirmModal.user.role}
                        </span>{' '}to{' '}
                        <span className={`vs-badge ${confirmModal.newRole === 'admin' ? 'vs-badge--warning' : 'vs-badge--accent'}`}>
                            {confirmModal.newRole}
                        </span>?
                        {confirmModal.newRole === 'admin' && (
                            <span className="vs-form-notice" style={{ display: 'flex', marginTop: 12 }}>
                                <AlertTriangle size={15} style={{ flexShrink: 0 }} /> This user will have full admin access.
                            </span>
                        )}
                    </>
                ) : ""}
                onConfirm={() => confirmModal && updateRole(confirmModal.user, confirmModal.newRole)}
                confirmText="Confirm"
            />

            <div className="vs-container">
                <div className="vs-page-head">
                    <div className="vs-page-head__text">
                        <span className="vs-page-kicker">Admin</span>
                        <h1 className="vs-page-title">Role management</h1>
                        <p className="vs-page-desc">
                            {pagination.total} total users · {counts.admin} admins · {counts.user} users
                        </p>
                    </div>
                    <button onClick={() => fetchUsers(page)} className="vs-btn vs-btn--secondary">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className="vs-toolbar">
                    <div className="vs-filter-group" role="group" aria-label="Filter by role">
                        {([
                            { key: 'all', label: `All (${counts.all})` },
                            { key: 'user', label: `Users (${counts.user})` },
                            { key: 'admin', label: `Admins (${counts.admin})` },
                        ] as const).map(f => (
                            <button key={f.key}
                                className={`vs-filter-btn ${filterRole === f.key ? 'active' : ''}`}
                                onClick={() => setFilterRole(f.key)}
                                aria-pressed={filterRole === f.key}
                            >{f.label}</button>
                        ))}
                    </div>
                    <SearchInput
                        placeholder="Search name or email…"
                        value={search}
                        onChange={setSearch}
                    />
                </div>

                {error && <div className="vs-error-banner" role="alert"><AlertCircle size={15} /> {error}</div>}

                <div className="vs-table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <LoadingSpinner size={30} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="vs-empty">
                            <Shield size={28} />
                            <p>No users match these filters.</p>
                        </div>
                    ) : (
                        <table className="vs-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Current role</th>
                                    <th>Status</th>
                                    <th>Change role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const isLoading = actionLoading === u._id;
                                    return (
                                        <tr key={u._id}>
                                            <td>
                                                <div className="vs-table-user">
                                                    <div className="vs-avatar">
                                                        {u.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span>{u.name}</span>
                                                </div>
                                            </td>

                                            <td className="vs-table-email">{u.email}</td>

                                            <td>
                                                <span className={`vs-badge ${u.role === 'admin' ? 'vs-badge--warning' : 'vs-badge--accent'}`}>
                                                    {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                                                    {u.role}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={`vs-badge ${u.isActivate ? 'vs-badge--success' : 'vs-badge--danger'}`}>
                                                    <span className="vs-status-dot" />
                                                    {u.isActivate ? 'Active' : 'Banned'}
                                                </span>
                                            </td>

                                            <td>
                                                {isLoading ? (
                                                    <LoadingSpinner size={18} />
                                                ) : (
                                                    <div className="vs-inline-actions-row">
                                                        {ROLES.map(role => {
                                                            const MetaIcon = roleMeta[role].icon;
                                                            const isCurrent = u.role === role;
                                                            return (
                                                                <button key={role}
                                                                    className="vs-btn vs-btn--ghost vs-btn--sm"
                                                                    disabled={isCurrent}
                                                                    onClick={() => setConfirmModal({ user: u, newRole: role })}
                                                                    aria-label={`Change ${u.name}'s role to ${role}`}>
                                                                    <MetaIcon size={13} />
                                                                    {isCurrent ? 'Current' : roleMeta[role].label}
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

                <div className="vs-table-footer">
                    <span>Showing {filtered.length} of {pagination.total} users</span>

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
