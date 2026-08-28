import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number; r: number };

const DOT_DENSITY = 1 / 14000; // dots per px^2
const MAX_DOTS = 140;
const LINK_DISTANCE = 130;
const CURSOR_RADIUS = 180;
const PARALLAX = 18;

/**
 * Animated constellation backdrop: drifting dots linked by faint lines,
 * gently parallaxed by the pointer. Freezes drift under prefers-reduced-motion.
 */
export function ConstellationBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let raf = 0;

    // Pointer state in CSS pixels; -1 marks "no pointer yet".
    const pointer = { x: -1, y: -1 };
    const parallax = { x: 0, y: 0 };
    const parallaxTarget = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_DOTS, Math.round(width * height * DOT_DENSITY));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.8 + Math.random() * 1.4,
      }));
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      parallaxTarget.x = (pointer.x / Math.max(rect.width, 1) - 0.5) * PARALLAX * 2;
      parallaxTarget.y = (pointer.y / Math.max(rect.height, 1) - 0.5) * PARALLAX * 2;
    };

    const onPointerLeave = () => {
      pointer.x = -1;
      pointer.y = -1;
      parallaxTarget.x = 0;
      parallaxTarget.y = 0;
    };

    const draw = () => {
      parallax.x += (parallaxTarget.x - parallax.x) * 0.05;
      parallax.y += (parallaxTarget.y - parallax.y) * 0.05;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(parallax.x, parallax.y);

      for (const dot of dots) {
        if (!reduceMotion) {
          dot.x += dot.vx;
          dot.y += dot.vy;
          if (dot.x < -20) dot.x = width + 20;
          if (dot.x > width + 20) dot.x = -20;
          if (dot.y < -20) dot.y = height + 20;
          if (dot.y > height + 20) dot.y = -20;
        }
      }

      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > LINK_DISTANCE) continue;

          let alpha = (1 - dist / LINK_DISTANCE) * 0.16;
          if (pointer.x >= 0) {
            const mx = (a.x + b.x) / 2 + parallax.x;
            const my = (a.y + b.y) / 2 + parallax.y;
            const near = Math.hypot(pointer.x - mx, pointer.y - my);
            if (near < CURSOR_RADIUS) alpha += (1 - near / CURSOR_RADIUS) * 0.28;
          }

          ctx.strokeStyle = `rgba(226, 232, 240, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const dot of dots) {
        let alpha = 0.3;
        if (pointer.x >= 0) {
          const near = Math.hypot(pointer.x - (dot.x + parallax.x), pointer.y - (dot.y + parallax.y));
          if (near < CURSOR_RADIUS) alpha += (1 - near / CURSOR_RADIUS) * 0.45;
        }
        ctx.fillStyle = `rgba(241, 245, 249, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
