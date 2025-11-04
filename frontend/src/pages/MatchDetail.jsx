import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api.js'

export default function MatchDetail() {
  const { id } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/api/matches/${id}`)
        setDetail(data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load match')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="flex justify-center"><span className="loading loading-spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  const p = detail.profile
  const s = detail.matchDetails

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between">
        <h1 className="text-2xl font-semibold">{p.userName}</h1>
        <div className="flex items-center gap-2">
          <div className="badge badge-primary">{s.totalScore}% match</div>
          <Link to={`/sessions/new?teacherId=${p.id}&teacherName=${encodeURIComponent(p.userName)}`} className="btn btn-primary btn-sm">Schedule Session</Link>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Introduction">
          <p>{p.introduction || '—'}</p>
        </Card>
        <Card title="Languages">
          <div className="flex flex-wrap gap-2">{(p.languages||[]).map((l, i)=>(<div key={i} className="badge badge-outline">{l}</div>))}</div>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title={`Can teach (${s.teachingCompatibility}%)`}>
          <div className="flex flex-wrap gap-2">{p.skillsToTeach.map((sk, i)=>(<div key={i} className="badge">{sk.name}</div>))}</div>
        </Card>
        <Card title={`Can learn (${s.learningCompatibility}%)`}>
          <div className="flex flex-wrap gap-2">{p.skillsToLearn.map((sk, i)=>(<div key={i} className="badge">{sk.name}</div>))}</div>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title={`Availability match (${s.availabilityMatch}%)`}>
          <div className="text-sm">Days: {(p.availability?.weekdays||[]).join(', ') || '—'}</div>
          <div className="text-sm">Time: {(p.availability?.preferredTime||[]).join(', ') || '—'}</div>
        </Card>
        <Card title="Location">
          <div>{p.location || '—'}</div>
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}


