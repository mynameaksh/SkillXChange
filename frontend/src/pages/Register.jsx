import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api.js'
import { useAuthStore } from '../store/auth.js'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setToken = useAuthStore(s => s.setToken)
  const setUser = useAuthStore(s => s.setUser)
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/users/register', { name, email, password, confirmPassword, age: Number(age) })
      setToken(data.token)
      setUser(data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h2 className="card-title">Create account</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <input className="input input-bordered w-full" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} required />
            <input className="input input-bordered w-full" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            <input className="input input-bordered w-full" type="number" placeholder="Age" value={age} onChange={(e)=>setAge(e.target.value)} required />
            <input className="input input-bordered w-full" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            <input className="input input-bordered w-full" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
            {error && <div className="alert alert-error text-sm">{error}</div>}
            <button className={`btn btn-primary w-full ${loading ? 'loading' : ''}`} disabled={loading}>Create account</button>
          </form>
          <p className="text-sm opacity-70">Already have an account? <Link to="/login" className="link">Login</Link></p>
        </div>
      </div>
    </div>
  )
}


