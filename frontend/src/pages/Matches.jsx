import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api.js'

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/matches')
        setMatches(data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load matches')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center"><span className="loading loading-spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Matches</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(m => (
          <div key={m.profile.id} className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">{m.profile.userName}</h2>
                <div className="badge badge-primary">{m.matchDetails.totalScore}%</div>
              </div>
              <div className="text-sm opacity-70">Location: {m.profile.location || '—'}</div>
              <div>
                <div className="text-sm font-medium mt-2">Can teach</div>
                <div className="flex flex-wrap gap-2">
                  {m.profile.skillsToTeach.slice(0,5).map((s, idx)=> (
                    <div key={idx} className="badge badge-outline">{s.name}</div>
                  ))}
                </div>
              </div>
              <div className="card-actions justify-between">
                <Link to={`/matches/${m.profile.id}`} className="btn btn-sm">View</Link>
                <Link to={`/sessions/new?teacherId=${m.profile.id}&teacherName=${encodeURIComponent(m.profile.userName)}`} className="btn btn-primary btn-sm">Schedule</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


