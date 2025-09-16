
export function rankAndSort(items, { q, domain, pathPrefix }) {
  const now = Date.now();
  
  const scoredItems = items.map(item => {
    const text = (item.text || '').toLowerCase();
    const itemDomain = item.metadata?.context?.domain?.name || '';
    const itemPath = item.metadata?.context?.route?.path || '';
    const itemTimestamp = item.ts ? new Date(item.ts).getTime() : 0;

    // 1. Text Relevance Score (simple inclusion for now)
    const textScore = q && text.includes(q.toLowerCase()) ? 1 : 0;

    // 2. Context Boost
    const domainBoost = domain && itemDomain === domain ? 4 : 0;
    const pathBoost = pathPrefix && itemPath.startsWith(pathPrefix) ? 2 : 0;
    
    // 3. Recency Decay (simple linear decay over 30 days)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const age = now - itemTimestamp;
    const recencyScore = itemTimestamp ? Math.max(0, (thirtyDays - age) / thirtyDays) : 0;
    
    // 4. Path Depth Penalty
    const pathDepth = (itemPath.match(/\//g) || []).length;
    const depthPenalty = pathDepth * 0.1;

    // Combine scores
    const finalScore = (item.score || 0) + textScore + domainBoost + pathBoost + recencyScore - depthPenalty;

    return { ...item, score: finalScore };
  });

  // Sort by final score, descending
  return scoredItems.sort((a, b) => b.score - a.score);
}

