import unittest

from app import create_app
from app.config import Settings


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app(Settings(service_token="test-token")).test_client()

    def test_health_requires_token(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": "Unauthorized"})

    def test_health_accepts_valid_token(self):
        response = self.client.get(
            "/health", headers={"X-AI-Service-Token": "test-token"}
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn("device", payload)
        self.assertIn("whisper_loaded", payload)

    def test_missing_token_config_fails_closed(self):
        client = create_app(Settings(service_token=None)).test_client()
        response = client.get("/health", headers={"X-AI-Service-Token": ""})
        self.assertEqual(response.status_code, 500)


if __name__ == "__main__":
    unittest.main()
