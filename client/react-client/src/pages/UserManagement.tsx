import { useEffect, useState } from "react";
import { AlertCircle, Ban, RefreshCw, Trash2, UserCheck } from "lucide-react";
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
            setPagination({
                total: data.total,
                totalPages: data.totalPages,
                page: data.page,
                limit: data.limit,
            });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Could not load users.');
        } finally { setLoading(false); }
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
        } finally { setLoading(false); }
    };

    const deleteUser = async (id: string) => {
        setActionLoading(id);
        setDeleteModal(null);
        try {
            await Api.delete(`/admin/user/${id}`);
            setUsers(prev => prev.filter(u => u._id !== id));
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Could not delete this user.');
        } finally { setActionLoading(null); }
    };

    const toggleBan = async (user: User) => {
        setActionLoading(user._id);
        try {
            await Api.patch(`/admin/user/${user._id}/${user.isActivate ? 'ban' : 'unban'}`, {});
            setUsers(prev => prev.map(u =>
                u._id === user._id ? { ...u, isActivate: !u.isActivate } : u
            ));
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Could not update this user.');
        } finally { setActionLoading(null); }
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
        <div className="vs-page fade-in">
            <Modal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                title="Delete user"
                description="This user account will be permanently deleted. This action cannot be undone."
                onConfirm={() => deleteModal && deleteUser(deleteModal)}
                confirmText="Delete"
                danger={true}
            />

            <div className="vs-container">
                <div className="vs-page-head">
                    <div className="vs-page-head__text">
                        <span className="vs-page-kicker">Admin</span>
                        <h1 className="vs-page-title">User management</h1>
                        <p className="vs-page-desc">{pagination.total} total users in this workspace.</p>
                    </div>
                    <button onClick={() => fetchUsers(page)} className="vs-btn vs-btn--secondary">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className="vs-toolbar">
                    <div className="vs-filter-group" role="group" aria-label="Filter users">
                        {([
                            { key: 'all',    label: `All (${counts.all})` },
                            { key: 'active', label: `Active (${counts.active})` },
                            { key: 'banned', label: `Banned (${counts.banned})` },
                            { key: 'admin',  label: `Admin (${counts.admin})` },
                        ] as const).map(f => (
                            <button key={f.key}
                                className={`vs-filter-btn ${filter === f.key ? 'active' : ''}`}
                                onClick={() => setFilter(f.key)}
                                aria-pressed={filter === f.key}
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
                            <UserCheck size={28} />
                            <p>No users match these filters.</p>
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
                                                        <button className={`vs-btn vs-btn--sm ${u.isActivate ? 'vs-btn--danger' : 'vs-btn--success'}`} onClick={() => toggleBan(u)}>
                                                            {u.isActivate ? <><Ban size={13} /> Ban</> : <><UserCheck size={13} /> Unban</>}
                                                        </button>
                                                        <button className="vs-btn vs-btn--danger vs-btn--sm" onClick={() => setDeleteModal(u._id)}>
                                                            <Trash2 size={13} /> Delete
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
