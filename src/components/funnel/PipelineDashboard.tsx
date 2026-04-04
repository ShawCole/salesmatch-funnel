import { useState, useEffect, useCallback } from 'react';
import type { PipelineConfig } from './types';
import { HighlightBar } from './HighlightBar';
import { FunnelChart } from './FunnelChart';
import { PipelineRow } from './PipelineRow';

const STORAGE_KEY = 'sm-pipeline-overrides';

function loadOverrides(): Record<string, number | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function PipelineDashboard() {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number | null>>(loadOverrides);
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

  useEffect(() => {
    fetch('/funnel-config.json').then(r => r.json()).then(setConfig).catch(console.error);
  }, []);

  const handleOverride = useCallback((key: string, value: number | null) => {
    setOverrides(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 rounded-full border-[3px] border-gray-700 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold">
              <span className="text-purple-400">{config.client}</span> Pipeline
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Intent → Ads → Landing Page → Retarget → Convert
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded">ADMIN</span>
            )}
            <a
              href="https://salesmatch-explorer.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/20 hover:bg-purple-600/30 transition-colors"
            >
              Map Explorer
            </a>
          </div>
        </div>

        {/* Highlight cards */}
        <HighlightBar data={config.highlights} />

        {/* Visual funnel */}
        <FunnelChart config={config} overrides={overrides} />

        {/* Pipeline detail rows */}
        <div className="space-y-3">
          {config.pipelines.map(p => (
            <PipelineRow
              key={p.id}
              pipeline={p}
              isAdmin={isAdmin}
              overrides={overrides}
              onOverride={handleOverride}
            />
          ))}
        </div>

        {/* Admin instructions */}
        {isAdmin && (
          <div className="glass rounded-xl p-3 border border-amber-500/20">
            <div className="text-[10px] text-amber-300 font-bold mb-1">Admin Mode</div>
            <div className="text-[9px] text-gray-400">
              Click any count to edit. Changes save to this browser's localStorage.
              Remove <code className="text-amber-400/80">?admin=true</code> from the URL for client view.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
