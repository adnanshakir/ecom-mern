"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import api from "@/lib/customerApi";

const SPEED = 60; // pixels per second

export default function TickerBar() {
  const [items, setItems] = useState([]);
  const [closed, setClosed] = useState(false); // memory only: bar returns on reload
  const [setWidth, setSetWidth] = useState(0);
  const measureRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get("/public/ticker").then((r) => alive && setItems(r.data.items || [])).catch(() => {});
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

  if (!items.length || closed) return null;

  const group = (key, { dup = false, extra = false } = {}) => (
    <div key={key} className={`flex shrink-0 items-center${extra ? " ticker-repeat" : ""}`}>
      {items.map((i) => (
        <span key={i._id} className="flex items-center">
          <span className="mx-6">
            {i.link ? (
              <Link href={i.link} tabIndex={dup ? -1 : undefined} className="hover:underline">
                {i.text}
              </Link>
            ) : (
              i.text
            )}
          </span>
          <span className="opacity-50">•</span>
        </span>
      ))}
    </div>
  );

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const copies = setWidth > 0 ? Math.ceil(vw / setWidth) + 1 : 1;
  const duration = Math.max(10, Math.round((setWidth * copies) / SPEED));

  return (
    <div className="ticker-bar relative flex h-9 items-center overflow-hidden bg-black text-sm text-white">
      <div ref={measureRef} className="invisible absolute left-0 top-0 flex whitespace-nowrap" aria-hidden="true">
        {group("measure", { dup: true })}
      </div>
      <div className="ticker-track flex w-max whitespace-nowrap" style={{ animationDuration: `${duration}s` }}>
        <div className="flex shrink-0">
          {Array.from({ length: copies }, (_, n) => group(`a${n}`, { extra: n > 0 }))}
        </div>
        <div className="ticker-dup flex shrink-0" aria-hidden="true">
          {Array.from({ length: copies }, (_, n) => group(`b${n}`, { dup: true, extra: n > 0 }))}
        </div>
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => setClosed(true)}
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center bg-black text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
