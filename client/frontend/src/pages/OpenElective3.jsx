import React, { useEffect, useState, useRef } from 'react'
import '../dashboard.css'
import { useNavigate } from 'react-router-dom'

// Certificate Upload for Open Elective 3 - stores by roll number
export default function OpenElective3() {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [file, setFile] = useState(null)
  const [meta, setMeta] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef(null)

  const MAX_BYTES = 1 * 1024 * 1024 // 1 MB

  useEffect(() => {
    const s = typeof window !== 'undefined' ? localStorage.getItem('student') : null
    if (!s) return navigate('/login')
    try {
      const parsed = JSON.parse(s)
      setStudent(parsed)
      // Load existing certificate metadata by roll number
      if (parsed['roll no']) {
        fetch(`http://localhost:5000/api/certification/metadata/${encodeURIComponent(parsed['roll no'])}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && d.data) setMeta(d.data) })
          .catch(() => {})
      }
    } catch (err) {
      console.error(err)
      navigate('/login')
    }
  }, [navigate])

  if (!student) return null

  async function upload() {
    setStatus('')
    if (!file) return setStatus('Choose a PDF first')
    if (file.type !== 'application/pdf') return setStatus('Only PDF files are allowed')
    if (file.size > MAX_BYTES) return setStatus('File too large. Max size: 1 MB')

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('rollNo', student['roll no'] || '')
      fd.append('studentName', student.name || '')

      console.log('Uploading certificate for roll no:', student['roll no'])
      
      const res = await fetch('http://localhost:5000/api/certification/upload', { method: 'POST', body: fd })
      
      if (!res.ok) {
        const errText = await res.text()
        console.error('Upload failed. Status:', res.status, 'Response:', errText)
        return setStatus(`Upload error: ${res.status} - ${errText || 'Unknown error'}`)
      }

      const data = await res.json()
      console.log('Upload response:', data)
      
      if (data.success) {
        const message = data.data.isUpdate 
          ? '✓ Certificate updated successfully in database' 
          : '✓ Certificate uploaded successfully to database'
        setStatus(message)
        setMeta(data.data || { filename: file.name, size: file.size, uploadedAt: new Date().toISOString() })
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setStatus(data.message || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload exception:', err)
      setStatus('Upload error: ' + err.message)
    }
    setUploading(false)
  }

  return (
    <div className="dashboard-root" style={{ padding: 20, backgroundColor: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h2 style={{ color: '#fff' }}>📄 Open Elective 3 — Upload Certificate</h2>
      <p style={{ color: '#ccc', marginBottom: 20 }}>
        Upload your Open Elective 3 certificate as a PDF file (max 1 MB). 
        Your certificate will be securely stored in the database with your roll number as the reference.
      </p>

      <div style={{ 
        border: '1px solid #555', 
        padding: 20, 
        borderRadius: 8, 
        backgroundColor: '#2a2a2a',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <input 
            ref={fileRef} 
            type="file" 
            accept="application/pdf" 
            onChange={e => setFile(e.target.files[0] || null)}
            disabled={uploading}
            style={{ 
              flex: 1, 
              backgroundColor: '#1a1a1a', 
              color: '#fff', 
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '8px'
            }}
          />
          <button 
            onClick={upload} 
            disabled={uploading || !file}
            style={{
              padding: '8px 16px',
              backgroundColor: uploading ? '#ccc' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? '⏳ Uploading...' : '⬆️ Upload'}
          </button>
        </div>

        {file && (
          <div style={{ marginTop: 8, fontSize: 14, color: '#ccc' }}>
            📎 Selected: <strong style={{ color: '#fff' }}>{file.name}</strong> — {(file.size / 1024).toFixed(1)} KB / {(MAX_BYTES / 1024 / 1024).toFixed(0)} MB max
          </div>
        )}
        
        {status && (
          <div style={{ 
            marginTop: 12, 
            padding: 10,
            borderRadius: 4,
            color: status.includes('✓') ? '#4caf50' : '#f44336',
            backgroundColor: status.includes('✓') ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
            border: `1px solid ${status.includes('✓') ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`
          }}>
            {status}
          </div>
        )}
      </div>

      {meta && (
        <div style={{ 
          border: '1px solid #555', 
          padding: 15, 
          borderRadius: 8,
          backgroundColor: '#2a2a2a'
        }}>
          <h3 style={{ marginTop: 0, color: '#4caf50' }}>✅ Certificate on File</h3>
          <div style={{ marginBottom: 10, color: '#fff' }}>
            <strong>File:</strong> {meta.filename} — {(meta.size/1024).toFixed(1)} KB
          </div>
          <div style={{ marginBottom: 10, fontSize: 13, color: '#ccc' }}>
            <strong>Originally Uploaded:</strong> {meta.uploadedAt ? new Date(meta.uploadedAt).toLocaleString() : 'Unknown'}
          </div>
          {meta.lastCertificateUpdated && (
            <div style={{ marginBottom: 10, fontSize: 13, color: '#ff9800' }}>
              <strong>Last Updated:</strong> {new Date(meta.lastCertificateUpdated).toLocaleString()}
            </div>
          )}
          <div style={{ marginBottom: 15, fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
            Note: Only one certificate per roll number is allowed. Uploading a new file will replace the existing one.
          </div>
        </div>
      )}
    </div>
  )
}
