// ---------------------------------------------------------------------------
// Страница «Проекты». Карточки идут в том же порядке и в той же мозаике, что
// и на главной: первые пять — большое фото и четыре поменьше, остальные —
// ровной сеткой ниже. Порядок задаётся в админке, раздел «Наши проекты».
// Нажатие на карточку открывает фото на весь экран.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PROJECTS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';
import { tr } from '../lib/i18n.js';
import { Img } from '../lib/img.jsx';
import { ProjectLightbox } from './ProjectLightbox.jsx';

export function ProjectCard({ project, index, big, language, onOpen }) {
  return (
    <button type="button" className="o-proj" onClick={() => onOpen(index)}>
      <span className="o-proj__media">
        <Img src={project.image} alt={localize(project.title, language)}
          sizes={big ? '(max-width: 900px) 100vw, 45vw' : '(max-width: 560px) 100vw, 30vw'} />
      </span>
      <span className="o-proj__loc">{localize(project.location, language)}</span>
      <span className="o-proj__title">{localize(project.title, language)}</span>
    </button>
  );
}

export function Projects({ onHome }) {
  const { language, text } = useSite();
  const [open, setOpen] = useState(null);
  const list = PROJECTS || [];
  const mosaic = list.slice(0, 5);
  const rest = list.slice(5);

  return (
    <>
      <div className="o-pagehead">
        <div className="o-wrap">
          <nav className="o-crumbs">
            <button type="button" onClick={onHome}>{tr('Главная')}</button><ChevronRight />
            <span>{text.projects.tag}</span>
          </nav>
          <h1>{text.projects.title}</h1>
          <p>{text.projects.description}</p>
        </div>
      </div>
      <section className="o-section" id="projects">
        <div className="o-wrap">
          <div className="o-projects">
            {mosaic.map((p, i) => <ProjectCard key={p.id || i} project={p} index={i} big={i === 0} language={language} onOpen={setOpen} />)}
          </div>
          {rest.length ? (
            <div className="o-projects o-projects--grid">
              {rest.map((p, i) => <ProjectCard key={p.id || i + 5} project={p} index={i + 5} language={language} onOpen={setOpen} />)}
            </div>
          ) : null}
        </div>
      </section>
      {open !== null && list[open] ? (
        <ProjectLightbox items={list} index={open} language={language} onClose={() => setOpen(null)} onChange={setOpen} />
      ) : null}
    </>
  );
}
