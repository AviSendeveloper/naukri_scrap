import { useState, useEffect } from 'react'
import {
    HiOutlineKey,
    HiOutlineChip,
    HiOutlineClock,
    HiOutlineAdjustments,
    HiOutlineSave,
    HiOutlinePlus,
    HiOutlineX
} from 'react-icons/hi'
import { fetchConfig, updateConfig } from '../services/api'
import Loader from '../components/Loader'

export default function Settings() {
    const [config, setConfig] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [newKeyword, setNewKeyword] = useState('')
    const [newSkill, setNewSkill] = useState('')
    const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error

    useEffect(() => {
        fetchConfig()
            .then(res => setConfig(res.data))
            .catch(err => console.error('Config fetch error:', err))
            .finally(() => setIsLoading(false))
    }, [])

    const addKeyword = () => {
        if (newKeyword.trim() && !config.keywords.includes(newKeyword.trim())) {
            setConfig(prev => ({ ...prev, keywords: [...prev.keywords, newKeyword.trim()] }))
            setNewKeyword('')
        }
    }

    const removeKeyword = (kw) => {
        setConfig(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }))
    }

    const addSkill = () => {
        if (newSkill.trim() && !config.skills.includes(newSkill.trim())) {
            setConfig(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
            setNewSkill('')
        }
    }

    const removeSkill = (skill) => {
        setConfig(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
    }

    const handleSave = async () => {
        setSaveStatus('saving')
        try {
            const res = await updateConfig(config)
            setConfig(res.data)
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (err) {
            console.error('Save error:', err)
            setSaveStatus('error')
            setTimeout(() => setSaveStatus('idle'), 3000)
        }
    }

    if (isLoading) return <Loader message="Loading settings..." />

    if (!config) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h2>Settings</h2>
                        <p>Could not load configuration.</p>
                    </div>
                </div>
            </div>
        )
    }

    const saveLabel = {
        idle: 'Save Changes',
        saving: 'Saving...',
        saved: 'Saved ✓',
        error: 'Error ✗',
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Settings</h2>
                    <p>Manage scraping configuration</p>
                </div>
                <button
                    className={`btn ${saveStatus === 'error' ? 'btn-outline' : 'btn-primary'}`}
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                >
                    <HiOutlineSave /> {saveLabel[saveStatus]}
                </button>
            </div>

            <div className="settings-grid">
                {/* Keywords */}
                <div className="settings-card animate-in animate-in-delay-1">
                    <h3><HiOutlineKey /> Search Keywords</h3>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                        Keywords used for searching jobs on Naukri.com
                    </p>
                    <div className="tags-list" style={{ marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
                        {config.keywords.map(kw => (
                            <span key={kw} className="tag primary" style={{ padding: '6px 12px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}>
                                {kw}
                                <HiOutlineX
                                    style={{ cursor: 'pointer', opacity: 0.7 }}
                                    onClick={() => removeKeyword(kw)}
                                />
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Add keyword..."
                            value={newKeyword}
                            onChange={e => setNewKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addKeyword()}
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-outline" onClick={addKeyword}>
                            <HiOutlinePlus />
                        </button>
                    </div>
                </div>

                {/* Skills */}
                <div className="settings-card animate-in animate-in-delay-2">
                    <h3><HiOutlineChip /> Matching Skills</h3>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                        Skills used for matching against job listings
                    </p>
                    <div className="tags-list" style={{ marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
                        {config.skills.map(skill => (
                            <span key={skill} className="tag secondary" style={{ padding: '6px 12px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}>
                                {skill}
                                <HiOutlineX
                                    style={{ cursor: 'pointer', opacity: 0.7 }}
                                    onClick={() => removeSkill(skill)}
                                />
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Add skill..."
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSkill()}
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-outline" onClick={addSkill}>
                            <HiOutlinePlus />
                        </button>
                    </div>
                </div>

                {/* Experience Range */}
                <div className="settings-card animate-in animate-in-delay-3">
                    <h3><HiOutlineClock /> Experience Range</h3>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                        Filter jobs by required experience
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Minimum (years)</label>
                            <input
                                className="form-input"
                                type="number"
                                min="0"
                                max="30"
                                value={config.experience?.min ?? 0}
                                onChange={e => setConfig(prev => ({
                                    ...prev,
                                    experience: { ...prev.experience, min: parseInt(e.target.value) || 0 }
                                }))}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Maximum (years)</label>
                            <input
                                className="form-input"
                                type="number"
                                min="0"
                                max="30"
                                value={config.experience?.max ?? 5}
                                onChange={e => setConfig(prev => ({
                                    ...prev,
                                    experience: { ...prev.experience, max: parseInt(e.target.value) || 0 }
                                }))}
                            />
                        </div>
                    </div>
                    <div style={{
                        marginTop: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        background: 'var(--accent-info-muted)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-sm)',
                        color: 'var(--accent-info)'
                    }}>
                        Currently filtering: {config.experience?.min ?? 0}–{config.experience?.max ?? 5} years
                    </div>
                </div>

                {/* Scraping Parameters */}
                <div className="settings-card animate-in animate-in-delay-4">
                    <h3><HiOutlineAdjustments /> Scraping Parameters</h3>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                        Control scraping behavior
                    </p>
                    <div className="form-group">
                        <label className="form-label">Pages per keyword</label>
                        <input
                            className="form-input"
                            type="number"
                            min="1"
                            max="20"
                            value={config.scraping?.pagesPerKeyword ?? 3}
                            onChange={e => setConfig(prev => ({
                                ...prev,
                                scraping: { ...prev.scraping, pagesPerKeyword: parseInt(e.target.value) || 1 }
                            }))}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Delay between keywords (ms)</label>
                        <input
                            className="form-input"
                            type="number"
                            min="1000"
                            max="30000"
                            step="1000"
                            value={config.scraping?.delayBetweenKeywords ?? 5000}
                            onChange={e => setConfig(prev => ({
                                ...prev,
                                scraping: { ...prev.scraping, delayBetweenKeywords: parseInt(e.target.value) || 5000 }
                            }))}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="form-label" style={{ marginBottom: 0 }}>Scrape job details</span>
                        <label style={{
                            position: 'relative',
                            width: '44px',
                            height: '24px',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={config.scraping?.scrapeJobDetails ?? true}
                                onChange={e => setConfig(prev => ({
                                    ...prev,
                                    scraping: { ...prev.scraping, scrapeJobDetails: e.target.checked }
                                }))}
                                style={{ display: 'none' }}
                            />
                            <span style={{
                                position: 'absolute',
                                inset: 0,
                                background: (config.scraping?.scrapeJobDetails ?? true) ? 'var(--accent-primary)' : 'var(--bg-surface-active)',
                                borderRadius: 'var(--radius-full)',
                                transition: 'background var(--transition-fast)',
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: (config.scraping?.scrapeJobDetails ?? true) ? '23px' : '3px',
                                    width: '18px',
                                    height: '18px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    transition: 'left var(--transition-fast)',
                                }} />
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
