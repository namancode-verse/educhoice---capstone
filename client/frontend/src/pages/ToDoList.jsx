import React, { useEffect, useMemo, useState } from 'react'

function storageKeyFor(email){
  return `tasks_${email}`
}

export default function ToDoList(){
  const [student, setStudent] = useState(null)
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(()=>{
    const s = localStorage.getItem('student')
    if(!s) return
    const parsed = JSON.parse(s)
    setStudent(parsed)
  }, [])

  useEffect(()=>{
    if(!student?.email) return
    const key = storageKeyFor(student.email)
    const raw = localStorage.getItem(key)
    try{ setTasks(raw? JSON.parse(raw) : []) }catch{ setTasks([]) }
  }, [student])

  const save = (next)=>{
    if(!student?.email) return
    const key = storageKeyFor(student.email)
    localStorage.setItem(key, JSON.stringify(next))
    setTasks(next)
  }

  const addTask = ()=>{
    const text = String(title||'').trim()
    if(!text) return
    const t = { text, date: date||'', completed: false, id: Date.now() }
    const next = [...tasks, t]
    save(next)
    setTitle(''); setDate('')
  }

  const toggle = (id)=>{
    const next = tasks.map(t=> t.id===id? {...t, completed: !t.completed} : t)
    save(next)
  }

  const remove = (id)=>{
    const next = tasks.filter(t=> t.id!==id)
    save(next)
  }

  const filtered = useMemo(()=>{
    return tasks.filter(t=>{
      if(filter==='active') return !t.completed
      if(filter==='completed') return t.completed
      return true
    })
  }, [tasks, filter])

  if(!student) return <div style={{ padding: 20 }}>Please login to see your tasks.</div>

  return (
    <div style={{ padding: 20, maxWidth:760, margin: '12px auto', color:'#0f172a' }}>
      <div style={{ background:'#1e293b', padding:16, borderRadius:12, color:'#e6eef8' }}>
        <h2 style={{ color:'#38bdf8', marginTop:0 }}>📝 To-Do List</h2>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a new task..." style={{ flex:1, padding:8, borderRadius:8, border:'none' }} />
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ padding:8, borderRadius:8, border:'none' }} />
          <button onClick={addTask} style={{ background:'#38bdf8', border:'none', padding:'8px 12px', borderRadius:8 }}>Add</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button onClick={()=>setFilter('all')} className={filter==='all'?'active':''}>All</button>
          <button onClick={()=>setFilter('active')} className={filter==='active'?'active':''}>Active</button>
          <button onClick={()=>setFilter('completed')} className={filter==='completed'?'active':''}>Completed</button>
        </div>

        <ul style={{ listStyle:'none', padding:0, maxHeight:320, overflowY:'auto' }}>
          {filtered.length===0 && <li style={{ color:'#94a3b8' }}>No tasks</li>}
          {filtered.map(t=> (
            <li key={t.id} style={{ background:'#334155', marginBottom:10, padding:12, borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ textDecoration: t.completed? 'line-through' : 'none', fontWeight:600 }}>{t.text}</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>Due: {t.date || 'No date'}</div>
              </div>
              <div className="actions">
                <button onClick={()=>toggle(t.id)}>✔️</button>
                <button onClick={()=>remove(t.id)}>🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

