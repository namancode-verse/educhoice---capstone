import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../App.css'
import '../dashboard.css'
import ToDoList from './ToDoList'
import Chatbot from './chatbot'
import OpenElective3 from './OpenElective3'

export default function Dashboard() {
  const [student, setStudent] = useState(null)
  const [section, setSection] = useState('home')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const s = localStorage.getItem('student')
    if (!s) {
      // no student selected; leave dashboard mounted but empty
      setStudent(null)
      return
    }
    setStudent(JSON.parse(s))
  }, [navigate])

  // read ?section= from URL so direct links work and keep dashboard mounted
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const sec = params.get('section')
      if (sec) setSection(sec)
    } catch { /* ignore */ }
  }, [location.search])

  function logout() {
    localStorage.removeItem('student')
    setStudent(null)
    navigate('/')
  }

  if (!student) return <div style={{ padding: 20 }}>No student selected.</div>

  const mandatory = student['mandatory courses'] || {}

  function HomeView() {
    return (
      <div className="content-grid">
        <div className="card big">
          <h3>Student Info</h3>
          <p><strong>{student.name}</strong></p>
          <p>Roll No: {student['roll no']}</p>
          <p>Email: {student.email}</p>
          <p>Current Sem: {student['current sem no']}</p>
          <p>GPA: {student['current gpa']}</p>
          <p>Credits Earned: {student['credits earned']}</p>
        </div>
        <div className="card big">
          <h3>Summary</h3>
          <p>Total Credits This Sem: {student['total credits In this sem']}</p>
          <p>Mandatory Courses: {Object.keys(mandatory).length}</p>
        </div>
      </div>
    )
  }

  function MandatoryView() {
    return (
      <div className="cards-row">
        {['cor1','cor2','cor3','cor4','cor5'].map(k => {
          const c = mandatory[k]
          if (!c) return null
          return (
            <div className="course-card" key={k}>
              <h4>{c['course code']}</h4>
              <p className="course-name">{c.name}</p>
              <p>Credits: {c.credits}</p>
            </div>
          )
        })}
      </div>
    )
  }

  function OptionalView() {
    const [tab, setTab] = useState('open1')
    const [nptel, setNptel] = useState([])
    const [enrolled, setEnrolled] = useState(student.open_electives || {})

    useEffect(() => {
      // fetch nptel courses for open elective 1
      fetch('http://localhost:5000/api/courses/nptel')
        .then(r => r.json())
        .then(setNptel)
        .catch(err => console.error(err))
    }, [])

    async function enrollCourse(course) {
      // API to save enrolled course for this student
      try {
        const res = await fetch('http://localhost:5000/api/courses/enroll', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentEmail: student.email, electiveSlot: 'open1', course })
        })
        const data = await res.json()
        if (data.success) {
          // backend returns enrolled array for open1
          const arr = data.enrolled || (enrolled.open1 ? (Array.isArray(enrolled.open1)? enrolled.open1 : [enrolled.open1]) : [])
          const updated = { ...(enrolled || {}), open1: arr }
          setEnrolled(updated)
          // update localStorage student object
          const s = JSON.parse(localStorage.getItem('student'))
          s.open_electives = { ...(s.open_electives||{}), open1: arr }
          localStorage.setItem('student', JSON.stringify(s))
        }
      } catch (err) { console.error(err) }
    }

    return (
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setTab('open1')} className={tab==='open1' ? 'active' : ''}>Open Elective 1 (NPTEL)</button>
          <button onClick={() => setTab('open2')} className={tab==='open2' ? 'active' : ''}>Open Elective 2 (Project)</button>
          <button onClick={() => setTab('open3')} className={tab==='open3' ? 'active' : ''}>Open Elective 3 (Certificates)</button>
        </div>

        {tab==='open1' && (
          <div>
            <h3>Available NPTEL Courses</h3>
            <div>
              <p style={{ color: '#eab308' }}>You can only enroll in 2 courses for Open Elective 1 this semester.</p>
              <div className="cards-row">
                {nptel.map((c, idx) => {
                  const enrolledArr = enrolled.open1 && Array.isArray(enrolled.open1) ? enrolled.open1 : (enrolled.open1 ? [enrolled.open1] : [])
                  const isEnrolled = enrolledArr.find(ec => ec.name === c.name)
                  const limitReached = enrolledArr.length >= 2
                  return (
                    <div className="course-card" key={idx}>
                      <h4>{c.name}</h4>
                      {c.link && <a href={c.link} target="_blank" rel="noreferrer">Visit</a>}
                      <div style={{ marginTop: '.5rem' }}>
                        <button disabled={isEnrolled || limitReached} onClick={() => enrollCourse({ name: c.name, link: c.link, credits: c.credits || 3 })}>
                          {isEnrolled ? 'Enrolled' : limitReached ? 'Limit reached' : 'Enroll'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h4>Your Enrolled Open Elective 1</h4>
              {enrolled.open1 && Array.isArray(enrolled.open1) && enrolled.open1.length>0 ? (
                <div style={{ display:'flex', gap:'.75rem' }}>
                  {enrolled.open1.map((ec, i) => (
                    <div className="course-card" key={i} style={{ width:'200px' }}>
                      <h4>{ec.name}</h4>
                      <a href={ec.link} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  ))}
                </div>
              ) : <p>No course enrolled yet.</p>}
            </div>
          </div>
        )}

        {tab==='open2' && (
          <div>
            <h3>Project under a guide (Open Elective 2)</h3>
            <p>Select a domain and request a teacher to be your guide.</p>
            <DomainTeachersView student={student} enrolled={enrolled} setEnrolled={setEnrolled} />
          </div>
        )}

        {tab==='open3' && (
          <OpenElective3 />
        )}
      </div>
    )
  }

  function DomainsPicker({ onSelectDomain }) {
    const [domains, setDomains] = useState([])
    useEffect(() => {
      fetch('http://localhost:5000/api/projects/domains')
        .then(r => r.json())
        .then(docs => {
          // documents may contain multiple fields; flatten into an array of domain strings
          if (!Array.isArray(docs)) return setDomains([])
          const first = docs[0] || {}
          // try to collect all arrays inside the doc
          const keys = Object.keys(first)
          const items = []
          keys.forEach(k => {
            const v = first[k]
            if (Array.isArray(v)) v.forEach(x => items.push(x))
          })
          setDomains(items)
        })
        .catch(err => console.error(err))
    }, [])

    return (
      <>
        {domains.length===0 && <p>Loading domains...</p>}
        {domains.map((d, i) => (
          <button key={i} onClick={() => onSelectDomain(d)}>{d}</button>
        ))}
      </>
    )
  }

  function DomainTeachersView({ student }) {
    const [selectedDomain, setSelectedDomain] = useState(null)
    const [teachers, setTeachers] = useState([])
    const [selectedTeacher, setSelectedTeacher] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
      // nothing
    }, [])

    async function loadTeachers(domain) {
      setSelectedDomain(domain)
      setLoading(true)
      try {
        const res = await fetch(`http://localhost:5000/api/projects/teachers/by-domain?domain=${encodeURIComponent(domain)}`)
        const data = await res.json()
        setTeachers(Array.isArray(data) ? data : [])
      } catch (err) { console.error(err) }
      setLoading(false)
    }

    async function sendRequest() {
      if (!selectedTeacher || !selectedDomain) return
      try {
        const res = await fetch('http://localhost:5000/api/projects/request-guide', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentEmail: student.email, teacherEmail: selectedTeacher.email, domain: selectedDomain })
        })
        const data = await res.json()
        if (data.success) {
          alert('Request sent to teacher')
        }
      } catch (err) { console.error(err) }
    }

    return (
      <div style={{ marginTop: '1rem' }}>
        <div>
          <h4>Selected domain: {selectedDomain || 'none'}</h4>
          <div style={{ marginBottom: '.5rem' }}>
            <DomainsPicker onSelectDomain={(d) => loadTeachers(d)} />
          </div>
        </div>

        <div>
          <h4>Teachers for {selectedDomain || '...'}</h4>
          {loading && <p>Loading teachers...</p>}
          <div className="cards-row">
            {teachers.map((t, idx) => (
              <div className="course-card" key={idx} style={{ width: '240px' }}>
                <h4>{t.name}</h4>
                <p className="small">{t.email}</p>
                <p className="small">Specializations: {(t.course_specialization_sector||[]).join(', ')}</p>
                <div style={{ marginTop: '.5rem' }}>
                  <button onClick={() => setSelectedTeacher(t)}>Select</button>
                </div>
              </div>
            ))}
            {teachers.length===0 && !loading && <p>No teachers found for this domain.</p>}
          </div>
        </div>

        {selectedTeacher && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Selected Teacher</h4>
            <div className="card big">
              <p><strong>{selectedTeacher.name}</strong></p>
              <p>{selectedTeacher.email}</p>
              <div style={{ marginTop: '.5rem' }}>
                <button onClick={sendRequest}>Send Request to be my guide</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>Student</h2>
          <p className="small">{student.name}</p>
        </div>
        <nav>
          <button className={section==='home'? 'active': ''} onClick={()=> setSection('home')}>Home</button>
          <button className={section==='mandatory'? 'active': ''} onClick={()=> setSection('mandatory')}>Mandatory Courses</button>
          <button className={section==='optional'? 'active': ''} onClick={()=> setSection('optional')}>Optional Courses</button>
          <button className={section==='tasks'? 'active': ''} onClick={()=> { setSection('tasks'); navigate('/dashboard?section=tasks') }}>Task List</button>
          <button className={section==='chatbot'? 'active': ''} onClick={()=> { setSection('chatbot'); navigate('/dashboard?section=chatbot') }}>Chatbot</button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={logout} className="logout">Logout</button>
        </div>
      </aside>
      <section className="main">
        <header className="main-header">
          <h1>
            {section === 'home' ? 'Home'
              : section === 'mandatory' ? 'Mandatory Courses'
              : section === 'optional' ? 'Optional Courses'
              : section === 'tasks' ? 'Task List'
              : section === 'chatbot' ? 'Chatbot'
              : ''}
          </h1>
        </header>
        <div className="main-content">
          {section==='home' && <HomeView />}
          {section==='mandatory' && <MandatoryView />}
          {section==='optional' && <OptionalView />}
          {section==='tasks' && <ToDoList />}
          {section==='chatbot' && <Chatbot />}
        </div>
      </section>
    </div>
  )
}
