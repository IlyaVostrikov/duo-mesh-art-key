import { useEffect, useRef } from "react";

/**
 * Скролл-скраб через video.currentTime.
 * Легче по весу (один файл), но требует all-intra mp4 (GOP=1, без B-кадров),
 * иначе seek по 4K даёт джанк. Файл: /hero/hero-scrub-1080.mp4 (24MB, all-intra).
 *
 * На iOS обязательно muted + playsInline, иначе скраб не работает.
 */

const SCROLL_VH = 300;
const SRC = "/hero/hero-scrub-1080.mp4";

export default function HeroScrubVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef(0);
  const targetRef = useRef(0);
  const seekingRef = useRef(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;

    // форсим декод первого кадра
    const kick = () => {
      video.currentTime = 0.001;
    };
    if (video.readyState >= 1) kick();
    else video.addEventListener("loadedmetadata", kick, { once: true });

    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0,
    });
    io.observe(wrap);

    // applySeek: ставим currentTime не чаще, чем закончился предыдущий seek
    const applySeek = () => {
      if (seekingRef.current) return;
      const dur = video.duration || 0;
      const t = clamp(targetRef.current, 0, dur ? dur - 0.05 : 0);
      if (Math.abs(t - video.currentTime) < 1 / 48) return; // < полкадра — пропускаем
      seekingRef.current = true;
      // fastSeek точнее для скраба, где есть
      // @ts-ignore
      if (typeof video.fastSeek === "function") video.fastSeek(t);
      else video.currentTime = t;
    };
    const onSeeked = () => {
      seekingRef.current = false;
      applySeek(); // догоняем, если цель ушла
    };
    video.addEventListener("seeked", onSeeked);

    const tick = () => {
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      targetRef.current = progress * (video.duration || 8);
      if (visible) applySeek();
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
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section style={{ height: "100svh", position: "relative" }}>
        <img
          src="/hero/hero-final.webp"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </section>
    );
  }

  return (
    <div ref={wrapRef} style={{ height: `${SCROLL_VH}vh`, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100svh", overflow: "hidden" }}>
        <video
          ref={videoRef}
          src={SRC}
          poster="/hero/hero-poster.webp"
          muted
          playsInline
          preload="auto"
          // @ts-ignore — disablePictureInPicture не в типах
          disablePictureInPicture
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
