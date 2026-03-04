import { UserPlus, ShoppingBag, ArrowDownToLine, MessageCircle, MoreHorizontal, Phone } from "lucide-react"

const notifications = [
    { id: 1, text: "56 New users registred.", time: "Just now", icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: 2, text: "132 Orders placed.", time: "59 Minutes ago", icon: ShoppingBag, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: 3, text: "Funds have been withdrawn.", time: "12 Hours ago", icon: ArrowDownToLine, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: 4, text: "5 Unread messages.", time: "Today, 11:59 PM", icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
]

const activities = [
    { id: 1, text: "Changed the style.", time: "Just now", avatar: "JD", color: "from-blue-400 to-indigo-500" },
    { id: 2, text: "177 New products added.", time: "47 Minutes ago", avatar: "AS", color: "from-rose-400 to-red-500" },
    { id: 3, text: "11 Products have been archived.", time: "1 Days ago", avatar: "BK", color: "from-amber-400 to-orange-500" },
    { id: 4, text: "Page \"Toys\" has been removed.", time: "Feb 2, 2024", avatar: "CW", color: "from-amber-100 to-amber-200" },
]

const contacts = [
    { id: 1, name: "Daniel Craig", avatar: "DC", color: "from-orange-400 to-amber-500", active: false },
    { id: 2, name: "Kate Morrison", avatar: "KM", color: "from-purple-400 to-pink-500", active: false },
    { id: 3, name: "Nataniel Donowan", avatar: "ND", color: "from-primary to-emerald-500", active: true },
    { id: 4, name: "Elisabeth Wayne", avatar: "EW", color: "from-blue-400 to-cyan-500", active: false },
    { id: 5, name: "Felicia Raspet", avatar: "FR", color: "from-rose-400 to-pink-500", active: false },
]

export function DashboardRightSidebar() {
    return (
        <div className="flex flex-col gap-8 w-full">
            {/* Notifications */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Notifications</h3>
                <div className="space-y-4">
                    {notifications.map((notif) => (
                        <div key={notif.id} className="flex items-start gap-3">
                            <div className={`mt-0.5 h-8 w-8 rounded-full ${notif.bg} ${notif.color} flex items-center justify-center shrink-0`}>
                                <notif.icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{notif.text}</span>
                                <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-border/50 w-full" />

            {/* Activities */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Activities</h3>
                <div className="space-y-4">
                    {activities.map((act) => (
                        <div key={act.id} className="flex flex-col relative pl-10 border-l border-border/30 pb-2 last:pb-0 last:border-transparent">
                            <div className={`absolute left-[-17px] top-0 h-8 w-8 rounded-full bg-gradient-to-tr ${act.color} text-white flex items-center justify-center text-[10px] font-bold shadow-sm ring-4 ring-background`}>
                                {act.avatar}
                            </div>
                            <div className="flex flex-col -mt-1 relative top-1">
                                <span className="text-sm font-medium text-foreground leading-tight">{act.text}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{act.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-border/50 w-full" />

            {/* Contacts */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Contacts of your managers</h3>
                <div className="space-y-3">
                    {contacts.map((contact) => (
                        <div
                            key={contact.id}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${contact.active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-secondary/30'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${contact.color} text-white flex items-center justify-center text-[10px] font-bold shadow-sm relative`}>
                                    {contact.avatar}
                                </div>
                                <span className={`text-sm font-medium ${contact.active ? 'text-primary drop-shadow-sm' : 'text-muted-foreground'}`}>
                                    {contact.name}
                                </span>
                            </div>
                            {contact.active ? (
                                <div className="flex gap-2">
                                    <button className="h-7 w-7 rounded-sm bg-primary/20 hover:bg-primary/40 text-primary flex items-center justify-center transition-colors">
                                        <MessageCircle className="h-3.5 w-3.5 fill-primary" />
                                    </button>
                                    <button className="h-7 w-7 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all">
                                        <Phone className="h-3.5 w-3.5 fill-current" />
                                    </button>
                                </div>
                            ) : (
                                <button className="text-muted-foreground/50 hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
