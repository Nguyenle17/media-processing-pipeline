import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Translate from '../pages/Translate'
import Summary from '../pages/Summary'
import ExtractAudio from '../pages/ExtractAudio'
import History from '../pages/History'
import OAuth2Success from '../pages/OauthSuccess'
import Settings from '../pages/Settings'

export default function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/translate" element={<Translate />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/extract-audio" element={<ExtractAudio />} />
        <Route path="/history" element={<History />} />
        <Route path="/oauth2/success" element={<OAuth2Success />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
