"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'
import { MoreVertical, DollarSign, BarChart2 } from 'lucide-react'

const salesData = [
    { name: 'Electronic', value: 55640, color: '#C2F970' },
    { name: 'Furniture', value: 11420, color: '#4ade80' },
    { name: 'Clothes', value: 1840, color: '#fef08a' },
    { name: 'Shoes', value: 2120, color: '#a3e635' },
]

const profitData = [
    { name: 'Mon', value: 120000 },
    { name: 'Tue', value: 125000 },
    { name: 'Wed', value: 118000 },
    { name: 'Thu', value: 130000 },
    { name: 'Fri', value: 128000 },
    { name: 'Sat', value: 136755 },
    { name: 'Sun', value: 135000 },
]

export function DashboardCharts() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Sales Overview Donut */}
            <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 z-10 relative">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Sales Overview</h2>
                    <button className="text-muted-foreground hover:text-foreground"><MoreVertical className="h-5 w-5" /></button>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-[240px]">
                    {/* Chart */}
                    <div className="relative w-48 h-48 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={8}
                                >
                                    {salesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} className="drop- hover:opacity-80 transition-opacity outline-none" />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-foreground">102k</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Weekly Visits</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 w-full relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Number of Sales</div>
                                <div className="text-2xl font-bold text-foreground">₹71,020</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {salesData.map((item) => (
                                <div key={item.name} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                                    </div>
                                    <div className="text-base font-bold text-foreground pl-4.5">₹{item.value.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Charts Stack */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 h-[110px]">
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center">
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="text-sm text-muted-foreground">New customers:</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-foreground">862</span>
                            <span className="text-xs text-destructive font-medium">-8%</span>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3">
                            <BarChart2 className="h-4 w-4" />
                        </div>
                        <div className="text-sm text-muted-foreground">Total profit:</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-foreground">₹25.6k</span>
                            <span className="text-xs text-primary font-medium">+42%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 flex-1 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-sm font-medium text-muted-foreground">Total Profit:</div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-foreground">₹1,36,755.77</span>
                            <span className="text-[10px] text-muted-foreground">| February 2024</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -left-2 -right-2 h-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={profitData}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#C2F970"
                                    strokeWidth={3}
                                    dot={false}
                                    style={{ filter: 'drop-shadow(0px 10px 10px rgba(194, 249, 112, 0.4))' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#202226', border: '1px solid #33363D', borderRadius: '8px' }}
                                    itemStyle={{ color: '#C2F970' }}
                                    formatter={(value: number | undefined) => [`₹${(value ?? 0).toLocaleString()}`, 'Profit']}
                                    labelStyle={{ display: 'none' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
