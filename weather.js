/* Kolkata clock and low-volume MET Norway forecast widget. No API key. */
(() => {
  'use strict';
  const zone='Asia/Kolkata',cacheKey='epoxy-aura-kolkata-weather-v1';
  const weather=document.getElementById('live-weather'),updated=document.getElementById('weather-updated');
  function clock(){
    const now=new Date();
    document.getElementById('live-date').textContent=new Intl.DateTimeFormat('en-IN',{timeZone:zone,weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);
    const time=document.getElementById('live-time');time.dateTime=now.toISOString();
    time.textContent=new Intl.DateTimeFormat('en-IN',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now)+' IST';
  }
  clock();setInterval(clock,1000);
  let cache=null,blocked=false,inFlight=false;
  try{cache=JSON.parse(localStorage.getItem(cacheKey));}catch(_){/* Storage is optional. */}
  function display(){
    if(!cache||!Number.isFinite(cache.temperature)||Date.now()-cache.savedAt>3*3600000)return false;
    weather.textContent='Kolkata · '+Math.round(cache.temperature)+'°C · '+cache.condition+' forecast';
    updated.textContent='Forecast time '+new Date(cache.forecastAt).toLocaleString('en-IN',{timeZone:zone})+' IST. Retrieved '+new Date(cache.savedAt).toLocaleTimeString('en-IN',{timeZone:zone})+' IST.';
    return true;
  }
  async function refresh(){
    if(blocked||inFlight||document.hidden)return;
    if(display()&&Date.now()<cache.expires)return;
    // A hosted Origin identifies the website. Do not impersonate one from file://.
    if(location.protocol==='file:'||['localhost','127.0.0.1',''].includes(location.hostname)){
      weather.textContent='Kolkata · Weather ↗';updated.textContent='Use the Forecast link while viewing local files. Automatic weather activates on a publicly hosted website with internet access.';return;
    }
    if(!navigator.onLine){if(!display())weather.textContent='Kolkata · Weather offline';return;}
    inFlight=true;const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),10000);
    try{
      const response=await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=22.5726&lon=88.3639',{signal:abort.signal,credentials:'omit'});
      if([403,429].includes(response.status))blocked=true;
      if(!response.ok)throw new Error('Weather response '+response.status);
      const payload=await response.json(),series=payload?.properties?.timeseries;
      if(!Array.isArray(series)||!series.length)throw new Error('Missing forecast');
      const point=series.reduce((a,b)=>Math.abs(Date.parse(a.time)-Date.now())<Math.abs(Date.parse(b.time)-Date.now())?a:b);
      const temperature=point.data?.instant?.details?.air_temperature;
      if(!Number.isFinite(temperature)||Math.abs(Date.parse(point.time)-Date.now())>3*3600000)throw new Error('Invalid or outdated forecast');
      const code=point.data?.next_1_hours?.summary?.symbol_code||point.data?.next_6_hours?.summary?.symbol_code||'weather';
      const condition=code.replace(/_(day|night|polartwilight)$/,'').replace(/([a-z])(showers|rain|cloudy|snow|thunder)/g,'$1 $2');
      cache={temperature,condition,forecastAt:point.time,savedAt:Date.now(),expires:Math.max(Date.parse(response.headers.get('Expires'))||0,Date.now()+45*60000)};
      try{localStorage.setItem(cacheKey,JSON.stringify(cache));}catch(_){}
      display();
    }catch(_){if(!display())weather.textContent='Kolkata · Weather unavailable';updated.textContent='Weather could not be refreshed. Use the Forecast link for the latest available information.';}
    finally{clearTimeout(timeout);inFlight=false;}
  }
  refresh();setInterval(refresh,(46+Math.random()*8)*60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){clock();refresh();}});
})();
