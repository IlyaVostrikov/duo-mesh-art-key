import { useEffect, useRef, useState } from "react";

/**
 * Скролл-скраб через секвенцию кадров на <canvas>.
 * Самый надёжный способ: нет seek-джанка H.264, идентичное поведение
 * во всех браузерах (вкл. iOS Safari), полный контроль mapping scroll→frame.
 *
 * Кадры: /hero/frames/f_001.webp ... f_096.webp (1600w, см. ассеты).
 */

const FRAME_COUNT = 96;
const FRAME_BASE = "/hero/frames"; // куда положишь распакованный hero-frames.zip
const framePath = (i: number) =>
  `${FRAME_BASE}/f_${String(i + 1).padStart(3, "0")}.webp`;

// Высота секции скролла. Больше = длиннее скраб. 300vh ≈ 2 экрана прокрутки.
const SCROLL_VH = 300;

export default function HeroScrubCanvas({ children }: { children?: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const drawnRef = useRef(-1);
  const rafRef = useRef(0);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- cover-fit отрисовка кадра в canvas (с учётом DPR) ----
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
    const dx = (cw * dpr - dw) / 2, dy = (ch * dpr - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    drawnRef.current = idx;
  };

  // ---- предзагрузка кадров ----
  useEffect(() => {
    let alive = true;
    let count = 0;
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = framePath(i);
      img.onload = () => {
        if (!alive) return;
        count++;
        setLoaded(count);
        if (i === 0) draw(0); // первый кадр — сразу
        if (count === FRAME_COUNT) setReady(true);
      };
      img.onerror = () => {
        if (!alive) return;
        count++;
        setLoaded(count);
        if (count === FRAME_COUNT) setReady(true);
      };
      imgs[i] = img;
    }
    framesRef.current = imgs;
    return () => {
      alive = false;
    };
  }, []);

  // ---- скролл → кадр ----
  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let visible = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) tick();
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    const tick = () => {
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      const idx = Math.round(progress * (FRAME_COUNT - 1));
      if (idx !== drawnRef.current) draw(idx);
      if (visible) rafRef.current = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
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

  // reduced-motion → статичный финальный кадр, без скролл-секции
  if (reduced) {
    return (
      <section style={{ height: "100svh", position: "relative" }}>
        <img
          src="/hero/hero-final.webp"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {children && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>{children}</div>
          </div>
        )}
      </section>
    );
  }

  const pct = Math.round((loaded / FRAME_COUNT) * 100);

  return (
    <div ref={wrapRef} style={{ height: `${SCROLL_VH}vh`, position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          overflow: "hidden",
        }}
      >
        {/* постер под канвасом — мгновенная отрисовка до загрузки */}
        <img
          src="/hero/hero-poster.webp"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: ready ? 0 : 1,
            transition: "opacity .4s",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        {children && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>{children}</div>
          </div>
        )}
        {!ready && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              font: "500 12px/1 ui-monospace, monospace",
              letterSpacing: ".08em",
              color: "rgba(255,255,255,.7)",
              mixBlendMode: "difference",
            }}
          >
            LOADING {pct}%
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
