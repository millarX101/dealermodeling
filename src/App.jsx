import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Estimator from './pages/Estimator'

// Set to false to require Supabase login, true to skip auth for dev testing
const DEV_BYPASS_AUTH = false

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              DEV_BYPASS_AUTH
                ? <Estimator />
                : <ProtectedRoute><Estimator /></ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
