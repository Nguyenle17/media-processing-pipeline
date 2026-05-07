import { createContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import Api from "../api/Api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const refreshTimerRef = useRef(null);

    const scheduleRefresh = (accessToken) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        try {
            const decoded = jwtDecode(accessToken);
            if (!decoded.exp) return;

            const expiresIn = decoded.exp * 1000 - Date.now();
            const refreshIn = expiresIn - 60 * 1000;

            if (refreshIn <= 0) {
                silentRefresh();
                return;
            }

            console.log(`Token refresh scheduled in ${Math.round(refreshIn / 1000)}s`);
            refreshTimerRef.current = setTimeout(() => silentRefresh(), refreshIn);
        } catch {
            silentRefresh();
        }
    };

    const silentRefresh = async () => {
        try {
            const newToken = await Api.refreshToken();
            setToken(newToken);
            Api.setToken(newToken);
            const decoded = jwtDecode(newToken);
            setUser(decoded);
            scheduleRefresh(newToken);
        } catch {
            setToken(null);
            setUser(null);
            Api.setToken(null);
        }
    };

    useEffect(() => {
        const run = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;

                    if (decoded.exp && decoded.exp < currentTime) {
                        await silentRefresh();
                    } else {
                        setUser(decoded);
                        Api.setToken(token);
                        localStorage.setItem("settings", decoded.settings || 'tiny');
                        scheduleRefresh(token);
                    }
                } catch {
                    localStorage.removeItem("token");
                    localStorage.removeItem("settings");
                    setToken(null);
                    setUser(null);
                    Api.setToken(null);
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        };

        run();
    }, []);

    const login = (newToken) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        Api.setToken(newToken);

        const decoded = jwtDecode(newToken);
        setUser(decoded);
        scheduleRefresh(newToken);
    };

    const logout = async () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        const hasToken = localStorage.getItem("token");

        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        Api.setToken(null);

        if (hasToken) {
            try {
                await Api.post('/auth/logout', {});
            } catch { }
        }
    };
    if (loading) return null;

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};