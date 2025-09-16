// Minimal telemetry helper for MV3

async function getSync(keys){return new Promise(r=>{try{chrome.storage.sync.get(keys,(d)=>r(d||{}))}catch{r({})}})}

import { resolveGatewayBaseUrl } from './env_config.js';

async function resolveGatewayBase(){
  try{
    const base = await resolveGatewayBaseUrl();
    return base && base.replace(/\/$/, "");
  }catch{ return null }
}

export async function emit(eventType, props={}){
  try{
    const { memory_enabled, telemetry_opt_out } = await getSync(["memory_enabled","telemetry_opt_out"]);
    if (memory_enabled === false || telemetry_opt_out === true) return false;
    const base = await resolveGatewayBase();
    if (!base) return false;
    const payload = { event: eventType, ts: Date.now(), props };
    const controller = new AbortController();
    const id = setTimeout(()=>controller.abort(), 3000);
    try{
      const res = await fetch(`${base}/telemetry`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      return res.ok;
    }catch{ return false } finally{ clearTimeout(id); }
  }catch{ return false; }
}
