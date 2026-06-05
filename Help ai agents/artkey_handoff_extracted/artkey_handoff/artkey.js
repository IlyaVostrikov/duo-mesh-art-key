/* ============================================================
   ArtKey — motion engine
   Everything animated is driven by a single rAF loop via inline
   styles (no reliance on CSS transitions / keyframes for state).
   ============================================================ */
(function(){
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp  = (a,b,t)=>a+(b-a)*t;
  const smooth= t=>t*t*(3-2*t);
  const outCubic = t=>1-Math.pow(1-t,3);

  /* ---------- REVEAL (scroll-position driven, stateless per frame) ---------- */
  const reveals=[...document.querySelectorAll('.reveal')].map(el=>({
    el,
    off: (parseFloat(el.style.getPropertyValue('--d'))||0)*0.16, // px stagger
    blur: el.classList.contains('blur'),
    peak:0
  }));
  function updateReveals(now,vh){
    for(const r of reveals){
      const rc=r.el.getBoundingClientRect();
      // 0 when top at 92% vh, 1 when it has risen 22% of vh higher
      let k = clamp((vh*0.92 - rc.top - r.off)/(vh*0.22), 0, 1);
      k = reduce ? 1 : outCubic(k);
      if(k < r.peak) k = r.peak; else r.peak = k;   // latch — never un-reveal
      r.el.style.opacity=String(k);
      r.el.style.transform = k>=1 ? 'none' : `translateY(${(1-k)*26}px)`;
      if(r.blur) r.el.style.filter = k>=1 ? 'none' : `blur(${(1-k)*8}px)`;
    }
  }

  /* ---------- CHECK ticks (scroll-position driven) ---------- */
  const checks=[...document.querySelectorAll('.check')].map(el=>({
    el, path:el.querySelector('.tick path'),
    off:(parseFloat(el.style.getPropertyValue('--d'))||0)*0.16, peak:0
  }));
  function updateChecks(now,vh){
    for(const c of checks){
      if(!c.path) continue;
      let k = clamp((vh*0.82 - c.el.getBoundingClientRect().top - c.off)/(vh*0.14), 0, 1);
      k = reduce ? 1 : outCubic(k);
      if(k < c.peak) k = c.peak; else c.peak = k;
      c.path.style.strokeDashoffset=String(24*(1-k));
    }
  }

  /* ---------- TOP BAR theme + ambient tint ---------- */
  const bar=document.querySelector('.topbar');
  const darkSections=[...document.querySelectorAll('[data-theme="dark"]')];
  function sectionDarkAt(probe){
    for(const s of darkSections){ const r=s.getBoundingClientRect(); if(r.top<=probe&&r.bottom>=probe) return true; }
    return false;
  }
  let ambientDark=false;

  /* ---------- scene registry ---------- */
  const scenes=[];
  const register=(el,render,scrub)=>scenes.push({el,render,scrub:!!scrub});
  function runScenes(t,vh){
    for(const s of scenes){
      const r=s.el.getBoundingClientRect();
      if(!(r.bottom>-vh*0.3 && r.top<vh*1.3) && !reduce) continue;
      let p=0;
      if(s.scrub){ const total=r.height-vh; p=total>0?clamp((-r.top)/total,0,1):(r.top<=0?1:0); }
      s.render(p,t);
    }
  }

  /* ---------- AMBIENT PARTICLES ---------- */
  const ambient=(function(){
    const cv=document.getElementById('ambient'); if(!cv) return null;
    const ctx=cv.getContext('2d'); let w,h,motes=[];
    function size(){
      w=cv.width=Math.floor(innerWidth*DPR); h=cv.height=Math.floor(innerHeight*DPR);
      cv.style.width=innerWidth+'px'; cv.style.height=innerHeight+'px';
      const n=Math.round((innerWidth*innerHeight)/26000);
      motes=new Array(Math.max(36,Math.min(110,n))).fill(0).map(()=>({
        x:Math.random()*w, y:Math.random()*h, r:(Math.random()*1.4+.4)*DPR,
        vx:(Math.random()-.5)*.12*DPR, vy:(-Math.random()*.18-.04)*DPR,
        a:Math.random()*.5+.15, ph:Math.random()*Math.PI*2 }));
    }
    size(); addEventListener('resize',size);
    function draw(){
      ctx.clearRect(0,0,w,h);
      const col=ambientDark?'239,236,230':'22,20,15', base=ambientDark?.5:.32;
      for(const m of motes){
        if(!reduce){ m.x+=m.vx; m.y+=m.vy; m.ph+=.008;
          if(m.y<-10){ m.y=h+10; m.x=Math.random()*w; }
          if(m.x<-10) m.x=w+10; if(m.x>w+10) m.x=-10; }
        const tw=(Math.sin(m.ph)*.5+.5)*.6+.4;
        ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${col},${m.a*tw*base})`; ctx.fill();
      }
    }
    return {draw};
  })();

  /* ---------- HERO living artwork (continuous, first-frame WOW) ---------- */
  (function heroArt(){
    const cv=document.getElementById('hero-canvas'); if(!cv) return;
    const ctx=cv.getContext('2d');
    const fpEl=document.getElementById('hero-fp');
    let w,h, t0=performance.now();
    const COLS=26, ROWS=34, pts=[];
    for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++)
      pts.push({u:(i+.5)/COLS,v:(j+.5)/ROWS,
        a:Math.random()*Math.PI*2, r:Math.random()*0.5+0.5, sp:Math.random()*0.7+0.5});
    // warm grayscale composition (an abstract "work")
    function field(u,v){
      let L=.78-v*.30;
      L+=Math.sin(v*9+u*1.6)*.05 + Math.cos(u*7-v*3)*.03;
      if(v>.40&&v<.64&&u>.16&&u<.72) L-=.32;       // dark mass
      if(v>.12&&v<.32&&u>.56&&u<.9)  L+=.12;        // light block
      if(u>.30&&u<.39) L-=.09;                      // seam
      L=clamp(L,.07,.95);
      return [Math.round(244*L+10),Math.round(240*L+9),Math.round(232*L+8)];
    }
    function size(){ w=cv.width=Math.floor(cv.clientWidth*DPR); h=cv.height=Math.floor(cv.clientHeight*DPR); }
    size(); addEventListener('resize',size);
    const HEX='0123456789abcdef';
    const FP='a3f9c27e';

    function draw(now){
      if(!w||!h) size();
      const T=(now-t0)/1000;
      // quick intro materialize (~0.9s), then stays fully present & alive
      const intro = reduce ? 1 : clamp(T/0.9,0,1);
      const introE = 1-Math.pow(1-intro,3);
      ctx.clearRect(0,0,w,h);
      const AW=w, AH=h, cellx=AW/COLS, celly=AH/ROWS;

      // a reconstruction wave travels top→bottom on a loop, lifting cells into
      // floating coordinate-points and settling them back — "self-verifying art"
      const wavePos = reduce ? -1 : ((T*0.34)%1.5)-0.25;   // -0.25..1.25
      const waveW = 0.16;

      for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
        const idx=j*COLS+i, pt=pts[idx], c=field(pt.u,pt.v);
        // distance of this row-band from the wave centre
        const dv = Math.abs(pt.v - wavePos);
        const lift = wavePos<0 ? 0 : clamp(1 - dv/waveW, 0, 1); // 0..1 inside band
        const liftE = lift*lift*(3-2*lift);
        const bx=pt.u*AW, by=pt.v*AH;
        // gentle continuous breathing drift everywhere
        const dx=Math.cos(T*0.6*pt.sp+pt.a)*2.2*DPR;
        const dy=Math.sin(T*0.6*pt.sp+pt.a)*2.2*DPR;
        // intro scatter (only during first 0.9s)
        const scat=(1-introE);
        const sx=Math.cos(pt.a)*pt.r*AW*0.5*scat;
        const sy=Math.sin(pt.a)*pt.r*AH*0.5*scat;
        // when lifted, the cell floats up & sideways as a point
        const lox = bx + sx + dx + Math.cos(pt.a)*liftE*18*DPR;
        const loy = by + sy + dy - liftE*14*DPR;

        const lum=(c[0]+c[1]+c[2])/765;
        if(liftE>0.04 || scat>0.04){
          // point form (brighter, so it reads against the dark ground)
          const r=DPR*(1.1+liftE*0.9);
          ctx.globalAlpha=introE*lerp(0.5,1,Math.max(lum,liftE));
          ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.beginPath(); ctx.arc(lox,loy,r,0,Math.PI*2); ctx.fill();
          // faint settled cell underneath so the picture never fully dissolves
          ctx.globalAlpha=introE*(1-liftE)*0.9;
          ctx.fillRect(bx-.5,by-.5,cellx+1,celly+1);
        } else {
          ctx.globalAlpha=introE;
          ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.fillRect(bx-.5,by-.5,cellx+1,celly+1);
        }
      }
      ctx.globalAlpha=1;

      // bright leading edge line of the wave
      if(wavePos>=0 && wavePos<=1 && !reduce){
        const y=wavePos*h;
        const g=ctx.createLinearGradient(0,y-2*DPR,0,y+2*DPR);
        g.addColorStop(0,'rgba(239,236,230,0)'); g.addColorStop(.5,`rgba(239,236,230,${0.5*introE})`); g.addColorStop(1,'rgba(239,236,230,0)');
        ctx.fillStyle=g; ctx.fillRect(0,y-2*DPR,w,4*DPR);
      }
      // inner frame line
      ctx.strokeStyle=`rgba(239,236,230,${0.14*introE})`; ctx.lineWidth=DPR; ctx.strokeRect(DPR,DPR,w-2*DPR,h-2*DPR);

      // live fingerprint in the plate
      if(fpEl){
        if(intro<1){
          let s=''; for(let i=0;i<FP.length;i++) s+= (Math.random()<introE)?FP[i]:HEX[(Math.random()*16)|0];
          fpEl.textContent=s;
        } else if(!reduce && Math.random()<0.05){
          const i=(Math.random()*FP.length)|0;
          fpEl.textContent=FP.slice(0,i)+HEX[(Math.random()*16)|0]+FP.slice(i+1);
          setTimeout(()=>{ fpEl.textContent=FP; },90);
        } else fpEl.textContent=FP;
      }
    }
    register(cv, (p,t)=>draw(t), false);
    if(reduce) draw(performance.now());
  })();
  (function sha(){
    const wrap=document.getElementById('sha'); const cv=document.getElementById('sha-canvas');
    if(!wrap||!cv) return;
    const ctx=cv.getContext('2d');
    const beats=[...wrap.querySelectorAll('.sha-beat')].map(el=>({el,o:0}));
    const hashEl=wrap.querySelector('.sha-hash b'); const hashBox=wrap.querySelector('.sha-hash');
    let w,h, hashO=0;
    const COLS=30, ROWS=40, pts=[];
    for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++)
      pts.push({u:(i+.5)/COLS,v:(j+.5)/ROWS,ox:Math.random()-.5,oy:Math.random()-.5,sp:Math.random()*.6+.4,ph:Math.random()*Math.PI*2});
    function field(u,v){
      let L=.80-v*.30; L+=Math.sin(v*11+u*1.4)*.05;
      if(v>.42&&v<.66&&u>.18&&u<.74) L-=.34;
      if(v>.10&&v<.30&&u>.55&&u<.9)  L+=.12;
      if(u>.30&&u<.40) L-=.10; L=clamp(L,.06,.96);
      return [Math.round(244*L+10),Math.round(240*L+9),Math.round(232*L+8)];
    }
    function size(){ w=cv.width=Math.floor(cv.clientWidth*DPR); h=cv.height=Math.floor(cv.clientHeight*DPR); }
    size(); addEventListener('resize',size);
    const HASH='a3f9c27e8b41d605fae29c7b3d18e0a4c6592f7188bd3e0a47c91f6e2b5d8a0c';
    const HEX='0123456789abcdef';
    function art(){ const aw=Math.min(w*.42,h*.46), ah=aw*1.32; return {x:(w-aw)/2,y:h*.40-ah/2,w:aw,h:ah}; }

    register(wrap,(p,t)=>{
      if(!w||!h) size();
      ctx.clearRect(0,0,w,h);
      const A=art();
      const pSolid=1-smooth(clamp((p-.34)/.18,0,1));
      const pGrid =smooth(clamp((p-.24)/.16,0,1))*(1-smooth(clamp((p-.66)/.14,0,1)));
      const pDisp =smooth(clamp((p-.40)/.30,0,1));
      const pConv =smooth(clamp((p-.70)/.30,0,1));
      const pHash =smooth(clamp((p-.72)/.22,0,1));

      if(pSolid>0.01){
        const cx=A.w/COLS, cy=A.h/ROWS; ctx.globalAlpha=pSolid;
        for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
          const c=field((i+.5)/COLS,(j+.5)/ROWS);
          ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.fillRect(A.x+i*cx-.5,A.y+j*cy-.5,cx+1,cy+1);
        }
        ctx.globalAlpha=1; ctx.strokeStyle='rgba(239,236,230,.10)'; ctx.lineWidth=DPR; ctx.strokeRect(A.x,A.y,A.w,A.h);
      }
      if(pGrid>0.01){
        ctx.globalAlpha=pGrid*.5; ctx.strokeStyle='rgba(239,236,230,.5)'; ctx.lineWidth=DPR*.6; ctx.beginPath();
        for(let i=0;i<=10;i++){ const x=A.x+A.w*i/10; ctx.moveTo(x,A.y); ctx.lineTo(x,A.y+A.h); }
        for(let j=0;j<=13;j++){ const y=A.y+A.h*j/13; ctx.moveTo(A.x,y); ctx.lineTo(A.x+A.w,y); }
        ctx.stroke(); ctx.globalAlpha=1;
      }
      if(pDisp>0.01){
        const lineY=A.y+A.h*.5;
        const P=pts.map(pt=>{
          const bx=A.x+pt.u*A.w, by=A.y+pt.v*A.h, drift=pDisp*(1-pConv);
          const fx=bx+pt.ox*A.w*.16*drift+Math.sin(t*.0006*pt.sp+pt.ph)*6*DPR*drift;
          const fy=by+pt.oy*A.h*.10*drift+Math.cos(t*.0006*pt.sp+pt.ph)*6*DPR*drift;
          return {x:lerp(fx,A.x+A.w*.5+(pt.u-.5)*A.w*.86,pConv), y:lerp(fy,lineY+pt.oy*4*DPR*(1-pConv),pConv), c:field(pt.u,pt.v)};
        });
        ctx.globalAlpha=clamp(pDisp,0,1)*(1-pConv*.6)*.7; ctx.strokeStyle='rgba(239,236,230,.6)'; ctx.lineWidth=DPR*.6; ctx.beginPath();
        for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
          const idx=j*COLS+i, a=P[idx];
          if(i<COLS-1){ const b=P[idx+1]; ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }
          if(j<ROWS-1){ const b=P[idx+COLS]; ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }
        }
        ctx.stroke(); ctx.globalAlpha=1;
        for(const q of P){
          const r=DPR*(1.4+pConv*.6); ctx.beginPath(); ctx.arc(q.x,q.y,r,0,Math.PI*2);
          const lum=(q.c[0]+q.c[1]+q.c[2])/765;
          ctx.fillStyle=`rgba(239,236,230,${lerp(.55,1,lum)*clamp(pDisp,0,1)})`; ctx.fill();
        }
        if(pConv>0.01){
          // soft radial halo behind the converged signature
          ctx.globalAlpha=pConv*.5;
          const rg=ctx.createRadialGradient(A.x+A.w/2,lineY,0,A.x+A.w/2,lineY,A.w*.62);
          rg.addColorStop(0,'rgba(239,236,230,.22)'); rg.addColorStop(1,'rgba(239,236,230,0)');
          ctx.fillStyle=rg; ctx.fillRect(A.x-A.w*.3,lineY-A.h*.2,A.w*1.6,A.h*.4);
          ctx.globalAlpha=pConv*.9;
          const g=ctx.createLinearGradient(A.x,0,A.x+A.w,0);
          g.addColorStop(0,'rgba(239,236,230,0)'); g.addColorStop(.5,'rgba(239,236,230,.85)'); g.addColorStop(1,'rgba(239,236,230,0)');
          ctx.strokeStyle=g; ctx.lineWidth=DPR*1.6; ctx.beginPath(); ctx.moveTo(A.x,lineY); ctx.lineTo(A.x+A.w,lineY); ctx.stroke(); ctx.globalAlpha=1;
        }
      }
      // hash readout — opacity is a pure function of p
      hashBox.style.opacity=String(clamp((p-.70)/.06,0,1));
      if(pHash>0.01){
        const reveal=Math.floor(pHash*HASH.length); let out='';
        for(let i=0;i<HASH.length;i++) out+= i<reveal?HASH[i]:HEX[(Math.random()*16)|0];
        hashEl.textContent=out;
      }
      // text beats — opacity is a windowed function of p (stateless)
      const bands=[[-1,.30],[.30,.55],[.55,.74],[.74,2]];
      beats.forEach((b,i)=>{
        const [s,e2]=bands[i];
        const o=clamp(Math.min((p-s)/.04,(e2-p)/.04,1),0,1);
        b.el.style.opacity=String(o);
        b.el.style.transform=`translateY(${(1-o)*16}px)`;
      });
    },true);
  })();

  /* ---------- SCENE: ownership chain ---------- */
  (function chain(){
    const wrap=document.getElementById('chain'); if(!wrap) return;
    const fill=wrap.querySelector('.chain-fill');
    const pulse=wrap.querySelector('.chain-pulse');
    const nodes=[...wrap.querySelectorAll('.node')].map(el=>({
      el, dot:el.querySelector('.dot'), role:el.querySelector('.role'),
      ico:el.querySelector('.n-ico'), ring:el.querySelector('.ring'),
      hash:el.querySelector('.n-hash'),
      strokes:[...el.querySelectorAll('.n-ico path, .n-ico circle')]
    }));
    const n=nodes.length;
    register(wrap,(p)=>{
      const tp=smooth(clamp((p-.08)/.80,0,1));
      fill.style.width=(tp*100)+'%';
      // traveling glow at the head of the fill
      pulse.style.left=(tp*100)+'%';
      pulse.style.opacity=String(tp>0 && tp<1 ? 1 : (tp>=1?0:0));
      nodes.forEach((nd,i)=>{
        const at=i/(n-1);
        // local progress as the fill head sweeps across this node (window ~7% of track)
        const lp=clamp((tp-at)/0.07 + 0.5, 0, 1);
        const e=outCubic(lp);
        // dot fills
        const lit=lp>0.5;
        nd.dot.style.background= lit?'var(--ink)':'var(--paper)';
        nd.dot.style.borderColor= lit?'var(--ink)':'var(--hair)';
        nd.dot.style.boxShadow= lit?'0 0 0 4px rgba(22,20,15,.06)':'none';
        // connector tick grows from track up to medallion
        nd.el.style.setProperty('--tick', (e*18)+'px');
        // medallion: fade + scale-settle, stroke draws
        nd.ico.style.opacity=String(e);
        nd.ico.style.transform=`translateX(-50%) scale(${0.7+0.3*e})`;
        nd.ico.style.borderColor = e>0.6 ? 'var(--ink)' : 'var(--hair)';
        nd.ico.style.color = e>0.6 ? 'var(--ink)' : 'var(--ink-3)';
        nd.strokes.forEach(s=>{ s.style.strokeDashoffset=String(1-e); });
        // ring pulse — one-shot as the head passes (peaks mid-pass)
        nd.ring.style.opacity=String(Math.sin(clamp(lp,0,1)*Math.PI)*0.5);
        nd.ring.style.transform=`scale(${0.6+lp*0.9})`;
        // hash chip
        nd.hash.style.opacity=String(e*0.95);
        nd.hash.style.transform=`translateX(-50%) translateY(${(1-e)*6}px)`;
        // role
        nd.role.style.opacity=String(e);
        nd.role.style.transform=`translateX(-50%) translateY(${(1-e)*8}px)`;
      });
    },true);
  })();

  /* ---------- QR matrix (deterministic, drawn once) ---------- */
  (function qr(){
    const cv=document.getElementById('qr-canvas'); if(!cv) return;
    const N=29, cell=4, q=4, px=(N+q*2)*cell;
    cv.width=px*DPR; cv.height=px*DPR; cv.style.width=px+'px'; cv.style.height=px+'px';
    const ctx=cv.getContext('2d'); ctx.scale(DPR,DPR);
    ctx.fillStyle='#f4f3f1'; ctx.fillRect(0,0,px,px); ctx.fillStyle='#16140f';
    let seed=20260604; const rnd=()=>{ seed=(seed*1664525+1013904223)&0xffffffff; return ((seed>>>8)&0xffff)/0xffff; };
    const grid=[]; for(let y=0;y<N;y++){ grid[y]=[]; for(let x=0;x<N;x++) grid[y][x]=rnd()>.52?1:0; }
    function finder(ox,oy){
      for(let y=0;y<=6;y++)for(let x=0;x<=6;x++)
        grid[oy+y][ox+x]= ((x===0||x===6||y===0||y===6)||(x>=2&&x<=4&&y>=2&&y<=4))?1:0;
      for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){ const gx=ox+x,gy=oy+y; if(gx<0||gy<0||gx>=N||gy>=N) continue; if(x===-1||x===7||y===-1||y===7) grid[gy][gx]=0; }
    }
    finder(0,0); finder(N-7,0); finder(0,N-7);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++) if(grid[y][x]) ctx.fillRect((q+x)*cell,(q+y)*cell,cell,cell);
  })();

  /* ---------- scanline (JS-driven sweep) ---------- */
  const scanline=(function(){
    const sp=document.querySelector('.specimen'); const ln=document.querySelector('.scanline');
    if(!sp||!ln) return null;
    return {tick:(t)=>{
      const r=sp.getBoundingClientRect();
      const vis=r.top<innerHeight && r.bottom>0;
      if(!vis){ ln.style.opacity='0'; return; }
      if(reduce){ ln.style.top='50%'; ln.style.opacity='.4'; return; }
      const cyc=(t%3400)/3400;
      ln.style.top=(cyc*100)+'%';
      ln.style.opacity=String((cyc<.08?cyc/.08:cyc>.92?(1-cyc)/.08:1)*.85);
    }};
  })();

  /* ---------- SCENE: finale constellation ---------- */
  (function constellation(){
    const cv=document.getElementById('constellation'); if(!cv) return;
    const ctx=cv.getContext('2d'); let w,h,works=[];
    function size(){
      w=cv.width=Math.floor(cv.clientWidth*DPR); h=cv.height=Math.floor(cv.clientHeight*DPR);
      const n=Math.round(innerWidth/120)+6;
      works=new Array(clamp(n,9,18)).fill(0).map(()=>({
        x:(0.08+0.84*Math.random())*w, y:(0.16+0.68*Math.random())*h,
        s:(Math.random()*10+8)*DPR, ph:Math.random()*Math.PI*2, sp:Math.random()*.4+.3 }));
      works.sort((a,b)=>a.x-b.x);
    }
    size(); addEventListener('resize',size);
    register(cv,(p,t)=>{
      if(!w||!h) size();
      ctx.clearRect(0,0,w,h);
      ctx.strokeStyle='rgba(239,236,230,.14)'; ctx.lineWidth=DPR*.7; ctx.beginPath();
      works.forEach((wk,i)=>{ i?ctx.lineTo(wk.x,wk.y):ctx.moveTo(wk.x,wk.y); }); ctx.stroke();
      works.forEach((wk)=>{
        const glow=reduce?.5:(Math.sin(t*.0009*wk.sp+wk.ph)*.5+.5);
        ctx.strokeStyle=`rgba(239,236,230,${lerp(.08,.5,glow)})`; ctx.lineWidth=DPR;
        ctx.strokeRect(wk.x-wk.s/2, wk.y-wk.s*.66, wk.s, wk.s*1.32);
        ctx.beginPath(); ctx.arc(wk.x,wk.y,DPR*1.4,0,Math.PI*2);
        ctx.fillStyle=`rgba(239,236,230,${lerp(.2,.8,glow)})`; ctx.fill();
      });
    },false);
  })();

  /* ---------- MASTER LOOP ---------- */
  function pass(t){
    const vh=innerHeight;
    ambientDark=sectionDarkAt(vh*0.5);
    bar.style.color = sectionDarkAt(42) ? 'var(--on-noir)' : 'var(--ink)';
    updateReveals(t,vh); updateChecks(t,vh);
    if(ambient) ambient.draw();
    runScenes(t,vh);
    if(scanline) scanline.tick(t);
  }
  function frame(t){ pass(t); requestAnimationFrame(frame); }

  // scroll/resize always re-pass (covers rAF throttling when idle/blurred)
  addEventListener('scroll',()=>pass(performance.now()),{passive:true});
  addEventListener('resize',()=>pass(performance.now()));
  window.__akPass = ()=>pass(performance.now());  // verification hook
  pass(performance.now());
  if(!reduce) requestAnimationFrame(frame);
})();
