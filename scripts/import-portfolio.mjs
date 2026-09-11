// Продуктовая линейка из презентации: девять продуктов с подробностями.
// Запуск: node scripts/import-portfolio.mjs

import { SiteDataFile } from '../server/siteDataFile.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = new SiteDataFile(
  path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js'),
  path.join(rootDir, 'server', 'data', 'backups'),
);

const t = (ru, en) => ({ ru, en });

const PORTFOLIO = [
  {
    id: 'autosdk', number: '01', icon: 'ScanLine',
    title: t('AutoSDK', 'AutoSDK'),
    subtitle: t('Библиотека распознавания ГРЗ', 'Number plate recognition library'),
    description: t(
      'Библиотека для встраивания распознавания государственных регистрационных знаков в собственные продукты и программно-аппаратные комплексы — без разработки алгоритмов компьютерного зрения.',
      'A library for embedding number plate recognition into your own products and hardware platforms — with no computer vision development of your own.',
    ),
    features: [
      t('Обработка видеопотока в реальном времени', 'Real-time video stream processing'),
      t('Одно- и двухстрочные ГРЗ более 30 стран', 'Single-line and two-line plates from 30+ countries'),
      t('Несколько ТС в кадре и несколько зон детекции', 'Several vehicles per frame and multiple detection zones'),
      t('Определение направления движения ТС', 'Vehicle direction detection'),
      t('Выбор достоверного результата по серии кадров', 'Highest-confidence result across a series of frames'),
    ],
    tagsTitle: t('Где применяется', 'Where it is used'),
    tags: [
      t('СКУД', 'Access control'), t('Парковки', 'Parking'), t('ITS', 'ITS'),
      t('Видеонаблюдение', 'Video surveillance'), t('Фиксация ПДД', 'Traffic enforcement'),
      t('ETC', 'ETC'), t('Весогабаритный контроль', 'Weigh-in-motion'), t('Встроенные устройства', 'Embedded devices'),
    ],
    meta: t('Windows · Linux · macOS · UNIX-подобные ОС', 'Windows · Linux · macOS · UNIX-like systems'),
    note: t('AutoSDK внедрён более чем в 50 странах мира.', 'AutoSDK is deployed in more than 50 countries worldwide.'),
  },
  {
    id: 'complexes', number: '02', icon: 'Camera',
    title: t('W-SPACE и URALAN', 'W-SPACE and URALAN'),
    subtitle: t('Комплексы фиксации нарушений ПДД', 'Traffic enforcement systems'),
    description: t(
      'Выявление транспортных средств в зоне контроля, распознавание ГРЗ, измерение скорости, формирование доказательной базы и передача событий во внешние системы.',
      'Vehicle detection in the enforcement zone, plate recognition, speed measurement, evidence package generation and event transfer to external systems.',
    ),
    features: [
      t('Проезд транспортного средства', 'Vehicle passage'),
      t('Превышение скорости в зоне контроля', 'Speeding in the enforcement zone'),
      t('Средняя скорость между двумя зонами', 'Average speed between two zones'),
      t('Выезд на полосу встречного движения', 'Driving into the oncoming lane'),
      t('Движение по тротуарам и дорожкам', 'Driving on pavements and footpaths'),
      t('Нарушение правил остановки и стоянки', 'Stopping and parking violations'),
      t('Полоса для маршрутных ТС', 'Public transport lane violations'),
      t('Проезд на запрещающий сигнал светофора', 'Running a red light'),
      t('Нарушения на железнодорожном переезде', 'Level crossing violations'),
      t('Приоритет пешехода на переходе', 'Failure to yield to pedestrians'),
      t('Ремни безопасности и телефон за рулём', 'Seat belts and phone use at the wheel'),
      t('ГРЗ из списка розыска', 'Hotlist plate hits'),
    ],
    tagsTitle: t('Варианты исполнения', 'Form factors'),
    tags: [
      t('Скоростной', 'Fixed speed camera'), t('Парковочный', 'Parking'),
      t('На перекрёсток', 'Intersection'), t('Передвижной (тренога)', 'Portable (tripod)'),
      t('Мобильный (люстра, БЛА)', 'Mobile (patrol car, UAV)'),
    ],
    meta: t('до 26 типов фиксируемых событий', 'up to 26 types of violations captured'),
    note: t(
      'Внедрено более 1000 комплексов в Азии и Европе. Комплекс на БЛА: фиксация с высоты до 200 метров, время полёта от 1 часа.',
      'More than 1,000 systems deployed in Asia and Europe. UAV unit: enforcement from up to 200 metres, flight time from 1 hour.',
    ),
  },
  {
    id: 'egsv', number: '03', icon: 'MonitorPlay',
    title: t('ЕГСВ', 'City video monitoring platform'),
    subtitle: t('Единая городская система видеомониторинга', 'Centralized surveillance for a site, city or region'),
    description: t(
      'Централизованный видеомониторинг в масштабе объекта, города или региона с подключением любых источников видеоданных.',
      'Centralized video monitoring across a site, city or region, with any video source connected.',
    ),
    features: [
      t('Модуль «Карта» — интерактивная карта города с удалённым доступом к каждому устройству', '“Map” module — interactive city map with remote access to every device'),
      t('Модуль RTMS — фиксация нарушителей и передача данных в единый реестр правонарушений', 'RTMS module — violation capture and data transfer to the national register of offences'),
      t('Модуль «Камеры» — управление списком камер и правами доступа операторов', '“Cameras” module — camera list management and operator access rights'),
      t('Развёртывание на базе существующего ситуационного центра', 'Deploys on top of an existing control room'),
      t('Интеграция с любым видеооборудованием, модульная структура и открытый API', 'Integration with any video equipment, modular architecture and open API'),
      t('Мобильное приложение с полной функциональностью', 'Full-featured mobile application'),
    ],
    tagsTitle: t('Встроенная видеоаналитика', 'Built-in video analytics'),
    tags: [
      t('Периметральная', 'Perimeter'), t('Ситуационная', 'Situational'),
      t('Биометрическая', 'Biometric'), t('Номерная', 'Number plate'), t('Многокамерная', 'Multi-camera'),
    ],
    meta: t('', ''),
    note: t('ЕГСВ внедрена в 16 городах Республики Казахстан.', 'The platform is deployed in 16 cities of the Republic of Kazakhstan.'),
  },
  {
    id: 'platform', number: '04', icon: 'LayoutGrid',
    title: t('Единая интеграционная платформа', 'Unified integration platform'),
    subtitle: t('Городская платформа данных — в разработке', 'Urban data platform — in development'),
    description: t(
      'Сбор, обработка, анализ и визуализация данных от любых источников: камер, комплексов фиксации, систем весогабаритного контроля, домофонов.',
      'Collection, processing, analysis and visualization of data from any source: cameras, enforcement systems, weigh-in-motion systems, intercoms.',
    ),
    features: [
      t('Видеоплатформа — все функции ЕГСВ плюс распознавание лиц и контроль доступа', 'Video platform — all monitoring functions plus face recognition and access control'),
      t('Весогабаритный контроль — комплексы ВГК в единой системе, раскрытие скрытых номеров, калибровка, спецпропуска', 'Weigh-in-motion — WIM systems in one network, hidden plate recovery, calibration, special permit checks'),
      t('Платные парковки — единый портал и биллинг, мониторинг занятости, выявление неоплаты, штрафы', 'Paid parking — single portal and billing, occupancy monitoring, non-payment detection, fines'),
      t('Определение инцидентов — оставленные предметы, зоны ТБО, содержание фасадов, неисправность освещения', 'Incident detection — abandoned objects, waste collection points, building facades, street lighting faults'),
      t('Дорожная инфраструктура — состояние полотна, бордюров, знаков, щитов и растительности', 'Road infrastructure — condition of the surface, kerbs, signs, boards and vegetation'),
      t('Подсистема ROADLY: инвентаризация объектов, данные о ямах в реальном времени, распознавание знаков, контроль устранения дефектов, SLAM-построение 3D-модели', 'ROADLY subsystem: asset inventory, real-time pothole data, sign recognition, repair verification, SLAM 3D reconstruction'),
    ],
    tagsTitle: t('', ''),
    tags: [],
    meta: t('', ''),
    note: t(
      'Ядро платформы: ролевая модель доступа, реестр объектов и реестр оборудования. Модульная структура расширяется любыми подсистемами по запросу заказчика.',
      "Platform core: role-based access, an asset register and an equipment register. The modular architecture extends with any subsystem at the customer's request.",
    ),
  },
  {
    id: 'network', number: '05', icon: 'Wifi',
    title: t('Сетевые технологии', 'Network technologies'),
    subtitle: t('Проводные и беспроводные сети связи', 'Wired and wireless connectivity'),
    description: t(
      'Проектирование и внедрение проводных и беспроводных технологий связи в городах.',
      'Design and deployment of wired and wireless communication technologies in cities.',
    ),
    features: [
      t('Абонентский доступ — GPON и FTTB: от 100 Мбит/с до 1 Гбит/с', 'Subscriber access — GPON and FTTB: from 100 Mbps to 1 Gbps'),
      t('Закрытая сеть безопасной среды — видеокамеры и домофоны с FaceID в изолированном сегменте', 'Secure closed network — cameras and intercoms with FaceID in an isolated segment'),
      t('Беспроводной доступ — абонентская связь на базе Wi-Fi', 'Wireless access — subscriber connectivity over Wi-Fi'),
      t('Радиомост 60 ГГц — помехоустойчивый закрытый сегмент и высокая скорость передачи', '60 GHz radio bridge — interference-resistant closed segment and high data transfer speed'),
    ],
    tagsTitle: t('', ''), tags: [], meta: t('', ''),
    note: t(
      'Устройства закрытой сети работают с платформой, рассчитанной на большие массивы данных.',
      'Closed-network devices run on a platform built for large data volumes.',
    ),
  },
  {
    id: 'toll', number: '06', icon: 'Coins',
    title: t('Взимание платы за проезд', 'Toll collection'),
    subtitle: t('Однопортальный рубеж MLFF и бэк-офис', 'Single-gantry free-flow system and back office'),
    description: t(
      'Однопортальный рубеж взимания в режиме «свободный поток» — для всех транспортных средств на скорости до 250 км/ч, днём и ночью, в любых погодных условиях.',
      'A single-gantry toll point in multi-lane free-flow mode — every vehicle charged at speeds up to 250 km/h, day and night, in any weather.',
    ),
    features: [
      t('Обнаружение и трекинг ТС с точностью 99,9% в многополосном потоке', 'Vehicle detection and tracking with 99.9% accuracy across all lanes'),
      t('Классификация по габаритам на базе LIDAR: длина, ширина, высота, число осей, скорость', 'LIDAR classification: length, width, height, axle count and speed'),
      t('Распознавание ГРЗ, включая иностранные номера', 'Number plate recognition, foreign plates included'),
      t('Считывание транспондеров DSRC CEN 278 и RFID-меток', 'DSRC CEN 278 transponder and RFID tag reading'),
      t('Бэк-офис: биллинг, платёжный шлюз, CRM, портал самообслуживания, управление OBU', 'Back office: billing, payment gateway, CRM, self-service portal, OBU management'),
      t('Контроль и антифрод: стационарный и мобильный контроль нарушителей, сокращение потерь доходов оператора', "Enforcement and anti-fraud: fixed and mobile enforcement, cutting the operator's revenue leakage"),
    ],
    tagsTitle: t('', ''), tags: [], meta: t('', ''),
    note: t(
      'Базовая технология — видеотоллинг на основе распознавания ГРЗ; опционально RFID-метки или DSRC-транспондеры для максимального охвата.',
      'Video tolling based on plate recognition is the base technology; low-cost RFID tags or DSRC transponders can be added for maximum coverage.',
    ),
  },
  {
    id: 'uav', number: '07', icon: 'Plane',
    title: t('Аэрофотосъёмка и мониторинг', 'Aerial survey and monitoring'),
    subtitle: t('Инспекция инфраструктуры с БПЛА', 'Infrastructure inspection by UAV'),
    description: t(
      'Платформа мониторинга гео-привязанных инцидентов, состояния территорий и инфраструктуры — от постановки задачи на съёмку до отчёта.',
      'A platform for monitoring geolocated incidents and the condition of sites and infrastructure — from tasking a survey to the final report.',
    ),
    features: [
      t('Планирование и задачи: проекты, зоны интереса, назначение исполнителей и техники', 'Planning and tasking: projects, areas of interest, crew and equipment assignment'),
      t('Обработка снимков обученной нейросетью с валидацией аналитиком, ортофотопланы, 2D и 3D', 'Image processing by a trained neural network with analyst validation, orthophotos, 2D and 3D'),
      t('Инциденты на карте: реестр событий с координатами, фото и видео, эскалация диспетчеру', 'Incidents on the map: register of events with coordinates, photos and video, escalation to the dispatcher'),
      t('Парк БПЛА и отчёты: учёт налёта, обслуживание техники, автоматические отчёты', 'Fleet and reporting: flight hours, maintenance tracking, automatic reports'),
    ],
    tagsTitle: t('Отрасли', 'Sectors'),
    tags: [
      t('Трубопроводы', 'Pipelines'), t('Энергетика', 'Power'), t('Транспорт и логистика', 'Transport and logistics'),
      t('Городское хозяйство', 'Municipal services'), t('Промплощадки', 'Industrial sites'),
      t('Леса и водные объекты', 'Forests and water bodies'), t('Службы ЧС', 'Emergency services'),
    ],
    meta: t('', ''), note: t('', ''),
  },
  {
    id: 'stablecoin', number: '08', icon: 'Link2',
    title: t('Блокчейн-инфраструктура стейблкоинов', 'Stablecoin blockchain infrastructure'),
    subtitle: t('Эмиссия, Proof-of-Reserve и кастоди', 'Issuance, Proof-of-Reserve and custody'),
    description: t(
      'Выпуск, обеспечение и обращение цифровых валют и токенов на базе Universa Blockchain — для государств, банков и корпораций: от цифрового золота и CBDC до расчётных стейблкоинов.',
      'Issuance, backing and circulation of digital currencies and tokens on Universa Blockchain — for governments, banks and corporations: from digital gold and CBDC to settlement stablecoins.',
    ),
    features: [
      t('Смарт-контракты: контроллер эмиссии mint / burn / redemption, ролевая модель, freeze / lock по требованию регулятора', 'Smart contracts: mint / burn / redemption controller, role-based access, freeze / lock at the regulator’s request'),
      t('Оракулы и Proof-of-Reserve: аттестации кастодианов и аудиторов как подписанные факты on-chain', 'Oracles and Proof-of-Reserve: custodian and auditor attestations as signed on-chain facts'),
      t('Инвариант: эмиссия не превышает подтверждённый резерв; MintGuard — консенсус 4-из-6 на каждую эмиссию', 'Invariant: issuance never exceeds the confirmed reserve; MintGuard — 4-of-6 consensus on every issuance'),
      t('Шифрование и кастоди: zero-knowledge, мультиподпись и разделение ключей, лицензированные ноды партнёров', 'Encryption and custody: zero-knowledge, multisig and key sharding, licensed partner nodes'),
      t('RegTech by design: KYC / KYB и комплаенс-правила в контракте', 'RegTech by design: KYC / KYB and compliance rules in the contract'),
      t('25 000+ TPS, комиссия близка к нулю, без майнинга', '25,000+ TPS, near-zero fees, no mining'),
    ],
    tagsTitle: t('', ''), tags: [], meta: t('', ''),
    note: t(
      'Референсы: цифровой золотой резерв (Бутан), GoldenToken, стейблкоины для банков Восточной Африки.',
      'References: digital gold reserve (Bhutan), GoldenToken, stablecoins for East African banks.',
    ),
  },
  {
    id: 'rwa', number: '09', icon: 'Boxes',
    title: t('Цифровая биржа RWA', 'RWA digital exchange'),
    subtitle: t('Токенизация реальных активов', 'Tokenization of real-world assets'),
    description: t(
      'Биржа токенизированных реальных активов: торговый движок, клиринг и Proof-of-Reserve в едином регулируемом контуре.',
      'An exchange for tokenized real-world assets: trading engine, clearing and Proof-of-Reserve in one regulated perimeter.',
    ),
    features: [
      t('Торговый движок: matching, OMS и риск-движок, клиринг T+0 / T+1, KYC / KYB, API для участников', 'Trading engine: matching, OMS and risk engine, T+0 / T+1 clearing, KYC / KYB, API for participants'),
      t('Протокол токенизации STABILIA: верифицированная эмиссия под резерв, DvP-расчёты, Token Passport', 'STABILIA tokenization protocol: verified issuance against reserve, DvP settlement, Token Passport'),
      t('Интеграция с реестрами и хранилищами: госреестры, элеваторы, IoT и банки', 'Registry and vault integration: state registries, grain elevators, IoT and banks'),
      t('Регулируемый периметр: МФЦА / AFSA, ADGM', 'Regulated perimeter: AIFC / AFSA, ADGM'),
      t('Открытый API / SDK — встраивание в существующую биржу', 'Open API / SDK — embeds into an existing exchange'),
    ],
    tagsTitle: t('Классы активов', 'Asset classes'),
    tags: [
      t('Зерно', 'Grain'), t('Золото и металлы', 'Gold and metals'), t('Недвижимость', 'Real estate'),
      t('Сырьё', 'Commodities'), t('Доходные инструменты', 'Yield instruments'), t('Складские расписки', 'Warehouse receipts'),
    ],
    meta: t('', ''),
    note: t(
      'Референс: биржа цифровых активов в МФЦА (Казахстан), лицензия AFSA — первый инструмент $WGRAIN (токенизированное зерно).',
      'Reference: digital asset exchange at the AIFC (Kazakhstan), AFSA licence — first instrument $WGRAIN (tokenized grain).',
    ),
  },
];

const content = await file.read();
content.PORTFOLIO = PORTFOLIO;
file.write(content);
console.log(`Продуктов перенесено: ${PORTFOLIO.length}`);
