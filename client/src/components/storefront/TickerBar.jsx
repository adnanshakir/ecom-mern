"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/customerApi";

export default function TickerBar() {
  const [items, setItems] = useState([]);
  const [hiddenSig, setHiddenSig] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("tickerHidden") || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get("/public/ticker").then((r) => alive && setItems(r.data.items || [])).catch(() => {});
    const timer = setTimeout(load, 0);
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(id);
    };
  }, []);

  const sig = items.map((i) => i._id).join(",");
  if (!items.length || hiddenSig === sig) return null;

  const chars = items.reduce((s, i) => s + i.text.length, 0);
  const duration = Math.max(15, Math.round(chars * 0.35)); // seconds, longer text = slower loop

  const content = items.map((i) => (
    <span key={i._id} className="mx-10 inline-block">
      {i.link ? <Link href={i.link} className="hover:underline">{i.text}</Link> : i.text}
    </span>
  ));

  return (
    <div className="relative flex h-9 items-center overflow-hidden bg-black text-sm text-white">
      <div className="ticker-track flex w-max whitespace-nowrap" style={{ animationDuration: `${duration}s` }}>
        <div className="flex min-w-[100vw] shrink-0 justify-around">{content}</div>
        <div className="flex min-w-[100vw] shrink-0 justify-around" aria-hidden="true">{content}</div>
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => { sessionStorage.setItem("tickerHidden", sig); setHiddenSig(sig); }}
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center bg-black text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

