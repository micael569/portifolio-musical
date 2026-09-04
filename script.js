/* ============================================================
   DADOS — edite estas duas listas com suas próprias faixas e vídeos.
   Basta colocar os arquivos dentro de assets/musicas e assets/videos
   e apontar o caminho aqui.
   ============================================================ */

const TRACKS = [
  { title: "Sambinha", desc: "Trilha sonora · 2025", src: "assets/musicas/musica2.mp3" },
  { title: "Groov", desc: "Trilha sonora · 2024", src: "assets/musicas/musica1.mp3" },
  { title: "Boss", desc: "Trilha sonora · 2024", src: "assets/musicas/musica3.mp3" },
  { title: "Exploração Espacial", desc: "Autoral · 2026", src: "assets/musicas/musica4.mp3" },
  { title: "Por do Sol", desc: "Autoral · 2026", src: "assets/musicas/musica5.mp3" },
  { title: "Memórias", desc: "Autoral · 2025", src: "assets/musicas/musica6.mp3" },
  { title: "Menu", desc: "Trilha sonora · 2024", src: "assets/musicas/musica7.mp3" },
  { title: "Sombrio", desc: "Trilha sonora · 2022", src: "assets/musicas/musica8.mp3" },
  { title: "Jazz", desc: "Autoral · 2022", src: "assets/musicas/musica9.mp3" },
  { title: "Mistério", desc: "Trilha sonora · 2023", src: "assets/musicas/musica10.mp3" }
];

const VIDEOS = [
  { title: "Pinguim (+18)", desc: "Remix · 2023", src: "assets/videos/video1.mp4" },
  { title: "Rock", desc: "Autoral · 2023", src: "assets/videos/video2.mp4" }
];

/* ============================================================
   RENDERIZAÇÃO DA TRACKLIST
   ============================================================ */
const tracklistEl = document.getElementById("tracklist");
const audioEl = document.getElementById("audio-el");
const nowPlayingEl = document.getElementById("now-playing");
const nowTimeEl = document.getElementById("now-time");

let currentIndex = null;

function formatTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const trackRows = [];

TRACKS.forEach((track, i) => {
  const row = document.createElement("div");
  row.className = "track";
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");
  row.innerHTML = `
    <div class="track__num">${String(i + 1).padStart(2, "0")}</div>
    <div class="track__meta">
      <p class="track__title">${track.title}</p>
      <p class="track__desc">${track.desc}</p>
    </div>
    <div class="track__duration" data-duration>--:--</div>
    <button class="track__play" aria-label="Tocar ${track.title}">▶</button>
  `;

  row.addEventListener("click", () => toggleTrack(i));
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTrack(i);
    }
  });

  tracklistEl.appendChild(row);
  trackRows.push(row);
});

// Carrega as durações aos poucos (poucas por vez), em vez de disparar
// todas as requisições de uma vez quando a página abre — evita picos de
// rede/CPU logo no carregamento, principalmente no celular.
function loadDurationsStaggered(rows, concurrency = 3) {
  let nextIndex = 0;

  function loadNext() {
    if (nextIndex >= TRACKS.length) return;
    const i = nextIndex++;
    const track = TRACKS[i];
    const row = rows[i];

    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = track.src;

    const finish = () => loadNext();

    probe.addEventListener("loadedmetadata", () => {
      row.querySelector("[data-duration]").textContent = formatTime(probe.duration);
      finish();
    });
    probe.addEventListener("error", () => {
      row.querySelector("[data-duration]").textContent = "—";
      finish();
    });
  }

  for (let c = 0; c < concurrency; c++) loadNext();
}

loadDurationsStaggered(trackRows);

function toggleTrack(i) {
  if (currentIndex === i && !audioEl.paused) {
    audioEl.pause();
    return;
  }

  if (currentIndex !== i) {
    currentIndex = i;
    audioEl.src = TRACKS[i].src;
  }

  audioEl.play().catch(() => {
    nowPlayingEl.textContent = "Não foi possível carregar este arquivo";
  });
}

audioEl.addEventListener("play", () => {
  updatePlayingUI();
  startVisualizer();
});
audioEl.addEventListener("pause", updatePlayingUI);
audioEl.addEventListener("ended", () => {
  currentIndex = null;
  updatePlayingUI();
});
audioEl.addEventListener("timeupdate", () => {
  nowTimeEl.textContent = `${formatTime(audioEl.currentTime)} / ${formatTime(audioEl.duration)}`;
});

function updatePlayingUI() {
  const rows = tracklistEl.querySelectorAll(".track");
  rows.forEach((row, i) => {
    const btn = row.querySelector(".track__play");
    const playing = i === currentIndex && !audioEl.paused;
    row.classList.toggle("is-playing", playing);
    btn.textContent = playing ? "❚❚" : "▶";
  });
  nowPlayingEl.textContent = currentIndex === null
    ? "Selecione uma faixa"
    : TRACKS[currentIndex].title;
}

/* ============================================================
   RENDERIZAÇÃO DOS VÍDEOS
   ============================================================ */
const videoGridEl = document.getElementById("video-grid");

VIDEOS.forEach((v) => {
  const card = document.createElement("div");
  card.className = "video-card";
  card.innerHTML = `
    <video controls preload="metadata">
      <source src="${v.src}" type="video/mp4">
      Seu navegador não suporta vídeo em HTML5.
    </video>
    <div class="video-card__caption">
      <p class="video-card__title">${v.title}</p>
      <p class="video-card__desc">${v.desc}</p>
    </div>
  `;
  videoGridEl.appendChild(card);
});

/* ============================================================
   VISUALIZADOR DE ONDA (Web Audio API) — elemento de assinatura
   ============================================================ */
let audioCtx, analyser, sourceNode, dataArray;
const waveCanvas = document.getElementById("wave-canvas");
const waveCtx = waveCanvas.getContext("2d");

// Número de barras exibidas e faixa de frequência considerada (em Hz).
// Dividimos o espectro em 3 regiões (grave / médio / agudo) com largura
// visual fixa, e dentro de cada região usamos escala logarítmica — assim
// nenhuma faixa domina o gráfico só por ter mais "bins" de FFT.
const VISUAL_BARS = 48;
const FREQ_MIN = 30;
const FREQ_MAX = 14000;
const BASS_END = 250;
const MID_END = 4000;

const REGION_WIDTHS = {
  bass: 0.28,
  mid: 0.44,
  treble: 0.28
};

let barBinRanges = null;

function initAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.75;
  analyser.minDecibels = -85;
  analyser.maxDecibels = -10;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  barBinRanges = computeBandBarRanges(audioCtx.sampleRate, analyser.frequencyBinCount);
}

function computeBandBarRanges(sampleRate, binCount) {
  const nyquist = sampleRate / 2;
  const maxFreq = Math.min(FREQ_MAX, nyquist);

  const freqToBin = (f) =>
    Math.min(binCount - 1, Math.max(0, Math.round((f / nyquist) * binCount)));

  function createLogRanges(freqStart, freqEnd, barCount) {
    const ranges = [];
    const logStart = Math.log10(freqStart);
    const logEnd = Math.log10(freqEnd);

    for (let i = 0; i < barCount; i++) {
      const t0 = i / barCount;
      const t1 = (i + 1) / barCount;
      const f0 = Math.pow(10, logStart + t0 * (logEnd - logStart));
      const f1 = Math.pow(10, logStart + t1 * (logEnd - logStart));
      const bin0 = freqToBin(f0);
      const bin1 = Math.max(bin0 + 1, freqToBin(f1));
      ranges.push([bin0, bin1]);
    }
    return ranges;
  }

  const bassBars = Math.round(VISUAL_BARS * REGION_WIDTHS.bass);
  const midBars = Math.round(VISUAL_BARS * REGION_WIDTHS.mid);
  const trebleBars = VISUAL_BARS - bassBars - midBars;

  return [
    ...createLogRanges(FREQ_MIN, BASS_END, bassBars),
    ...createLogRanges(BASS_END, MID_END, midBars),
    ...createLogRanges(MID_END, maxFreq, trebleBars)
  ];
}

// ---- CORREÇÃO PRINCIPAL: só existe UM loop de animação por vez ----
let waveLoopActive = false;

function startVisualizer() {
  initAudioGraph();
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (!waveLoopActive) {
    waveLoopActive = true;
    drawWave();
  }
}

function drawWave() {
  if (!analyser || !barBinRanges) {
    waveLoopActive = false;
    return;
  }

  analyser.getByteFrequencyData(dataArray);
  const w = waveCanvas.width;
  const h = waveCanvas.height;
  waveCtx.clearRect(0, 0, w, h);

  const barWidth = w / VISUAL_BARS;
  const color = audioEl.paused ? "rgba(233,226,208,0.15)" : "rgb(227, 162, 59)";
  waveCtx.fillStyle = color;

  for (let i = 0; i < VISUAL_BARS; i++) {
    const [bin0, bin1] = barBinRanges[i];
    let energy = 0;
    for (let b = bin0; b < bin1; b++) {
      const v = dataArray[b] / 255;
      energy += v * v;
    }
    const rms = Math.sqrt(energy / (bin1 - bin0));
    const barHeight = rms * h;
    waveCtx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
  }

  // Se a música parou (pause, fim da faixa, ou troca de faixa), este é o
  // último frame desenhado — o loop encerra aqui em vez de continuar para
  // sempre em segundo plano.
  if (audioEl.paused || audioEl.ended) {
    waveLoopActive = false;
    return;
  }

  requestAnimationFrame(drawWave);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
}
window.addEventListener("resize", () => resizeCanvas(waveCanvas));
resizeCanvas(waveCanvas);

/* ============================================================
   ONDA AMBIENTE NO HERO (decorativa, sem depender de áudio)
   ============================================================ */
const heroWave = document.getElementById("hero-wave");
const heroCtx = heroWave.getContext("2d");
let heroT = 0;
let heroLoopActive = false;

function resizeHero() {
  const rect = heroWave.getBoundingClientRect();
  heroWave.width = rect.width * devicePixelRatio;
  heroWave.height = rect.height * devicePixelRatio;
}
resizeHero();
window.addEventListener("resize", resizeHero);

function drawHeroWave() {
  const w = heroWave.width;
  const h = heroWave.height;
  heroCtx.clearRect(0, 0, w, h);
  heroCtx.strokeStyle = "rgba(233, 226, 208, 0.4)";
  heroCtx.lineWidth = 2 * devicePixelRatio;
  heroCtx.beginPath();

  for (let x = 0; x <= w; x += 4) {
    const y = h / 2 + Math.sin(x * 0.02 + heroT) * (h * 0.28) * Math.sin(heroT * 0.3);
    if (x === 0) heroCtx.moveTo(x, y);
    else heroCtx.lineTo(x, y);
  }
  heroCtx.stroke();
  heroT += 0.02;

  if (document.hidden) {
    heroLoopActive = false;
    return;
  }
  requestAnimationFrame(drawHeroWave);
}

function startHeroWave() {
  if (!heroLoopActive) {
    heroLoopActive = true;
    drawHeroWave();
  }
}

// Pausa as animações quando a aba está em segundo plano (economiza
// bateria/CPU no celular) e retoma quando volta a ficar visível.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    startHeroWave();
    if (!audioEl.paused) startVisualizer();
  }
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) startHeroWave();
