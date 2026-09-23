import { Routes, Route } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Translate from '../pages/Translate'
import ExtractAudio from '../pages/ExtractAudio'
import History from '../pages/History'
import OAuthSuccess from '../pages/OauthSuccess'
import Settings from '../pages/Settings'
import Dashboard from '../pages/DashBoard'
import UserManagement from '../pages/UserManagement'
import AdminRoleUpdate from '../pages/AdminRoleUpdate'
import ProtectedRoute from '../components/auth/ProtectedRoute'

export default function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/translate" element={<Translate />} />
        <Route path="/extract-audio" element={<ExtractAudio />} />
        <Route path="/history" element={<History />} />
        <Route path="/auth/callback" element={<OAuthSuccess />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/users-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin-role-update" element={<ProtectedRoute allowedRoles={['admin']}><AdminRoleUpdate /></ProtectedRoute>} />
      </Routes>
    </Layout>
  )
}
