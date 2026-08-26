"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MarshadowCinematicProps = { onComplete: () => void };
type IntroPhase = "film" | "brand";
const BRAND_START_SECONDS = 8.08;

export default function MarshadowCinematic({ onComplete }: MarshadowCinematicProps) {
  const callbackRef = useRef(onComplete);
  const filmRef = useRef<HTMLVideoElement>(null);
  const phaseRef = useRef<IntroPhase>("film");
  const finishedRef = useRef(false);
  const [phase, setPhase] = useState<IntroPhase>("film");
  const [exiting, setExiting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => { callbackRef.current = onComplete; }, [onComplete]);

  const finish = useCallback((fast = false) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    filmRef.current?.pause();
    setExiting(true);
    window.setTimeout(() => callbackRef.current(), fast ? 180 : 480);
  }, []);

  const revealBrand = useCallback(() => {
    if (finishedRef.current || phaseRef.current === "brand") return;
    phaseRef.current = "brand";
    setPhase("brand");
    setNeedsTap(false);
  }, []);

  useEffect(() => {
    const absoluteFallback = window.setTimeout(() => finish(), 12500);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(absoluteFallback);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish]);

  const startPlayback = async () => {
    try {
      await filmRef.current?.play();
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
    }
  };

  const syncTitlePhase = () => {
    const video = filmRef.current;
    if (!video) return;
    if (video.currentTime >= BRAND_START_SECONDS) revealBrand();
  };

  return (
    <section
      className={`reference-intro ${exiting ? "reference-intro--exit" : ""}`}
      data-phase={phase}
      aria-label="Abertura da Marshadow Dex"
      role="dialog"
      aria-modal="true"
    >
      <div className="reference-intro__stage">
        <video
          ref={filmRef}
          className="reference-intro__video reference-intro__video--film"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onCanPlay={startPlayback}
          onTimeUpdate={syncTitlePhase}
          onEnded={() => finish()}
          onError={() => finish(true)}
        >
          <source media="(max-width: 720px)" src="assets/marshadow-dex-intro-mobile.mp4" type="video/mp4" />
          <source src="assets/marshadow-dex-intro-desktop.mp4" type="video/mp4" />
        </video>

        {phase === "brand" && (
          <div className="reference-intro__name">
            <strong>Marshadow Dex</strong><i />
          </div>
        )}

        {needsTap && phase === "film" && (
          <button type="button" className="reference-intro__tap" onClick={startPlayback}>TOQUE PARA INICIAR</button>
        )}
      </div>
    </section>
  );
}
