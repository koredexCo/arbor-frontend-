import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  GitBranch, MessageSquare, Brain, Zap,
  ArrowRight, Check, Star, ChevronRight, Sparkles
} from "lucide-react";

export function Landing() {
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const parent = cv!.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      cv!.width = r.width * dpr;
      cv!.height = 268 * dpr;
      cv!.style.width = r.width + 'px';
      cv!.style.height = '268px';
    }
    resize();
    
    let prog = 0;
    let st: number | null = null;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const handleResize = () => { resize(); draw(prog); };
    window.addEventListener('resize', handleResize, { passive: true });

    const C = {
      nodeBg: 'rgba(255,255,255,0.05)', nb: 'rgba(255,255,255,0.12)',
      nAct: '#1e3a5f', nActB: '#3b82f6',
      line: 'rgba(255,255,255,0.15)', ld: 'rgba(59,130,246,0.5)',
      dot: 'rgba(255,255,255,0.25)', dotA: '#3b82f6',
      text: 'rgba(255,255,255,0.85)', sub: 'rgba(255,255,255,0.35)',
      ico: 'rgba(255,255,255,0.5)',
    };

    const N = [
      { id: 'm', lb: 'main', sb: 'root', fx: .50, fy: .08, a: false, r: true },
      { id: 'n1', lb: 'marketing', sb: 'depth 1 · from: main', fx: .30, fy: .32, a: false },
      { id: 'n2', lb: 'product', sb: 'depth 1 · from: main', fx: .68, fy: .32, a: false },
      { id: 'n3', lb: 'content', sb: 'depth 2 · from: marketing', fx: .17, fy: .58, a: false },
      { id: 'n4', lb: 'paid ads', sb: 'depth 2 · from: marketing', fx: .44, fy: .58, a: false },
      { id: 'n5', lb: 'SEO first', sb: 'depth 2 · from: product', fx: .76, fy: .58, a: true },
      { id: 'n6', lb: 'blog', sb: 'depth 3 · from: content', fx: .30, fy: .84, a: false },
      { id: 'n7', lb: 'google ads', sb: 'depth 3 · from: paid ads', fx: .55, fy: .84, a: false },
    ];
    const E = [
      { f: 'm', t: 'n1', d: 0 }, { f: 'm', t: 'n2', d: 0 },
      { f: 'n1', t: 'n3', d: 0 }, { f: 'n1', t: 'n4', d: 0 },
      { f: 'n2', t: 'n5', d: 1 }, { f: 'n3', t: 'n6', d: 0 }, { f: 'n4', t: 'n7', d: 0 },
    ];
    const ro = ['m', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
    const gp = (n: any) => ({ x: n.fx * cv.width / dpr, y: n.fy * cv.height / dpr });
    const eo = (t: number) => 1 - Math.pow(1 - t, 3);
    const nr = (id: string) => ro.indexOf(id) / (ro.length - 1);

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath();
      ctx!.moveTo(x + r, y); ctx!.lineTo(x + w - r, y); ctx!.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx!.lineTo(x + w, y + h - r); ctx!.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx!.lineTo(x + r, y + h); ctx!.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx!.lineTo(x, y + r); ctx!.quadraticCurveTo(x, y, x + r, y); ctx!.closePath();
    }

    const DUR = 2200;

    function draw(p: number) {
      const W = cv.width / dpr, H = cv.height / dpr;
      ctx!.save(); ctx!.scale(dpr, dpr); ctx!.clearRect(0, 0, W, H);
      E.forEach(e => {
        const f = N.find(n => n.id === e.f), t = N.find(n => n.id === e.t);
        const al = Math.max(0, Math.min(1, (p - nr(e.t) + .15) / .15));
        if (!al) return;
        const fp = gp(f), tp = gp(t);
        ctx!.save(); ctx!.globalAlpha = al;
        ctx!.strokeStyle = e.d ? C.ld : C.line; ctx!.lineWidth = 1.5;
        if (e.d) ctx!.setLineDash([5, 4]); else ctx!.setLineDash([]);
        const my = fp.y + (tp.y - fp.y) * .5;
        ctx!.beginPath(); ctx!.moveTo(fp.x, fp.y + 13); ctx!.lineTo(fp.x, my); ctx!.lineTo(tp.x, my); ctx!.lineTo(tp.x, tp.y - 13); ctx!.stroke();
        ctx!.fillStyle = e.d ? C.dotA : C.dot; ctx!.setLineDash([]);
        ctx!.beginPath(); ctx!.arc(fp.x, fp.y + 13, 3, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(tp.x, tp.y - 13, 3, 0, Math.PI * 2); ctx!.fill();
        ctx!.restore();
      });
      const NW = 128, NH = 50, R = 9;
      N.forEach(n => {
        const rt = nr(n.id), rw = (p - rt) / .18;
        const al = Math.max(0, Math.min(1, rw)); if (!al) return;
        const sc = 0.7 + 0.3 * eo(Math.max(0, Math.min(1, rw)));
        const pos = gp(n), x = pos.x - NW / 2, y = pos.y - NH / 2;
        ctx!.save(); ctx!.globalAlpha = al;
        ctx!.translate(pos.x, pos.y); ctx!.scale(sc, sc); ctx!.translate(-pos.x, -pos.y);
        if (n.a) { ctx!.shadowColor = 'rgba(59,130,246,.35)'; ctx!.shadowBlur = 18; }
        rr(x, y, NW, NH, R);
        ctx!.fillStyle = n.a ? C.nAct : C.nodeBg; ctx!.fill();
        ctx!.strokeStyle = n.a ? C.nActB : (n.r ? 'rgba(255,255,255,.22)' : C.nb);
        ctx!.lineWidth = n.a ? 1.5 : 1; ctx!.setLineDash([]); ctx!.stroke(); ctx!.shadowBlur = 0;
        const ix = x + 11, iy = y + NH / 2 - 7;
        ctx!.strokeStyle = n.a ? 'rgba(147,197,253,.9)' : C.ico; ctx!.lineWidth = 1.3;
        [iy, iy + 10].forEach(cy => { ctx!.beginPath(); ctx!.arc(ix + 3, cy, 2, 0, Math.PI * 2); ctx!.stroke(); });
        ctx!.beginPath(); ctx!.arc(ix + 10, iy + 3, 2, 0, Math.PI * 2); ctx!.stroke();
        ctx!.beginPath(); ctx!.moveTo(ix + 3, iy + 2); ctx!.lineTo(ix + 3, iy + 8);
        ctx!.moveTo(ix + 3, iy + 2); ctx!.quadraticCurveTo(ix + 3, iy + 5, ix + 8, iy + 3); ctx!.stroke();
        ctx!.fillStyle = n.a ? '#fff' : C.text;
        ctx!.font = `500 ${n.r ? 13 : 12}px 'DM Sans',sans-serif`;
        ctx!.fillText(n.lb, x + 24, y + NH / 2 - 1);
        if (!n.r) {
          ctx!.fillStyle = n.a ? 'rgba(147,197,253,.7)' : C.sub;
          ctx!.font = `300 9.5px 'DM Sans',sans-serif`;
          ctx!.fillText(n.sb, x + 24, y + NH / 2 + 13);
        }
        ctx!.restore();
      });
      ctx!.restore();
    }

    let animId: number;
    function frame(ts: number) {
      if (!st) st = ts;
      prog = Math.min(eo((ts - st) / DUR), 1);
      draw(prog);
      if (prog < 1) animId = requestAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(es => {
      if (es[0].isIntersecting) { st = null; animId = requestAnimationFrame(frame); }
    }, { threshold: .25 });
    observer.observe(cv);

    const intervalId = setInterval(() => { if (prog >= 1) draw(1); }, 60);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      clearInterval(intervalId);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('arbor-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('arbor-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setError("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };



  const features = [
    {
      icon: GitBranch,
      title: "Branch Any Message",
      description: "Fork conversations at any point to explore alternative directions without losing context.",
      color: "emerald",
    },
    {
      icon: Brain,
      title: "Full Context Memory",
      description: "Vector-powered memory ensures the AI always remembers what matters across all branches.",
      color: "purple",
    },
    {
      icon: MessageSquare,
      title: "Seamless Switching",
      description: "Jump between branches instantly. Each branch maintains its own conversation thread.",
      color: "blue",
    },
    {
      icon: Zap,
      title: "Smart Context Building",
      description: "Pinned messages, vector search, and branch hierarchy create perfect context windows.",
      color: "amber",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "3 conversations",
        "10 branches total",
        "Basic memory",
        "Community support",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$12",
      period: "/month",
      features: [
        "Unlimited conversations",
        "Unlimited branches",
        "Full vector memory",
        "Priority LLM",
        "Export conversations",
        "Priority support",
      ],
      cta: "Upgrade to Pro",
      popular: true,
    },
    {
      name: "Team",
      price: "$39",
      period: "/month",
      features: [
        "Everything in Pro",
        "5 team members",
        "Shared workspace",
        "Admin controls",
        "API access",
        "Dedicated support",
      ],
      cta: "Start Team Trial",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden" style={{background: 'var(--bg)', transition: 'background .3s, color .3s'}}>
      {/* ============================================================
          NAVBAR
          ============================================================ */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all" style={{background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--rule)'}}>
        <div className="w-full px-6 md:px-10 h-[58px] flex items-center justify-between">

          {/* ── LEFT: Logo + Nav links ─────────────── */}
          <div className="flex items-center gap-9">
            {/* Logo */}
            <div className="flex items-center gap-[10px] shrink-0">
              <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center shrink-0" style={{background: 'linear-gradient(150deg, #2e2e2e 0%, #060606 60%, #1a1a1a 100%)', boxShadow: '0 2px 12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.1)'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="7" cy="6" r="2.2" fill="white"/>
                  <circle cx="7" cy="18" r="2.2" fill="white"/>
                  <circle cx="17" cy="11" r="2.2" fill="white"/>
                  <line x1="7" y1="8.2" x2="7" y2="15.8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M7 8.5C7 8.5 7 11 17 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <span style={{fontFamily: '"DM Serif Display", serif', fontSize: '18px', letterSpacing: '-.02em', color: 'var(--ink)', lineHeight: '1'}}>
                Arbor
              </span>
            </div>

            {/* Nav links */}
            <ul className="hidden md:flex items-center gap-[28px] list-none">
              <li><a href="#how-it-works" style={{fontSize: '14px', fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '.06em', textTransform: 'uppercase', textDecoration: 'none'}} className="hover:text-[#111110] transition-colors">How it works</a></li>
              <li><a href="#features" style={{fontSize: '14px', fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '.06em', textTransform: 'uppercase', textDecoration: 'none'}} className="hover:text-[#111110] transition-colors">Features</a></li>
              <li><a href="#pricing" style={{fontSize: '14px', fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '.06em', textTransform: 'uppercase', textDecoration: 'none'}} className="hover:text-[#111110] transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* ── RIGHT: Theme toggle + Sign In + Get Started ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme toggle pill */}
            <button
              onClick={() => setIsDark(d => !d)}
              aria-label="Toggle theme"
              style={{
                width: '44px', height: '22px',
                background: 'var(--t-track)',
                border: '1px solid var(--rule-2)',
                borderRadius: '100px',
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                outline: 'none',
                transition: 'background .3s',
              }}
            >
              <span style={{
                position: 'absolute', top: '1px', left: '1px',
                width: '18px', height: '18px',
                borderRadius: '50%',
                background: 'var(--t-thumb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), background .3s',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                transform: isDark ? 'translateX(22px)' : 'translateX(0)',
              }}>
                {isDark ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0e0d0b" strokeWidth="2.5" strokeLinecap="round" style={{width:'9px',height:'9px'}}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{width:'9px',height:'9px'}}>
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
                    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
                    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
                  </svg>
                )}
              </span>
            </button>

            {/* Sign In */}
            <button
              onClick={() => { setShowAuth(true); setIsSignUp(false); }}
              style={{fontSize: '14px', fontWeight: 500, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.01em', padding: '6px 12px'}}
              className="hover:text-[#111110] transition-colors"
            >
              Sign In
            </button>

            {/* Get Started */}
            <button
              onClick={() => { setShowAuth(true); setIsSignUp(true); }}
              style={{fontSize: '14px', fontWeight: 500, color: 'var(--bg)', background: 'var(--ink)', padding: '9px 22px', borderRadius: '100px', border: 'none', cursor: 'pointer', letterSpacing: '.01em'}}
              className="transition-all hover:opacity-80 hover:-translate-y-[1px]"
            >
              Get Started
            </button>
          </div>

        </div>
      </nav>

      {/* ============================================================
          HERO
          ============================================================ */}
      <section style={{paddingTop: '130px', borderBottom: '1px solid var(--rule)'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'center'}} className="px-6 md:px-[52px]">
          {/* Left: text */}
          <div>
            {/* Kicker */}
            <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '32px'}}>
              <span style={{width: '4px', height: '4px', borderRadius: '50%', background: 'var(--muted)', flexShrink: 0}}></span>
              Arbor is where teams think with AI
            </div>

            {/* Headline — two separate elements like the HTML */}
            <div style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(44px, 5.8vw, 80px)', lineHeight: 0.96, letterSpacing: '-.035em', color: 'var(--ink)', marginBottom: '8px'}}>
              Think deeper.
            </div>
            <span style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(44px, 5.8vw, 80px)', lineHeight: 0.96, letterSpacing: '-.035em', fontStyle: 'italic', color: 'var(--muted)', marginBottom: '28px', display: 'block'}}>
              Branch freely.
            </span>

            {/* Subline */}
            <p style={{fontSize: '15.5px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.75, maxWidth: '380px', marginBottom: '36px'}}>
              Arbor is the AI workspace built for how teams actually think — in parallel, not in straight lines.
            </p>

            {/* CTA */}
            <div>
              <button
                onClick={() => { setShowAuth(true); setIsSignUp(true); }}
                style={{display: 'inline-block', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', background: 'var(--ink)', padding: '13px 30px', borderRadius: '100px', border: 'none', cursor: 'pointer', letterSpacing: '.02em'}}
                className="transition-all hover:opacity-80 hover:-translate-y-[2px]"
              >
                Start for free →
              </button>
              <span style={{display: 'block', marginTop: '14px', fontSize: '11.5px', color: 'var(--muted)', fontStyle: 'italic'}}>
                No credit card needed. Bring your own API key.
              </span>
            </div>
          </div>

          {/* Right: demo window */}
          <div>
            <div style={{border: '1px solid var(--rule)', borderRadius: '10px', overflow: 'hidden'}}>
              {/* Browser chrome bar — white/warm bg, light dots, muted url text */}
              <div style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 15px', borderBottom: '1px solid var(--rule)', background: 'var(--bg)'}}>
                <div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rule-2)'}}></div>
                <div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rule-2)'}}></div>
                <div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rule-2)'}}></div>
                <div style={{flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--muted)', letterSpacing: '.04em'}}>arbor — branch timeline</div>
              </div>
              {/* Canvas area */}
              <div style={{background: '#0c1118', padding: '20px'}}>
                <canvas ref={canvasRef} style={{width: '100%', height: '268px', display: 'block'}}></canvas>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          EDITORIAL STATEMENT — full-bleed dark section
          ============================================================ */}
      <div style={{background: 'var(--ink)', padding: '96px 52px', borderBottom: '1px solid #1e1d1a'}}>
        <div style={{maxWidth: '860px', margin: '0 auto'}}>
          <blockquote style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(28px, 3.8vw, 50px)', lineHeight: 1.18, letterSpacing: '-.025em', color: 'var(--bg)', fontStyle: 'italic'}}>
            "Every conversation you've ever had with AI is sitting in a dead chat window.
            Gone. Arbor is built on the belief that good ideas deserve to survive."
          </blockquote>
          <cite style={{display: 'block', marginTop: '28px', fontSize: '11px', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontStyle: 'normal'}}>
            — The thinking behind Arbor
          </cite>
        </div>
      </div>

      {/* ============================================================
          PROBLEM SECTION
          ============================================================ */}
      <section style={{padding: '108px 0', borderBottom: '1px solid var(--rule)'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px'}}>
          <span style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '52px', display: 'block'}}>
            The problem
          </span>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start'}}>
            <h2 style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(30px, 3.8vw, 50px)', lineHeight: 1.08, letterSpacing: '-.03em', color: 'var(--ink)'}}>
              Your best thinking gets lost.
            </h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <p style={{fontSize: '15.5px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.8}}>
                Every AI conversation you've had is a dead end. You explore one direction, hit a wall, open a new chat, re-explain everything, and lose what came before. <strong style={{color: 'var(--ink-2)', fontWeight: 500}}>The context is gone. The thread is broken.</strong>
              </p>
              <p style={{fontSize: '15.5px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.8}}>
                Your team has the same problem — times ten. Everyone exploring separately. No shared history. No visible reasoning. <strong style={{color: 'var(--ink-2)', fontWeight: 500}}>Decisions made without the full picture.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW ARBOR WORKS — numbered rows
          ============================================================ */}
      <section id="how-it-works" style={{padding: '108px 0', borderBottom: '1px solid var(--rule)'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px'}}>
          <span style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '64px', display: 'block'}}>
            How Arbor works
          </span>
          <div style={{borderTop: '1px solid var(--rule)'}}>
            {[
              {num: '01', title: 'Branch any message into a new direction.', desc: 'Each branch keeps its own context — focused, clean. Switch between branches instantly. Nothing gets lost. Everything stays connected to where it started.'},
              {num: '02', title: 'Your team sees the whole picture.', desc: 'Every idea. Every dead end. Every breakthrough — all in one place. Your whole team thinks together across branches, without duplicating work or losing reasoning.'},
              {num: '03', title: 'Bring your own key. Any model.', desc: 'Use Claude, GPT-4, Gemini, Llama — your choice. One OpenRouter key unlocks 50+ AI models. We stay out of the way between you and the AI.'},
            ].map((row, i) => (
              <div key={i} style={{display: 'grid', gridTemplateColumns: '72px 1.1fr 2fr', gap: '0 44px', alignItems: 'start', padding: '48px 0', borderBottom: '1px solid var(--rule)'}}
                className="group hover:bg-[#f4f2ee] transition-colors duration-200">
                <div style={{fontFamily: '"DM Serif Display", serif', fontSize: '56px', color: 'var(--rule-2)', lineHeight: 1, letterSpacing: '-.05em', paddingTop: '1px'}}
                  className="group-hover:text-[#999893] transition-colors duration-250">
                  {row.num}
                </div>
                <div style={{fontSize: '17px', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35, paddingTop: '5px', letterSpacing: '-.01em'}}>
                  {row.title}
                </div>
                <p style={{fontSize: '14.5px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.8, paddingTop: '5px'}}>
                  {row.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES — table rows
          ============================================================ */}
      <section id="features" style={{padding: '108px 0', borderBottom: '1px solid var(--rule)'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px'}}>
          <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '56px', gap: '24px'}}>
            <div>
              <span style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '16px'}}>What's inside</span>
              <h2 style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(26px, 3.2vw, 42px)', letterSpacing: '-.025em', lineHeight: 1.08, color: 'var(--ink)'}}>
                Everything you need<br/>to <em style={{fontStyle: 'italic', color: 'var(--muted)'}}>think better.</em>
              </h2>
            </div>
            <button onClick={() => { setShowAuth(true); setIsSignUp(true); }}
              style={{flexShrink: 0, fontSize: '13px', fontWeight: 500, color: 'var(--bg)', background: 'var(--ink)', padding: '13px 28px', borderRadius: '100px', border: 'none', cursor: 'pointer', letterSpacing: '.02em'}}
              className="transition-all hover:opacity-80">
              Get started free
            </button>
          </div>
          <div style={{borderTop: '1px solid var(--rule)'}}>
            {[
              {icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" style={{width:'14px',height:'14px',stroke:'var(--muted)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>, name: 'Branch Map', desc: 'See your entire thinking process as a visual tree. Every branch, every direction, all connected.', pill: 'Visual'},
              {icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" style={{width:'14px',height:'14px',stroke:'var(--muted)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/></svg>, name: 'Context Isolation', desc: 'Each branch remembers only what matters to it. No noise. No confusion. Just focused AI.', pill: 'Core'},
              {icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" style={{width:'14px',height:'14px',stroke:'var(--muted)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>, name: 'Team Workspace', desc: 'Your whole team thinks together. Different branches, shared foundation. No duplicated work.', pill: 'Team'},
              {icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" style={{width:'14px',height:'14px',stroke:'var(--muted)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>, name: 'Any AI Model', desc: 'Claude, GPT-4, Gemini, Llama — all in one workspace with your own API key. You own the connection.', pill: 'Models'},
              {icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" style={{width:'14px',height:'14px',stroke:'var(--muted)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75"/></svg>, name: 'Persistent Memory', desc: 'Arbor remembers semantically. Come back weeks later — it knows where you left off.', pill: 'Memory'},
            ].map((feat, i) => (
              <div key={i} style={{display: 'grid', gridTemplateColumns: '240px 1fr auto', gap: '0 44px', alignItems: 'center', padding: '28px 0', borderBottom: '1px solid var(--rule)'}}
                className="group hover:bg-[#f4f2ee] transition-colors duration-200">
                <div style={{display: 'flex', alignItems: 'center', gap: '14px'}}>
                  <div style={{width: '30px', height: '30px', border: '1px solid var(--rule)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}
                    className="group-hover:border-[#cccac4] transition-colors duration-200">
                    {feat.icon}
                  </div>
                  <span style={{fontSize: '14.5px', fontWeight: 500, color: 'var(--ink)', letterSpacing: '-.01em'}}>{feat.name}</span>
                </div>
                <p style={{fontSize: '14px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.6}}>{feat.desc}</p>
                <span style={{fontSize: '9.5px', fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--rule-2)', padding: '3px 9px', borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0}}>
                  {feat.pill}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          WHO IT'S FOR
          ============================================================ */}
      <section style={{padding: '108px 0', borderBottom: '1px solid var(--rule)'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px'}}>
          <div style={{marginBottom: '64px'}}>
            <span style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '16px'}}>Built for</span>
            <h2 style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(28px, 3.5vw, 46px)', letterSpacing: '-.03em', lineHeight: 1.05, color: 'var(--ink)', maxWidth: '520px'}}>
              Teams who<br/><em style={{fontStyle: 'italic', color: 'var(--muted)'}}>think seriously.</em>
            </h2>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 80px', borderTop: '1px solid var(--rule)'}}>
            {[
              {num: 'i.', text: <><strong style={{fontWeight: 500, color: 'var(--ink-2)'}}>Engineering teams</strong> evaluating architecture decisions.</>},
              {num: 'ii.', text: <><strong style={{fontWeight: 500, color: 'var(--ink-2)'}}>Product teams</strong> exploring different directions.</>},
              {num: 'iii.', text: <><strong style={{fontWeight: 500, color: 'var(--ink-2)'}}>Researchers</strong> mapping complex problems.</>},
              {num: 'iv.', text: <>Anyone who's ever said <strong style={{fontWeight: 500, color: 'var(--ink-2)'}}>"where did that idea go?"</strong></>},
            ].map((item, i) => (
              <div key={i} style={{padding: '28px 0', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'baseline', gap: '16px'}}>
                <span style={{fontFamily: '"DM Serif Display", serif', fontSize: '13px', color: 'var(--muted)', flexShrink: 0, letterSpacing: '-.01em'}}>{item.num}</span>
                <p style={{fontSize: '15px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.55}}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <section id="pricing" style={{padding: '108px 0', borderBottom: '1px solid var(--rule)'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px'}}>
          <div style={{marginBottom: '64px'}}>
            <span style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '16px'}}>Pricing</span>
            <h2 style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(28px, 3.5vw, 46px)', letterSpacing: '-.03em', lineHeight: 1.05, color: 'var(--ink)', marginBottom: '12px'}}>
              Free to start.<br/>Bring your own key.
            </h2>
            <p style={{fontSize: '15px', fontWeight: 400, color: 'var(--body)', lineHeight: 1.65, maxWidth: '440px'}}>
              No proprietary model costs. No lock-in. You bring your OpenRouter key and we do the rest.
            </p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)'}}>
            {[
              {tier: 'Free', price: '$0', tagline: 'Forever. No credit card.', items: ['Unlimited conversations', 'Unlimited branches', 'All AI models', 'Bring your own OpenRouter key'], highlighted: false},
              {tier: 'Team', price: '$49', tagline: 'Everything in Free, plus:', items: ['Team workspaces', 'Shared branch history', 'Member management', 'Priority support'], highlighted: true},
            ].map((plan, i) => (
              <div key={i} style={{background: plan.highlighted ? 'var(--bg-2)' : 'var(--bg)', padding: '44px 48px'}}>
                <div style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '14px'}}>{plan.tier}</div>
                <div style={{fontFamily: '"DM Serif Display", serif', fontSize: '52px', letterSpacing: '-.04em', color: 'var(--ink)', lineHeight: 1, marginBottom: '4px'}}>
                  {plan.price}{plan.tier === 'Team' && <sub style={{fontFamily: '"DM Sans", sans-serif', fontSize: '14px', fontWeight: 400, color: 'var(--muted)', verticalAlign: 'baseline', letterSpacing: 0}}> / month</sub>}
                </div>
                <div style={{fontSize: '13px', fontWeight: 400, color: 'var(--body)', marginBottom: '32px', fontStyle: 'italic'}}>{plan.tagline}</div>
                <ul style={{listStyle: 'none', borderTop: '1px solid var(--rule)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '11px'}}>
                  {plan.items.map((item, j) => (
                    <li key={j} style={{fontSize: '13.5px', fontWeight: 400, color: 'var(--body)', display: 'flex', alignItems: 'center', gap: '10px', lineHeight: 1.4}}>
                      <span style={{width: '4px', height: '4px', borderRadius: '50%', background: 'var(--muted)', flexShrink: 0, display: 'inline-block'}}></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{marginTop: '28px', fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.65, fontStyle: 'italic'}}>
            <a href="https://openrouter.ai" target="_blank" rel="noopener" style={{color: 'var(--ink)', textDecoration: 'underline', textDecorationThickness: '1px', textUnderlineOffset: '2px', fontStyle: 'normal'}}>openrouter.ai</a> gives you free access to 50+ AI models — Claude, GPT-4, Gemini, Llama — with a single key.
          </p>
          <div style={{marginTop: '44px'}}>
            <button onClick={() => { setShowAuth(true); setIsSignUp(true); }}
              style={{fontSize: '13px', fontWeight: 500, color: 'var(--bg)', background: 'var(--ink)', padding: '13px 30px', borderRadius: '100px', border: 'none', cursor: 'pointer', letterSpacing: '.02em'}}
              className="transition-all hover:opacity-80 hover:-translate-y-[2px]">
              Get started free →
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER CTA — dark
          ============================================================ */}
      <div style={{background: 'var(--ink)', padding: '120px 52px', textAlign: 'center'}}>
        <span style={{fontSize: '10.5px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '24px'}}>Ready?</span>
        <h2 style={{fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(36px, 5.5vw, 70px)', letterSpacing: '-.03em', lineHeight: .98, color: 'var(--bg)', marginBottom: '18px'}}>
          Your ideas deserve<br/><em style={{fontStyle: 'italic', color: 'var(--muted)'}}>to survive.</em>
        </h2>
        <p style={{fontSize: '15px', fontWeight: 400, color: '#7a7870', margin: '0 auto 40px', maxWidth: '320px', lineHeight: 1.65}}>
          Start branching for free.
        </p>
        <button onClick={() => { setShowAuth(true); setIsSignUp(true); }}
          style={{fontSize: '13px', fontWeight: 500, color: 'var(--ink)', background: 'var(--bg)', padding: '13px 36px', borderRadius: '100px', border: 'none', cursor: 'pointer', letterSpacing: '.02em'}}
          className="transition-all hover:opacity-88 hover:-translate-y-[2px]">
          Start for free →
        </button>
        <span style={{display: 'block', marginTop: '18px', fontSize: '11.5px', color: '#555450', letterSpacing: '.04em'}}>arbor.koredex.com</span>
      </div>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer style={{background: 'var(--ink)', borderTop: '1px solid rgba(255,255,255,.07)', padding: '36px 0'}}>
        <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 52px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '24px', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <div style={{width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(150deg,#2e2e2e 0%,#060606 60%,#1a1a1a 100%)', boxShadow: '0 1px 6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="6" r="2.2" fill="white"/>
                <circle cx="7" cy="18" r="2.2" fill="white"/>
                <circle cx="17" cy="11" r="2.2" fill="white"/>
                <line x1="7" y1="8.2" x2="7" y2="15.8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M7 8.5C7 8.5 7 11 17 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span style={{fontFamily: '"DM Serif Display", serif', fontSize: '15px', color: 'var(--bg)'}}>Arbor</span>
          </div>
          <ul style={{display: 'flex', alignItems: 'center', gap: '24px', listStyle: 'none'}}>
            <li><a href="/privacy" style={{fontSize: '11.5px', color: '#5a574f', textDecoration: 'none', letterSpacing: '.04em'}} className="hover:text-[#fdfcf9] transition-colors">Privacy</a></li>
            <li><a href="/terms" style={{fontSize: '11.5px', color: '#5a574f', textDecoration: 'none', letterSpacing: '.04em'}} className="hover:text-[#fdfcf9] transition-colors">Terms</a></li>
            <li><a href="mailto:hello@koredex.com" style={{fontSize: '11.5px', color: '#5a574f', textDecoration: 'none', letterSpacing: '.04em'}} className="hover:text-[#fdfcf9] transition-colors">hello@koredex.com</a></li>
          </ul>
          <div style={{textAlign: 'right', fontSize: '11.5px', color: '#5a574f', lineHeight: 1.6}}>
            © 2026 Arbor · A Koredex product
          </div>
        </div>
      </footer>

      {/* ============================================================
          AUTH MODAL
          ============================================================ */}
      {showAuth && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.4)'}}>
          <div className="relative rounded p-8 w-[420px] max-w-[90vw] shadow-2xl"
               style={{background: 'var(--bg)', border: '1px solid var(--rule)'}}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded bg-white  to-white 
                              flex items-center justify-center mx-auto mb-4 shadow-lg shadow-none">
                <GitBranch size={22} className="text-[#0a0a0a]" />
              </div>
              <h3 className="text-xl font-bold" style={{color: 'var(--ink)'}}>
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h3>
              <p className="text-sm mt-1" style={{color: 'var(--body)'}}>
                {isSignUp ? "Start branching your conversations" : "Sign in to continue"}
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="space-y-2 mb-6">
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/dashboard` },
                  });
                  if (error) setError(error.message);
                }}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: { redirectTo: `${window.location.origin}/dashboard` },
                  });
                  if (error) setError(error.message);
                }}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Continue with GitHub
              </button>
            </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{background: 'var(--rule)'}} />
                <span className="text-xs" style={{color: 'var(--muted)'}}>or</span>
                <div className="flex-1 h-px" style={{background: 'var(--rule)'}} />
              </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="input-field"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="input-field"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input-field"
                required
                minLength={6}
              />

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded animate-spin" />
                ) : (
                  <>
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Sign-up consent */}
            {isSignUp && (
              <p className="text-xs text-[#52504b] text-center mt-3">
                By signing up you agree to our{' '}
                <a href="/terms" className="underline hover:text-[#52504b] transition-colors">Terms</a>
                {' '}and{' '}
                <a href="/privacy" className="underline hover:text-[#52504b] transition-colors">Privacy Policy</a>
              </p>
            )}

            <p className="text-center text-xs text-[#52504b] mt-4">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-[#52504b] hover:text-[#52504b] font-medium"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>

            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 text-[#52504b] hover:text-[#0a0a0a] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 10V4h-4M7 10V4h4M12 4v16M7 20h10" />
    </svg>
  );
}
