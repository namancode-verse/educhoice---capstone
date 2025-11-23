import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TeacherStudents() {
  const navigate = useNavigate()
  const [students, setStudents] = useState(null)

  useEffect(() => {
    const t = localStorage.getItem('teacher')
    if (!t) {
      setStudents([])
      navigate('/')
      return
    }
    const parsed = JSON.parse(t)
    fetch(`http://localhost:5000/api/projects/teachers/${encodeURIComponent(parsed.email)}`)
      .then(r => r.json())
      .then(d => setStudents(Array.isArray(d.students) ? d.students : []))
      .catch(err => {
        console.error(err)
        setStudents([])
      })
  }, [navigate])

  if (students === null) return <div>Loading...</div>

  return (
    <div className="teacher-students-page" style={{ padding: '1rem' }}>
      {/* Minimal page: only a compact list of student names */}
      <div style={{ marginBottom: '.5rem' }}>
        <button onClick={() => navigate('/teacher')} style={{ fontSize: '.9rem' }}>Back to Home</button>
      </div>
      {students.length === 0 ? (
        <div style={{ color: '#fff', fontSize: '.95rem' }}>No students assigned yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {students.map((s, i) => {
            const studentEmail = typeof s === 'string' ? s : (s.studentEmail || '')
            return (
              <div key={i} style={{ padding: '.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '.95rem' }}>
                <span style={{ fontWeight: 700 }}>{studentEmail}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
