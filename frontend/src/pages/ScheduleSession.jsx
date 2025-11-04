import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../utils/api.js'

export default function ScheduleSession() {
  const [sp] = useSearchParams()
  const [teacherId, setTeacherId] = useState('')
  const [teacherSkills, setTeacherSkills] = useState('')
  const [learnerSkills, setLearnerSkills] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const tid = sp.get('teacherId')
    if (tid) setTeacherId(tid)
    const tName = sp.get('teacherName')
    if (tName && !notes) setNotes(`Session with ${tName}`)
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const payload = {
        teacherId,
        teacherSkills: teacherSkills.split(',').map(s=>({ name: s.trim(), proficiencyLevel: 'advanced', yearsOfExperience: 0 })).filter(s=>s.name),
        learnerSkills: learnerSkills.split(',').map(s=>({ name: s.trim(), proficiencyLevel: 'beginner', yearsOfExperience: 0 })).filter(s=>s.name),
        scheduledTime: new Date(scheduledTime).toISOString(),
        duration: Number(duration),
        notes,
      }
      await api.post('/api/sessions', payload)
      navigate('/sessions')
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to schedule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Schedule a Session</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="form-control">
              <div className="label"><span className="label-text">Teacher User ID</span></div>
              <input className="input input-bordered w-full" placeholder="Teacher User ID" value={teacherId} onChange={(e)=>setTeacherId(e.target.value)} required />
            </label>
            <input className="input input-bordered w-full" placeholder="Teacher skills (comma separated)" value={teacherSkills} onChange={(e)=>setTeacherSkills(e.target.value)} />
            <input className="input input-bordered w-full" placeholder="Your learning skills (comma separated)" value={learnerSkills} onChange={(e)=>setLearnerSkills(e.target.value)} />
            <input className="input input-bordered w-full" type="datetime-local" value={scheduledTime} onChange={(e)=>setScheduledTime(e.target.value)} required />
            <input className="input input-bordered w-full" type="number" min="15" step="15" value={duration} onChange={(e)=>setDuration(e.target.value)} />
            <textarea className="textarea textarea-bordered w-full" placeholder="Notes (optional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
            {error && <div className="alert alert-error">{error}</div>}
            <button className={`btn btn-primary w-full ${loading ? 'loading' : ''}`} disabled={loading}>Schedule</button>
          </form>
        </div>
      </div>
    </div>
  )
}
