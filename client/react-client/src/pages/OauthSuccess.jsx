import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useEffect, useContext } from "react";

export default function OAuth2Success() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        const data = await res.json();

        if (data.accessToken) {
          login(data.accessToken);
        }

        navigate('/');
      } catch (err) {
        console.error(err);
        navigate('/login');
      }
    }

    fetchToken();
  }, []);

  return <div>Logging in...</div>;
}