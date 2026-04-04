import { useState } from 'react';
import { RefreshCw, ExternalLink, Image, Video } from 'lucide-react';
import type { Pipeline, PipelineNodes, Asset } from './types';
import { NODE_ORDER, NODE_META } from './types';

function rate(from: number | null, to: number | null): string | null {
  if (from == null || to == null || from === 0) return null;
  return `${((to / from) * 100).toFixed(1)}%`;
}

function fmtCount(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function AssetCard({ asset }: { asset: Asset }) {
  const Icon = asset.type === 'video' ? Video : Image;
  const platformColors: Record<string, string> = {
    meta: '#1877F2', dsp: '#10b981', linkedin: '#0A66C2', email: '#f59e0b',
  };
  return (
    <div className="glass rounded-lg p-2.5 min-w-[160px] hover:bg-white/[0.04] transition-colors">
      <div className="h-16 rounded-md bg-white/5 flex items-center justify-center mb-2 border border-white/5">
        <Icon size={18} className="text-gray-500" />
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: platformColors[asset.platform] || '#888' }} />
        <span className="text-[8px] font-semibold text-gray-400 uppercase">{asset.platform}</span>
        <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-gray-500">{asset.type}</span>
      </div>
      <div className="text-[9px] text-gray-300 font-medium truncate mb-1.5" title={asset.label}>{asset.label}</div>
      <div className="flex gap-2 text-[8px] text-gray-500">
        <span>{(asset.impressions / 1000).toFixed(0)}K imp</span>
        <span>{(asset.clicks / 1000).toFixed(1)}K clk</span>
        <span className="font-bold text-teal-400">{asset.ctr}%</span>
      </div>
    </div>
  );
}

interface PipelineRowProps {
  pipeline: Pipeline;
  isAdmin: boolean;
  overrides: Record<string, number | null>;
  onOverride: (nodeId: string, value: number | null) => void;
}

export function PipelineRow({ pipeline, isAdmin, overrides, onOverride }: PipelineRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const getCount = (nodeId: keyof PipelineNodes): number | null => {
    const key = `${pipeline.id}.${nodeId}`;
    if (key in overrides) return overrides[key];
    return pipeline.nodes[nodeId].count;
  };

  const handleEdit = (nodeId: string, raw: string) => {
    const key = `${pipeline.id}.${nodeId}`;
    const num = parseInt(raw.replace(/,/g, ''), 10);
    onOverride(key, isNaN(num) ? null : num);
    setEditing(null);
  };

  const nodes = NODE_ORDER.map((nodeId, i) => {
    const meta = NODE_META[nodeId];
    const count = getCount(nodeId);
    const node = pipeline.nodes[nodeId];
    const prevCount = i > 0 ? getCount(NODE_ORDER[i - 1]) : null;
    const transferRate = rate(prevCount, count);

    return { nodeId, meta, count, node, transferRate, index: i };
  });

  // Determine which section each node belongs to
  const tofuNodes = nodes.slice(0, 3); // IC → Meta → LP
  const bofuNodes = nodes.slice(3);    // Retarget → Converted

  return (
    <div className="glass rounded-xl p-4 md:p-5">
      {/* Pipeline header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 mb-4 text-left">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: pipeline.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">{pipeline.name}</div>
          <div className="text-[10px] text-gray-400">{pipeline.description}</div>
        </div>
        <div className="flex items-center gap-3 text-[10px] shrink-0">
          <div className="text-gray-500">
            <span className="text-gray-300 font-bold">{fmtCount(getCount('intentCore'))}</span> intent
          </div>
          <div className="text-gray-500">
            <span className="text-gray-300 font-bold">{fmtCount(getCount('metaAudience'))}</span> matched
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <path d="M3 5 L6 8 L9 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </button>

      {/* Pipeline nodes */}
      {expanded && (
        <div className="space-y-4">
          {/* TOFU section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">TOFU Campaign</span>
              <span className="text-[9px] text-gray-600">— {pipeline.tofuCampaign}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-stretch gap-0 overflow-x-auto pb-1">
              {tofuNodes.map(({ nodeId, meta, count, node, transferRate, index }) => (
                <div key={nodeId} className="flex flex-col md:flex-row items-center md:items-stretch shrink-0">
                  {/* Transfer arrow */}
                  {index > 0 && (
                    <div className="flex md:flex-col items-center justify-center h-8 md:h-auto md:w-14 shrink-0">
                      <div className={`text-[9px] font-bold tabular-nums mr-1.5 md:mr-0 md:mb-0.5 ${transferRate ? 'text-gray-300' : 'text-gray-600'}`}>
                        {transferRate || '—'}
                      </div>
                      {/* Vertical arrow on mobile */}
                      <div className="md:hidden w-px h-full bg-gradient-to-b from-gray-600 to-gray-500 relative">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[5px] border-transparent border-t-gray-500" />
                      </div>
                      {/* Horizontal arrow on desktop */}
                      <div className="hidden md:block w-full h-px bg-gradient-to-r from-gray-600 to-gray-500 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-gray-500" />
                      </div>
                      <div className="text-[7px] text-gray-600 ml-1.5 md:ml-0 md:mt-0.5">match</div>
                    </div>
                  )}
                  {/* Node */}
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 w-full md:w-auto md:min-w-[130px] flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-0">
                    <div className="text-base md:mb-1">{meta.icon}</div>
                    <div className="flex-1 md:flex-initial">
                      <div className="text-[10px] font-bold text-gray-200 md:mb-0.5">{meta.label}</div>
                      <div className="text-[8px] text-gray-500 md:mb-2">{meta.description}</div>
                    </div>
                    {/* Count — editable in admin mode */}
                    {isAdmin && editing === nodeId ? (
                      <input
                        autoFocus
                        type="text"
                        defaultValue={count?.toLocaleString() ?? ''}
                        placeholder="—"
                        className="w-20 text-center text-lg font-bold bg-white/10 border border-purple-500/50 rounded px-1 py-0.5 text-white outline-none"
                        onBlur={(e) => handleEdit(nodeId, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(nodeId, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditing(null); }}
                      />
                    ) : (
                      <button
                        onClick={() => isAdmin && setEditing(nodeId)}
                        className={`text-xl font-bold tabular-nums ${count != null ? 'text-white' : 'text-gray-600'} ${isAdmin ? 'hover:text-purple-300 cursor-pointer' : 'cursor-default'}`}
                      >
                        {fmtCount(count)}
                      </button>
                    )}
                    {/* Status badges */}
                    <div className="flex flex-wrap gap-1 md:mt-1.5 justify-center">
                      {node.refreshDays && (
                        <span className="flex items-center gap-0.5 text-[8px] text-amber-400/80 bg-amber-400/10 rounded px-1.5 py-0.5">
                          <RefreshCw size={8} /> {node.refreshDays}d
                        </span>
                      )}
                      {node.status && (
                        <span className="text-[8px] text-blue-400/80 bg-blue-400/10 rounded px-1.5 py-0.5">{node.status}</span>
                      )}
                      {node.landingPage && (
                        <span className="flex items-center gap-0.5 text-[8px] text-gray-400 bg-white/5 rounded px-1.5 py-0.5">
                          <ExternalLink size={7} /> LP
                        </span>
                      )}
                      {count == null && !node.status && (
                        <span className="text-[8px] text-gray-600 bg-white/5 rounded px-1.5 py-0.5">pending</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BOFU section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">BOFU Campaign</span>
              <span className="text-[9px] text-gray-600">— {pipeline.bofuCampaign}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-stretch gap-0 overflow-x-auto pb-1">
              {bofuNodes.map(({ nodeId, meta, count, node, transferRate, index }) => (
                <div key={nodeId} className="flex flex-col md:flex-row items-center md:items-stretch shrink-0">
                  {/* Transfer arrow */}
                  {index > 3 && (
                    <div className="flex md:flex-col items-center justify-center h-8 md:h-auto md:w-14 shrink-0">
                      <div className={`text-[9px] font-bold tabular-nums mr-1.5 md:mr-0 md:mb-0.5 ${transferRate ? 'text-gray-300' : 'text-gray-600'}`}>
                        {transferRate || '—'}
                      </div>
                      <div className="md:hidden w-px h-full bg-gradient-to-b from-gray-600 to-gray-500 relative">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[5px] border-transparent border-t-gray-500" />
                      </div>
                      <div className="hidden md:block w-full h-px bg-gradient-to-r from-gray-600 to-gray-500 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-gray-500" />
                      </div>
                    </div>
                  )}
                  {/* Connection from LP to Retarget */}
                  {index === 3 && (
                    <div className="flex md:flex-col items-center justify-center h-8 md:h-auto md:w-14 shrink-0">
                      <div className="text-[9px] font-bold text-teal-500 mr-1.5 md:mr-0 md:mb-0.5">~100%</div>
                      <div className="md:hidden w-px h-full bg-gradient-to-b from-teal-600 to-teal-500 relative">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[5px] border-transparent border-t-teal-500" />
                      </div>
                      <div className="hidden md:block w-full h-px bg-gradient-to-r from-teal-600 to-teal-500 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-teal-500" />
                      </div>
                      <div className="text-[7px] text-teal-600 ml-1.5 md:ml-0 md:mt-0.5">pixel sync</div>
                    </div>
                  )}
                  {/* Node */}
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 w-full md:w-auto md:min-w-[130px] flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-0">
                    <div className="text-base md:mb-1">{meta.icon}</div>
                    <div className="flex-1 md:flex-initial">
                      <div className="text-[10px] font-bold text-gray-200 md:mb-0.5">{meta.label}</div>
                      <div className="text-[8px] text-gray-500 md:mb-2">{meta.description}</div>
                    </div>
                    {isAdmin && editing === nodeId ? (
                      <input
                        autoFocus
                        type="text"
                        defaultValue={count?.toLocaleString() ?? ''}
                        placeholder="—"
                        className="w-20 text-center text-lg font-bold bg-white/10 border border-purple-500/50 rounded px-1 py-0.5 text-white outline-none"
                        onBlur={(e) => handleEdit(nodeId, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(nodeId, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditing(null); }}
                      />
                    ) : (
                      <button
                        onClick={() => isAdmin && setEditing(nodeId)}
                        className={`text-xl font-bold tabular-nums ${count != null ? 'text-white' : 'text-gray-600'} ${isAdmin ? 'hover:text-purple-300 cursor-pointer' : 'cursor-default'}`}
                      >
                        {fmtCount(count)}
                      </button>
                    )}
                    <div className="flex flex-wrap gap-1 md:mt-1.5 justify-center">
                      {node.refreshDays && (
                        <span className="flex items-center gap-0.5 text-[8px] text-amber-400/80 bg-amber-400/10 rounded px-1.5 py-0.5">
                          <RefreshCw size={8} /> {node.refreshDays}d
                        </span>
                      )}
                      {node.status && (
                        <span className="text-[8px] text-blue-400/80 bg-blue-400/10 rounded px-1.5 py-0.5">{node.status}</span>
                      )}
                      {node.landingPage && (
                        <span className="flex items-center gap-0.5 text-[8px] text-gray-400 bg-white/5 rounded px-1.5 py-0.5">
                          <ExternalLink size={7} /> LP
                        </span>
                      )}
                      {count == null && !node.status && (
                        <span className="text-[8px] text-gray-600 bg-white/5 rounded px-1.5 py-0.5">pending</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset gallery */}
          {(pipeline.assets.tofu?.length || pipeline.assets.bofu?.length) ? (
            <div className="space-y-3 pt-2 border-t border-white/5">
              {pipeline.assets.tofu && pipeline.assets.tofu.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">TOFU Creatives</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {pipeline.assets.tofu.map((a, i) => <AssetCard key={i} asset={a} />)}
                  </div>
                </div>
              )}
              {pipeline.assets.bofu && pipeline.assets.bofu.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">BOFU Creatives</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {pipeline.assets.bofu.map((a, i) => <AssetCard key={i} asset={a} />)}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Map link */}
          <div className="pt-2 border-t border-white/5">
            <a href={pipeline.audienceLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
              View audience on map →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
