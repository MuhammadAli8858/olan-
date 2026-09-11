// Переносит содержание корпоративной презентации в контент сайта.
// Запуск: node scripts/import-presentation.mjs
//
// Русская и английская версии взяты из презентаций напрямую.
// Остальные языки сайта подхватят русский текст как запасной вариант —
// перевести их можно кнопкой «Перевести на все языки» в админ-панели.

import { SiteDataFile } from '../server/siteDataFile.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = new SiteDataFile(
  path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js'),
  path.join(rootDir, 'server', 'data', 'backups'),
);

const t = (ru, en) => ({ ru, en });

// ──────────────────────────── О компании ────────────────────────────

const COMPANY = {
  tagline: t(
    'Технологический партнёр полного цикла для умного города, автоматической фиксации нарушений и интеллектуальной транспортной инфраструктуры',
    'Full-cycle technology partner for smart cities, automated traffic enforcement and intelligent transport infrastructure',
  ),
  badges: [
    t('Разработка', 'Development'),
    t('Производство', 'Manufacturing'),
    t('Интеграция', 'Integration'),
    t('Эксплуатация', 'Operation'),
  ],
  intro: t(
    'Группа OLAN объединяет центр разработки программного обеспечения и электроники, производственную и инженерную базу в Узбекистане, а также международный контур проектов.',
    'OLAN Group brings together a software and electronics development centre, a manufacturing and engineering base in Uzbekistan, and an international project portfolio.',
  ),
  what: t(
    'Компания разрабатывает, производит и внедряет программно-аппаратные комплексы, системы видеоаналитики и решения для цифровой инфраструктуры.',
    'The company develops, manufactures and deploys integrated hardware and software systems, video analytics and digital infrastructure solutions.',
  ),
  how: t(
    'Мы сопровождаем проекты на всех этапах: от обследования и разработки концепции до поставки оборудования, запуска, мониторинга, сервисного обслуживания и масштабирования.',
    'We support projects at every stage: from site survey and concept design to equipment supply, launch, monitoring, service and scaling.',
  ),
  // К чему стремимся — то, что просили вынести на главную.
  mission: t(
    'Мы стремимся к тому, чтобы города Узбекистана и всего региона управлялись данными, а не догадками: чтобы каждое нарушение фиксировалось неотвратимо, каждая дорога была под контролем, а технологии для этого создавались здесь, а не закупались за рубежом.',
    'Our goal is for cities in Uzbekistan and across the region to be run on data rather than guesswork: every violation recorded without exception, every road under control, and the technology behind it built here rather than imported.',
  ),
  focus: t(
    'Специализация — проекты, где нужно соединить технологию, производство, полевую инфраструктуру, государственные системы, коммерческую модель и долгосрочную эксплуатацию.',
    'Our focus is projects that bring together technology, manufacturing, field infrastructure, government systems, a commercial model and long-term operation.',
  ),
  pillars: [
    {
      id: 'rnd', icon: 'Code2',
      title: t('Центр разработки', 'Development centre'),
      text: t('Программное обеспечение, компьютерное зрение и электроника', 'Software, computer vision and electronics'),
    },
    {
      id: 'production', icon: 'Factory',
      title: t('Производственная и инженерная база', 'Manufacturing and engineering base'),
      text: t('Узбекистан: сборка, настройка, монтаж и сервис', 'Uzbekistan: assembly, configuration, installation and service'),
    },
    {
      id: 'international', icon: 'Globe',
      title: t('Международный контур', 'International portfolio'),
      text: t('Проекты, партнёрства и локализация в других юрисдикциях', 'Projects, partnerships and localization in other jurisdictions'),
    },
  ],
  partner: {
    title: t('Один партнёр — полный результат', 'One partner, end-to-end accountability'),
    text: t(
      'Мы отвечаем не только за поставку оборудования или ПО, но и за запуск, работоспособность и адаптацию решений в реальных полевых условиях.',
      'We take responsibility not just for supplying equipment or software, but for launch, uptime and adaptation in real field conditions.',
    ),
    points: [
      t('Короткая цепочка принятия решений', 'Short decision-making chain'),
      t('Прямой доступ к продуктовой и инженерной команде', 'Direct access to the product and engineering team'),
      t('Возможность глубокой локализации', 'Scope for deep localization'),
      t('Один ответственный за технологический, коммерческий и операционный результат', 'One party accountable for the technical, commercial and operational result'),
    ],
  },
  proof: {
    title: t('Узбекистан: локальный контур полного цикла', 'Uzbekistan: full-cycle local capability'),
    text: t(
      'В Узбекистане сформирован полный локальный контур: производство, настройка, строительство, монтаж, мониторинг и эксплуатация. Команда развернула проектный офис и развивает систему мониторинга, SLA и выездной сервис.',
      'In Uzbekistan we have built a complete local capability: manufacturing, configuration, construction, installation, monitoring and operation. The team has set up a PMO and is developing monitoring, SLA and field service.',
    ),
    highlight: t(
      'Один из ключевых проектов охватывает распределённую сеть из сотен комплексов фиксации нарушений ПДД.',
      'One of the key projects covers a distributed network of hundreds of traffic enforcement systems.',
    ),
    items: [
      { icon: 'Factory', title: t('Производство и настройка', 'Manufacturing and configuration'), text: t('Локальная сборка ПАК и входной контроль комплектующих', 'Local assembly of systems and incoming inspection of components') },
      { icon: 'HardHat', title: t('Строительство и монтаж', 'Construction and installation'), text: t('Опоры, электропитание, связь, калибровка и пусконаладка', 'Poles, power, connectivity, calibration and commissioning') },
      { icon: 'Headset', title: t('Мониторинг и сервис', 'Monitoring and service'), text: t('Проектный офис, SLA, удалённая диагностика и выездные бригады', 'PMO, SLA, remote diagnostics and field crews') },
    ],
  },
};

const COMPANY_STATS = [
  { id: 'countries', value: '50+', label: t('стран, где внедрён AutoSDK', 'countries where AutoSDK is deployed') },
  { id: 'systems', value: '1000+', label: t('комплексов фиксации в Азии и Европе', 'enforcement systems across Asia and Europe') },
  { id: 'cities', value: '16', label: t('городов Казахстана на ЕГСВ', 'cities in Kazakhstan run on the platform') },
  { id: 'tps', value: '25 000+', label: t('транзакций в секунду — Universa', 'transactions per second on Universa') },
];

// ─────────────────────── Направления деятельности ───────────────────────

const DIRECTIONS = [
  { id: 'enforcement', icon: 'TrafficCone', title: t('Автоматическая фиксация нарушений ПДД', 'Automated traffic enforcement'),
    text: t('Фиксация нарушений, распознавание ГРЗ, формирование дорожных событий и передача данных в государственные системы.', 'Violation detection, plate recognition, traffic event records and data transfer to government systems.') },
  { id: 'vision', icon: 'Eye', title: t('Видеоаналитика и компьютерное зрение', 'Video analytics and computer vision'),
    text: t('Собственные алгоритмы распознавания, обученные на реальных дорожных данных.', 'In-house recognition algorithms trained on real road data.') },
  { id: 'its', icon: 'Route', title: t('Интеллектуальная транспортная инфраструктура', 'Intelligent transport infrastructure'),
    text: t('Проектирование, развёртывание и эксплуатация распределённых дорожных систем.', 'Design, deployment and operation of distributed road systems.') },
  { id: 'smartcity', icon: 'Building2', title: t('Решения для умного города', 'Smart city solutions'),
    text: t('Камеры, платформы управления, каналы связи, ЦОД и мониторинг — от одного партнёра.', 'Cameras, management platforms, connectivity, data centres and monitoring — from one partner.') },
  { id: 'residential', icon: 'ShieldCheck', title: t('Цифровая безопасность жилых территорий', 'Security systems for residential areas'),
    text: t('Видеонаблюдение, домофоны с FaceID и изолированные сети для жилых кварталов.', 'Surveillance, FaceID intercoms and isolated networks for residential districts.') },
  { id: 'gov', icon: 'Landmark', title: t('Интеграция с государственными системами', 'Integration with government systems'),
    text: t('Передача данных в реестры правонарушений и ведомственные информационные системы.', 'Data transfer to offence registers and government information systems.') },
  { id: 'localization', icon: 'Cog', title: t('Локализация производства и сервисная эксплуатация', 'Local manufacturing and ongoing service'),
    text: t('Местная сборка, обучение персонала, монтаж и сервис по SLA.', 'Local assembly, staff training, installation and SLA-based service.') },
];

// ───────────────────────── Модели сотрудничества ─────────────────────────

const ENGAGEMENT_MODELS = [
  { id: 'enforcement',
    type: t('Автоматическая фиксация нарушений ПДД, безопасность дорожного движения, пополнение бюджета', 'Automated traffic enforcement, road safety, revenue for the public budget'),
    role: t('Разработчик технологии, производитель, интегратор и оператор', 'Technology developer, manufacturer, integrator and operator'),
    result: t('Решение от обследования и локализации до развёртывания и эксплуатации по SLA', 'A solution from survey and localization to rollout and SLA-based operation') },
  { id: 'smartcity',
    type: t('Умный город и транспорт, распределённая городская инфраструктура', 'Smart city and transport, distributed urban infrastructure'),
    role: t('Поставщик и разработчик ПО и VMS с аналитикой, партнёр по интеграции', 'Supplier and developer of software and VMS with analytics, integration partner'),
    result: t('Оборудование, связь, электропитание, ЦОД, программная интеграция и мониторинг', 'Equipment, connectivity, power, data centre, software integration and monitoring') },
  { id: 'b2g',
    type: t('B2G- и ГЧП-инфраструктурные проекты', 'B2G and PPP infrastructure projects'),
    role: t('Технологический партнёр проекта', 'Project technology partner'),
    result: t('Техническая концепция, локализация, модель эксплуатации, поставка и пусконаладка', 'Technical concept, localization, operating model, supply and commissioning') },
  { id: 'jv',
    type: t('Локализация производства и совместные предприятия', 'Local manufacturing and joint ventures'),
    role: t('Технологический и производственный партнёр', 'Technology and manufacturing partner'),
    result: t('Локальное содержание, производство, обучение, монтаж и сервис', 'Local content, manufacturing, training, installation and service') },
  { id: 'service',
    type: t('Эксплуатация и модернизация существующей инфраструктуры', 'Operation and modernization of existing infrastructure'),
    role: t('Сервисный оператор', 'Service operator'),
    result: t('Мониторинг, диагностика, управление инцидентами, выезды и SLA', 'Monitoring, diagnostics, incident management, field visits and SLA') },
];

// ─────────────────────────── Как мы работаем ───────────────────────────

const WORKFLOW = {
  steps: [
    { n: '1', title: t('Обследование объекта', 'Site survey') },
    { n: '2', title: t('Техническая концепция', 'Technical concept') },
    { n: '3', title: t('Проектирование', 'Design') },
    { n: '4', title: t('Снабжение и логистика', 'Procurement and logistics') },
    { n: '5', title: t('Опоры, питание, связь', 'Poles, power, connectivity') },
    { n: '6', title: t('Монтаж оборудования', 'Equipment installation') },
    { n: '7', title: t('Калибровка', 'Calibration') },
    { n: '8', title: t('Пусконаладочные работы', 'Commissioning') },
    { n: '9', title: t('Приёмочные испытания', 'Acceptance testing') },
    { n: '10', title: t('Интеграция с ЦОД и ГИС', 'Data centre and government system integration') },
  ],
  note: t(
    'Единая ответственность за весь маршрут — от обследования площадки до интеграции с государственными информационными системами.',
    'Single accountability end to end — from the site survey to integration with government information systems.',
  ),
  operation: {
    title: t('Проектный офис и сервис по SLA', 'PMO and SLA-based service'),
    items: [
      t('Работа проектного офиса', 'PMO operation'),
      t('Координация кросс-функциональных команд', 'Coordination of cross-functional teams'),
      t('Контроль бюджета и обязательств', 'Budget and commitment control'),
      t('Мониторинг оборудования и удалённая диагностика', 'Equipment monitoring and remote diagnostics'),
      t('Управление инцидентами', 'Incident management'),
      t('Выездные бригады и управление ЗИП', 'Field crews and spare parts management'),
    ],
    slaText: t('Восстановление работоспособности в соответствии с согласованным уровнем сервиса.', 'Restoration of service in line with the agreed service level.'),
    slaPoints: [
      t('Анализ коренных причин неисправностей', 'Root cause analysis of failures'),
      t('Плановая модернизация инфраструктуры', 'Planned infrastructure modernization'),
      t('Один ответственный за результат', 'One party accountable for the result'),
    ],
  },
};

// ────────────────────────────── Команда ──────────────────────────────

const TEAM = {
  roles: [
    t('Технологические предприниматели и продуктовые руководители', 'Technology entrepreneurs and product leaders'),
    t('Разработчики ПО и компьютерного зрения', 'Software and computer vision developers'),
    t('Инженеры-конструкторы и специалисты по электронике', 'Design engineers and electronics specialists'),
    t('Специалисты по радиоэлектронике', 'Radio electronics specialists'),
    t('Эксперты по производству и настройке ПАК', 'Manufacturing and system configuration experts'),
    t('Технические интеграторы', 'Technical integrators'),
    t('Руководители B2G- и B2B-проектов', 'B2G and B2B project managers'),
    t('Международные продажи и партнёрства', 'International sales and partnerships'),
    t('Эксперты по операционному управлению', 'Operations management experts'),
  ],
  note: t(
    'Все ключевые компетенции объединены в едином контуре ответственности — короткие сроки принятия решений и единый контроль результата.',
    'All key capabilities sit with one accountable team — short decision cycles and single-point control over delivery.',
  ),
  capabilities: [
    { icon: 'Eye', title: t('Видеоаналитика и ПО', 'Video analytics and software'),
      text: t('LPR/ANPR, распознавание нарушений и атрибутов ТС, логика дорожных событий, AutoSDK, ПО W-SPACE, открытые API', 'LPR/ANPR, violation and vehicle attribute recognition, road event logic, AutoSDK, W-SPACE software, open APIs') },
    { icon: 'Cpu', title: t('Электроника', 'Electronics'),
      text: t('Встроенное ПО, конструкция изделий, коммуникационные и регистрационные блоки, серийная сборка', 'Embedded software, product design, communication and recording units, serial assembly') },
    { icon: 'BadgeCheck', title: t('Метрология и сертификация', 'Metrology and certification'),
      text: t('Утверждение типа средств измерений, техническая документация, адаптация интерфейсов и форматов данных', 'Type approval of measuring instruments, technical documentation, adaptation of interfaces and data formats') },
    { icon: 'HardHat', title: t('Инфраструктура полного цикла', 'Full-cycle infrastructure'),
      text: t('Обследование и проектирование, снабжение, опоры и питание, монтаж, калибровка, пусконаладка, испытания', 'Survey and design, procurement, poles and power, installation, calibration, commissioning, testing') },
    { icon: 'ClipboardCheck', title: t('Проектный и сервисный менеджмент', 'Project and service management'),
      text: t('Проектный офис, бюджеты и обязательства, мониторинг, инциденты, выездные бригады, ЗИП, RCA, SLA', 'PMO, budgets and commitments, monitoring, incidents, field crews, spare parts, RCA, SLA') },
    { icon: 'Handshake', title: t('Коммерциализация и масштабирование', 'Commercialization and scaling'),
      text: t('Международные продажи, технический пресейл, OEM-лицензирование, B2G и ГЧП, совместные предприятия', 'International sales, technical presales, OEM licensing, B2G and PPP, joint ventures') },
  ],
  strengths: [
    { icon: 'Lightbulb', title: t('Предпринимательское мышление', 'Entrepreneurial mindset'),
      text: t('Превращаем технологию в продукт, производство, сервис и работающий операционный контур', 'We turn technology into a product, manufacturing, service and a business that runs') },
    { icon: 'Network', title: t('Системное мышление', 'Systems thinking'),
      text: t('Одновременно учитываем технологию, экономику, регулирование, инфраструктуру и эксплуатацию', 'We weigh technology, economics, regulation, infrastructure and operation at once') },
    { icon: 'Users', title: t('Кросс-функциональное лидерство', 'Cross-functional leadership'),
      text: t('Объединяем R&D, производство, монтаж, IT, сервис и коммерцию вокруг общего результата', 'We align R&D, manufacturing, installation, IT, service and sales around one result') },
    { icon: 'Handshake', title: t('Работа со сложными стейкхолдерами', 'Complex stakeholder management'),
      text: t('Синхронизируем интересы заказчиков, регуляторов, инвесторов, интеграторов и партнёров', 'We align customers, regulators, investors, integrators and local partners') },
    { icon: 'ShieldCheck', title: t('Ответственность и адаптивность', 'Accountability and adaptability'),
      text: t('Отвечаем не только за поставку, но и за запуск и работу в реальных полевых условиях', 'We take responsibility not just for supply, but for launch and operation in real field conditions') },
    { icon: 'Languages', title: t('Межкультурная коммуникация', 'Cross-cultural communication'),
      text: t('Переводим требования одного рынка на язык продукта, договора и локальной команды', "We translate one market's requirements into product, contract and local team terms") },
  ],
};

file.read().then((content) => {
  content.COMPANY = COMPANY;
  content.COMPANY_STATS = COMPANY_STATS;
  content.DIRECTIONS = DIRECTIONS;
  content.ENGAGEMENT_MODELS = ENGAGEMENT_MODELS;
  content.WORKFLOW = WORKFLOW;
  content.TEAM = TEAM;
  if (!content.PORTFOLIO) content.PORTFOLIO = [];
  file.write(content);
  console.log('Перенесено: COMPANY, COMPANY_STATS, DIRECTIONS, ENGAGEMENT_MODELS, WORKFLOW, TEAM');
});
