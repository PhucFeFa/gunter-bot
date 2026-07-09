import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Users, Zap, TrendingUp, Loader2 } from 'lucide-react';
import './index.css';

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [botStats, setBotStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gọi API từ Bot
    const fetchData = async () => {
      try {
        const [lbRes, statsRes] = await Promise.all([
          axios.get('http://localhost:3001/api/leaderboard'),
          axios.get('http://localhost:3001/api/bot-stats')
        ]);
        
        if (lbRes.data.success) setLeaderboard(lbRes.data.data);
        if (statsRes.data.success) setBotStats(statsRes.data.data);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-16 animate-fade-in-down">
          <div className="flex items-center gap-4 mb-6 md:mb-0">
            {botStats ? (
              <img src={botStats.botAvatar} alt="Bot Avatar" className="w-16 h-16 rounded-2xl shadow-xl shadow-indigo-500/20 border border-white/10" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-800 animate-pulse border border-white/10" />
            )}
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                {botStats ? botStats.botName : 'Gunter Bot'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">Hệ thống quản trị máy chủ thông minh</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="glass-panel px-5 py-3 rounded-xl flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Servers</p>
                <p className="font-bold">{botStats ? botStats.guilds : '--'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Leaderboard Section */}
        <main className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            <h2 className="text-2xl font-bold">Bảng Xếp Hạng Tiền Tệ</h2>
          </div>

          <div className="glass-panel rounded-2xl p-1 overflow-hidden border border-white/5 shadow-2xl">
            <div className="bg-slate-900/50 rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                <div className="col-span-2 md:col-span-1 text-center">Hạng</div>
                <div className="col-span-6 md:col-span-7">Thành Viên</div>
                <div className="col-span-4 text-right flex justify-end items-center gap-1">
                  Số dư <TrendingUp className="w-3 h-3" />
                </div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col divide-y divide-white/5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                    <p>Đang tải dữ liệu hệ thống...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <p>Chưa có ai trong danh sách.</p>
                  </div>
                ) : (
                  leaderboard.map((user, index) => (
                    <div 
                      key={user.userId} 
                      className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Rank */}
                      <div className="col-span-2 md:col-span-1 flex justify-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 
                            index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                            index === 2 ? 'bg-amber-600/20 text-amber-500 border border-amber-600/30' :
                            'bg-slate-800/50 text-slate-500'
                          }
                        `}>
                          {index + 1}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="col-span-6 md:col-span-7 flex items-center gap-4">
                        <img 
                          src={user.avatar} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 group-hover:border-indigo-500/50 transition-colors"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{user.username}</span>
                          <span className="text-xs text-slate-500 font-mono">{user.userId}</span>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="col-span-4 flex items-center justify-end gap-2 text-right">
                        <span className="font-bold text-emerald-400 text-lg">
                          {user.balance.toLocaleString()}
                        </span>
                        <Zap className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
