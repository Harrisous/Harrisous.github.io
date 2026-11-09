import { useAgentBuild, AgentModule } from './agent-build.jsx';
const { useState, useEffect } = React;

const SECTIONS = [
  { key: 'education', title: 'Education', color: '#00e5ff', agent: 'SCHOLAR' },
  { key: 'experience', title: 'Experience', color: '#ff65d9', agent: 'VECTOR' },
  { key: 'projects', title: 'Projects', color: '#00e5ff', agent: 'ATLAS' },
  { key: 'publications', title: 'Publications', color: '#f5e663', agent: 'PEER' },
  { key: 'blogs', title: 'Blogs', color: '#ff65d9', agent: 'SCRIBE' },
  { key: 'resources', title: 'Resources', color: '#00e5ff', agent: 'INDEX' },
  { key: 'notes', title: 'Study notes', color: '#bda4ff', agent: 'SPARK' },
  { key: 'skills', title: 'Skills', color: '#f5e663', agent: 'FORGE' },
];
const Arrow = () => <span aria-hidden="true">↗</span>;
const STAR_FIELDS = [
  ['situation', 'Situation'], ['task', 'Task'], ['action', 'Action'], ['result', 'Result'],
];
// This is the supported relative chronology, not invented completion dates.
// Projects without a reliable date are listed separately until confirmed.
const PROJECT_ORDER = ['PROJ_008', 'PROJ_009', 'PROJ_010', 'PROJ_011', 'PROJ_005', 'PROJ_004', 'PROJ_002', 'PROJ_001', 'PROJ_006', 'PROJ_007'];
const Tags = ({ items = [] }) => items.length ? <ul className="wb-tags" aria-label="Topics">{items.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul> : null;
function SocialIcon({ type }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };
  if (type === 'email') return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg>;
  if (type === 'linkedin') return <svg {...common} fill="currentColor"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8v-4.65c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.52 2.8-1.52 3 0 3.57 1.98 3.57 4.55v5.22Z" /></svg>;
  return <svg {...common} fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>;
}

function SectionHeading({ section, index }) {
  return <div className="wb-section-heading"><span className="wb-section-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2 id={`${section.key}-heading`}>{section.title}</h2><span className="wb-heading-rule" /></div>;
}
function ContentCard({ item, section, SmartImage, build }) {
  const disabled = item.active === false;
  const external = /^https?:\/\//i.test(item.link || '');
  const editorial = ['publications', 'blogs', 'resources', 'notes'].includes(section.key);
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const actionLabel = { publications: 'Explore paper', blogs: 'Read article', resources: 'Open resource', notes: 'Read notes' }[section.key] || 'Explore project';
  const story = section.key === 'projects' && item.star
    ? STAR_FIELDS.filter(([key]) => item.star[key]) : [];
  const rawText = [item.id + (item.date ? ` / ${item.date}` : ''), item.category, item.title,
    ...(story.length ? story.map(([key, label]) => `${label.toUpperCase()}\n${item.star[key]}`) : [item.description]),
    item.stack?.join(' · '), disabled ? 'Work in progress' : item.link ? actionLabel : 'Project overview',
  ].filter(Boolean).join('\n');
  return <AgentModule build={build} name={section.agent} color={section.color} rawText={rawText} className="wb-card-build"><article className={`wb-card ${disabled ? 'wb-card-wip' : ''}`} data-entry-id={item.id}>
    {item.image && <div className="wb-card-image"><SmartImage src={item.image} alt={item.imageAlt || item.title} id={item.id} className="wb-image" />{!item.image.endsWith('.svg') && item.imageKind !== 'generated-concept' && <span className="wb-image-code" aria-hidden="true">{item.id}</span>}</div>}
    <div className="wb-card-body">
      <div className="wb-card-meta"><span>{item.id}{item.date ? ` / ${item.date}` : ''}</span><span>{disabled ? 'IN PROGRESS' : item.category}</span></div>
      <h3>{editorial && !disabled && item.link ? <a className="wb-title-link" href={item.link} {...linkProps}>{item.title} <Arrow /></a> : item.title}</h3>
      {story.length ? <dl className="wb-star">{story.map(([key, label]) => <div key={key} className={`wb-star-${key}`}><dt><span aria-hidden="true">{label[0]}</span>{label}</dt><dd>{item.star[key]}</dd></div>)}</dl> : <p>{item.description}</p>}
      <Tags items={item.stack} />
      <div className="wb-card-action">{disabled ? <span className="wb-muted">Work in progress</span> : item.link ? <a href={item.link} {...linkProps} className={editorial ? 'wb-action-button' : undefined} aria-label={`${actionLabel}: ${item.title}`}>{actionLabel} <Arrow /></a> : <span className="wb-muted">Project overview</span>}</div>
    </div>
  </article></AgentModule>;
}
function Education({ profile, build }) {
  return <div className="wb-education-list">{(profile.educationFull || []).map((school, i) => <AgentModule key={i} build={build} name="SCHOLAR" color="#00e5ff" rawText={[school.dates, school.school, school.degree, school.gpa && `GPA ${school.gpa}`, school.courses?.join(' · ')].filter(Boolean).join('\n')}><article className="wb-school">
    <div className="wb-date">{school.dates}</div><div><h3>{school.school}</h3><p className="wb-degree">{school.degree}</p>{school.gpa && <p className="wb-gpa">GPA {school.gpa}</p>}<Tags items={school.courses} /></div>
  </article></AgentModule>)}</div>;
}
function Experience({ profile, build }) {
  return <div className="wb-timeline">{(profile.experience || []).map((job, i) => <AgentModule key={`${job.company}-${i}`} build={build} name="VECTOR" color="#ff65d9" rawText={[job.dates, job.location, job.company, job.role, ...(job.bullets || [])].filter(Boolean).join('\n')}><article className="wb-job">
    <div className="wb-date">{job.dates}<span>{job.location}</span></div><div><h3>{job.company}</h3><p className="wb-role">{job.role}</p>{!!job.bullets?.length && <ul className="wb-job-points">{job.bullets.map((b,k)=><li key={k}>{b}</li>)}</ul>}</div>
  </article></AgentModule>)}</div>;
}
function Projects({ items = [], section, SmartImage, build }) {
  const ranked = PROJECT_ORDER.map(id => items.find(item => item.id === id)).filter(Boolean);
  const remaining = items.filter(item => !PROJECT_ORDER.includes(item.id));
  return <><div className="wb-card-grid">{ranked.map(item => <ContentCard key={item.id} item={item} section={section} SmartImage={SmartImage} build={build} />)}</div>{remaining.length > 0 && <><h3 className="wb-more-projects">More projects</h3><div className="wb-card-grid">{remaining.map(item => <ContentCard key={item.id} item={item} section={section} SmartImage={SmartImage} build={build} />)}</div></>}</>;
}

function Skills({ profile, build, color }) {
  const alphabetical = items => [...items].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return <div className="wb-skills-grid">{Object.entries(profile.skills || {}).map(([group, items]) => {
    const skills = alphabetical(items);
    const models = group === 'Generative AI & LLM' ? alphabetical(profile.llmModels || []) : [];
    const rawText = [group, skills.join(' · '), ...(models.length ? ['Models', models.join(' · ')] : [])].join('\n');
    return <AgentModule key={group} build={build} name="FORGE" color={color} rawText={rawText}>
      <div><h3>{group}</h3><Tags items={skills} />{models.length > 0 && <div className="wb-skill-models"><h4>Models</h4><Tags items={models} /></div>}</div>
    </AgentModule>;
  })}</div>;
}

export function WorkbenchScene({ data, bgm, SmartImage }) {
  const build = useAgentBuild();
  const p = data.profile;
  const [active, setActive] = useState('education');
  useEffect(() => {
    // The document mounts after the browser's initial fragment navigation.
    const key = window.location.hash.slice(1);
    if (!SECTIONS.some(section => section.key === key)) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(key)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [data]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = 'education';
      const threshold = Math.min(window.innerHeight * .3, 220);
      for (const s of SECTIONS) {
        const el = document.getElementById(s.key);
        if (el && el.getBoundingClientRect().top <= threshold) current = s.key;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'skills';
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll',onScroll); window.removeEventListener('resize',onScroll); };
  }, []);
  return <div className="workbench" id="top">
    <a className="wb-skip" href="#education">Skip to content</a>
    <header className="wb-header"><a href="#top" className="wb-brand" aria-label="Harry home"><span className="wb-brand-mark" aria-hidden="true">H</span>HARRY<span className="wb-brand-sub"> / GRAPH_OS</span></a>
      <div className="wb-header-right"><button className="agent-build-button" type="button" onClick={build.moduleRunning ? build.skip : build.replay} disabled={build.reducedMotion} aria-label={build.moduleRunning ? 'Skip all builds' : 'Replay builds'}><span aria-hidden="true">{build.moduleRunning ? '↳' : '↻'}</span>{build.moduleRunning ? 'Skip builds' : 'Replay builds'}</button><a href="./index_apple.html" className="wb-mode">Switch mode <Arrow /></a></div>
    </header>
    <div className="wb-layout">
      <aside className="wb-sidebar" aria-label="Profile and section navigation">
        <div className="wb-identity">
          <div className="wb-portrait"><img src={p.avatar} alt={p.name} width="220" height="220" loading="eager" decoding="async" /><span className="wb-portrait-corner" aria-hidden="true" /><span className="wb-portrait-id" aria-hidden="true">ID / HARRISOUS</span></div>
          <div className="wb-socials" aria-label="Social links"><a href={p.contact.github} target="_blank" rel="noopener noreferrer"><SocialIcon type="github" />GitHub</a><a href={p.contact.linkedin} target="_blank" rel="noopener noreferrer"><SocialIcon type="linkedin" />LinkedIn</a><a href={`mailto:${p.contact.email}`}><SocialIcon type="email" />Email</a></div>
          <AgentModule build={build} name="ORIGIN" color="#00e5ff" rawText={[p.location, p.callsign, p.name, p.title, ...(p.focusAreas || [])].join('\n')} className="wb-identity-copy"><div className="wb-eyebrow wb-location"><span className="wb-status-dot" />{p.location}</div>
          <h1>{p.callsign}<span className="wb-hero-period">.</span></h1><p className="wb-name">{p.name}</p><p className="wb-title">{p.title}</p><ul className="wb-focus-areas" aria-label="Areas of focus">{(p.focusAreas || []).map((area,i)=><li key={area}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{area}</li>)}</ul></AgentModule>
        </div>
        <nav className="wb-nav" aria-label="Content sections">{SECTIONS.map((s,i)=><a key={s.key} href={`#${s.key}`} aria-current={active===s.key?'location':undefined} style={{'--section-color':s.color}}><span className="wb-nav-number">{String(i+1).padStart(2,'0')}</span><span className="wb-nav-line" /><span>{s.title}</span><span className="wb-nav-dot" aria-hidden="true" /></a>)}</nav>
        <div className="wb-audio"><button onClick={bgm.toggle} aria-pressed={bgm.playing} aria-label="Toggle background music">{bgm.status === 'loading' ? '◌ LOADING' : bgm.playing ? 'Ⅱ BGM ON' : bgm.status === 'error' ? '↻ RETRY BGM' : '▶ BGM OFF'}</button><label><span className="sr-only">Music volume</span><input type="range" min="0" max="100" value={bgm.vol} onChange={e=>bgm.setVolume(Number(e.target.value))} /></label>{bgm.status === 'loading' && <span className="wb-audio-message" role="status">Connecting to SoundCloud…</span>}{bgm.error && <span className="wb-audio-message" role="status">{bgm.error} <a href={bgm.trackUrl} target="_blank" rel="noopener noreferrer">Open SoundCloud ↗</a></span>}</div>
      </aside>
      <main className="wb-document">
        {SECTIONS.map((s,i)=><section id={s.key} key={s.key} className={`wb-section wb-section-${s.key}`} style={{'--section-color':s.color}} aria-labelledby={`${s.key}-heading`}>
          <SectionHeading section={s} index={i} />
          {s.key==='education' ? <Education profile={p} build={build} /> : s.key==='experience' ? <Experience profile={p} build={build} /> : s.key==='projects' ? <Projects items={data.projects} section={s} SmartImage={SmartImage} build={build} /> : s.key==='skills' ? <Skills profile={p} build={build} color={s.color} /> : <div className="wb-card-grid">{(data[s.key] || []).map(item=><ContentCard key={item.id} item={item} section={s} SmartImage={SmartImage} build={build} />)}</div>}
        </section>)}
        <footer className="wb-footer"><div><span className="wb-eyebrow">LET'S BUILD SOMETHING.</span><a className="wb-footer-email" href={`mailto:${p.contact.email}`}>{p.contact.email} <Arrow /></a></div><div><span>© 2026 HAOCHEN LI</span><a href="#top">Back to top ↑</a></div></footer>
      </main>
    </div>
  </div>;
}
