'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  Search,
  ChevronRight,
  Smartphone,
  Server,
  Layers,
  X,
  Clock,
  Code2,
} from 'lucide-react';
import { IAppLog } from '@/lib/models/AppLog';

export default function AdminLogsViewer() {
  const [logs, setLogs] = useState<IAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<IAppLog | null>(null);
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, totalErrors: 0 });
  const [clearing, setClearing] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.append('level', levelFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setStats(data.stats || { total: 0, totalErrors: 0 });
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all system error logs?')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/admin/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setStats({ total: 0, totalErrors: 0 });
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    } finally {
      setClearing(false);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase">
            <AlertCircle className="w-3 h-3" />
            <span>ERROR</span>
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase">
            <AlertTriangle className="w-3 h-3" />
            <span>WARN</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase">
            <Info className="w-3 h-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'mobile-app':
        return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
      case 'backend-api':
        return <Server className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Terminal className="w-7 h-7 text-indigo-400" />
            <span>System & Mobile Error Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, crash reports, and exceptions from mobile devices & backend proxy
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-2 text-sm font-medium"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleClearLogs}
            disabled={clearing || logs.length === 0}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">
            Total Captured Logs
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-2xl font-extrabold text-red-400">{stats.totalErrors}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">
            Error Severity
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl col-span-2 sm:col-span-1">
          <p className="text-2xl font-extrabold text-purple-400">
            {logs.filter((l) => l.source === 'mobile-app').length}
          </p>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">
            From Mobile Client
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search error message, stack trace..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Level Filter */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            {['all', 'error', 'warn', 'info'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-lg font-semibold uppercase transition-colors ${
                  levelFilter === lvl
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="mobile-app">Mobile App</option>
            <option value="backend-api">Backend Proxy</option>
            <option value="admin-dashboard">Admin Dashboard</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="divide-y divide-white/5">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm space-y-2">
              <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-400">No logs captured yet</p>
              <p className="text-xs">
                Errors occurring in the mobile app or backend will appear here in real time.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log._id}
                onClick={() => setSelectedLog(log)}
                className="p-4 hover:bg-white/[0.03] transition-colors cursor-pointer flex items-start justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5">{getLevelBadge(log.level)}</div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate font-mono">
                      {log.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        {getSourceIcon(log.source)}
                        <span>{log.source}</span>
                      </span>

                      <span>•</span>

                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Now'}</span>
                      </span>

                      {log.context && Object.keys(log.context).length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-indigo-300 font-mono">
                            {Object.keys(log.context).length} context fields
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-300 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-3xl w-full border border-white/15 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getLevelBadge(selectedLog.level)}
                  <span className="text-xs text-slate-400 font-mono uppercase">
                    Source: {selectedLog.source}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white break-words font-mono mt-2">
                  {selectedLog.message}
                </h3>
                <p className="text-xs text-slate-400">
                  Logged at: {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : ''}
                </p>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Data */}
            {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Metadata & Environment Context</span>
                </h4>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                  <pre className="text-xs text-indigo-300 font-mono">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Stack Trace */}
            {selectedLog.stack ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>Stack Trace</span>
                </h4>
                <div className="bg-black/60 p-4 rounded-xl border border-red-500/20 overflow-x-auto max-h-60">
                  <pre className="text-xs text-red-300/90 font-mono whitespace-pre-wrap">
                    {selectedLog.stack}
                  </pre>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
