import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react"

const metrics = [
    {
        title: "Net revenue",
        value: "₹3,131,021",
        change: "+0.4%",
        trend: "up",
        period: "vs last month"
    },
    {
        title: "ARR",
        value: "₹1,511,121",
        change: "+32%",
        trend: "up",
        period: "vs last quarter"
    },
    {
        title: "Quarterly revenue goal",
        value: "71%",
        goal: "₹1.1M",
        type: "progress"
    },
    {
        title: "New orders",
        value: "18,221",
        change: "+11%",
        trend: "up",
        period: "vs last quarter"
    }
]

export function DashboardMetrics() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map((metric, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/50 transition-colors group">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{metric.title}</h3>
                    <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-bold tracking-tight text-foreground">{metric.value}</span>
                        {metric.type === 'progress' && (
                            <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-secondary stroke-current"
                                        strokeWidth="3"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-primary stroke-current drop-"
                                        strokeDasharray={`${parseInt(metric.value)}, 100`}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                    {metric.change && (
                        <div className="flex items-center gap-1.5 mt-3 text-sm">
                            <span className={`flex items-center font-medium ${metric.trend === 'up' ? 'text-primary' : 'text-destructive'}`}>
                                {metric.trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                                {metric.change}
                            </span>
                            <span className="text-muted-foreground text-xs">{metric.period}</span>
                        </div>
                    )}
                    {metric.goal && (
                        <div className="mt-3 text-xs text-muted-foreground font-medium">
                            Goal: {metric.goal}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
