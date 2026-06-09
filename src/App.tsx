import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import Dashboard from '@/pages/Dashboard'
import SubjectList from '@/pages/SubjectList'
import SubjectEnroll from '@/pages/SubjectEnroll'
import SubjectDetail from '@/pages/SubjectDetail'
import ConsentPage from '@/pages/ConsentPage'
import CRFList from '@/pages/CRFList'
import CRFDetail from '@/pages/CRFDetail'
import QueryManagement from '@/pages/QueryManagement'
import SAEList from '@/pages/SAEList'
import SAEReport from '@/pages/SAEReport'
import SAEDetail from '@/pages/SAEDetail'
import MonitoringCenter from '@/pages/MonitoringCenter'
import Randomization from '@/pages/Randomization'
import EthicsReview from '@/pages/EthicsReview'
import VisitManagement from '@/pages/VisitManagement'
import DataLock from '@/pages/DataLock'
import DataLockReview from '@/pages/DataLockReview'
import Statistics from '@/pages/Statistics'
import Performance from '@/pages/Performance'
import Messages from '@/pages/Messages'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subjects" element={<SubjectList />} />
          <Route path="/subjects/enroll" element={<SubjectEnroll />} />
          <Route path="/subjects/:id" element={<SubjectDetail />} />
          <Route path="/subjects/:id/consent" element={<ConsentPage />} />
          <Route path="/crf" element={<CRFList />} />
          <Route path="/crf/:id" element={<CRFDetail />} />
          <Route path="/queries" element={<QueryManagement />} />
          <Route path="/sae" element={<SAEList />} />
          <Route path="/sae/report" element={<SAEReport />} />
          <Route path="/sae/:id" element={<SAEDetail />} />
          <Route path="/monitoring" element={<MonitoringCenter />} />
          <Route path="/randomization" element={<Randomization />} />
          <Route path="/ethics" element={<EthicsReview />} />
          <Route path="/visits" element={<VisitManagement />} />
          <Route path="/data-lock" element={<DataLock />} />
          <Route path="/data-lock-review" element={<DataLockReview />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Routes>
    </Router>
  )
}
