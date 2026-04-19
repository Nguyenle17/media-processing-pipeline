const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class Api {
    constructor() {
        this.token = localStorage.getItem("token") || null;
        this.BASE_URL = BASE_URL;
    }

    setToken(token) {
        this.token = token;
    }

    setLogoutCallback(callback) {
        this.onLogout = callback;
    }

    async refreshToken() {
        try {
            const response = await fetch(this.BASE_URL + '/auth/refresh', {
                method: 'POST',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Refresh failed');
            const result = await response.json();
            this.token = result.accessToken;
            console.log('Token refreshed:', this.token);
            localStorage.setItem("token", result.accessToken);
            return result.accessToken;
        } catch (error) {
            this.token = null;
            localStorage.removeItem("token");
            if (this.onLogout) this.onLogout();
            throw error;
        }
    }

    async get(ENDPOINT) {
        const response = await fetch(this.BASE_URL + ENDPOINT, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        if (response.status === 401) {
            await this.refreshToken();
            return this.get(ENDPOINT);
        }

        if (!response.ok) throw new Error(`GET ${ENDPOINT} failed: ${response.status}`);
        return response.json();
    }

    async post(ENDPOINT, DATA, HEADERS = 'application/json') {
        const isFormData = DATA instanceof FormData;

        const response = await fetch(this.BASE_URL + ENDPOINT, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                ...(!isFormData && { 'Content-Type': HEADERS }),
            },
            body: isFormData ? DATA : JSON.stringify(DATA),
        });

        if (response.status === 401) {
            await this.refreshToken();
            return this.post(ENDPOINT, DATA, HEADERS);
        }

        if (!response.ok) throw new Error(`POST ${ENDPOINT} failed: ${response.status}`);
        return response.json();
    }

    async put(ENDPOINT, DATA) {
        const isFormData = DATA instanceof FormData;

        const response = await fetch(this.BASE_URL + ENDPOINT, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                ...(!isFormData && { 'Content-Type': 'application/json' }),
            },
            body: isFormData ? DATA : JSON.stringify(DATA),
        });

        if (response.status === 401) {
            await this.refreshToken();
            return this.put(ENDPOINT, DATA);
        }

        if (!response.ok) throw new Error(`PUT ${ENDPOINT} failed: ${response.status}`);
        return response.json();
    }

    async delete(ENDPOINT) {
        const response = await fetch(this.BASE_URL + ENDPOINT, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        if (response.status === 401) {
            await this.refreshToken();
            return this.delete(ENDPOINT);
        }

        if (!response.ok) throw new Error(`DELETE ${ENDPOINT} failed: ${response.status}`);
        return response.json();
    }
}

export default new Api();