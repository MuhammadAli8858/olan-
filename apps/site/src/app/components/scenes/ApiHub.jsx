// ---------------------------------------------------------------------------
// ЕГСВ: открытый API и любые вендоры.
//
// Слева — системы разных производителей, справа — сервисы платформы, в
// центре — ядро ЕГСВ 2.0 с интеграционной шиной. По линиям всё время идут
// данные, а раз в пару секунд один из вендоров «включается»: его линия
// загорается, импульс проходит через ядро и зажигает нужный сервис.
// Схема повторяет слайд из презентации «Продукты и системы».
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react';
import { Archive, Bell, MonitorPlay, Radar, ScanFace, ScanSearch } from 'lucide-react';
import { tr } from '../../lib/i18n.js';
import { clamp, easeInOut, useAwake, useBeats, useFrames, useReducedMotion } from './engine.js';
import './scenes.css';

const VENDORS = ['NtechLab', 'Axxon', 'Macroscop', 'VisionLabs', 'Hikvision', 'Dahua', 'Tevian'];
const SERVICES = [
  { icon: MonitorPlay, label: () => tr('Видеомониторинг') },
  { icon: ScanSearch, label: () => tr('Видеоаналитика') },
  { icon: Archive, label: () => tr('Видеоархив') },
  { icon: Bell, label: () => tr('Тревожная панель') },
  { icon: Radar, label: () => tr('RTMS-система') },
  { icon: ScanFace, label: () => tr('Распознавание лиц') },
];
// Кто с каким сервисом «разговаривает» в подсветке.
const PAIRS = [[0, 5], [4, 0], [2, 1], [5, 2], [1, 3], [3, 5], [6, 1], [4, 4]];
const CORE = [204, 150];
const VY = (i) => 48 + i * 34;
const SY = (i) => 62 + i * 35.2;
const vPath = (i) => `M 122 ${VY(i)} C 158 ${VY(i)}, 150 ${CORE[1]}, ${CORE[0] - 30} ${CORE[1]}`;
const sPath = (i) => `M ${CORE[0] + 30} ${CORE[1]} C 262 ${CORE[1]}, 250 ${SY(i)}, 282 ${SY(i)}`;

export default function ApiHub() {
  const root = useRef(null);
  const svg = useRef(null);
  const reduced = useReducedMotion();
  const { awake } = useAwake(root);
  const beat = useBeats(awake, [2400], { reduced, still: 0 });
  const [va, sa] = PAIRS[beat % PAIRS.length];
  const wiresV = useRef([]);
  const wiresS = useRef([]);
  const hot = useRef([]);
  const beatAt = useRef({ beat: -1, t: 0 });

  // Яркий импульс: по линии вендора к ядру, пауза, от ядра к сервису.
  useFrames(awake && !reduced, (t) => {
    if (beatAt.current.beat !== beat) beatAt.current = { beat, t };
    const e = t - beatAt.current.t;
    const legs = [[wiresV.current[va], 0, 900], [wiresS.current[sa], 1100, 900]];
    legs.forEach(([path, start, dur], k) => {
      const dot = hot.current[k];
      if (!dot || !path) return;
      const p = (e - start) / dur;
      if (p < 0 || p > 1.25) { dot.setAttribute('opacity', '0'); return; }
      const L = path.getTotalLength();
      const pt = path.getPointAtLength(L * easeInOut(clamp(p)));
      dot.setAttribute('cx', pt.x.toFixed(2));
      dot.setAttribute('cy', pt.y.toFixed(2));
      dot.setAttribute('opacity', String(p > 1 ? 1 - (p - 1) * 4 : 1));
    });
  });

  useEffect(() => {
    const el = svg.current;
    if (!el || !el.pauseAnimations) return;
    if (awake && !reduced) el.unpauseAnimations(); else el.pauseAnimations();
  }, [awake, reduced]);

  return (
    <div ref={root} className="o-scene o-scene--hub" data-awake={awake ? '' : undefined} dir="ltr" aria-hidden="true">
      <svg ref={svg} className="o-hub__svg" viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <radialGradient id="hub-core"><stop offset="0" stopColor="#2f7bff" stopOpacity=".55" /><stop offset="1" stopColor="#2f7bff" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx={CORE[0]} cy={CORE[1]} r="70" fill="url(#hub-core)" className="o-hub__aura" />
        {VENDORS.map((_, i) => <path key={`v${i}`} ref={(el) => { wiresV.current[i] = el; }} d={vPath(i)} className={`o-hub__wire${i === va ? ' is-on' : ''}`} />)}
        {SERVICES.map((_, i) => <path key={`s${i}`} ref={(el) => { wiresS.current[i] = el; }} d={sPath(i)} className={`o-hub__wire${i === sa ? ' is-on' : ''}`} />)}
        {reduced ? null : VENDORS.map((_, i) => (
          <circle key={`pv${i}`} r="1.6" className="o-hub__bit">
            <animateMotion dur={`${2.6 + (i % 3) * 0.7}s`} begin={`${-i * 0.45}s`} repeatCount="indefinite" path={vPath(i)} />
          </circle>
        ))}
        {reduced ? null : SERVICES.map((_, i) => (
          <circle key={`ps${i}`} r="1.6" className="o-hub__bit">
            <animateMotion dur={`${2.2 + (i % 2) * 0.9}s`} begin={`${-i * 0.6}s`} repeatCount="indefinite" path={sPath(i)} />
          </circle>
        ))}
        <circle ref={(el) => { hot.current[0] = el; }} r="3.2" className="o-hub__hot" opacity="0" />
        <circle ref={(el) => { hot.current[1] = el; }} r="3.2" className="o-hub__hot" opacity="0" />
        <circle cx={CORE[0]} cy={CORE[1]} r="38" className="o-hub__ring" />
        <circle cx={CORE[0]} cy={CORE[1]} r="46" className="o-hub__ring o-hub__ring--b" />
      </svg>
      <div className="o-hub__col o-hub__col--v">
        {VENDORS.map((v, i) => (
          <span key={v} className={`o-hub__chip${i === va ? ' is-on' : ''}`} style={{ top: `${(VY(i) / 300) * 100}%` }}>{v}</span>
        ))}
      </div>
      <div className="o-hub__core" style={{ left: `${(CORE[0] / 400) * 100}%`, top: `${(CORE[1] / 300) * 100}%` }} key={`c${beat}`}>
        <span className="o-hub__api">API</span>
        <b>{tr('ЕГСВ 2.0')}</b>
        <i>{tr('интеграционная шина')}</i>
      </div>
      <div className="o-hub__col o-hub__col--s">
        {SERVICES.map((s, i) => {
          const I = s.icon;
          return (
            <span key={i} className={`o-hub__svc${i === sa ? ' is-on' : ''}`} style={{ top: `${(SY(i) / 300) * 100}%` }}>
              <I /><em>{s.label()}</em>
            </span>
          );
        })}
      </div>
      <div className="o-hub__foot">{tr('16 вендоров')} · {tr('открытый API')}</div>
    </div>
  );
}
