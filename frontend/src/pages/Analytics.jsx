import {
    HiOutlineBriefcase,
    HiOutlineOfficeBuilding,
    HiOutlineLocationMarker,
    HiOutlineChip
} from 'react-icons/hi'
import { jobsByKeyword, topCompanies, topSkills, jobsByLocation, jobsByIndustry, mockJobs } from '../data/mockData'

function BarChart({ data, labelKey, valueKey, colorRotation = ['primary', 'secondary', 'warning', 'info'] }) {
    const maxVal = Math.max(...data.map(d => d[valueKey]))
    return (
        <div className="bar-chart">
            {data.map((item, i) => (
                <div className="bar-chart-item" key={item[labelKey]}>
                    <span className="bar-chart-label" title={item[labelKey]}>{item[labelKey]}</span>
                    <div className="bar-chart-bar-wrapper">
                        <div
                            className={`bar-chart-bar ${colorRotation[i % colorRotation.length]}`}
                            style={{ width: `${(item[valueKey] / maxVal) * 100}%` }}
                        >
                            <span className="bar-chart-value">{item[valueKey]}</span>
                        </div>
                    </div>
                    <span className="bar-chart-count">{item[valueKey]}</span>
                </div>
            ))}
        </div>
    )
}

function DonutChart({ data, labelKey, valueKey, colors }) {
    const total = data.reduce((sum, d) => sum + d[valueKey], 0)
    let cumulativePercent = 0

    const segments = data.map((item, i) => {
        const percent = (item[valueKey] / total) * 100
        const startAngle = (cumulativePercent / 100) * 360
        const endAngle = ((cumulativePercent + percent) / 100) * 360
        cumulativePercent += percent

        const startRad = ((startAngle - 90) * Math.PI) / 180
        const endRad = ((endAngle - 90) * Math.PI) / 180
        const largeArc = percent > 50 ? 1 : 0

        const x1 = 80 + 60 * Math.cos(startRad)
        const y1 = 80 + 60 * Math.sin(startRad)
        const x2 = 80 + 60 * Math.cos(endRad)
        const y2 = 80 + 60 * Math.sin(endRad)

        return (
            <path
                key={i}
                d={`M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[i % colors.length]}
                stroke="var(--bg-surface)"
                strokeWidth="2"
            />
        )
    })

    return (
        <div className="donut-chart">
            <svg className="donut-svg" viewBox="0 0 160 160">
                {segments}
                <circle cx="80" cy="80" r="35" fill="var(--bg-surface)" />
                <text x="80" y="76" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">{total}</text>
                <text x="80" y="94" textAnchor="middle" fill="var(--text-muted)" fontSize="10">Total</text>
            </svg>
            <div className="donut-legend">
                {data.map((item, i) => (
                    <div className="donut-legend-item" key={item[labelKey]}>
                        <span className="donut-legend-color" style={{ background: colors[i % colors.length] }}></span>
                        <span className="donut-legend-label">{item[labelKey]}</span>
                        <span className="donut-legend-value">{item[valueKey]}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function Analytics() {
    const salaryRanges = (() => {
        const ranges = { 'Not disclosed': 0, '< ₹10 LPA': 0, '₹10-20 LPA': 0, '₹20-30 LPA': 0, '₹30+ LPA': 0 }
        mockJobs.forEach(j => {
            if (j.salary === 'Not disclosed') { ranges['Not disclosed']++; return }
            const match = j.salary.match(/₹(\d+)/)
            if (!match) return
            const min = parseInt(match[1])
            if (min < 10) ranges['< ₹10 LPA']++
            else if (min < 20) ranges['₹10-20 LPA']++
            else if (min < 30) ranges['₹20-30 LPA']++
            else ranges['₹30+ LPA']++
        })
        return Object.entries(ranges).map(([range, count]) => ({ range, count })).filter(r => r.count > 0)
    })()

    const donutColors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Analytics</h2>
                    <p>Insights from {mockJobs.length} scraped jobs</p>
                </div>
            </div>

            <div className="section-grid">
                {/* Jobs by Keyword */}
                <div className="card animate-in animate-in-delay-1">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title"><HiOutlineBriefcase style={{ verticalAlign: 'middle', marginRight: '8px' }} />Jobs by Keyword</h3>
                            <p className="card-subtitle">Search term distribution</p>
                        </div>
                    </div>
                    <BarChart data={jobsByKeyword} labelKey="keyword" valueKey="count" />
                </div>

                {/* Jobs by Location (Donut) */}
                <div className="card animate-in animate-in-delay-2">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title"><HiOutlineLocationMarker style={{ verticalAlign: 'middle', marginRight: '8px' }} />Jobs by Location</h3>
                            <p className="card-subtitle">Geographic distribution</p>
                        </div>
                    </div>
                    <DonutChart data={jobsByLocation} labelKey="location" valueKey="count" colors={donutColors} />
                </div>

                {/* Top Companies */}
                <div className="card animate-in animate-in-delay-3">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title"><HiOutlineOfficeBuilding style={{ verticalAlign: 'middle', marginRight: '8px' }} />Top Companies</h3>
                            <p className="card-subtitle">Companies with most listings</p>
                        </div>
                    </div>
                    <BarChart data={topCompanies} labelKey="company" valueKey="count" colorRotation={['info', 'primary', 'secondary', 'warning']} />
                </div>

                {/* Top Skills */}
                <div className="card animate-in animate-in-delay-4">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title"><HiOutlineChip style={{ verticalAlign: 'middle', marginRight: '8px' }} />Top Skills</h3>
                            <p className="card-subtitle">Most demanded skills</p>
                        </div>
                    </div>
                    <BarChart data={topSkills} labelKey="skill" valueKey="count" colorRotation={['secondary', 'info', 'warning', 'primary']} />
                </div>
            </div>

            {/* Full Width Charts */}
            <div className="section-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                {/* Salary Distribution */}
                <div className="card animate-in animate-in-delay-3">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">💰 Salary Distribution</h3>
                            <p className="card-subtitle">Salary ranges across listings</p>
                        </div>
                    </div>
                    <BarChart data={salaryRanges} labelKey="range" valueKey="count" colorRotation={['warning', 'secondary', 'primary', 'info']} />
                </div>

                {/* Industry Types */}
                <div className="card animate-in animate-in-delay-4">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">🏭 Industry Types</h3>
                            <p className="card-subtitle">Job distribution by industry</p>
                        </div>
                    </div>
                    <DonutChart data={jobsByIndustry} labelKey="industry" valueKey="count" colors={donutColors} />
                </div>
            </div>
        </div>
    )
}
