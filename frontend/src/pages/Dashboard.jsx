import { useEffect, useState } from 'react'
import api from '../utils/api.js'
import { useAuthStore } from '../store/auth.js'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const user = useAuthStore(s => s.user)
  const fetchMe = useAuthStore(s => s.fetchMe)

  useEffect(() => {
    const load = async () => {
      try {
        if (!user) await fetchMe()
        const { data } = await api.get('/api/dashboard/overview')
        setOverview(data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load overview')
      }
    }
    load()
  }, [])

  if (error) return <div className="alert alert-error">{error}</div>
  if (!overview) return <div className="flex justify-center"><span className="loading loading-spinner"></span></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="stats stats-vertical lg:stats-horizontal shadow">
        <div className="stat">
          <div className="stat-title">Profile Completion</div>
          <div className="stat-value">{overview.profileCompletion}%</div>
        </div>
        <div className="stat">
          <div className="stat-title">Unread Messages</div>
          <div className="stat-value">{overview.unreadMessages}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Upcoming Sessions">
          <ul className="space-y-2">
            {overview.upcomingSessions.map(s => (
              <li key={s._id} className="p-3 rounded bg-base-200">
                <div className="font-medium">{new Date(s.scheduledTime).toLocaleString()}</div>
                <div className="text-sm opacity-70">{s.teacher?.user?.name} ↔ {s.learner?.user?.name}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent Sessions">
          <ul className="space-y-2">
            {overview.recentSessions.map(s => (
              <li key={s._id} className="p-3 rounded bg-base-200">
                <div className="font-medium">{s.status}</div>
                <div className="text-sm opacity-70">{s.teacher?.user?.name} ↔ {s.learner?.user?.name}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <StatsCharts />
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function StatsCharts() {
  const [range, setRange] = useState('month')
  const [teach, setTeach] = useState(null)
  const [learn, setLearn] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [t, l] = await Promise.all([
          api.get('/api/dashboard/stats/teaching', { params: { timeRange: range } }),
          api.get('/api/dashboard/stats/learning', { params: { timeRange: range } }),
        ])
        setTeach(t.data)
        setLearn(l.data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load stats')
      }
    }
    load()
  }, [range])

  const chartData = (stats) => ({
    labels: (stats?.monthlyStats || []).map(s => s.month),
    datasets: [
      { label: 'Sessions', data: (stats?.monthlyStats || []).map(s=>s.sessions), backgroundColor: '#34d399' },
      { label: 'Hours', data: (stats?.monthlyStats || []).map(s=>s.hours), backgroundColor: '#60a5fa' },
    ]
  })

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Your Stats</h2>
          <select className="select select-bordered select-sm" value={range} onChange={(e)=>setRange(e.target.value)}>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="all">All</option>
          </select>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium mb-2">Teaching</div>
            <Bar data={chartData(teach)} options={{ responsive: true, plugins: { legend: { labels: { color: 'currentColor' } } }, scales: { x: { ticks: { color: 'currentColor' } }, y: { ticks: { color: 'currentColor' } } } }} />
          </div>
          <div>
            <div className="font-medium mb-2">Learning</div>
            <Bar data={chartData(learn)} options={{ responsive: true, plugins: { legend: { labels: { color: 'currentColor' } } }, scales: { x: { ticks: { color: 'currentColor' } }, y: { ticks: { color: 'currentColor' } } } }} />
          </div>
        </div>
      </div>
    </div>
  )
}


