import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Plus, Trash2, LogOut, QrCode, CheckCircle2, 
  Loader2, Send, LayoutDashboard, Zap, Settings, User, 
  Menu, X, ChevronRight, Bell, Shield, Smartphone, Calendar,
  Users, Inbox, Search, Phone, Video, MoreVertical, Paperclip, Smile, Info, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Page = 'dashboard' | 'automations' | 'chatbot' | 'bookings' | 'broadcast' | 'inbox' | 'settings';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  
  // Data states
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ keyword: '', reply: '' });
  const [menuConfig, setMenuConfig] = useState<any>({ enabled: true, welcomeText: '', options: [] });
  const [menuPath, setMenuPath] = useState<string[]>([]); // To track which submenu we are editing
  const [bookings, setBookings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastContacts, setBroadcastContacts] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [waStatus, setWaStatus] = useState<{ status: string; qr: string | null }>({ status: 'connecting', qr: null });
  const [activeContact, setActiveContact] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    let interval: any;
    if (user) {
      fetchWaStatus();
      fetchData();
      interval = setInterval(() => {
        fetchWaStatus();
        fetchData();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setRules(data.rules || []);
        setMenuConfig(data.menu || { enabled: true, welcomeText: '', options: [] });
      }
    } catch (e) {}
    setLoading(false);
  };

  const fetchData = async () => {
    try {
      const [bookingsRes, messagesRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/messages')
      ]);
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (messagesRes.ok) setMessages(await messagesRes.json());
    } catch (e) {}
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      if (isRegister) {
        setIsRegister(false);
        alert('Registered successfully! Please login.');
      } else {
        checkAuth();
      }
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  const fetchWaStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setWaStatus(data);
    } catch (e) {}
  };

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.keyword || !newRule.reply) return;
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    });
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules);
      setNewRule({ keyword: '', reply: '' });
    }
  };

  const deleteRule = async (id: string) => {
    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules);
    }
  };

  const saveMenu = async () => {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuConfig),
    });
    if (res.ok) alert('Menu saved!');
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg || !broadcastContacts) return;
    const contacts = broadcastContacts.split(',').map(c => c.trim().includes('@') ? c.trim() : `${c.trim()}@s.whatsapp.net`);
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: broadcastMsg, contacts }),
    });
    if (res.ok) {
      alert('Broadcast sent!');
      setBroadcastMsg('');
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const sendReply = async (to: string) => {
    const text = replyText[to];
    if (!text) return;
    const res = await fetch('/api/messages/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text }),
    });
    if (res.ok) {
      setReplyText({ ...replyText, [to]: '' });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[25%] -left-[25%] w-[70%] h-[70%] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-[25%] -right-[25%] w-[70%] h-[70%] bg-blue-500/10 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-10 relative z-10"
        >
          <div className="flex justify-center mb-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <MessageSquare className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight font-display">
              {isRegister ? 'Join WA BOT' : 'Welcome Back'}
            </h1>
            <p className="text-neutral-500 text-sm">
              {isRegister ? 'Start automating your business today' : 'Sign in to manage your WhatsApp bot'}
            </p>
          </div>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase ml-1">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase ml-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit"
              className="btn-primary w-full text-lg mt-4"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="w-full mt-10 text-neutral-500 hover:text-emerald-500 text-sm font-semibold transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </motion.div>
      </div>
    );
  }

  const SidebarItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: Page }) => (
    <button
      onClick={() => setActivePage(id)}
      className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3.5 rounded-2xl transition-colors group relative ${
        activePage === id 
          ? 'bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20' 
          : 'text-neutral-400 hover:bg-white/5 hover:text-white'
      }`}
      title={label}
    >
      <Icon className={`w-5 h-5 ${activePage === id ? 'text-neutral-950' : 'text-neutral-500 group-hover:text-emerald-500'}`} />
      <span className="hidden lg:inline text-sm tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex font-sans selection:bg-emerald-500/30">
      <aside className="flex flex-col w-20 lg:w-72 bg-neutral-900 border-r border-white/5 sticky top-0 h-screen z-50">
        <div className="h-full flex flex-col p-4 lg:p-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <MessageSquare className="w-6 h-6 text-neutral-950" />
            </div>
            <span className="hidden lg:inline font-bold text-2xl text-white tracking-tighter font-display">WA BOT</span>
          </div>

          <div className="flex-1 space-y-1">
            <p className="hidden lg:block text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] px-4 mb-4">Main Menu</p>
            <nav className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
              <SidebarItem icon={Inbox} label="Team Inbox" id="inbox" />
              <SidebarItem icon={Zap} label="Automations" id="automations" />
              <SidebarItem icon={MessageSquare} label="Chatbot" id="chatbot" />
            </nav>

            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] px-4 mt-8 mb-4">Engagement</p>
            <nav className="space-y-1">
              <SidebarItem icon={Users} label="Broadcast" id="broadcast" />
              <SidebarItem icon={Calendar} label="Bookings" id="bookings" />
            </nav>

            <p className="hidden lg:block text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] px-4 mt-8 mb-4">System</p>
            <nav className="space-y-1">
              <SidebarItem icon={Settings} label="Settings" id="settings" />
            </nav>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-4 mb-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-400 border border-white/5 shrink-0">
                <User size={20} />
              </div>
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 rounded-2xl text-neutral-500 hover:text-red-500 hover:bg-red-500/5 transition-all font-semibold group">
              <LogOut className="w-5 h-5 transition-transform" />
              <span className="hidden lg:inline text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-6 flex-1">
            <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-2 w-full max-w-md group focus-within:border-emerald-500/50 transition-all">
              <Search size={18} className="text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
              <input type="text" placeholder="Search anything..." className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-neutral-600" />
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-800 rounded text-[10px] font-bold text-neutral-500 border border-white/5">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-neutral-950" />
            </button>
            <div className="h-8 w-px bg-white/5 mx-2" />
            <div className={`px-4 py-2 bg-neutral-900 rounded-full border border-white/5 flex items-center gap-2.5 shadow-inner`}>
              <div className={`w-2 h-2 rounded-full ${waStatus.status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`} />
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{waStatus.status}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white font-display">Welcome back, {user?.email?.split('@')[0]}</h2>
                    <p className="text-neutral-500 text-sm mt-1">Here's what's happening with your WhatsApp bot today.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn-secondary px-6 py-3 text-sm">
                      <Calendar size={18} />
                      <span>Schedule</span>
                    </button>
                    <button onClick={() => setActivePage('broadcast')} className="btn-primary px-6 py-3 text-sm">
                      <Plus size={18} />
                      <span>New Broadcast</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Messages', value: messages.length, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Active Rules', value: rules.length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Bookings', value: bookings.length, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Contacts', value: new Set(messages.map(m => m.from)).size, icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                  ].map((stat, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="glass-card p-8 group relative overflow-hidden"
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl -mr-12 -mt-12 transition-all group-hover:scale-150`} />
                      <div className="relative z-10">
                        <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-6 border border-white/5 shadow-inner group-hover:rotate-12 transition-transform`}>
                          <stat.icon size={28} />
                        </div>
                        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <h4 className="text-4xl font-bold text-white font-display tracking-tight">{stat.value}</h4>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 glass-card p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] -mr-48 -mt-48" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div>
                          <h3 className="text-2xl font-bold text-white font-display">Device Connection</h3>
                          <p className="text-neutral-500 text-sm mt-1">Link your device to start automating</p>
                        </div>
                        <div className={`badge ${waStatus.status === 'connected' ? 'badge-emerald' : 'badge-neutral animate-pulse'}`}>
                          {waStatus.status}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="relative p-6 bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                          {waStatus.status === 'qr' && waStatus.qr ? (
                            <img src={waStatus.qr} alt="QR Code" className="w-56 h-56" />
                          ) : waStatus.status === 'connected' ? (
                            <div className="w-56 h-56 flex flex-col items-center justify-center text-emerald-500">
                              <CheckCircle2 size={80} className="mb-4" />
                              <p className="font-bold text-neutral-900">DEVICE LINKED</p>
                            </div>
                          ) : (
                            <div className="w-56 h-56 flex items-center justify-center">
                              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-6">
                          <h4 className="text-lg font-bold text-white">How to connect:</h4>
                          <ol className="space-y-4">
                            {[
                              'Open WhatsApp on your phone',
                              'Tap Menu or Settings and select Linked Devices',
                              'Tap on Link a Device',
                              'Point your phone to this screen to capture the code'
                            ].map((step, i) => (
                              <li key={i} className="flex items-start gap-4 text-neutral-400">
                                <span className="w-6 h-6 bg-neutral-950 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-500 border border-white/5">{i + 1}</span>
                                <span className="text-sm font-medium">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-10 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -ml-32 -mb-32" />
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-white font-display mb-2">Quick Actions</h3>
                      <p className="text-neutral-500 text-sm mb-8">Common tasks to get started</p>
                      <div className="space-y-3">
                        {[
                          { label: 'Create Auto-Reply', icon: Zap, page: 'automations' },
                          { label: 'Setup Chatbot', icon: MessageSquare, page: 'chatbot' },
                          { label: 'Send Broadcast', icon: Send, page: 'broadcast' },
                          { label: 'View Inbox', icon: Inbox, page: 'inbox' },
                        ].map((action, i) => (
                          <button 
                            key={i}
                            onClick={() => setActivePage(action.page as Page)}
                            className="w-full p-4 bg-neutral-950/50 border border-white/5 rounded-2xl flex items-center gap-4 text-neutral-400 hover:text-white hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all group"
                          >
                            <action.icon size={18} className="group-hover:text-emerald-500 transition-colors" />
                            <span className="text-sm font-bold">{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-8 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative z-10">
                      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                        Need help? Check our <span className="text-emerald-500 cursor-pointer hover:underline">documentation</span> or contact support.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'automations' && (
              <motion.div key="automations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white font-display">Auto Reply Rules</h2>
                    <p className="text-neutral-500 text-sm mt-1">Set up keywords that trigger automatic responses instantly.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="glass-card p-8 sticky top-28">
                      <h3 className="text-xl font-bold text-white font-display mb-6">Create New Rule</h3>
                      <form onSubmit={addRule} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Trigger Keyword</label>
                          <div className="relative">
                            <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                            <input type="text" value={newRule.keyword} onChange={e => setNewRule({...newRule, keyword: e.target.value})} placeholder="e.g. price, hours" className="input-field pl-14" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Auto Response</label>
                          <textarea value={newRule.reply} onChange={e => setNewRule({...newRule, reply: e.target.value})} placeholder="Enter the reply message..." className="input-field h-32 resize-none leading-relaxed" required />
                        </div>
                        <button type="submit" className="btn-primary w-full">
                          <Plus size={18} />
                          <span>Add Automation</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Active Automations ({rules.length})</p>
                    </div>
                    {rules.map(rule => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={rule.id} 
                        className="glass-card p-6 flex items-center justify-between group hover:border-emerald-500/20 transition-all"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:rotate-12 transition-transform">
                            <Zap size={20} />
                          </div>
                          <div>
                            <p className="text-white font-bold text-lg">{rule.keyword}</p>
                            <p className="text-neutral-500 text-sm line-clamp-1">{rule.reply}</p>
                          </div>
                        </div>
                        <button onClick={() => deleteRule(rule.id)} className="p-3 text-neutral-600 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                    {rules.length === 0 && (
                      <div className="text-center py-32 glass-card border-dashed border-neutral-800 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-neutral-900 rounded-3xl flex items-center justify-center text-neutral-700 border border-white/5">
                          <Zap size={32} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-white font-bold">No automation rules yet</p>
                          <p className="text-neutral-500 text-sm">Create your first keyword-based reply on the left.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'chatbot' && (
              <motion.div key="chatbot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white font-display">Menu Chatbot</h2>
                    <p className="text-neutral-500 text-sm mt-1">Build interactive automated flows for your customers.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-neutral-900/50 p-2 rounded-2xl border border-white/5">
                    <div className={`badge ${menuConfig.enabled ? 'badge-emerald' : 'badge-neutral'}`}>
                      {menuConfig.enabled ? 'System Active' : 'System Paused'}
                    </div>
                    <button 
                      onClick={() => setMenuConfig({ ...menuConfig, enabled: !menuConfig.enabled })}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${menuConfig.enabled ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${menuConfig.enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-10">
                      <div className="flex items-center gap-3 mb-10">
                        <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] bg-neutral-950/50 px-5 py-2.5 rounded-full border border-white/5">
                          <button onClick={() => setMenuPath([])} className="hover:text-emerald-500 transition-colors">ROOT</button>
                          {menuPath.map((p, i) => (
                            <React.Fragment key={i}>
                              <ChevronRight className="w-3 h-3 text-neutral-700" />
                              <span className="text-emerald-500/50">SUBMENU</span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {(() => {
                        const getCurrentMenu = () => {
                          let current = menuConfig;
                          for (const id of menuPath) {
                            const opt = current.options?.find((o: any) => o.id === id);
                            if (!opt) return current; // Fallback to current level if path is invalid
                            current = opt.submenu;
                          }
                          return current;
                        };
                        const current = getCurrentMenu();

                        const updateCurrentMenu = (updates: any) => {
                          const newConfig = JSON.parse(JSON.stringify(menuConfig));
                          let target = newConfig;
                          for (const id of menuPath) {
                            const opt = target.options?.find((o: any) => o.id === id);
                            if (!opt) break;
                            target = opt.submenu;
                          }
                          Object.assign(target, updates);
                          setMenuConfig(newConfig);
                        };

                        const addOption = () => {
                          const newOption = {
                            id: Math.random().toString(36).substr(2, 9),
                            trigger: ((current.options?.length || 0) + 1).toString(),
                            label: 'New Option',
                            action: 'text',
                            replyText: 'Hello!',
                            submenu: { welcomeText: 'Submenu Welcome', options: [] }
                          };
                          updateCurrentMenu({ options: [...(current.options || []), newOption] });
                        };

                        const removeOption = (id: string) => {
                          updateCurrentMenu({ options: (current.options || []).filter((o: any) => o.id !== id) });
                        };

                        const updateOption = (id: string, updates: any) => {
                          updateCurrentMenu({
                            options: (current.options || []).map((o: any) => o.id === id ? { ...o, ...updates } : o)
                          });
                        };

                        return (
                          <div className="space-y-10">
                            {menuPath.length === 0 && (
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Main Trigger Keyword</label>
                                <div className="relative">
                                  <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                  <input 
                                    type="text" 
                                    value={menuConfig.triggerKeyword || ''} 
                                    onChange={e => setMenuConfig({ ...menuConfig, triggerKeyword: e.target.value })}
                                    className="input-field pl-14" 
                                    placeholder="e.g. menu, start, hi"
                                  />
                                </div>
                                <p className="text-[10px] text-neutral-600 font-medium ml-1">This keyword (and common greetings like 'hi') will trigger the menu chatbot.</p>
                              </div>
                            )}

                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Welcome Message</label>
                              <textarea 
                                value={current.welcomeText} 
                                onChange={e => updateCurrentMenu({ welcomeText: e.target.value })}
                                className="input-field h-32 resize-none leading-relaxed" 
                                placeholder="Welcome to our business! How can we help?"
                              />
                            </div>

                            <div className="space-y-6">
                              <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Menu Options</label>
                                <button onClick={addOption} className="text-emerald-500 hover:text-emerald-400 text-xs font-bold flex items-center gap-1.5 bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 transition-all">
                                  <Plus size={14} />
                                  <span>Add Option</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-6">
                                {current.options?.map((opt: any) => (
                                  <motion.div 
                                    layout
                                    key={opt.id} 
                                    className="bg-neutral-950/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 group hover:border-emerald-500/20 transition-all"
                                  >
                                    <div className="flex flex-col sm:flex-row gap-6">
                                      <div className="w-20">
                                        <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-3 block text-center">Key</label>
                                        <input 
                                          type="text" 
                                          value={opt.trigger} 
                                          onChange={e => updateOption(opt.id, { trigger: e.target.value })}
                                          className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-3 py-4 text-center text-emerald-500 text-xl font-black focus:outline-none focus:border-emerald-500/50 shadow-inner"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-3 block">Option Label</label>
                                        <input 
                                          type="text" 
                                          value={opt.label} 
                                          onChange={e => updateOption(opt.id, { label: e.target.value })}
                                          className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-lg focus:outline-none focus:border-emerald-500/50 shadow-inner"
                                        />
                                      </div>
                                      <div className="flex items-end gap-3">
                                        <button onClick={() => removeOption(opt.id)} className="p-4 text-neutral-600 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all border border-white/5">
                                          <Trash2 size={20} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                      <div className="space-y-3">
                                        <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Action Type</label>
                                        <select 
                                          value={opt.action} 
                                          onChange={e => updateOption(opt.id, { action: e.target.value })}
                                          className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-neutral-400 focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer shadow-inner"
                                        >
                                          <option value="text">Reply with Text</option>
                                          <option value="submenu">Open Submenu</option>
                                        </select>
                                      </div>
                                      <div className="space-y-3">
                                        <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Status</label>
                                        <div className="flex items-center h-[54px] px-5 bg-neutral-900 rounded-2xl border border-white/5">
                                          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                          <span className="text-xs font-bold text-neutral-400">Active Option</span>
                                        </div>
                                      </div>
                                    </div>

                                    {opt.action === 'text' ? (
                                      <div className="space-y-3">
                                        <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">Reply Message</label>
                                        <textarea 
                                          value={opt.replyText} 
                                          onChange={e => updateOption(opt.id, { replyText: e.target.value })}
                                          className="w-full bg-neutral-900 border border-white/5 rounded-[2rem] px-6 py-5 text-sm text-neutral-300 focus:outline-none focus:border-emerald-500/50 h-32 resize-none leading-relaxed shadow-inner"
                                          placeholder="Enter the message to send..."
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 gap-4">
                                        <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                            <Menu size={20} />
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-emerald-500">Submenu Flow</p>
                                            <p className="text-xs text-neutral-500">Contains {opt.submenu?.options?.length || 0} interactive options</p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => setMenuPath([...menuPath, opt.id])}
                                          className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest text-white bg-neutral-900 px-6 py-3 rounded-xl border border-white/5 hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                                        >
                                          <span>Edit Flow</span>
                                          <ChevronRight size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                                {(current.options?.length || 0) === 0 && (
                                  <div className="text-center py-24 border-2 border-dashed border-neutral-800 rounded-[3rem] flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-neutral-900 rounded-3xl flex items-center justify-center text-neutral-700 border border-white/5">
                                      <Plus size={32} />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-white font-bold">No options added yet</p>
                                      <p className="text-neutral-500 text-sm">Click "Add Option" to start building your menu.</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <button 
                      onClick={saveMenu} 
                      className="btn-primary w-full py-6 text-xl shadow-2xl shadow-emerald-500/20"
                    >
                      <Shield size={24} />
                      <span>Save Chatbot Configuration</span>
                    </button>
                  </div>

                  <div className="space-y-8">
                    <div className="glass-card p-8 sticky top-28">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-white font-display">Live Preview</h3>
                        <Smartphone size={20} className="text-neutral-500" />
                      </div>
                      <div className="bg-neutral-950 rounded-[2.5rem] p-6 border border-white/5 shadow-inner min-h-[450px] flex flex-col relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-neutral-900 rounded-b-2xl border-x border-b border-white/5" />
                        <div className="flex-1 pt-8 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                          <div className="bg-neutral-900 rounded-[1.5rem] rounded-tl-none p-5 max-w-[90%] border border-white/5 shadow-lg">
                            <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                              {(() => {
                                let current = menuConfig;
                                for (const id of menuPath) {
                                  const opt = current.options?.find((o: any) => o.id === id);
                                  if (opt && opt.submenu) {
                                    current = opt.submenu;
                                  } else {
                                    break;
                                  }
                                }
                                let text = (current.welcomeText || '') + '\n\n';
                                current.options?.forEach((opt: any) => {
                                  text += `${opt.trigger}. ${opt.label}\n`;
                                });
                                return text;
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                          <div className="flex-1 h-12 bg-neutral-900 rounded-2xl border border-white/5 px-5 flex items-center">
                            <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Type a message...</span>
                          </div>
                          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-neutral-950 shadow-lg shadow-emerald-500/20">
                            <Send size={18} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-8 bg-emerald-500/5 border-emerald-500/10">
                      <h3 className="text-xl font-bold text-emerald-500 font-display mb-4">Pro Tip</h3>
                      <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                        Keep your menu simple. Use numbers (1, 2, 3) as triggers for the best user experience on mobile devices.
                      </p>
                    </div>

                    <div className="glass-card p-8">
                      <h3 className="text-xl font-bold text-white font-display mb-6">Chatbot Behavior</h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Auto-reply Delay</p>
                            <p className="text-[10px] text-neutral-500">Simulate human typing</p>
                          </div>
                          <select className="bg-neutral-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                            <option>No delay</option>
                            <option>2 seconds</option>
                            <option>5 seconds</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Business Hours</p>
                            <p className="text-[10px] text-neutral-500">Only reply during work hours</p>
                          </div>
                          <button className="w-10 h-5 bg-neutral-800 rounded-full relative">
                            <div className="absolute top-1 left-1 w-3 h-3 bg-neutral-600 rounded-full" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Human Handoff</p>
                            <p className="text-[10px] text-neutral-500">Notify team on complex queries</p>
                          </div>
                          <button className="w-10 h-5 bg-emerald-500 rounded-full relative">
                            <div className="absolute top-1 left-6 w-3 h-3 bg-white rounded-full" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'bookings' && (
              <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white font-display">Appointments</h2>
                    <p className="text-neutral-500 text-sm mt-1">Manage your upcoming customer bookings and schedules.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn-secondary">
                      <Calendar size={18} />
                      <span>Calendar View</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Total Bookings</p>
                      <p className="text-2xl font-bold text-white">{bookings.length}</p>
                    </div>
                  </div>
                  <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Today</p>
                      <p className="text-2xl font-bold text-white">
                        {bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length}
                      </p>
                    </div>
                  </div>
                  <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">New Customers</p>
                      <p className="text-2xl font-bold text-white">12</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {bookings.map(booking => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={booking.id} 
                      className="glass-card p-8 group hover:border-emerald-500/20 transition-all"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-emerald-500 border border-white/5 group-hover:scale-110 transition-transform">
                          <User size={24} />
                        </div>
                        <div className="badge badge-emerald">Confirmed</div>
                      </div>
                      <div className="space-y-1 mb-6">
                        <h4 className="text-xl font-bold text-white font-display">{booking.customerPhone.split('@')[0]}</h4>
                        <p className="text-neutral-500 text-sm">{booking.customerPhone}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Date</p>
                          <p className="text-sm font-bold text-white">{booking.date}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Time</p>
                          <p className="text-sm font-bold text-white">{booking.time}</p>
                        </div>
                      </div>
                      <div className="mt-8 flex gap-3">
                        <button className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl border border-white/5 transition-all">Reschedule</button>
                        <button className="p-3 text-neutral-600 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-white/5">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {bookings.length === 0 && (
                    <div className="col-span-full text-center py-40 glass-card border-dashed border-neutral-800 flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 bg-neutral-900 rounded-[2.5rem] flex items-center justify-center text-neutral-700 border border-white/5">
                        <Calendar size={40} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white font-bold text-xl">No appointments yet</p>
                        <p className="text-neutral-500">Your customer bookings will appear here automatically.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activePage === 'broadcast' && (
              <motion.div key="broadcast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white font-display">Broadcast Message</h2>
                    <p className="text-neutral-500 text-sm mt-1">Send a message to multiple contacts at once.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-10 space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Recipient Numbers</label>
                          <div className="relative">
                            <Users className="absolute left-5 top-5 text-neutral-500" size={18} />
                            <textarea 
                              value={broadcastContacts} 
                              onChange={e => setBroadcastContacts(e.target.value)} 
                              placeholder="Enter numbers separated by commas (e.g. 919876543210, 918765432109)" 
                              className="input-field h-32 pl-14 pt-4 resize-none leading-relaxed" 
                            />
                          </div>
                          <p className="text-[10px] text-neutral-600 font-medium ml-1">Include country code without '+' (e.g. 91 for India).</p>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Message Content</label>
                          <div className="relative">
                            <MessageSquare className="absolute left-5 top-5 text-neutral-500" size={18} />
                            <textarea 
                              value={broadcastMsg} 
                              onChange={e => setBroadcastMsg(e.target.value)} 
                              placeholder="Type your broadcast message here..." 
                              className="input-field h-48 pl-14 pt-4 resize-none leading-relaxed" 
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={sendBroadcast} 
                        className="btn-primary w-full py-6 text-xl shadow-2xl shadow-emerald-500/20"
                      >
                        <Send size={24} />
                        <span>Launch Broadcast</span>
                      </button>
                    </div>

                    <div className="glass-card p-8">
                      <h3 className="text-xl font-bold text-white font-display mb-6">Recent Broadcasts</h3>
                      <div className="space-y-4">
                        {[
                          { date: 'Today, 10:30 AM', recipients: 45, status: 'Completed' },
                          { date: 'Yesterday, 02:15 PM', recipients: 120, status: 'Completed' },
                          { date: 'Mar 12, 09:00 AM', recipients: 88, status: 'Completed' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                <CheckCircle2 size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{item.date}</p>
                                <p className="text-xs text-neutral-500">{item.recipients} recipients</p>
                              </div>
                            </div>
                            <span className="badge badge-emerald text-[10px]">{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass-card p-8">
                      <h3 className="text-xl font-bold text-white font-display mb-6">Broadcast Stats</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-neutral-900/50 rounded-2xl border border-white/5 flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Total Recipients</span>
                          <span className="text-lg font-bold text-white">{broadcastContacts.split(',').filter(n => n.trim()).length}</span>
                        </div>
                        <div className="p-4 bg-neutral-900/50 rounded-2xl border border-white/5 flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Estimated Time</span>
                          <span className="text-lg font-bold text-white">~{broadcastContacts.split(',').filter(n => n.trim()).length * 2}s</span>
                        </div>
                      </div>
                      <div className="mt-8 p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                        <h4 className="text-xs font-bold text-blue-500 mb-2 flex items-center gap-2">
                          <Info size={14} />
                          <span>Important</span>
                        </h4>
                        <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                          Sending too many messages too fast can lead to account suspension. We recommend adding delays between messages.
                        </p>
                      </div>
                    </div>

                    <div className="glass-card p-8 bg-purple-500/5 border-purple-500/10">
                      <h3 className="text-xl font-bold text-purple-500 font-display mb-4">Templates</h3>
                      <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                        Save time by using pre-defined message templates for your broadcasts.
                      </p>
                      <button className="w-full btn-secondary py-3 text-xs">Manage Templates</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'inbox' && (
              <motion.div 
                key="inbox" 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.98 }} 
                className="h-[calc(100vh-12rem)] flex glass-card overflow-hidden p-0 border-white/5"
              >
                {/* Contacts Sidebar */}
                <div className="w-80 border-r border-white/5 flex flex-col bg-neutral-950/20">
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white font-display mb-4">Messages</h3>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input 
                        type="text" 
                        placeholder="Search chats..." 
                        className="w-full bg-neutral-900/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {Array.from(new Set(messages.map(m => m.from))).map(contact => {
                      const lastMsg = messages.filter(m => m.from === contact).pop();
                      const isActive = activeContact === contact;
                      return (
                        <button 
                          key={contact}
                          onClick={() => setActiveContact(contact)}
                          className={`w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-all relative group ${isActive ? 'bg-emerald-500/5' : ''}`}
                        >
                          {isActive && (
                            <motion.div 
                              layoutId="active-chat" 
                              className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            />
                          )}
                          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-emerald-500 font-bold border border-white/5 shadow-inner group-hover:scale-105 transition-transform">
                            {contact.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <p className={`text-sm font-bold truncate transition-colors ${isActive ? 'text-emerald-500' : 'text-white'}`}>
                                {contact.split('@')[0]}
                              </p>
                              <span className="text-[10px] text-neutral-500 font-medium">
                                {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 truncate font-medium">{lastMsg?.text || 'No messages'}</p>
                          </div>
                        </button>
                      );
                    })}
                    {messages.length === 0 && (
                      <div className="p-12 text-center">
                        <MessageSquare className="w-10 h-10 mx-auto mb-4 text-neutral-800" />
                        <p className="text-neutral-600 text-sm font-medium">No conversations yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-neutral-950/10">
                  {activeContact ? (
                    <>
                      {/* Chat Header */}
                      <div className="px-8 py-5 border-b border-white/5 bg-neutral-900/20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                            {activeContact.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-base font-bold text-white">{activeContact.split('@')[0]}</p>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Now</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Phone size={18} /></button>
                          <button className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Video size={18} /></button>
                          <button className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"><MoreVertical size={18} /></button>
                        </div>
                      </div>

                      {/* Messages List */}
                      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)]">
                        {messages.filter(m => m.from === activeContact).map((m, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] space-y-1.5`}>
                              <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-xl ${
                                m.direction === 'out' 
                                  ? 'bg-emerald-500 text-neutral-950 font-medium rounded-tr-none' 
                                  : 'bg-neutral-900 text-white border border-white/5 rounded-tl-none'
                              }`}>
                                {m.text}
                              </div>
                              <p className={`text-[10px] font-bold text-neutral-600 uppercase tracking-tighter ${m.direction === 'out' ? 'text-right' : 'text-left'}`}>
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Chat Input */}
                      <div className="p-6 border-t border-white/5 bg-neutral-900/20">
                        <div className="flex items-center gap-4 bg-neutral-950/50 p-2 rounded-[2rem] border border-white/5 shadow-inner">
                          <button type="button" className="p-3 text-neutral-500 hover:text-emerald-500 transition-colors"><Paperclip size={20} /></button>
                          <input 
                            type="text" 
                            value={replyText[activeContact] || ''} 
                            onChange={e => setReplyText({...replyText, [activeContact]: e.target.value})} 
                            onKeyDown={e => e.key === 'Enter' && sendReply(activeContact)}
                            placeholder="Type a message..." 
                            className="flex-1 bg-transparent border-none text-white focus:ring-0 text-sm py-3"
                          />
                          <button type="button" className="p-3 text-neutral-500 hover:text-emerald-500 transition-colors"><Smile size={20} /></button>
                          <button 
                            onClick={() => sendReply(activeContact)}
                            className="w-12 h-12 bg-emerald-500 text-neutral-950 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            <Send size={20} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 space-y-6">
                      <div className="w-24 h-24 bg-neutral-900 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-2xl relative">
                        <MessageSquare className="w-10 h-10 text-neutral-700" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-neutral-950" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white font-display">Your Inbox is Ready</p>
                        <p className="text-sm text-neutral-500 mt-1">Select a conversation to start chatting with your customers</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activePage === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white font-display">Settings</h2>
                    <p className="text-neutral-500 text-sm mt-1">Manage your account preferences and system configuration.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-10">
                      <h3 className="text-xl font-bold text-white font-display mb-8">Profile Information</h3>
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-8 p-6 bg-neutral-900/50 rounded-3xl border border-white/5">
                          <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-neutral-950 text-3xl font-black shadow-xl shadow-emerald-500/20">
                            {user?.email?.substring(0, 1).toUpperCase()}
                          </div>
                          <div className="text-center sm:text-left space-y-2">
                            <p className="text-xl font-bold text-white">{user?.email?.split('@')[0]}</p>
                            <p className="text-neutral-500 text-sm">{user?.email}</p>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                              <span className="badge badge-emerald">Verified Account</span>
                            </div>
                          </div>
                          <button className="sm:ml-auto btn-secondary text-xs py-2 px-4">Change Avatar</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Display Name</label>
                            <input type="text" defaultValue={user?.email?.split('@')[0]} className="input-field" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                            <input type="email" defaultValue={user?.email} disabled className="input-field opacity-50 cursor-not-allowed" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-10">
                      <h3 className="text-xl font-bold text-white font-display mb-8">System Configuration</h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-neutral-900/50 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                              <Bell size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Email Notifications</p>
                              <p className="text-xs text-neutral-500">Receive daily reports and alerts</p>
                            </div>
                          </div>
                          <button className="w-12 h-6 bg-emerald-500 rounded-full relative">
                            <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-neutral-900/50 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20">
                              <Shield size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Two-Factor Auth</p>
                              <p className="text-xs text-neutral-500">Add an extra layer of security</p>
                            </div>
                          </div>
                          <button className="btn-secondary text-xs py-2 px-4">Enable</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass-card p-8 border-red-500/10">
                      <h3 className="text-xl font-bold text-red-500 font-display mb-6">Danger Zone</h3>
                      <div className="space-y-4">
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button className="w-full py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-red-500/20 transition-all">
                          Delete Account
                        </button>
                      </div>
                    </div>

                    <div className="glass-card p-8 bg-emerald-500/5 border-emerald-500/10">
                      <h3 className="text-xl font-bold text-emerald-500 font-display mb-4">Pro Plan</h3>
                      <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                        You are currently on the Pro Plan. Your next billing date is April 15, 2026.
                      </p>
                      <button className="w-full btn-primary py-4">Manage Subscription</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
