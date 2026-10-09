import { createContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import Api from "../api/Api";

const DEFAULT_MODEL = 'base';
const SUPPORTED_MODELS = new Set(['tiny', 'base', 'small', 'medium', 'large']);

const normalizeModel = (model: unknown): string =>
    typeof model === 'string' && SUPPORTED_MODELS.has(model) ? model : DEFAULT_MODEL;

export interface JwtPayload {
    exp?: number;
    name?: string;
    email?: string;
    role?: string;
    settings?: string;
    [key: string]: any;
}

export interface AuthContextType {
    token: string | null;
    user: JwtPayload | null;
    login: (token: string) => void;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<JwtPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    const clearSession = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        localStorage.removeItem('settings');
        setToken(null);
        setUser(null);
        Api.setToken(null);
    }, []);

    const syncSettings = async (fallback?: unknown) => {
        try {
            const result = await Api.get('/users/settings');
            const model = normalizeModel(result?.selectedModel || result?.model);
            localStorage.setItem('settings', model);
            setUser((current) => current ? { ...current, settings: model } : current);
        } catch {
            const model = normalizeModel(fallback);
            localStorage.setItem('settings', model);
            setUser((current) => current ? { ...current, settings: model } : current);
        }
    };

    const scheduleRefresh = (accessToken: string) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        try {
            const decoded = jwtDecode<JwtPayload>(accessToken);
            if (!decoded.exp) return;
            const expiresIn = decoded.exp * 1000 - Date.now();
            const refreshIn = expiresIn - 60 * 1000;
            if (refreshIn <= 0) { silentRefresh(); return; }
            refreshTimerRef.current = setTimeout(() => silentRefresh(), refreshIn);
        } catch { silentRefresh(); }
    };

    const silentRefresh = async () => {
        try {
            const newToken = await Api.refreshToken();
            setToken(newToken);
            Api.setToken(newToken);
            const decoded = jwtDecode<JwtPayload>(newToken);
            setUser(decoded);
            await syncSettings(decoded.settings);
            scheduleRefresh(newToken);
        } catch {
            clearSession();
        }
    };

    useEffect(() => {
        Api.setLogoutCallback(clearSession);
        return () => Api.setLogoutCallback(undefined);
    }, [clearSession]);

    useEffect(() => {
        const run = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode<JwtPayload>(token);
                    const currentTime = Date.now() / 1000;
                    if (decoded.exp && decoded.exp < currentTime) {
                        await silentRefresh();
                    } else {
                        setUser(decoded);
                        Api.setToken(token);
                        await syncSettings(decoded.settings);
                        scheduleRefresh(token);
                    }
                } catch {
                    clearSession();
                }
            } else {
                // Rehydrate the in-memory access token from the httpOnly refresh cookie.
                await silentRefresh();
            }
            setLoading(false);
        };
        run();
    }, []);

    const login = (newToken: string) => {
        if (!newToken) throw new Error("Access token is required");
        try {
            const decoded = jwtDecode<JwtPayload>(newToken);
            localStorage.removeItem("settings");
            setToken(newToken); Api.setToken(newToken);
            setUser(decoded);
            void syncSettings(decoded.settings);
            scheduleRefresh(newToken);
        } catch (error) {
            console.error("Invalid access token:", error);
            clearSession();
            throw error;
        }
    };

    const logout = async () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        try { await Api.post('/auth/logout', {}); }
        catch { /* The local session is cleared even if the server is unavailable. */ }
        finally { clearSession(); }
    };

    if (loading) return null;
    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
