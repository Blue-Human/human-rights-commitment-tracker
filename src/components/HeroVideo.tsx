"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { alpha } from "@mui/material/styles";
import { brand } from "@/brand";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (motion.matches) video.pause();
      else void video.play().catch(() => {});
    };
    update();
    motion.addEventListener("change", update);
    return () => {
      motion.removeEventListener("change", update);
      video.pause();
    };
  }, []);

  return (
    <>
      <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, pointerEvents: "none", "@media (prefers-reduced-motion: reduce)": { display: "none" } }}>
        <Box
          component="video"
          ref={videoRef}
          src="/images/ods/3143889-uhd_2562_1440_24fps%20(1).mp4"
          muted
          loop
          playsInline
          preload="none"
          tabIndex={-1}
          onCanPlay={() => setAvailable(true)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setAvailable(false)}
          sx={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.65)" }}
        />
        <Box sx={{ position: "absolute", inset: 0, bgcolor: alpha(brand.navy, .74) }} />
      </Box>
      {available && (
        <IconButton
          aria-label={playing ? "Pausar vídeo de fondo" : "Reproducir vídeo de fondo"}
          title={playing ? "Pausar vídeo de fondo" : "Reproducir vídeo de fondo"}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) void video.play().catch(() => {});
            else video.pause();
          }}
          sx={{ position: "absolute", right: 8, top: 8, zIndex: 2, color: "rgba(255,255,255,.72)", width: 44, height: 44, "&:hover": { bgcolor: "rgba(255,255,255,.08)" }, "&.Mui-focusVisible": { outline: "2px solid #fff" }, "@media (prefers-reduced-motion: reduce)": { display: "none" } }}
        >
          {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
      )}
    </>
  );
}
