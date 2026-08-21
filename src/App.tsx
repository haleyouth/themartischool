import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout'
import { RequireRole } from '@/components/RequireRole'
import { PageLoader } from '@/components/ui/Feedback'

// The public landing page is the entry point, so it loads eagerly.
import LandingPage from '@/pages/public/LandingPage'
import Login from '@/pages/auth/Login'
import NotFound from '@/pages/NotFound'

// The dashboard is a distinct bundle, a visiting parent never downloads it.
const AppLayout = lazy(() => import('@/components/app/AppLayout'))
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))
const Registrations = lazy(() => import('@/pages/app/Registrations'))
const Students = lazy(() => import('@/pages/app/Students'))
const StudentDetail = lazy(() => import('@/pages/app/StudentDetail'))
const Classes = lazy(() => import('@/pages/app/Classes'))
const Attendance = lazy(() => import('@/pages/app/Attendance'))
const Reports = lazy(() => import('@/pages/app/Reports'))
const Messages = lazy(() => import('@/pages/app/Messages'))
const Notifications = lazy(() => import('@/pages/app/Notifications'))
const Staff = lazy(() => import('@/pages/app/Staff'))
const AuditLog = lazy(() => import('@/pages/app/AuditLog'))
const Settings = lazy(() => import('@/pages/app/Settings'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/app"
          element={
            <RequireRole>
              <AppLayout />
            </RequireRole>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />

          <Route
            path="registrations"
            element={
              <RequireRole roles={['director', 'principal']}>
                <Registrations />
              </RequireRole>
            }
          />
          <Route
            path="students"
            element={
              <RequireRole roles={['director', 'principal', 'teacher']}>
                <Students />
              </RequireRole>
            }
          />
          <Route
            path="students/:studentId"
            element={
              <RequireRole roles={['director', 'principal', 'teacher']}>
                <StudentDetail />
              </RequireRole>
            }
          />
          <Route
            path="classes"
            element={
              <RequireRole roles={['director', 'principal', 'teacher']}>
                <Classes />
              </RequireRole>
            }
          />
          <Route path="attendance" element={<Attendance />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="staff"
            element={
              <RequireRole roles={['director', 'principal']}>
                <Staff />
              </RequireRole>
            }
          />
          <Route
            path="audit"
            element={
              <RequireRole roles={['principal']}>
                <AuditLog />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
