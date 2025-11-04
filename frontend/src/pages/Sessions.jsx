import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api.js'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (opts={}) => {
    setLoading(true); setError('')
    try {
      const params = { page, limit: 10 }
      if (status) params.status = status
      if (role) params.role = role
      const { data } = await api.get('/api/sessions', { params })
      setSessions(data.sessions)
      setTotal(data.total)
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, status, role])

  const pages = Math.max(1, Math.ceil(total / 10))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Link to="/sessions/new" className="btn btn-primary">Schedule</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="select select-bordered" value={status} onChange={(e)=>{setStatus(e.target.value); setPage(1)}}>
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="select select-bordered" value={role} onChange={(e)=>{setRole(e.target.value); setPage(1)}}>
          <option value="">Both Roles</option>
          <option value="teacher">As Teacher</option>
          <option value="learner">As Learner</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="flex justify-center"><span className="loading loading-spinner"/></div>
      ) : (
        <div className="grid gap-3">
          {sessions.map(s => (
            <div key={s._id} className="card bg-base-200">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{new Date(s.scheduledTime).toLocaleString()} • {s.duration} min</div>
                  <div className="badge">{s.status}</div>
                </div>
                <div className="text-sm opacity-70">{s.teacher?.user?.name} ↔ {s.learner?.user?.name}</div>
                <div className="card-actions justify-end">
                  <Link to={`/sessions/${s._id}`} className="btn btn-sm">View</Link>
                </div>
              </div>
            </div>
          ))}
          <div className="join self-center mt-2">
            <button className="btn join-item" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <button className="btn join-item" disabled>{page} / {pages}</button>
            <button className="btn join-item" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}


