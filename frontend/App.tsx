import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, Bell, ShieldAlert, Sliders, MessageSquare, Database, 
  Terminal, Zap, Flame, Radio, TrendingUp, TrendingDown, Sun, Moon 
} from 'lucide-react';

interface EconomicEvent {
  id: number;
  event_name: string;
  currency: string;
  impact: string;
  actual: number;
  forecast: number;
  previous: number;
  sentiment: string;
  explanation?: string;
}

interface Signal {
  id: number;
  asset: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  entry_zone: string;
  take_profit: string;
  stop_loss: string;
  risk_rating: string;
}

export default function ForexIntelligenceAI() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeSpeechTab, setActiveSpeechTab] = useState<'FOMC' | 'ECB' | 'BOE'>('FOMC');
  const [speechText, setSpeechText] = useState<string>('');
  const [speechSentiment, setSpeechSentiment] = useState<{classification: string, score: number} | null>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Welcome to Alpha Terminal v1.0. Ready for asset correlation analysis.' }
  ]);
  
  // Live Feed alerts
  const [liveAlerts, setLiveAlerts] = useState<string[]>(['System online. Connected to global liquidity aggregators.']);

  useEffect(() => {
    // Initial Hydration Fetch
    fetch('http://localhost:8000/api/calendar').then(res => res.json()).then(data => setEvents(data || []));
    fetch('http://localhost:8000/api/signals').then(res => res.json()).then(data => setSignals(data || []));

    // Dynamic WebSocket link
    const socket = new WebSocket('ws://localhost:8000/ws');
    socket.onmessage = (messageEvent) => {
      const data = JSON.parse(messageEvent.data);
      if (data.type === 'NEW_EVENT') {
        setEvents(prev => [data, ...prev]);
        setLiveAlerts(prev => [`🚨 [${data.currency}] ${data.event_name} -> ${data.sentiment}`, ...prev]);
        
        if (data.impacted_assets) {
          const generatedSignals: Signal[] = data.impacted_assets
            .filter((a: any) => a.direction !== 'NEUTRAL')
            .map((a: any, idx: number) => ({
              id: Date.now() + idx,
              asset: a.asset,
              action: a.direction,
              entry_zone: 'Market executing pivot frame',
              take_profit: 'Target Expansion Delta',
              stop_loss: 'Structural violation cutoff',
              risk_rating: a.volatility
            }));
          setSignals(prev => [...generatedSignals, ...prev]);
        }
      }
    };
    return () => socket.close();
  }, []);

  const triggerSimulation = async () => {
    await fetch('http://localhost:8000/api/simulate/event', { method: 'POST' });
  };

  const handleAnalyzeSpeech = async () => {
    if(!speechText) return;
    const res = await fetch('http://localhost:8000/api/speech-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: activeSpeechTab, title: 'Live Transcript Segment', text: speechText })
    });
    const metrics = await res.json();
    setSpeechSentiment({ classification: metrics.classification, score: metrics.score });
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatLog(p => [...p, { role: 'user', text: userMsg }]);
    setChatInput('');
    
    const res = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMsg })
    });
    const parsed = await res.json();
    setChatLog(p => [...p, { role: 'ai', text: parsed.response }]);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-[#080C14] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* --- HEADER --- */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-50 p-4 flex justify-between items-center ${darkMode ? 'border-gray-800 bg-[#0B0F19]/80' : 'border-gray-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <Terminal className="text-sky-500 w-6 h-6 animate-pulse" />
          <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
            FOREX INTELLIGENCE AI
          </h1>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-400">Hedge Fund Core v1.2</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={triggerSimulation} className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono text-xs px-3 py-1.5 rounded shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Force Simulated Micro Event
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full border border-gray-700 hover:bg-gray-800/50 transition">
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* --- WORKSPACE GRID --- */}
      <main className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* --- LEFT COL: STREAMING ALERTS & REAL-TIME SPEECH SENTIMENT --- */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className={`p-4 rounded-xl border backdrop-blur-xl transition ${darkMode ? 'bg-[#111827]/70 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className="text-sm font-semibold tracking-wider uppercase mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-red-500 animate-ping" /> Real-time Wire Feed</h2>
            <div className="h-44 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {liveAlerts.map((alert, i) => (
                <div key={i} className="p-2 rounded bg-black/20 border-l-2 border-sky-500 whitespace-pre-wrap">{alert}</div>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-xl border backdrop-blur-xl transition ${darkMode ? 'bg-[#111827]/70 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className="text-sm font-semibold tracking-wider uppercase mb-2 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Central Bank Speech NLP</h2>
            <div className="flex gap-2 mb-3">
              {(['FOMC', 'ECB', 'BOE'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveSpeechTab(tab)} className={`text-xs px-3 py-1 rounded transition ${activeSpeechTab === tab ? 'bg-sky-600 text-white' : 'bg-gray-800/40 text-gray-400'}`}>{tab}</button>
              ))}
            </div>
            <textarea value={speechText} onChange={(e) => setSpeechText(e.target.value)} placeholder="Paste policy speech transcript or press conference statement text segments here..." className="w-full h-32 text-xs p-2 rounded bg-black/40 border border-gray-700 focus:outline-none focus:border-sky-500 resize-none text-gray-200" />
            <button onClick={handleAnalyzeSpeech} className="mt-2 w-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs py-2 rounded transition font-medium">Classify Sentiment Profile</button>
            
            {speechSentiment && (
              <div className="mt-4 p-3 rounded bg-black/30 border border-gray-800 text-center">
                <div className="text-xs text-gray-400 uppercase">NLP Matrix Output:</div>
                <div className={`text-base font-bold my-1 ${speechSentiment.classification.includes('Hawkish') ? 'text-emerald-400' : 'text-red-400'}`}>{speechSentiment.classification}</div>
                <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden relative">
                  <div className="bg-gradient-to-r from-red-500 via-gray-400 to-emerald-500 h-full w-full absolute transition-all" style={{ left: `${(speechSentiment.score + 1) * 50 - 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CENTER COLS: LIVE ECONOMIC CALENDAR MATRIX & AI DIAGNOSTIC PANEL --- */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className={`p-4 rounded-xl border backdrop-blur-xl transition ${darkMode ? 'bg-[#111827]/70 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className="text-sm font-semibold tracking-wider uppercase mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-sky-500" /> Advanced Economic Calendar Engine</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                    <th className="pb-2">Asset/CCY</th>
                    <th className="pb-2">Macro Metric Indicator</th>
                    <th className="pb-2 text-center">Impact</th>
                    <th className="pb-2 text-right">Actual</th>
                    <th className="pb-2 text-right">Forecast</th>
                    <th className="pb-2 text-right">Previous</th>
                    <th className="pb-2 text-right">Sentiment Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {events.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-500">No recent economic releases found. Trigger simulation or await live pipelines.</td></tr>
                  ) : events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-800/20 transition-all">
                      <td className="py-3 font-bold text-sky-400">{ev.currency}</td>
                      <td className="py-3 max-w-[180px] truncate text-gray-300 font-sans" title={ev.event_name}>{ev.event_name}</td>
                      <td className="py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ev.impact === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-amber-500/10 text-amber-400'}`}>{ev.impact}</span>
                      </td>
                      <td className="py-3 text-right font-bold text-white">{ev.actual ?? '-'}</td>
                      <td className="py-3 text-right text-gray-400">{ev.forecast ?? '-'}</td>
                      <td className="py-3 text-right text-gray-400">{ev.previous ?? '-'}</td>
                      <td className={`py-3 text-right font-bold ${ev.sentiment === 'BULLISH' ? 'text-emerald-400' : ev.sentiment === 'BEARISH' ? 'text-red-400' : 'text-gray-400'}`}>{ev.sentiment || 'NEUTRAL'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Explanation Module Highlight */}
          {events[0]?.explanation && (
            <div className="p-4 rounded-xl border border-sky-900/50 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 backdrop-blur-xl">
              <h3 className="text-xs font-bold font-mono tracking-wider text-sky-400 uppercase mb-1.5 flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5" /> Latest Instantly Generated AI Interpretation</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">{events[0].explanation}</p>
            </div>
          )}
        </div>

        {/* --- RIGHT COL: ALGORITHMIC TRADING SIGNALS & COGNITIVE AI COMPANION --- */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className={`p-4 rounded-xl border backdrop-blur-xl transition ${darkMode ? 'bg-[#111827]/70 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className="text-sm font-semibold tracking-wider uppercase mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-emerald-400" /> Alpha Signal Panel Matrix</h2>
            <div className="space-y-3 h-60 overflow-y-auto pr-1">
              {signals.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-500 font-mono">Awaiting algorithmic matrix triggers.</div>
              ) : signals.map((sig) => (
                <div key={sig.id} className="p-3 rounded-lg bg-black/40 border border-gray-800 text-xs font-mono relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 bottom-0 w-1 ${sig.action === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-white">{sig.asset}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sig.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{sig.action}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[11px] text-gray-400">
                    <div>Entry: <span className="text-gray-200">{sig.entry_zone}</span></div>
                    <div>Risk: <span className="text-amber-400">{sig.risk_rating}</span></div>
                    <div className="col-span-2 text-emerald-400 font-bold">TP: {sig.take_profit}</div>
                    <div className="col-span-2 text-red-400 font-bold">SL: {sig.stop_loss}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[9px] text-gray-500 font-sans leading-tight">
              ⚠️ <strong>Disclaimer:</strong> Financial assets are highly speculative. Structural quantitative models are for validation educational usage parameters only.
            </div>
          </div>

          <div className={`p-4 rounded-xl border backdrop-blur-xl flex-1 flex flex-col transition ${darkMode ? 'bg-[#111827]/70 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className="text-sm font-semibold tracking-wider uppercase mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-purple-400" /> AI Quant Chat</h2>
            <div className="flex-1 overflow-y-auto space-y-2 h-44 bg-black/30 p-2 rounded border border-gray-800 font-mono text-[11px]">
              {chatLog.map((chat, i) => (
                <div key={i} className={`p-1.5 rounded ${chat.role === 'user' ? 'bg-sky-950/40 text-sky-300 ml-4 text-right' : 'bg-purple-950/30 text-purple-300 mr-4 text-left'}`}>
                  <strong>{chat.role === 'user' ? 'You: ' : 'Terminal: '}</strong>{chat.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="mt-2 flex gap-1">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask: Why did Gold fall after FOMC?..." className="flex-1 bg-black/50 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500" />
              <button type="submit" className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 rounded font-mono font-bold">EXEC</button>
            </form>
          </div>
        </div>
      </main>

      {/* --- FOOTER & WATERMARK --- */}
      <footer className="mt-8 border-t border-gray-900 p-4 text-center font-mono text-[11px] text-gray-600 flex justify-between items-center max-w-7xl mx-auto">
        <div>© 2026 Forex Intelligence AI Inc. All sovereign pipeline metrics secured via Cloudflare TLS.</div>
        <div className="text-gray-400 tracking-wide font-bold transition hover:text-sky-400">
          Made with ❤️ by <span className="underline decoration-sky-500 underline-offset-4">Kexer</span>
        </div>
      </footer>
    </div>
  );
        }
