import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import uiImage from '../assets/login_page_ui.jpg'
import TopLeftLogo from '../components/TopLeftLogo'
import { API_BASE_URL } from '../config/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password, role })
      if (role === 'teacher') {
        localStorage.setItem('teacher', JSON.stringify(res.data))
        navigate('/teacher')
      } else {
        localStorage.setItem('student', JSON.stringify(res.data))
        navigate('/dashboard')
      }
    } catch (err) {
      if (err.response) setError(err.response.data?.message || 'Login failed')
      else setError('Cannot reach server. Please try again later.')
    }
  }

  return (
    <div className="auth-page">
      <TopLeftLogo />
      <div className="auth-inner">
        <div className="auth-left" aria-hidden>
          <img src={uiImage} alt="login UI" className="auth-art" />
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-sub">Sign in to continue to the portal</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="field-label">Login as</label>
              <RoleSelect value={role} onChange={v => setRole(v)} />

              <label className="field-label">Email</label>
              <input className="field-input" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@university.edu" />

              <label className="field-label">Password</label>
              <input className="field-input" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="********" />

              <button className="primary-btn" type="submit">Login</button>
            </form>
            {error && <p className="auth-error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const options = [ { value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' } ]
  const containerRef = useRef(null)

  // close when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function handleOptionMouseDown(opt) {
    return (e) => {
      // prevent blur from firing before selection
      e.preventDefault()
      onChange(opt.value)
      setOpen(false)
    }
  }

  function handleOptionKeyDown(opt) {
    return (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onChange(opt.value)
        setOpen(false)
      }
    }
  }

  return (
    <div className="custom-select" ref={containerRef} tabIndex={0}>
      <button
        type="button"
        className="custom-select-toggle"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}
      >
        {options.find(o => o.value === value)?.label || 'Select'}
        <span className="caret">▾</span>
      </button>
      {open && (
        <ul role="listbox" className="custom-select-list">
          {options.map(o => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              tabIndex={0}
              className="custom-select-item"
              onMouseDown={handleOptionMouseDown(o)}
              onKeyDown={handleOptionKeyDown(o)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
