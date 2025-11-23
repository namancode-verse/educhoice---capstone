import { Routes, Route } from 'react-router-dom'
import './App.css'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentList from './pages/StudentList'
import MarksAllocation from './pages/MarksAllocation'
import Login from './pages/Login'
import OpenElective3 from './pages/OpenElective3'
import Dashboard from './pages/Dashboard'
// TaskList was removed per request

function App() {
  return (
    <div className="app">
      {/* Navigation links removed per request (Login/Dashboard removed) */}
      <main>
        <Routes>
          {/* Root now points to Login as the default landing page */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          {/* TaskList route removed */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teacher/students" element={<StudentList />} />
          <Route path="/teacher/marks" element={<MarksAllocation />} />
          <Route path="/open-elective-3" element={<OpenElective3 />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
