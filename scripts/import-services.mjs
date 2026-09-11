// Дополняет два ключевых направления полным содержанием из презентации
// и добавляет раздел «Задачи заказчика» — проблема и услуга, которая её решает,
// по всем направлениям компании, а не только по фиксации нарушений.
//
// Запуск: node scripts/import-services.mjs

import { SiteDataFile } from '../server/siteDataFile.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = new SiteDataFile(
  path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js'),
  path.join(rootDir, 'server', 'data', 'backups'),
);

const t = (ru, en) => ({ ru, en });

// ───────── Направление 01: автоматическая фиксация нарушений ПДД ─────────

const ENFORCEMENT_POINTS = [
  t('Фиксация нарушений правил дорожного движения', 'Detection of traffic violations'),
  t('Распознавание государственных регистрационных знаков', 'Automatic number plate recognition'),
  t('Формирование дорожных событий', 'Traffic event records'),
  t('Передача данных во внешние и государственные системы', 'Data transfer to external and government systems'),
  t('Повышение безопасности дорожного движения', 'Improved road safety'),
  t('Эксплуатация распределённых сетей оборудования', 'Operation of distributed equipment networks'),
];

const ENFORCEMENT_ROLE = [
  t('Разработчик технологии', 'Technology developer'),
  t('Производитель ПАК', 'Systems manufacturer'),
  t('Системный интегратор', 'Systems integrator'),
  t('Оператор инфраструктуры', 'Infrastructure operator'),
];

// ───────────── Направление 02: умный город и транспорт ─────────────

const SMARTCITY_POINTS = [
  t('Камеры и оборудование видеофиксации', 'Cameras and video capture equipment'),
  t('Программные платформы управления', 'Management software platforms'),
  t('Видеоаналитика', 'Video analytics'),
  t('Каналы связи и электропитание', 'Connectivity and power supply'),
  t('Центры обработки данных', 'Data centres'),
  t('Мониторинг и удалённая диагностика', 'Monitoring and remote diagnostics'),
  t('Интеграция с информационными системами', 'Integration with information systems'),
  t('Оборудование, ПО, связь и эксплуатация — от одного партнёра', 'Equipment, software, connectivity and operation — from one partner'),
];

// ──────────────── Задачи заказчика по всем услугам ────────────────
// Каждая запись: боль заказчика, что мы делаем, и куда ведёт ссылка.

const SERVICE_CASES = [
  {
    id: 'enforcement', icon: 'TrafficCone', link: 'product-complexes',
    title: t('Нарушения фиксируются выборочно', 'Enforcement is patchy'),
    problem: t(
      'Экипаж стоит на посту несколько часов в сутки, остальное время участок живёт без контроля. Водители это знают, и статистика ДТП не меняется годами.',
      'A patrol covers a few hours a day; the rest of the time the road is unchecked. Drivers know it, and accident figures stay flat for years.',
    ),
    solution: t(
      'Комплексы W-SPACE и URALAN закрывают участок круглосуточно: до 26 типов событий, распознавание номеров, доказательная база и передача в государственные системы без оператора.',
      'W-SPACE and URALAN systems cover the road around the clock: up to 26 event types, plate recognition, evidence packages and transfer to government systems with no operator.',
    ),
    linkLabel: t('Комплексы фиксации', 'Enforcement systems'),
  },
  {
    id: 'citywide', icon: 'MonitorPlay', link: 'product-egsv',
    title: t('Город не видит, что происходит на улицах', 'The city cannot see what happens on its streets'),
    problem: t(
      'Камеры стоят от разных подрядчиков, записи лежат в разных системах, у дежурного нет единой картины. Найти нужный фрагмент — задача на полдня.',
      'Cameras come from different contractors, recordings sit in different systems, and the duty officer has no single picture. Finding the right clip takes half a day.',
    ),
    solution: t(
      'ЕГСВ собирает любые источники видео в один контур: интерактивная карта города, удалённый доступ к каждому устройству, встроенная видеоаналитика и передача нарушений в реестр. Разворачивается поверх существующего ситуационного центра.',
      'The city video monitoring platform brings any video source into one loop: an interactive city map, remote access to every device, built-in analytics and violation transfer to the register. It deploys on top of an existing control room.',
    ),
    linkLabel: t('ЕГСВ', 'City video monitoring'),
  },
  {
    id: 'data', icon: 'LayoutGrid', link: 'product-platform',
    title: t('Данные есть, а решения принимать не на чем', 'There is data, but nothing to base decisions on'),
    problem: t(
      'Камеры, комплексы фиксации, весогабаритный контроль, парковки и домофоны живут отдельно. Свести их вместе некому, а значит и картины города нет.',
      'Cameras, enforcement systems, weigh-in-motion, parking and intercoms all live apart. Nobody brings them together, so there is no picture of the city.',
    ),
    solution: t(
      'Единая интеграционная платформа собирает и анализирует данные от любых источников: видеоплатформа, весогабаритный контроль, платные парковки, определение инцидентов и состояние дорожной инфраструктуры в одном ядре с ролевой моделью доступа.',
      'The unified integration platform collects and analyses data from any source: video platform, weigh-in-motion, paid parking, incident detection and road infrastructure condition in one core with role-based access.',
    ),
    linkLabel: t('Интеграционная платформа', 'Integration platform'),
  },
  {
    id: 'roads', icon: 'Route', link: 'product-uav',
    title: t('О разрушении дороги узнаём последними', 'Road damage is discovered last'),
    problem: t(
      'Ямы, сбитые знаки и заросшая обочина обнаруживаются по жалобам, а не по регламенту. Проверить, устранён ли дефект, можно только выездом.',
      'Potholes, damaged signs and overgrown verges are found through complaints rather than routine. Checking whether a defect was fixed requires a site visit.',
    ),
    solution: t(
      'Аэрофотосъёмка с БПЛА и подсистема ROADLY: инвентаризация объектов, распознавание знаков, данные о ямах в реальном времени, автоматический контроль устранения дефектов и дашборд с текущим состоянием инфраструктуры.',
      'UAV aerial survey and the ROADLY subsystem: asset inventory, sign recognition, real-time pothole data, automatic repair verification and a dashboard with the current state of the infrastructure.',
    ),
    linkLabel: t('Мониторинг с БПЛА', 'UAV monitoring'),
  },
  {
    id: 'toll', icon: 'Coins', link: 'product-toll',
    title: t('Платная дорога теряет доход', 'The toll road leaks revenue'),
    problem: t(
      'Шлагбаумы создают очереди, часть транспорта проезжает без оплаты, а посчитать реальные потери оператор не может.',
      'Barriers create queues, part of the traffic passes without paying, and the operator cannot measure the actual losses.',
    ),
    solution: t(
      'Однопортальный рубеж в режиме «свободный поток»: обнаружение и трекинг с точностью 99,9% на скорости до 250 км/ч, классификация по LIDAR, распознавание иностранных номеров, бэк-офис с биллингом и антифрод-платформа.',
      'A single-gantry free-flow toll point: detection and tracking with 99.9% accuracy at up to 250 km/h, LIDAR classification, foreign plate recognition, a billing back office and an anti-fraud platform.',
    ),
    linkLabel: t('Взимание платы за проезд', 'Toll collection'),
  },
  {
    id: 'sdk', icon: 'ScanLine', link: 'product-autosdk',
    title: t('Нужно распознавание номеров в своём продукте', 'You need plate recognition in your own product'),
    problem: t(
      'Разработка компьютерного зрения с нуля — это годы и команда исследователей. Готовые зарубежные решения плохо читают местные номера.',
      'Building computer vision from scratch takes years and a research team. Off-the-shelf foreign solutions read local plates poorly.',
    ),
    solution: t(
      'Библиотека AutoSDK встраивается в ваш продукт: обработка видеопотока в реальном времени, ГРЗ более 30 стран, несколько ТС в кадре, определение направления движения. Внедрена более чем в 50 странах.',
      'The AutoSDK library embeds into your product: real-time video processing, plates from 30+ countries, several vehicles per frame, direction detection. Deployed in more than 50 countries.',
    ),
    linkLabel: t('AutoSDK', 'AutoSDK'),
  },
  {
    id: 'network', icon: 'Wifi', link: 'product-network',
    title: t('Камеру ставить некуда — нет связи и питания', 'There is nowhere to put a camera — no connectivity or power'),
    problem: t(
      'Оборудование куплено, а подключить его не к чему: кабель не проложен, канал перегружен, жилой сектор в общей сети с городскими системами.',
      'The equipment is bought but there is nothing to connect it to: no cable, an overloaded channel, and residential devices sharing a network with city systems.',
    ),
    solution: t(
      'Проектируем и строим связь: GPON и FTTB от 100 Мбит/с до 1 Гбит/с, беспроводной доступ, радиомост 60 ГГц и закрытая сеть безопасной среды, где камеры и домофоны с FaceID вынесены в изолированный сегмент.',
      'We design and build the connectivity: GPON and FTTB from 100 Mbps to 1 Gbps, wireless access, a 60 GHz radio bridge and a secure closed network where cameras and FaceID intercoms sit in an isolated segment.',
    ),
    linkLabel: t('Сетевые технологии', 'Network technologies'),
  },
  {
    id: 'reserves', icon: 'Link2', link: 'product-stablecoin',
    title: t('Регулятор требует доказать обеспечение', 'The regulator demands proof of backing'),
    problem: t(
      'Цифровая валюта или токен выпущены, но подтвердить резерв нечем: аудит раз в квартал, а между проверками — доверие на слово.',
      'A digital currency or token has been issued, but the reserve cannot be proven: an audit once a quarter, and trust on faith in between.',
    ),
    solution: t(
      'Блокчейн-инфраструктура на Universa: аттестации кастодианов и аудиторов как подписанные факты on-chain, инвариант «эмиссия не превышает резерв», консенсус 4-из-6 на каждую эмиссию и публичная панель резервов.',
      'Blockchain infrastructure on Universa: custodian and auditor attestations as signed on-chain facts, the invariant that issuance never exceeds the reserve, 4-of-6 consensus on every issuance and a public reserve dashboard.',
    ),
    linkLabel: t('Блокчейн-инфраструктура', 'Blockchain infrastructure'),
  },
  {
    id: 'rwa', icon: 'Boxes', link: 'product-rwa',
    title: t('Реальные активы неликвидны', 'Real-world assets are illiquid'),
    problem: t(
      'Зерно на элеваторе, металл в хранилище и складские расписки нельзя быстро продать или заложить — нет прозрачного рынка и подтверждения наличия.',
      'Grain in an elevator, metal in a vault and warehouse receipts cannot be sold or pledged quickly — there is no transparent market and no proof of existence.',
    ),
    solution: t(
      'Цифровая биржа RWA: торговый движок с клирингом T+0 / T+1, протокол токенизации под подтверждённый резерв, коннекторы к госреестрам и элеваторам. Работает в регулируемом периметре МФЦА и ADGM.',
      'The RWA digital exchange: a trading engine with T+0 / T+1 clearing, a tokenization protocol backed by a confirmed reserve, connectors to state registries and elevators. Operates within the AIFC and ADGM regulated perimeter.',
    ),
    linkLabel: t('Цифровая биржа RWA', 'RWA exchange'),
  },
  {
    id: 'localization', icon: 'Factory', link: 'card-directions-localization',
    title: t('Требуется локальное содержание в проекте', 'The project requires local content'),
    problem: t(
      'Условия закупки требуют локализации, а поставщик умеет только привезти коробки. Обслуживать оборудование потом некому.',
      'Procurement rules require localization, but the supplier can only ship boxes. Afterwards there is nobody to service the equipment.',
    ),
    solution: t(
      'В Узбекистане у нас полный локальный контур: сборка ПАК, входной контроль комплектующих, строительство и монтаж, обучение персонала, мониторинг и сервис по SLA. Такой же контур воспроизводится в другой юрисдикции.',
      'In Uzbekistan we have a complete local capability: system assembly, incoming inspection, construction and installation, staff training, monitoring and SLA-based service. The same loop can be reproduced elsewhere.',
    ),
    linkLabel: t('Локализация производства', 'Local manufacturing'),
  },
];

// ─────────────────────────── применяем ───────────────────────────

const content = await file.read();

for (const direction of content.DIRECTIONS || []) {
  if (direction.id === 'enforcement') {
    direction.points = ENFORCEMENT_POINTS;
    direction.roleTitle = t('Роль OLAN в проекте', 'OLAN’s role in the project');
    direction.role = ENFORCEMENT_ROLE;
    direction.roleNote = t(
      'Программно-аппаратные комплексы собственной разработки: от схемотехники и встроенного ПО до серийной сборки и выпускного контроля качества.',
      'Systems built in-house: from circuit design and embedded software to serial assembly and final quality control.',
    );
  }
  if (direction.id === 'smartcity') {
    direction.points = SMARTCITY_POINTS;
    direction.roleTitle = t('Что получает город', 'What the city gets');
    direction.role = [t('Оборудование, ПО, связь и эксплуатация — от одного партнёра', 'Equipment, software, connectivity and operation — from one partner')];
    direction.roleNote = t(
      'Распределённые городские системы, которые мы проектируем, разворачиваем и эксплуатируем целиком.',
      'Distributed urban systems that we design, deploy and operate end to end.',
    );
  }
}

content.SERVICE_CASES = SERVICE_CASES;

file.write(content);
console.log('Направление «фиксация»: пунктов', ENFORCEMENT_POINTS.length, '| роль:', ENFORCEMENT_ROLE.length);
console.log('Направление «умный город»: пунктов', SMARTCITY_POINTS.length);
console.log('Задач заказчика:', SERVICE_CASES.length);
