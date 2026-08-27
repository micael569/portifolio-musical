/* ============================================================
   DADOS — edite estas duas listas com suas próprias faixas e vídeos.
   Basta colocar os arquivos dentro de assets/musicas e assets/videos
   e apontar o caminho aqui.
   ============================================================ */

const TRACKS = [
    {
    title: "Sambinha",
    desc: "Trilha sonora · 2025",
    src: "assets/musicas/musica2.mp3"
  },
  {
    title: "Groov",
    desc: "Trilha sonora · 2024",
    src: "assets/musicas/musica1.mp3"
  },
  {
    title: "Boss",
    desc: "Trilha sonora · 2024",
    src: "assets/musicas/musica3.mp3"
  },
  {
    title: "Exploração Espacial",
    desc: "Autoral · 2026",
    src: "assets/musicas/musica4.mp3"
  },
  {
    title: "Por do Sol",
    desc: "Autoral · 2026",
    src: "assets/musicas/musica5.mp3"
  },
  {
    title: "Memórias",
    desc: "Autoral · 2025",
    src: "assets/musicas/musica6.mp3"
  },
  {
    title: "Menu",
    desc: "Trilha sonora · 2024",
    src: "assets/musicas/musica7.mp3"
  },
  {
    title: "Sombrio",
    desc: "Trilha sonora · 2022",
    src: "assets/musicas/musica8.mp3"
  },
  {
    title: "Jazz",
    desc: "Autoral · 2022",
    src: "assets/musicas/musica9.mp3"
  },
  {
    title: "Mistério",
    desc: "Trilha sonora · 2023",
    src: "assets/musicas/musica10.mp3"
  },
  {
    title: "Palhacinho :)",
    desc: "Rascunho · 2026",
    src: "assets/musicas/musica11.mp3"
  }
];

const VIDEOS = [
  {
    title: "Pinguim (+18)",
    desc: "Remix · 2023",
    src: "assets/videos/video1.mp4"
  },
  {
    title: "Rock",
    desc: "Autoral · 2023",
    src: "assets/videos/video2.mp4"
  }
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

  // Carrega a duração sem tocar, só para exibir na lista
  const probe = new Audio();
  probe.preload = "metadata";
  probe.src = track.src;
  probe.addEventListener("loadedmetadata", () => {
    const durEl = row.querySelector("[data-duration]");
    durEl.textContent = formatTime(probe.duration);
  });
  probe.addEventListener("error", () => {
    const durEl = row.querySelector("[data-duration]");
    durEl.textContent = "—";
  });
});

function toggleTrack(i) {
  const rows = tracklistEl.querySelectorAll(".track");

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
    row.classList.toggle("is-playing", i === currentIndex && !audioEl.paused);
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
// Graves e médios ficam sub-representados numa escala linear porque
// ocupam poucos "bins" da FFT — por isso agrupamos por oitava (log),
// do jeito que o ouvido percebe o espectro.
const VISUAL_BARS = 48;
const FREQ_MIN = 30;    // grave mais baixo audível relevante
const FREQ_MAX = 14000; // agudo mais alto relevante (acima disso é quase só chiado)

let barBinRanges = null; // calculado depois que sabemos o sampleRate

function initAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;              // mais resolução para separar graves de médios
  analyser.smoothingTimeConstant = 0.75; // suaviza sem deixar "travado"
  analyser.minDecibels = -85;            // mais sensível a sons baixos
  analyser.maxDecibels = -10;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  barBinRanges = computeLogBarRanges(audioCtx.sampleRate, analyser.frequencyBinCount);
}

// Calcula, para cada barra visual, qual faixa de bins da FFT ela deve
// resumir — usando espaçamento logarítmico (igual espaço por oitava).
function computeLogBarRanges(sampleRate, binCount) {
  const nyquist = sampleRate / 2;
  const logMin = Math.log10(FREQ_MIN);
  const logMax = Math.log10(Math.min(FREQ_MAX, nyquist));
  const ranges = [];

  const freqToBin = (f) => Math.min(binCount - 1, Math.round((f / nyquist) * binCount));

  for (let i = 0; i < VISUAL_BARS; i++) {
    const t0 = i / VISUAL_BARS;
    const t1 = (i + 1) / VISUAL_BARS;
    const f0 = Math.pow(10, logMin + t0 * (logMax - logMin));
    const f1 = Math.pow(10, logMin + t1 * (logMax - logMin));
    const bin0 = freqToBin(f0);
    const bin1 = Math.max(bin0 + 1, freqToBin(f1));
    ranges.push([bin0, bin1]);
  }
  return ranges;
}

function startVisualizer() {
  initAudioGraph();
  if (audioCtx.state === "suspended") audioCtx.resume();
  drawWave();
}

function drawWave() {
  requestAnimationFrame(drawWave);
  if (!analyser || !barBinRanges) return;

  analyser.getByteFrequencyData(dataArray);
  const w = waveCanvas.width;
  const h = waveCanvas.height;
  waveCtx.clearRect(0, 0, w, h);

  const barWidth = w / VISUAL_BARS;
  const color = audioEl.paused ? "rgba(233,226,208,0.15)" : "rgb(227, 162, 59)";
  waveCtx.fillStyle = color;

  for (let i = 0; i < VISUAL_BARS; i++) {
    const [bin0, bin1] = barBinRanges[i];
    let sum = 0;
    for (let b = bin0; b < bin1; b++) sum += dataArray[b];
    const avg = sum / (bin1 - bin0);
    const value = avg / 255;
    const barHeight = value * h;
    waveCtx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
  }
}

/* Ajusta a resolução real do canvas ao tamanho exibido */
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

function resizeHero() {
  const rect = heroWave.getBoundingClientRect();
  heroWave.width = rect.width * devicePixelRatio;
  heroWave.height = rect.height * devicePixelRatio;
}
resizeHero();
window.addEventListener("resize", resizeHero);

function drawHeroWave() {
  requestAnimationFrame(drawHeroWave);
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
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) drawHeroWave();
