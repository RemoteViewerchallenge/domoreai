
export const SmartGrid = ({ endpoint }: { endpoint?: string }) => {
  return (
    <div className="p-4 border border-dashed border-zinc-700 rounded bg-zinc-900/50">
      <div className="text-xs text-zinc-500 font-mono mb-2">SmartGrid: {endpoint || 'No Endpoint'}</div>
      <div className="grid grid-cols-3 gap-2">
         {[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse"></div>)}
      </div>
    </div>
  );
};
