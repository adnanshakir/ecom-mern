"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import api from "@/lib/customerApi";

const SPEED = 60; // pixels per second

export default function TickerBar() {
  const [items, setItems] = useState([]);
  const [closed, setClosed] = useState(false); // memory only: bar returns on reload
  const [setWidth, setSetWidth] = useState(0);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const measureRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get("/public/ticker")
        .then((r) => alive && setItems(r.data.items || []))
        .catch(() => {});
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const sig = items.map((i) => i._id).join(",");

  useLayoutEffect(() => {
    if (measureRef.current) setSetWidth(measureRef.current.offsetWidth);
  }, [sig]);

  useEffect(() => {
    const el = containerRef.current;
    const updateWidth = () => {
      setVw(el?.offsetWidth || (typeof window !== "undefined" ? window.innerWidth : 1280));
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined" && el) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect?.width || el.offsetWidth;
          if (width) setVw(width);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [sig, closed]);

  if (!items.length || closed) return null;

  const group = (key, { dup = false, extra = false } = {}) => (
    <div
      key={key}
      aria-hidden={dup ? "true" : undefined}
      className={`flex shrink-0 items-center motion-reduce:shrink motion-reduce:min-w-0 motion-reduce:flex-wrap motion-reduce:whitespace-normal motion-reduce:justify-center${extra ? " ticker-repeat" : ""}`}
    >
      {items.map((i) => {
        const isExternal = Boolean(i.link && /^https?:\/\//i.test(i.link));
        return (
          <span key={i._id} className="flex items-center">
            <span className="mx-6">
              {i.link ? (
                <a
                  href={i.link}
                  tabIndex={dup ? -1 : undefined}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="hover:underline"
                >
                  {i.text}
                </a>
              ) : (
                i.text
              )}
            </span>
            <span className="opacity-50">•</span>
          </span>
        );
      })}
    </div>
  );

  const copies = setWidth > 0 ? Math.ceil(vw / setWidth) + 1 : 1;
  const duration = Math.max(10, Math.round((setWidth * copies) / SPEED));

  return (
    <div
      ref={containerRef}
      className="ticker-bar relative z-20 flex h-9 items-center overflow-hidden bg-black text-sm text-white"
    >
      <div
        ref={measureRef}
        className="invisible pointer-events-none absolute left-0 top-0 flex whitespace-nowrap"
        aria-hidden="true"
      >
        {group("measure", { dup: true })}
      </div>
      <div
        className="ticker-track flex w-max whitespace-nowrap motion-reduce:w-full motion-reduce:max-w-[calc(100%-2.25rem)] motion-reduce:flex-wrap motion-reduce:whitespace-normal"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex shrink-0 motion-reduce:shrink motion-reduce:min-w-0 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:whitespace-normal motion-reduce:justify-center">
          {Array.from({ length: copies }, (_, n) => group(`a${n}`, { dup: n > 0, extra: n > 0 }))}
        </div>
        <div className="ticker-dup flex shrink-0" aria-hidden="true">
          {Array.from({ length: copies }, (_, n) => group(`b${n}`, { dup: true, extra: n > 0 }))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setClosed(true)}
        className="absolute right-0 top-0 z-10 flex h-9 w-9 items-center justify-center bg-black text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
