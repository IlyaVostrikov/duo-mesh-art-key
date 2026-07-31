import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Hero со СКРОЛЛ-СКРАБОМ: задний фон — анимация, кадр привязан к позиции скролла.
 * Анимация двигается ТОЛЬКО когда скроллишь. Рендер кадров на <canvas>
 * (нет seek-джанка H.264, одинаково во всех браузерах вкл. iOS).
 *
 * Кадры: /hero/frames/f_001.webp … f_062.webp (1440w, линейная анимация из оригинала).
 * children — оверлей (заголовок/CTA), опционально фейдится по прогрессу.
 */

const FRAME_COUNT = 62;
const FRAME_BASE = "/hero/frames";
const framePath = (i: number) =>
  `${FRAME_BASE}/f_${String(i + 1).padStart(3, "0")}.webp`;

const SCROLL_VH = 300; // длина зоны скраба: 300 ≈ 2 экрана прокрутки

export default function HeroScrubCanvas({ children }: { children?: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const drawnRef = useRef(-1);
  const rafRef = useRef(0);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const draw = (idx: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[idx];
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max((cw * dpr) / iw, (ch * dpr) / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (cw * dpr - dw) / 2, (ch * dpr - dh) / 2, dw, dh);
    drawnRef.current = idx;
  };

  // предзагрузка
  useEffect(() => {
    let alive = true, count = 0;
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = framePath(i);
      img.onload = img.onerror = () => {
        if (!alive) return;
        count++;
        setLoaded(count);
        if (i === 0 && img.naturalWidth) draw(0);
        if (count === FRAME_COUNT) setReady(true);
      };
      imgs[i] = img;
    }
    framesRef.current = imgs;
    return () => { alive = false; };
  }, []);

  // скролл → кадр (+ опциональный фейд оверлея)
  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let visible = false;

    const tick = () => {
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      const idx = Math.round(p * (FRAME_COUNT - 1));
      if (idx !== drawnRef.current) draw(idx);
      if (contentRef.current) contentRef.current.style.opacity = String(clamp(1 - p * 1.6, 0, 1));
      if (visible) rafRef.current = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(tick); }
    }, { threshold: 0 });
    io.observe(wrap);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    tick();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section style={{ height: "100svh", position: "relative", background: "#0b0c10" }}>
        <img src="/hero/hero-final.webp" alt="" style={cover} />
        <Overlay>{children}</Overlay>
      </section>
    );
  }

  const pct = Math.round((loaded / FRAME_COUNT) * 100);

  return (
    <div ref={wrapRef} style={{ height: `${SCROLL_VH}vh`, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100svh", overflow: "hidden", background: "#0b0c10" }}>
        <img src="/hero/hero-poster.webp" alt="" aria-hidden
          style={{ ...cover, opacity: ready ? 0 : 1, transition: "opacity .4s" }} />
        <canvas ref={canvasRef} style={cover} />
        <div ref={contentRef} style={{ position: "absolute", inset: 0, willChange: "opacity" }}>
          <Overlay>{children}</Overlay>
        </div>
        {!ready && (
          <div style={{ position: "absolute", bottom: 24, left: 24, font: "500 12px/1 ui-monospace,monospace", letterSpacing: ".08em", color: "rgba(255,255,255,.7)", mixBlendMode: "difference" }}>
            LOADING {pct}%
          </div>
        )}
      </div>
    </div>
  );
}

function Overlay({ children }: { children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "clamp(28px,6vw,88px)", color: "#fff", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto" }}>{children ?? <DefaultContent />}</div>
    </div>
  );
}

function DefaultContent() {
  return (
    <>
      <style>{`
        .dm-eyebrow{font:500 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;opacity:.78;margin:0 0 18px}
        .dm-title{font:300 clamp(40px,7vw,92px)/1.02 Georgia,serif;letter-spacing:-.01em;margin:0;max-width:16ch;text-shadow:0 2px 40px rgba(0,0,0,.35)}
        .dm-sub{font:400 clamp(15px,1.4vw,19px)/1.5 ui-sans-serif,system-ui,sans-serif;opacity:.85;margin:20px 0 32px;max-width:42ch}
        .dm-cta{display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border:1px solid rgba(255,255,255,.55);border-radius:999px;color:#fff;text-decoration:none;font:500 14px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;backdrop-filter:blur(6px);transition:background .25s,border-color .25s,transform .25s}
        .dm-cta:hover{background:rgba(255,255,255,.12);border-color:#fff;transform:translateY(-1px)}
      `}</style>
      <p className="dm-eyebrow">DUO&nbsp;MESH</p>
      <h1 className="dm-title">Подлинность, заверенная криптографией</h1>
      <p className="dm-sub">Виртуальные залы и сертификат Art&nbsp;Key — провенанс, который нельзя подделать.</p>
      <a className="dm-cta" href="/halls">Войти в залы →</a>
    </>
  );
}

const cover: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
