// ---------------------------------------------------------------------------
// Реестр живых сцен. В контенте у продукта или у раздела страницы есть поле
// scene — имя сцены из списка ниже. Каждая сцена грузится отдельным файлом
// только на той странице, где она нужна; пока файл грузится, на её месте
// стоит обычная картинка раздела.
// ---------------------------------------------------------------------------
import { lazy, Suspense } from 'react';
import { Img } from '../../lib/img.jsx';

const LOADERS = {
  kzmap: () => import('./KzMap.jsx'),
  wall: () => import('./Wall.jsx'),
  bodycam: () => import('./Bodycam.jsx'),
  hub: () => import('./ApiHub.jsx'),
  sites: () => import('./EgsvSites.jsx'),
  gantry: () => import('./TollGantry.jsx'),
  lidar: () => import('./TollLidar.jsx'),
  enforce: () => import('./TollEnforce.jsx'),
  backoffice: () => import('./TollBackoffice.jsx'),
  gnss: () => import('./TollGnss.jsx'),
  flight: () => import('./UavFlight.jsx'),
  launch: () => import('./UavLaunch.jsx'),
  hover: () => import('./UavHover.jsx'),
  survey: () => import('./UavSurvey.jsx'),
  detect: () => import('./UavDetect.jsx'),
  pipeline: () => import('./UavPipeline.jsx'),
  charge: () => import('./UavCharge.jsx'),
  thermal: () => import('./UavThermal.jsx'),
};

const cache = {};

export const SCENE_KINDS = Object.keys(LOADERS);

export function hasScene(kind) {
  return Boolean(kind && LOADERS[kind]);
}

// Сцены по умолчанию — для контента, в котором поля scene ещё нет
// (например, тексты на сервере правили в админке до обновления сайта).
// Сцена привязана к тому, что раздел показывает: к его картинке или
// иллюстрации. Если картинку раздела заменили, сцена по умолчанию не
// включается — на сайте остаётся новая картинка.
// Пустое поле scene ('') в контенте явно отключает анимацию.
const HERO_DEFAULTS = { egsv: 'wall', toll: 'gantry', uav: 'flight' };
const SECTION_DEFAULTS = {
  egsv: { map: 'kzmap', net: 'hub', '/products/egsv-bodycam.jpg': 'bodycam', scan: 'sites' },
  toll: { scan: 'lidar', radar: 'enforce', net: 'backoffice', map: 'gnss' },
  uav: {
    '/products/uav-plane.jpg': 'launch', '/products/uav-copter.jpg': 'hover', map: 'survey', '/products/uav-ai.jpg': 'detect',
    '/products/uav-pipeline.jpg': 'pipeline', '/products/uav-thermal.jpg': 'thermal', battery: 'charge',
  },
};

export function heroScene(product) {
  if (!product) return '';
  if (typeof product.scene === 'string') return hasScene(product.scene) ? product.scene : '';
  return HERO_DEFAULTS[product.id] || '';
}

export function sectionScene(product, section) {
  if (!product || !section) return '';
  if (typeof section.scene === 'string') return hasScene(section.scene) ? section.scene : '';
  const map = SECTION_DEFAULTS[product.id];
  if (!map) return '';
  return map[section.image] || (!section.image && map[section.visual]) || '';
}

export function Scene({ kind, image, sizes = '(max-width: 900px) 100vw, 50vw' }) {
  if (!hasScene(kind)) return null;
  const Comp = cache[kind] || (cache[kind] = lazy(LOADERS[kind]));
  const poster = image
    ? <Img src={image} alt="" sizes={sizes} className="o-scene__poster" lqip={false} />
    : <div className="o-scene" />;
  return (
    <Suspense fallback={poster}>
      <Comp image={image} sizes={sizes} />
    </Suspense>
  );
}
