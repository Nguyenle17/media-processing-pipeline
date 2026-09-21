import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useEffect, useContext } from "react";
import Api from "../api/Api";

export default function OAuth2Success() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      try {
        const accessToken = await Api.refreshToken();

        if (!accessToken) {
          throw new Error("No access token returned");
        }

        if (!mounted) return;

        login(accessToken);
        navigate("/", { replace: true });
      } catch (err) {
        console.error("OAuth callback error:", err);

        if (!mounted) return;

        navigate("/login?error=google_auth_failed", {
          replace: true,
        });
      }
    };

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [login, navigate]);

  return <div>Logging in...</div>;
}
