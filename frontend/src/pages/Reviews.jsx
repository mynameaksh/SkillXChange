import { useEffect, useState } from 'react'
import api from '../utils/api.js'
import { useSearchParams } from 'react-router-dom'

export default function Reviews() {
  const [sp] = useSearchParams()
  const userId = sp.get('user')
  const [role, setRole] = useState('teacher')
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const { data } = await api.get(`/api/reviews/user/${userId}`, { params: { role, status: 'published', page, limit: 10 } })
      setReviews(data.reviews); setPages(data.totalPages)
      const sum = await api.get(`/api/reviews/summary/${userId}`, { params: { role } })
      setSummary(sum.data)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load reviews')
    }
  }

  useEffect(() => { if (userId) load() }, [userId, role, page])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <select className="select select-bordered" value={role} onChange={(e)=>{setRole(e.target.value); setPage(1)}}>
          <option value="teacher">As Teacher</option>
          <option value="learner">As Learner</option>
        </select>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {summary && (
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Overall</div>
            <div className="stat-value">{summary.ratings.overall}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total</div>
            <div className="stat-value">{summary.ratings.totalReviews}</div>
          </div>
        </div>
      )}
      <div className="grid gap-3">
        {reviews.map(r => (
          <div key={r._id} className="card bg-base-200">
            <div className="card-body gap-1">
              <div className="font-medium">{r.reviewer?.name}</div>
              <div className="text-sm">Overall: {r.ratings?.overall} • Communication: {r.ratings?.communication}</div>
              <div className="opacity-80">{r.comment}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="join">
        <button className="btn join-item" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <button className="btn join-item" disabled>{page} / {pages}</button>
        <button className="btn join-item" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
      <SubmitReview />
    </div>
  )
}

function SubmitReview() {
  const [sessionId, setSessionId] = useState('')
  const [ratings, setRatings] = useState({ overall: 5, knowledge: 5, communication: 5, punctuality: 5, methodology: 5 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    setError(''); setMsg(''); setLoading(true)
    try {
      await api.post(`/api/reviews/${sessionId}`, { ratings, skills: [], comment, isPublic: true })
      setMsg('Review submitted')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-3">
        <h2 className="card-title">Submit a Review</h2>
        <input className="input input-bordered" placeholder="Session ID" value={sessionId} onChange={(e)=>setSessionId(e.target.value)} />
        <div className="grid md:grid-cols-5 gap-2">
          {Object.keys(ratings).map(k => (
            <label key={k} className="form-control">
              <div className="label"><span className="label-text capitalize">{k}</span></div>
              <input type="number" min="1" max="5" className="input input-bordered" value={ratings[k]} onChange={(e)=>setRatings({...ratings, [k]: Number(e.target.value)})} />
            </label>
          ))}
        </div>
        <textarea className="textarea textarea-bordered" placeholder="Comment" value={comment} onChange={(e)=>setComment(e.target.value)} />
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card-actions justify-end">
          <button className={`btn btn-primary ${loading?'loading':''}`} onClick={submit} disabled={loading}>Submit Review</button>
        </div>
      </div>
    </div>
  )
}


