import { useEffect, useState } from 'react'
import api from '../utils/api.js'
import { useAuthStore } from '../store/auth.js'

const WEEKDAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const TIMES = ['morning','afternoon','evening','night']

function SkillsEditor({ title, value, onChange }) {
  const [name, setName] = useState('')
  const [proficiencyLevel, setProficiencyLevel] = useState('beginner')
  const [yearsOfExperience, setYearsOfExperience] = useState('0')

  const add = () => {
    if (!name.trim()) return
    onChange([...(value||[]), { name: name.trim(), proficiencyLevel, yearsOfExperience: Number(yearsOfExperience)||0 }])
    setName(''); setProficiencyLevel('beginner'); setYearsOfExperience('0')
  }
  const remove = (idx) => {
    onChange(value.filter((_, i)=> i!==idx))
  }

  return (
    <div className="space-y-2">
      <div className="font-medium">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="input input-bordered" placeholder="Skill name" value={name} onChange={(e)=>setName(e.target.value)} />
        <select className="select select-bordered" value={proficiencyLevel} onChange={(e)=>setProficiencyLevel(e.target.value)}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input className="input input-bordered" type="number" min="0" placeholder="Years exp" value={yearsOfExperience} onChange={(e)=>setYearsOfExperience(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={add}>Add</button>
      </div>
      <div className="grid gap-2">
        {(value||[]).map((s, idx)=> (
          <div key={idx} className="flex items-center justify-between p-3 rounded bg-base-200">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-sm opacity-70">{s.proficiencyLevel} · {s.yearsOfExperience} yrs</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={()=>remove(idx)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfileEditor() {
  const user = useAuthStore(s => s.user)
  const fetchMe = useAuthStore(s => s.fetchMe)

  const [introduction, setIntroduction] = useState('')
  const [skillsToTeach, setSkillsToTeach] = useState([])
  const [skillsToLearn, setSkillsToLearn] = useState([])
  const [availability, setAvailability] = useState({ weekdays: [], preferredTime: [] })
  const [location, setLocation] = useState('')
  const [languages, setLanguages] = useState('')
  const [socialLinks, setSocialLinks] = useState({ linkedin: '', github: '', website: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(()=>{
    const load = async () => {
      try {
        if (!user) await fetchMe()
        // Optionally fetch existing profile to prefill
        if (user?._id) {
          try {
            const { data } = await api.get(`/api/profiles/${user._id}`)
            setIntroduction(data.introduction || '')
            setSkillsToTeach(data.skillsToTeach || [])
            setSkillsToLearn(data.skillsToLearn || [])
            setAvailability(data.availability || { weekdays: [], preferredTime: [] })
            setLocation(data.location || '')
            setLanguages((data.languages || []).join(', '))
            setSocialLinks(data.socialLinks || { linkedin:'', github:'', website:'' })
          } catch {
            // no existing profile; ignore
          }
        }
      } catch (e) {
        setError('Failed to load user')
      }
    }
    load()
  }, [])

  const toggleWeekday = (d) => {
    const next = availability.weekdays.includes(d) ? availability.weekdays.filter(x=>x!==d) : [...availability.weekdays, d]
    setAvailability({ ...availability, weekdays: next })
  }
  const toggleTime = (t) => {
    const next = availability.preferredTime.includes(t) ? availability.preferredTime.filter(x=>x!==t) : [...availability.preferredTime, t]
    setAvailability({ ...availability, preferredTime: next })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      const payload = {
        introduction,
        skillsToTeach,
        skillsToLearn,
        availability,
        location,
        languages: languages.split(',').map(s=>s.trim()).filter(Boolean),
        socialLinks,
      }
      const { data } = await api.post('/api/profiles', payload)
      setMessage(data.message || 'Profile saved')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card bg-base-200">
        <div className="card-body space-y-4">
          <h2 className="card-title">Your Profile</h2>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label"><span className="label-text">Introduction</span></label>
              <textarea className="textarea textarea-bordered h-28" value={introduction} onChange={(e)=>setIntroduction(e.target.value)} placeholder="Tell others about you" />
            </div>

            <SkillsEditor title="Skills to Teach" value={skillsToTeach} onChange={setSkillsToTeach} />
            <SkillsEditor title="Skills to Learn" value={skillsToLearn} onChange={setSkillsToLearn} />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Location</span></label>
                <input className="input input-bordered" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="City, Country" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Languages (comma separated)</span></label>
                <input className="input input-bordered" value={languages} onChange={(e)=>setLanguages(e.target.value)} placeholder="e.g. English, Hindi" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="mb-2 font-medium">Availability - Weekdays</div>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(d=> (
                    <button type="button" key={d} className={`btn btn-sm ${availability.weekdays.includes(d) ? 'btn-primary' : 'btn-outline'}`} onClick={()=>toggleWeekday(d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 font-medium">Availability - Preferred Time</div>
                <div className="flex flex-wrap gap-2">
                  {TIMES.map(t=> (
                    <button type="button" key={t} className={`btn btn-sm ${availability.preferredTime.includes(t) ? 'btn-primary' : 'btn-outline'}`} onClick={()=>toggleTime(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <input className="input input-bordered" placeholder="LinkedIn URL" value={socialLinks.linkedin} onChange={(e)=>setSocialLinks({...socialLinks, linkedin: e.target.value})} />
              <input className="input input-bordered" placeholder="GitHub URL" value={socialLinks.github} onChange={(e)=>setSocialLinks({...socialLinks, github: e.target.value})} />
              <input className="input input-bordered" placeholder="Website URL" value={socialLinks.website} onChange={(e)=>setSocialLinks({...socialLinks, website: e.target.value})} />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <div className="card-actions">
              <button className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
