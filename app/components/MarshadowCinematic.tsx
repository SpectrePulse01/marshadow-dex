"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MarshadowCinematicProps = { onComplete: () => void };
type IntroPhase = "film" | "brand";

export default function MarshadowCinematic({ onComplete }: MarshadowCinematicProps) {
  const callbackRef = useRef(onComplete);
  const filmRef = useRef<HTMLVideoElement>(null);
  const brandRef = useRef<HTMLVideoElement>(null);
  const phaseRef = useRef<IntroPhase>("film");
  const brandTimerRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const [phase, setPhase] = useState<IntroPhase>("film");
  const [exiting, setExiting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => { callbackRef.current = onComplete; }, [onComplete]);

  const finish = useCallback((fast = false) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    window.clearTimeout(brandTimerRef.current);
    filmRef.current?.pause();
    brandRef.current?.pause();
    setExiting(true);
    window.setTimeout(() => callbackRef.current(), fast ? 180 : 480);
  }, []);

  const revealBrand = useCallback(() => {
    if (finishedRef.current || phaseRef.current === "brand") return;
    phaseRef.current = "brand";
    setPhase("brand");
    setNeedsTap(false);

    const brand = brandRef.current;
    if (brand) {
      brand.currentTime = 0;
      void brand.play().catch(() => undefined);
    }

    // Safety gate: the site is always released even if a media event fails.
    brandTimerRef.current = window.setTimeout(() => finish(), 3100);
  }, [finish]);

  useEffect(() => {
    const brandFallback = window.setTimeout(revealBrand, 9500);
    const absoluteFallback = window.setTimeout(() => finish(), 13100);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(brandFallback);
      window.clearTimeout(absoluteFallback);
      window.clearTimeout(brandTimerRef.current);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish, revealBrand]);

  const startPlayback = async () => {
    try {
      await filmRef.current?.play();
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
    }
  };

  const startBridgeNearEnd = () => {
    const video = filmRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    if (video.currentTime >= video.duration - 0.5) revealBrand();
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
          src="assets/marshadow-dex-opening-lite.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onCanPlay={startPlayback}
          onTimeUpdate={startBridgeNearEnd}
          onEnded={revealBrand}
          onError={revealBrand}
        />

        <div className="reference-intro__brand-frame" aria-hidden={phase !== "brand"}>
          <video
            ref={brandRef}
            className="reference-intro__brand-video"
            src="assets/marshadow-dex-brand.mp4"
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onEnded={() => finish()}
            onError={() => finish()}
          />
          {phase === "brand" && (
            <div className="reference-intro__name">
              <strong>Marshadow Dex</strong><i />
            </div>
          )}
        </div>

        <span className="reference-intro__bridge" aria-hidden="true" />

        {needsTap && phase === "film" && (
          <button type="button" className="reference-intro__tap" onClick={startPlayback}>TOQUE PARA INICIAR</button>
        )}
      </div>
    </section>
  );
}
