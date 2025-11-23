import React from 'react'
import { useNavigate } from 'react-router-dom'

export function Navbar({ title, onLogout }) {
  const navigate = useNavigate()
  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: '#f8fafc' }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div>
        <button onClick={() => navigate('/dashboard')} style={{ marginRight: 8 }}>Dashboard</button>
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}

export function Sidebar({ items = [], active, onSelect = () => {} }) {
  return (
    <aside className="sidebar" style={{ width: 240 }}>
      <div className="sidebar-top">
        <h2>Student</h2>
      </div>
      <nav>
        {items.map(it => (
          <button key={it.key} className={active === it.key ? 'active' : ''} onClick={() => onSelect(it.key)}>{it.label}</button>
        ))}
      </nav>
      <div className="sidebar-bottom" />
    </aside>
  )
}

export default { Navbar, Sidebar }
