import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MarksAllocation(){
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [marksMap, setMarksMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(true)
  const [showUpdatePassword, setShowUpdatePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(()=>{
    const t = localStorage.getItem('teacher')
    if(!t) return navigate('/login')
    const parsed = JSON.parse(t)
    // fetch teacher students
    fetch(`http://localhost:5000/api/projects/teachers/${encodeURIComponent(parsed.email)}`)
      .then(r=>r.json())
      .then(d=>{
        const studs = Array.isArray(d.students) ? d.students : []
        setStudents(studs.map(s=>typeof s==='string'?{studentEmail:s,studentName:s}:s))
        // fetch existing marks
        return fetch(`http://localhost:5000/api/projects/marks/${encodeURIComponent(parsed.email)}`)
          .then(r=>r.json())
          .then(mdocs=>{
            const map = {}
            const arr = mdocs || []
            for (let i=0;i<arr.length;i++){
              const m = arr[i]
              map[m.studentEmail] = m.phases || {}
            }
            setMarksMap(map)
          })
      })
      .catch(err=>console.error(err))
      .finally(()=>setLoading(false))
  },[navigate])

  function setMark(studentEmail, phase, value){
    setMarksMap(prev=>({ ...prev, [studentEmail]: { ...(prev[studentEmail]||{}), [phase]: value } }))
  }

  async function submitAll(){
    const t = JSON.parse(localStorage.getItem('teacher'))
    const payload = Object.keys(marksMap).map(studentEmail=>({ studentEmail, phases: marksMap[studentEmail] }))
    try{
      const res = await fetch('http://localhost:5000/api/projects/marks/save', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ teacherEmail: t.email, marks: payload })
      })
      const data = await res.json()
      if(data.success){
        alert('Marks saved')
        setEditing(false)
      }
    }catch(err){ console.error(err) }
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
    
    const teacher = JSON.parse(localStorage.getItem('teacher'))
    
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
        setTimeout(() => setShowUpdatePassword(false), 2000)
      } else {
        setPasswordError(data.message || 'Failed to update password')
      }
    } catch (err) {
      setPasswordError('Server error. Please try again.')
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>Teacher</h2>
          <p className="small">{JSON.parse(localStorage.getItem('teacher')).name}</p>
        </div>
        <nav>
          <button onClick={()=>navigate('/teacher')}>Home</button>
          <button onClick={()=>navigate('/teacher/students')}>Students</button>
          <button className={'active'} onClick={()=>navigate('/teacher/marks')}>Marks Allocation</button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setShowUpdatePassword(true)} className="update-password">Update Password</button>
          <button onClick={()=>{ localStorage.removeItem('teacher'); navigate('/login') }} className="logout">Logout</button>
        </div>
      </aside>

      <section className="main">
        <header className="main-header">
          <h1>Marks Allocation</h1>
        </header>
        <div className="main-content">
          {loading ? <div>Loading...</div> : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <button onClick={()=>setEditing(true)}>Edit</button>
                <button onClick={submitAll} style={{ marginLeft: '1rem' }}>Submit</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Student</th>
                      <th style={{ padding: '8px' }}>Phase 1</th>
                      <th style={{ padding: '8px' }}>Phase 2</th>
                      <th style={{ padding: '8px' }}>Phase 3</th>
                      <th style={{ padding: '8px' }}>Phase 4</th>
                      <th style={{ padding: '8px' }}>Phase 5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx)=>{
                      const email = s.studentEmail
                      const name = s.studentName || email
                      const phases = marksMap[email] || {}
                      return (
                        <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '8px' }}>{name}</td>
                          {[1,2,3,4,5].map(p => (
                            <td key={p} style={{ padding: '6px' }}>
                              <input
                                disabled={!editing}
                                value={phases[`phase${p}`] || ''}
                                onChange={e=>setMark(email, `phase${p}`, e.target.value)}
                                style={{ width: '80px' }}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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
                  border: '1px solid #ccc',
                  fontSize: '14px'
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
                  border: '1px solid #ccc',
                  fontSize: '14px'
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
