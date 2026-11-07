const openBtn = document.getElementById('openInvite');
const musicToggle = document.getElementById('musicToggle');
const invite = document.getElementById('invite');
const bottomNav = document.getElementById('bottomNav');
let invitationOpened = false;
openBtn.addEventListener('click', () => {
  if (invitationOpened) return;
  invitationOpened = true;
  openBtn.disabled = true;
  // The user's click authorizes audio playback in Chrome, Safari and Edge.
  startMusic();
  const stage = document.getElementById('royalPetals');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i=0;i<24;i++) {
      const p=document.createElement('span'); p.className='royal-petal';
      p.style.setProperty('--x',`${Math.random()*100}%`);
      p.style.setProperty('--drift',`${(Math.random()-.5)*170}px`);
      p.style.setProperty('--delay',`${Math.random()*.45}s`);
      p.style.setProperty('--duration',`${1.3+Math.random()*.8}s`);
      stage.appendChild(p);
    }
  }
  document.body.classList.add('invite-open');
  invite.classList.remove('hidden');
  bottomNav?.classList.add('show');
  const hero=document.getElementById('home');
  hero.classList.add('royal-exiting');
  setTimeout(() => {
    hero.hidden = true;
    hero.remove(); // Never show the opening artwork again while scrolling.
    window.scrollTo({top:0,left:0,behavior:'instant'});
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850);
});

// The event start comes from data-target on the countdown in index.html.
const target = new Date((document.querySelector('.countdown[data-target]') || {}).dataset?.target || '2026-12-18T19:30:00+05:30');

function updateCountdown(){
  const now = new Date();
  let diff = target - now;
  if (diff <= 0){
    ['days','hours','minutes','seconds'].forEach(id => document.getElementById(id).textContent = '00');
    const caption=document.getElementById('countdownCaption'); if(caption)caption.textContent='The celebration has begun!';
    return;
  }
  const d = Math.floor(diff / 86400000); diff %= 86400000;
  const h = Math.floor(diff / 3600000); diff %= 3600000;
  const m = Math.floor(diff / 60000); diff %= 60000;
  const s = Math.floor(diff / 1000);
  document.getElementById('days').textContent = String(d).padStart(2,'0');
  document.getElementById('hours').textContent = String(h).padStart(2,'0');
  document.getElementById('minutes').textContent = String(m).padStart(2,'0');
  document.getElementById('seconds').textContent = String(s).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown,1000);

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));




/* Music: the Open Invitation click is the user gesture that authorizes playback.
   Place an actual MP3 at audio/wedding-music.mp3 (case-sensitive online). */
const weddingMusic = new Audio('audio/wedding-music.mp3');
weddingMusic.preload = 'auto';
weddingMusic.loop = true;
weddingMusic.volume = 0.48;
let musicStarted = false;
let musicErrorShown = false;
const musicStatus = document.getElementById('musicStatus');

function musicMessage(message) {
  if (!musicStatus) return;
  musicStatus.textContent = message;
  musicStatus.hidden = false;
}
function updateMusicControl() {
  const playing = !weddingMusic.paused && !weddingMusic.ended;
  musicToggle.classList.add('show');
  musicToggle.classList.toggle('paused', !playing);
  musicToggle.textContent = playing ? '♫' : '♪';
  musicToggle.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
  musicToggle.title = playing ? 'Pause music' : 'Play music';
}
function audioErrorMessage(error) {
  if (error && error.name === 'NotAllowedError') return 'Tap the music button to start the music.';
  if (weddingMusic.error?.code === 4 || error?.name === 'NotSupportedError')
    return 'Music could not be loaded. Check that audio/wedding-music.mp3 is a valid MP3.';
  if (weddingMusic.error?.code === 2)
    return 'Music could not be loaded. Check the audio file and its location.';
  return 'Music is unavailable. Check audio/wedding-music.mp3, then tap ♪ to retry.';
}
async function startMusic() {
  // Called synchronously within the Open Invitation click, before transitions.
  musicToggle.classList.add('show');
  musicToggle.hidden = false;
  try {
    const playPromise = weddingMusic.play();
    if (playPromise) await playPromise;
    musicStarted = true;
    musicErrorShown = false;
    if (musicStatus) musicStatus.hidden = true;
  } catch (error) {
    console.warn('Wedding music:', error);
    musicMessage(audioErrorMessage(error));
  }
  updateMusicControl();
}
musicToggle.addEventListener('click', () => {
  if (weddingMusic.paused) startMusic();
  else {
    weddingMusic.pause();
    if (musicStatus) musicStatus.hidden = true;
    updateMusicControl();
  }
});
weddingMusic.addEventListener('playing', updateMusicControl);
weddingMusic.addEventListener('pause', updateMusicControl);
weddingMusic.addEventListener('error', () => {
  if (!invitationOpened || musicErrorShown) return;
  musicErrorShown = true;
  musicMessage(audioErrorMessage());
  updateMusicControl();
});

/* Floral heart-opening effect */
const burstSprites = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];

function createFlowerBurst(){
  const burst = document.getElementById('flowerBurst');
  burst.innerHTML = '';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = window.innerWidth < 740 ? 20 : 28;

  for(let i=0;i<count;i++){
    const flower = document.createElement('span');
    flower.className = 'burst-flower';

    const angle = (Math.PI * 2 * i / count) + (Math.random()-.5)*.25;
    const distance = Math.min(window.innerWidth * .42, 210) * (.5 + Math.random() * .5);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    flower.style.setProperty('--x', `${x.toFixed(1)}px`);
    flower.style.setProperty('--y', `${y.toFixed(1)}px`);
    flower.style.setProperty('--rot', `${Math.round(Math.random()*520-260)}deg`);
    flower.style.setProperty('--scale', `${(0.55+Math.random()*.9).toFixed(2)}`);
    flower.style.setProperty('--dur', `${(0.9+Math.random()*.45).toFixed(2)}s`);
    flower.style.setProperty('--delay', `${(Math.random()*.11).toFixed(2)}s`);
    flower.style.backgroundPosition = burstSprites[i % burstSprites.length];

    burst.appendChild(flower);
  }

  setTimeout(()=>{ burst.innerHTML=''; }, 1800);
}

/* Light floral drift in the background after the invitation opens */
let ambientTimer = null;
const ambientPalette = [
  'rgba(244,164,190,.82)',
  'rgba(231,196,106,.78)',
  'rgba(195,164,221,.72)',
  'rgba(242,190,145,.76)',
  'rgba(170,207,166,.72)',
  'rgba(246,215,183,.80)'
];

function addAmbientFlower(){
  if(document.hidden) return;
  const holder = document.getElementById('ambientFlowers');
  const f = document.createElement('span');
  f.className = 'ambient-flower';

  f.style.left = `${Math.random()*100}vw`;
  f.style.setProperty('--drift', `${Math.round(Math.random()*110-55)}px`);
  f.style.setProperty('--spin', `${Math.round(Math.random()*260-130)}deg`);
  f.style.setProperty('--flowerScale', `${(0.55+Math.random()*.45).toFixed(2)}`);
  f.style.setProperty('--flowerOpacity', `${(0.12+Math.random()*.10).toFixed(2)}`);
  f.style.setProperty('--fallDur', `${(11+Math.random()*8).toFixed(1)}s`);
  f.style.setProperty('--flower', ambientPalette[Math.floor(Math.random()*ambientPalette.length)]);

  holder.appendChild(f);
  setTimeout(()=>f.remove(), 21000);
}

function startAmbientFlowers(){
  if(ambientTimer) return;
  addAmbientFlower();
  ambientTimer = setInterval(addAmbientFlower, 1450);
}


