import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function StudentList() {
  const navigate = useNavigate()
  const [students, setStudents] = useState(null)
  const [filter, setFilter] = useState('')
  const [showUpdatePassword, setShowUpdatePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // read teacher info from localStorage for sidebar
  const stored = typeof window !== 'undefined' ? localStorage.getItem('teacher') : null
  const teacherObj = stored ? JSON.parse(stored) : null

  useEffect(() => {
    if (!stored) { navigate('/'); setStudents([]); return }
    const parsed = JSON.parse(stored)
    fetch(`http://localhost:5000/api/projects/teachers/${encodeURIComponent(parsed.email)}`)
      .then(r => r.json())
      .then(d => setStudents(Array.isArray(d.students) ? d.students : []))
      .catch(err => {
        console.error(err)
        setStudents([])
      })
  }, [navigate, stored])

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
          email: teacherObj.email,
          currentPassword,
          newPassword
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setPasswordSuccess('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setTimeout(() => setShowUpdatePassword(false), 2000)
      } else {
        setPasswordError(data.message || 'Failed to update password')
      }
    } catch (err) {
      setPasswordError('Server error. Please try again.')
    }
  }

  if (students === null) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div className="dashboard" style={{ color: '#fff' }}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>Teacher</h2>
          <p className="small">{(teacherObj && (teacherObj.name || teacherObj.email)) || ''}</p>
        </div>
        <nav>
          <button onClick={() => navigate('/teacher')}>Home</button>
          <button className={'active'} onClick={() => navigate('/teacher/students')}>Students</button>
          <button onClick={() => navigate('/teacher/marks')}>Marks Allocation</button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setShowUpdatePassword(true)} className="update-password">Update Password</button>
          <button onClick={() => { localStorage.removeItem('teacher'); navigate('/') }} className="logout">Logout</button>
        </div>
      </aside>

      <section className="main">
        <header className="main-header">
          <h1 style={{ margin: 0 }}>Students</h1>
        </header>
        <div className="main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <input
              placeholder="Search students..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6 }}
            />
            <button onClick={() => navigate('/teacher')} style={{ fontSize: '.9rem' }}>Back</button>
          </div>

          {students.length === 0 ? (
            <div>No students assigned yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '75vh', overflowY: 'auto' }}>
              {students
                .filter(s => {
                  const email = typeof s === 'string' ? s : (s.studentEmail || '')
                  return email.toLowerCase().includes(filter.toLowerCase())
                })
                .map((s, i) => {
                  const email = typeof s === 'string' ? s : (s.studentEmail || '')
                  const domain = typeof s === 'string' ? '—' : (s.domain || '—')
                  return (
                    <div key={i} style={{ padding: 10, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{email}</div>
                        <div style={{ fontSize: '.82rem', opacity: 0.9 }}>{email}</div>
                        <div style={{ fontSize: '.82rem', opacity: 0.85 }}>Domain: {domain}</div>
                      </div>
                      <div>
                        <button onClick={async () => {
                          if (!confirm(`Unassign ${name}? This will remove their guide.`)) return
                          try {
                            const res = await fetch('http://localhost:5000/api/projects/unassign-student', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ teacherEmail: teacherObj.email, studentEmail: email })
                            })
                            const data = await res.json()
                            if (data.success) {
                              // refresh list
                              const parsed = JSON.parse(localStorage.getItem('teacher'))
                              const r = await fetch(`http://localhost:5000/api/projects/teachers/${encodeURIComponent(parsed.email)}`)
                              const d = await r.json()
                              setStudents(Array.isArray(d.students) ? d.students : [])
                            }
                          } catch (err) { console.error(err) }
                        }}>Unassign</button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </section>

      {/* Password Update Modal */}
      {showUpdatePassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '30px',
            borderRadius: '8px',
            minWidth: '400px',
            color: '#fff',
            border: '1px solid #333'
          }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>Update Password</h3>
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
              <label style={{ display: 'block', marginBottom: '5px' }}>Current Password:</label>
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
              <label style={{ display: 'block', marginBottom: '5px' }}>New Password:</label>
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
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowUpdatePassword(false)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
