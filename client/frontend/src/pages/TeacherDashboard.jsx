import { useEffect, useState } from 'react'
import '../teacherdashboard.css'
import { useNavigate } from 'react-router-dom'

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState(null)
  const [section, setSection] = useState('home')
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('teacher')
    if (!t) return navigate('/login')
    const parsed = JSON.parse(t)
    // fetch fresh teacher document from backend to get pendingRequests and students
    fetch(`http://localhost:5000/api/projects/teachers/${encodeURIComponent(parsed.email)}`)
      .then(r => r.json())
      .then(d => setTeacher(d))
      .catch(err => {
        console.error(err)
        setTeacher(parsed)
      })
    // re-run when refreshKey changes
  }, [navigate, refreshKey])

  async function respond(studentEmail, accept) {
    try {
      const res = await fetch('http://localhost:5000/api/projects/respond-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherEmail: teacher.email, studentEmail, accept })
      })
      const data = await res.json()
      if (data.success) {
        // navigate to students list page after acceptance so teacher sees assigned students
        if (accept) {
          navigate('/teacher/students')
        } else {
          // if rejected, reload teacher to refresh pending list
          setRefreshKey(k => k + 1)
        }
      }
    } catch (err) { console.error(err) }
  }

  function logout() {
    localStorage.removeItem('teacher')
    navigate('/login')
  }

  async function updatePassword() {
    setPasswordError('')
    setPasswordSuccess('')
    
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in both fields')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/update-teacher-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: teacher.email,
          currentPassword,
          newPassword
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setPasswordSuccess('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setTimeout(() => setSection('home'), 2000)
      } else {
        setPasswordError(data.message || 'Failed to update password')
      }
    } catch (err) {
      setPasswordError('Server error. Please try again.')
    }
  }

  if (!teacher) return <div>Loading...</div>

  // specializations removed from Home per request

  return (
    <div className="dashboard" style={{ color: '#fff' }}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>Teacher</h2>
          <p className="small">{teacher.name || teacher.email}</p>
        </div>
        <nav>
          <button className={section==='home' ? 'active' : ''} onClick={() => setSection('home')}>Home</button>
          <button onClick={() => navigate('/teacher/students')}>Students</button>
          <button onClick={() => navigate('/teacher/marks')}>Marks Allocation</button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setSection('updatePassword')} className="update-password">Update Password</button>
          <button onClick={logout} className="logout">Logout</button>
        </div>
      </aside>
      <section className="main">
        <header className="main-header">
          <h1>{section === 'updatePassword' ? 'Update Password' : 'Home'}</h1>
        </header>
        <div className="main-content">

          {section === 'home' && (
            <>
              <div className="card big">
                <h3>Pending Guide Requests</h3>
                {Array.isArray(teacher.pendingRequests) && teacher.pendingRequests.length>0 ? (
                  <div>
                    {teacher.pendingRequests.map((req, i) => (
                      <div key={i} style={{ marginBottom: '.5rem', padding: '.5rem', border: '1px solid #333' }}>
                        <p><strong>{req.studentEmail}</strong></p>
                        <p className="small">Domain: {req.domain}</p>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button onClick={() => respond(req.studentEmail, true)}>Accept</button>
                          <button onClick={() => respond(req.studentEmail, false)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p>No pending requests.</p>}
              </div>

              {/* Home shows only Pending Guide Requests. Students are available in the Students page. */}

              {/* Students list moved to separate page /teacher/students */}
            </>
          )}

          {section === 'updatePassword' && (
            <div className="card big">
              <h3>Update Password</h3>
              <div style={{ maxWidth: '400px' }}>
                {passwordError && (
                  <div style={{ 
                    color: '#ff6b6b', 
                    marginBottom: '15px', 
                    padding: '10px', 
                    backgroundColor: 'rgba(255,107,107,0.1)', 
                    borderRadius: '4px' 
                  }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div style={{ 
                    color: '#51cf66', 
                    marginBottom: '15px', 
                    padding: '10px', 
                    backgroundColor: 'rgba(81,207,102,0.1)', 
                    borderRadius: '4px' 
                  }}>
                    {passwordSuccess}
                  </div>
                )}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
                    Current Password:
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #555',
                      fontSize: '14px',
                      backgroundColor: '#2a2a2a',
                      color: '#fff'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>
                    New Password:
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #555',
                      fontSize: '14px',
                      backgroundColor: '#2a2a2a',
                      color: '#fff'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={updatePassword}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Update Password
                  </button>
                  <button 
                    onClick={() => setSection('home')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  )
}
