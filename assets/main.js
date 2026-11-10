(() => {
  // Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Putt progress bar + mission parallax
  const root = document.documentElement, mbg = document.querySelector('.mission-bg'), mission = document.querySelector('.mission');
  const onScroll = () => {
    const p = window.scrollY / Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty('--p', (p * 100).toFixed(2) + '%');
    if (mbg) { const r = mission.getBoundingClientRect(); const k = Math.max(-1, Math.min(1, r.top / innerHeight)); mbg.style.transform = `translateY(${k * -60}px)`; }
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Mobile nav
  const nav = document.getElementById('nav');
  document.getElementById('navToggle').addEventListener('click', () => nav.classList.toggle('open'));
  document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  // Front/back flip
  document.querySelectorAll('.flip-tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.flip-tabs button').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.flip-img').forEach(i => i.classList.toggle('active', i.dataset.side === b.dataset.show));
  }));
  // Size picker (visual only)
  document.querySelectorAll('.sizes button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sizes button').forEach(x => x.classList.toggle('on', x === b));
  }));

  // Scorecard hover peek
  const peek = document.getElementById('scPeek');
  document.querySelectorAll('.sc-row[data-img]').forEach(r => {
    r.addEventListener('mouseenter', () => { peek.src = r.dataset.img; peek.style.top = (r.offsetTop - 60) + 'px'; peek.classList.add('show'); });
    r.addEventListener('mouseleave', () => peek.classList.remove('show'));
  });

  // Sunday Tee Time: verse of the week (KJV, public domain)
  const verses = [
    ['Genesis 2:2', 'And on the seventh day God ended his work which he had made; and he rested on the seventh day from all his work which he had made.', 'Leave the phone in the bag for nine holes. Rest is part of the plan.'],
    ['Colossians 3:23', 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.', 'Play every shot like it matters, including the ones nobody sees.'],
    ['Proverbs 3:6', 'In all thy ways acknowledge him, and he shall direct thy paths.', 'Before you pick a line on the green, pick a thing to be thankful for.'],
    ['Psalm 46:10', 'Be still, and know that I am God.', 'Take one slow breath over the ball before every shot today.'],
    ['Matthew 11:28', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', 'Whatever you carried onto the course, set it down at the first tee.'],
    ['1 Corinthians 10:31', 'Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.', 'Win or lose the match, thank God for the round out loud.'],
    ['Proverbs 22:6', 'Train up a child in the way he should go: and when he is old, he will not depart from it.', 'Bring a kid along. Let him keep score, and show him what it looks like to lose well.'],
    ['Philippians 4:13', 'I can do all things through Christ which strengtheneth me.', 'Remember it on the long par 5, and on the hard days off the course too.'],
    ['Proverbs 27:17', 'Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.', 'Ask someone in your group how he is really doing, and wait for the honest answer.']
  ];
  const wk = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); };
  const week = wk(new Date());
  let i = week % verses.length;
  const $ = id => document.getElementById(id);
  const render = () => {
    const q = $('tVerse'); q.classList.add('fade');
    setTimeout(() => {
      const [ref, v, r] = verses[i];
      $('tRef').textContent = ref; q.textContent = '“' + v + '”'; $('tReflect').textContent = r;
      $('tWeek').textContent = String(((week + i - (week % verses.length)) % 52) || 52).padStart(2, '0');
      $('tCount').textContent = (i + 1) + ' / ' + verses.length;
      q.classList.remove('fade');
    }, 180);
  };
  $('tPrev').onclick = () => { i = (i - 1 + verses.length) % verses.length; render(); };
  $('tNext').onclick = () => { i = (i + 1) % verses.length; render(); };
  render();

  // Commandment cards flip
  document.querySelectorAll('.cmd').forEach(c => c.addEventListener('click', () => c.classList.toggle('on')));

  // Countdown to the next Sunday 7:00 AM ET (PLACEHOLDER launch date: Mike to set the real one)
  const nextSunday = () => { const d = new Date(); const t = new Date(d); t.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); t.setHours(7, 0, 0, 0); return t; };
  const LAUNCH = nextSunday();
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    let s = Math.max(0, Math.floor((LAUNCH - new Date()) / 1000));
    $('cdD').textContent = pad(Math.floor(s / 86400)); s %= 86400;
    $('cdH').textContent = pad(Math.floor(s / 3600)); s %= 3600;
    $('cdM').textContent = pad(Math.floor(s / 60)); $('cdS').textContent = pad(s % 60);
  };
  tick(); setInterval(tick, 1000);

  // Signup (front-end only; not wired to any list)
  $('signup').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('email').value.trim();
    $('formMsg').textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? "You're on the tee sheet. See you Sunday. (Preview only, nothing was sent.)"
      : 'Enter a valid email to reserve your tee time.';
  });

  // Sabbath Mode: auto on Sundays, previewable from the footer
  const banner = $('sabbathBanner');
  const setSabbath = on => { document.body.classList.toggle('sabbath', on); banner.hidden = !on; $('sabbathToggle').textContent = on ? 'Exit Sabbath Mode' : 'Preview Sabbath Mode'; };
  if (new Date().getDay() === 0) setSabbath(true);
  $('sabbathToggle').onclick = () => { setSabbath(!document.body.classList.contains('sabbath')); scrollTo({ top: 0, behavior: 'smooth' }); };
  banner.querySelector('.sb-close').onclick = () => { banner.hidden = true; };
})();
