import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Resume from './pages/Resume'

export default function App() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/resume" element={<Resume />} />
                <Route path="/settings" element={<Settings />} />
            </Route>
        </Routes>
    )
}

