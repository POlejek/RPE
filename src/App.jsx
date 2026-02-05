import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
import MonitoringObciazen from './components/MonitoringObciazen'
import PHVDashboard from './components/PHVDashboard'
import UzupelnijMinuty from './components/UzupelnijMinuty'
import { Activity, Edit3, Users } from 'lucide-react'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <Activity className="w-8 h-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-800">RPE Dashboard</span>
              </div>
              
              <div className="flex gap-2">
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-gray-700 hover:text-indigo-600"
                >
                  <Activity className="w-5 h-5" />
                  <span className="hidden md:inline">Monitoring Obciążeń</span>
                </Link>
                <Link
                  to="/minuty"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors text-gray-700 hover:text-orange-600"
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="hidden md:inline">Uzupełnij Minuty</span>
                </Link>
                <Link
                  to="/phv"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-gray-700 hover:text-purple-600"
                >
                  <Users className="w-5 h-5" />
                  <span className="hidden md:inline">Dashboard PHV</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<MonitoringObciazen />} />
          <Route path="/minuty" element={<UzupelnijMinuty />} />
          <Route path="/phv" element={<PHVDashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
