"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import MarshadowCinematic from "./components/MarshadowCinematic";

const MasterBall3D = lazy(() => import("./components/MasterBall3D"));
const PokedexPortal = lazy(() => import("./components/PokedexPortal"));
const TeamBuilder = lazy(() => import("./components/TeamBuilder"));
const AccountSystem = lazy(() => import("./components/AccountSystem"));
export default function Home() {
  const [entered, setEntered] = useState(false);
  const [pokedexOpen, setPokedexOpen] = useState(false);
  const [teamBuilderOpen, setTeamBuilderOpen] = useState(false);
  const [dexTransition, setDexTransition] = useState(false);
  const [trainerProfile, setTrainerProfile] = useState<{ name: string; photo: string; accent: string } | null>(null);
  const cursorGhostRef = useRef<HTMLImageElement>(null);
  const scrollFillRef = useRef<HTMLSpanElement>(null);
  const scrollTextRef = useRef<HTMLElement>(null);
  const dexOpenTimerRef = useRef<number>(0);
  const dexEndTimerRef = useRef<number>(0);

  const cancelDexTransition = useCallback(() => {
    window.clearTimeout(dexOpenTimerRef.current);
    window.clearTimeout(dexEndTimerRef.current);
    dexOpenTimerRef.current = 0;
    dexEndTimerRef.current = 0;
    setDexTransition(false);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(dexOpenTimerRef.current);
    window.clearTimeout(dexEndTimerRef.current);
  }, []);

  useEffect(() => {
    if (entered) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [entered]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      cancelDexTransition();
      if (pokedexOpen) setPokedexOpen(false);
      if (teamBuilderOpen) setTeamBuilderOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelDexTransition, pokedexOpen, teamBuilderOpen]);

  useEffect(() => {
    if (!entered) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const ghost = cursorGhostRef.current;
        if (!ghost) return;
        ghost.style.setProperty("--cursor-x", `${event.clientX}px`);
        ghost.style.setProperty("--cursor-y", `${event.clientY}px`);
        ghost.classList.add("is-visible");
      });
    };
    const hover = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      cursorGhostRef.current?.classList.toggle("is-hovering", Boolean(target?.closest("button, a, input")));
    };
    const hide = (event: PointerEvent) => {
      if (!event.relatedTarget) cursorGhostRef.current?.classList.remove("is-visible");
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", hover, { passive: true });
    window.addEventListener("pointerout", hide, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", hover);
      window.removeEventListener("pointerout", hide);
    };
  }, [entered]);

  useEffect(() => {
    if (!entered) return;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        scrollFillRef.current?.style.setProperty("--scroll-progress", `${progress}`);
        if (scrollTextRef.current) scrollTextRef.current.textContent = `${Math.round(progress * 100).toString().padStart(2, "0")}`;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [entered]);

  const scrollToCapture = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById("captura")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openPokedex = () => {
    if (dexTransition) return;
    cancelDexTransition();
    setTeamBuilderOpen(false);
    setDexTransition(true);
    dexOpenTimerRef.current = window.setTimeout(() => setPokedexOpen(true), 760);
    dexEndTimerRef.current = window.setTimeout(() => {
      setDexTransition(false);
      dexEndTimerRef.current = 0;
    }, 1650);
  };

  const openTeamBuilder = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    cancelDexTransition();
    setPokedexOpen(false);
    setTeamBuilderOpen(true);
  };

  const syncTrainerProfile = useCallback((profile: { name: string; photo: string; accent: string } | null) => {
    setTrainerProfile(profile);
  }, []);

  return (
    <main className={`site-shell ${entered ? "site-shell--ready" : "site-shell--intro"}`}>
      {!entered && <MarshadowCinematic onComplete={() => setEntered(true)} />}

      <div className={`dex-transition ${dexTransition ? "is-active" : ""}`} aria-hidden="true">
        <i /><i /><i /><span>POKÉDEX // SINCRONIZANDO</span>
      </div>

      <nav className="topbar" aria-label="Navegação principal">
        <a className="brand" href="#inicio">
          <span className="brand__sigil"><i /></span>
          <span>MARSHADOW<small>DEX // 0802</small></span>
        </a>
        <div className="topbar__actions">
          {entered && <Suspense fallback={null}><AccountSystem onProfileChange={syncTrainerProfile} /></Suspense>}
          <a className="team-builder-trigger" href="#team-builder" onClick={openTeamBuilder} aria-label="Abrir Team Builder">
            <span className="team-builder-trigger__mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            <span className="team-builder-trigger__copy"><b>TEAM BUILDER</b><small>ANÁLISE TÁTICA</small></span>
          </a>
          <a className="talk-marshadow" href="marshadow-ai/index.html" aria-label="Fale com Marshadow AI">
            <span className="talk-marshadow__mark" aria-hidden="true"><i /><i /></span>
            <span className="talk-marshadow__copy"><b>FALE COM MARSHADOW</b><small>IA COMPETITIVA</small></span>
          </a>
        </div>
      </nav>

      <section className="hero" id="inicio">
        <div className="hero__backdrop" aria-hidden="true" />
        <div className="hero__poster" role="img" aria-label="Ilustração de Marshadow em uma floresta sombria" />
        <div className="hero__veil" aria-hidden="true"><i /><i /><i /></div>
        {trainerProfile && (
          <aside className="trainer-welcome" aria-live="polite" style={{ "--trainer-accent": trainerProfile.accent } as CSSProperties}>
            <span className="trainer-welcome__halo" aria-hidden="true"><i /><i /></span>
            <span className="trainer-welcome__portrait"><img src={trainerProfile.photo} alt="" onError={(event) => {
              const fallback = new URL("assets/profile/pinterest/perfil-01.webp", document.baseURI).href;
              if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
              else event.currentTarget.hidden = true;
            }} /></span>
            <span className="trainer-welcome__copy">
              <small>ARQUIVO DO TREINADOR // ONLINE</small>
              <b>BEM-VINDO, <em>{trainerProfile.name.trim().split(/\s+/)[0].toUpperCase()}</em></b>
              <i>SUA SOMBRA FOI RECONHECIDA</i>
            </span>
          </aside>
        )}
        <div className="hero__badge"><span>#0802</span><small>GLOOMDWELLER POKÉMON</small></div>
        <div className="hero__content">
          <span className="eyebrow"><i /> ENTRE ONDE A LUZ NÃO ALCANÇA</span>
          <h2>MARSHADOW</h2>
          <p>Nas sombras, cada movimento deixa um eco. Marshadow observa, copia — e devolve tudo mais forte.</p>
          <a className="primary-cta" href="#captura" onClick={scrollToCapture}>
            <span className="primary-cta__flames" aria-hidden="true">
              <svg viewBox="0 0 620 100" preserveAspectRatio="none">
                <defs>
                  <filter id="cta-black-fire" x="-10%" y="-35%" width="120%" height="160%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="8" result="fire-noise">
                      <animate attributeName="baseFrequency" dur="1.9s" values="0.015 0.09;0.025 0.14;0.012 0.08" repeatCount="indefinite" />
                      <animate attributeName="seed" dur="2.4s" values="8;19;31" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="fire-noise" scale="17" xChannelSelector="R" yChannelSelector="B" />
                    <feGaussianBlur stdDeviation="0.5" />
                  </filter>
                  <linearGradient id="cta-flame-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#171717" stopOpacity=".18" />
                    <stop offset=".48" stopColor="#080808" stopOpacity=".78" />
                    <stop offset="1" stopColor="#000" />
                  </linearGradient>
                </defs>
                <path className="primary-cta__flame-layer primary-cta__flame-layer--back" filter="url(#cta-black-fire)" d="M-25 102V78C-2 72 7 34 25 57C43 82 48 15 73 48C94 76 99 19 124 55C142 80 154 21 177 50C195 76 207 5 232 47C253 82 268 23 288 52C309 83 319 14 344 48C368 81 376 19 402 55C420 81 434 8 458 49C479 84 493 23 514 52C535 82 545 13 570 52C590 82 604 40 645 58V102Z" />
                <path className="primary-cta__flame-layer primary-cta__flame-layer--front" filter="url(#cta-black-fire)" d="M-20 104V87C8 72 20 53 39 76C58 96 71 45 94 72C117 97 130 48 151 76C174 101 190 40 214 72C237 100 251 48 274 77C296 101 312 39 336 72C359 100 374 52 397 77C421 101 436 42 459 71C483 98 499 50 521 77C544 101 558 44 582 72C604 96 617 66 644 77V104Z" />
              </svg>
            </span>
            <span className="primary-cta__label">ABRIR A MARSHADOW DEX</span><i>↓</i>
          </a>
        </div>
        <div className="hero__coordinates"><span>ESPÉCIE // SOMBRA</span><span>LUTADOR + FANTASMA</span></div>
      </section>

      <section className="capture-vault" id="captura">
        <div className="capture-vault__clouds" aria-hidden="true" />
        <div className="capture-vault__grid" aria-hidden="true" />
        <div className="capture-vault__copy">
          <span className="eyebrow"><i /> ARTEFATO 3D // INTERATIVO</span>
          <h2>GIRE.<br /><em>TOQUE.</em><br />DESBLOQUEIE.</h2>
          <p>Arraste o dedo ou mova o cursor sobre a Master Ball. Quanto mais rápido o movimento, mais violenta fica a rotação.</p>
          <div className="capture-readout"><span>WEBGL // ATIVO</span><span>ARQUIVO NACIONAL</span><span>DADOS AO VIVO</span></div>
        </div>
        <div className="capture-vault__stage">
          <div className="capture-rings" aria-hidden="true"><i /><i /><i /></div>
          {entered && (
            <Suspense fallback={<div className="masterball-loading">MATERIALIZANDO MASTER BALL...</div>}>
              <MasterBall3D onActivate={openPokedex} />
            </Suspense>
          )}
          <small>CLIQUE OU TOQUE PARA ABRIR A POKÉDEX</small>
        </div>
        <footer><span>MARSHADOW DEX // 2026</span><span>O VÉU OBSERVA DE VOLTA.</span></footer>
      </section>

      {entered && (
        <Suspense fallback={null}>
          <PokedexPortal open={pokedexOpen} onClose={() => setPokedexOpen(false)} />
        </Suspense>
      )}

      {entered && (
        <Suspense fallback={null}>
          <TeamBuilder open={teamBuilderOpen} onClose={() => setTeamBuilderOpen(false)} />
        </Suspense>
      )}

      {entered && <img className="cursor-haunter" ref={cursorGhostRef} src="assets/haunter-cursor-transparent.gif" alt="" aria-hidden="true" draggable={false} />}
      {entered && <aside className="scroll-reactor" aria-hidden="true"><small>VEIL</small><div><span ref={scrollFillRef} /></div><b ref={scrollTextRef}>00</b></aside>}
    </main>
  );
}
