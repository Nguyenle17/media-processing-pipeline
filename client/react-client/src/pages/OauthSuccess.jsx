import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuth2Success() {
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        const data = await res.json();

        if (data.accessToken) {
          localStorage.setItem('token', data.accessToken);
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