import { MoreVertical, Star, Zap } from "lucide-react"

const customers = [
    { name: "Danny Liu", email: "danny@gmail.com", deals: "1,023", value: "$37,431", avatar: "DL" },
    { name: "Bella Deviant", email: "bella@gmail.com", deals: "963", value: "$30,423", avatar: "BD" },
    { name: "Darrell Steward", email: "darrel@gmail.com", deals: "843", value: "$28,549", avatar: "DS" },
]

export function DashboardBottomRow() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Customer list</h2>
                    <button className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/50 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                <th className="pb-3 flex items-center gap-1 font-semibold">Name <span className="text-[10px] opacity-50">▲</span></th>
                                <th className="pb-3 text-right">Deals <span className="text-[10px] opacity-50">▲</span></th>
                                <th className="pb-3 text-right">Total Deal Value <span className="text-[10px] opacity-50">▲</span></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm dive-y divide-border/30">
                            {customers.map((cust, i) => (
                                <tr key={i} className="hover:bg-secondary/20 transition-colors group">
                                    <td className="py-4 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-primary text-primary-foreground flex items-center justify-center font-bold text-xs ring-2 ring-background">
                                            {cust.avatar}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">{cust.name}</span>
                                            <span className="text-xs text-muted-foreground">{cust.email}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right font-medium text-foreground">{cust.deals}</td>
                                    <td className="py-4 text-right font-bold text-foreground">{cust.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="relative bg-gradient-to-br from-green-950 to-[#10190D] border border-[#233519] rounded-2xl p-6 overflow-hidden flex flex-col justify-between group border-green-900">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/20 transition-all duration-700"></div>

                <div className="relative z-10 flex justify-between items-start mb-4">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#203D1A] to-[#12230E] border border-primary/20 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm">
                        <Zap className="h-3 w-3 text-primary fill-primary" /> Premium Plan
                    </div>
                    <button className="text-primary/70 hover:text-primary transition-colors">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>

                <div className="relative z-10 my-4 flex items-end gap-2">
                    <span className="text-5xl font-extrabold text-white">$30</span>
                    <span className="text-xs text-primary/70 font-medium pb-2 border-l border-primary/30 pl-2 leading-tight">
                        Per Month<br />Per User
                    </span>
                </div>

                <div className="relative z-10 mb-6 flex flex-col">
                    <p className="text-sm font-medium text-gray-300">
                        Improve your workplace, view and analyze your profits and losses ✨
                    </p>
                </div>

                <div className="relative z-10 flex gap-3">
                    <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all active:scale-95 font-bold py-3 px-4 rounded-xl">
                        Get Started
                    </button>
                    <button className="bg-[#203D1A] hover:bg-[#2A4D23] transition-colors border border-primary/20 text-white p-3 rounded-xl flex items-center justify-center">
                        <Star className="h-5 w-5 text-primary fill-primary/30" />
                    </button>
                </div>
            </div>
        </div>
    )
}
