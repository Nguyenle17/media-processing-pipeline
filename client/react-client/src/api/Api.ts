const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type RequestInitWithBody = RequestInit & { body?: BodyInit | null };

class Api {
    token: string | null = null;
    readonly BASE_URL = BASE_URL;
    private refreshPromise: Promise<string> | null = null;
    private onLogout?: () => void;

    setToken(token: string | null) { this.token = token; }

    setLogoutCallback(callback: (() => void) | undefined) { this.onLogout = callback; }

    private clearSession() {
        this.token = null;
        this.onLogout?.();
    }

    async refreshToken(): Promise<string> {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            const response = await fetch(`${this.BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            let result: { accessToken?: string } = {};
            try { result = await response.json(); } catch { /* handled below */ }
            if (!response.ok || typeof result.accessToken !== 'string' || !result.accessToken) {
                throw new Error('Session expired');
            }
            this.token = result.accessToken;
            return result.accessToken;
        })().catch((error) => {
            this.clearSession();
            throw error;
        }).finally(() => { this.refreshPromise = null; });

        return this.refreshPromise;
    }

    private async parseResponse<T>(response: Response): Promise<T> {
        const body = await response.text();
        let parsed: unknown;
        if (body) {
            try { parsed = JSON.parse(body); } catch { parsed = body; }
        }
        if (!response.ok) {
            const data = parsed as { message?: string; error?: string } | undefined;
            throw new Error(data?.message || data?.error || `${response.status} ${response.statusText}`);
        }
        return parsed as T;
    }

    private buildInit(init: RequestInitWithBody): RequestInit {
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/json');
        if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
        return { ...init, headers, credentials: 'include' };
    }

    async request<T = any>(endpoint: string, init: RequestInitWithBody = {}, retry = true): Promise<T> {
        const response = await fetch(`${this.BASE_URL}${endpoint}`, this.buildInit(init));
        if (response.status === 401 && retry && this.token && endpoint !== '/auth/refresh') {
            await this.refreshToken();
            return this.request<T>(endpoint, init, false);
        }
        return this.parseResponse<T>(response);
    }

    async raw(endpoint: string, init: RequestInitWithBody = {}, retry = true): Promise<Response> {
        const response = await fetch(`${this.BASE_URL}${endpoint}`, this.buildInit(init));
        if (response.status === 401 && retry && this.token && endpoint !== '/auth/refresh') {
            await this.refreshToken();
            return this.raw(endpoint, init, false);
        }
        if (!response.ok) await this.parseResponse(response);
        return response;
    }

    get<T = any>(endpoint: string) { return this.request<T>(endpoint, { method: 'GET' }); }

    post<T = any>(endpoint: string, data?: any, contentType = 'application/json') {
        const isFormData = data instanceof FormData;
        return this.request<T>(endpoint, {
            method: 'POST',
            headers: !isFormData ? { 'Content-Type': contentType } : undefined,
            body: isFormData ? data : JSON.stringify(data ?? {}),
        });
    }

    put<T = any>(endpoint: string, data?: any) {
        const isFormData = data instanceof FormData;
        return this.request<T>(endpoint, {
            method: 'PUT',
            headers: !isFormData ? { 'Content-Type': 'application/json' } : undefined,
            body: isFormData ? data : JSON.stringify(data ?? {}),
        });
    }

    delete<T = any>(endpoint: string) { return this.request<T>(endpoint, { method: 'DELETE' }); }

    patch<T = any>(endpoint: string, data?: any) {
        const isFormData = data instanceof FormData;
        return this.request<T>(endpoint, {
            method: 'PATCH',
            headers: !isFormData ? { 'Content-Type': 'application/json' } : undefined,
            body: isFormData ? data : JSON.stringify(data ?? {}),
        });
    }
}

export default new Api();
