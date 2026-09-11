// Дополняет контент тем, чего не хватало: подробные описания карточек,
// изображения с осмысленными подписями, десятый продукт (каталог комплексов)
// и оставшиеся блоки презентации.
//
// Запуск: node scripts/import-details.mjs

import { SiteDataFile } from '../server/siteDataFile.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = new SiteDataFile(
  path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js'),
  path.join(rootDir, 'server', 'data', 'backups'),
);

const t = (ru, en) => ({ ru, en });

// Временные изображения из уже имеющихся в проекте.
// Подпись описывает, что должно быть на снимке, — по ней легко подобрать замену.
const IMG = {
  radar: '/products/w-space.png',
  uralan: '/products/uralan.png',
  trc: '/products/TRC.png',
  parking: '/products/comoto.png',
  complex: '/products/olan-complex-1.png',
  astra: '/products/astra.png',
  sova: '/products/sova.png',
  cordon: '/products/cordon.png',
};

// ───────────────────── Подробности направлений ─────────────────────

const DIRECTION_DETAILS = {
  enforcement: {
    image: IMG.radar,
    imageCaption: t('Стационарный комплекс контроля скорости на магистрали', 'Fixed speed enforcement system on a highway'),
    details: [
      t('Комплекс сам выявляет транспортное средство в зоне контроля, измеряет скорость двумя независимыми методами — радаром Доплера и оптическим анализом видео, — распознаёт номер и собирает доказательный пакет.', 'The system detects the vehicle in the enforcement zone, measures speed by two independent methods — Doppler radar and optical video analysis — reads the plate and assembles the evidence package.'),
      t('Материал уходит во внешние и государственные системы автоматически: оператор в цепочке не нужен, а значит нет ни задержек, ни человеческого фактора при оформлении.', 'The record is delivered to external and government systems automatically: no operator in the loop, so there are no delays and no human factor in processing.'),
      t('Мы отвечаем за весь маршрут — от разработки схемотехники и встроенного ПО до серийной сборки, монтажа на объекте и эксплуатации распределённой сети по SLA.', 'We own the whole route — from circuit design and embedded software to serial assembly, on-site installation and SLA-based operation of the distributed network.'),
    ],
  },
  vision: {
    image: IMG.trc,
    imageCaption: t('Камера комплекса на перекрёстке: распознавание номеров в потоке', 'Intersection camera: plate recognition in live traffic'),
    details: [
      t('Алгоритмы распознавания — собственная разработка, обученная на реальных дорожных данных региона, а не на зарубежных наборах. Поэтому номера местных образцов читаются устойчиво в дождь, снег и ночью.', 'The recognition algorithms are our own, trained on real regional road data rather than foreign datasets. Local plate formats are therefore read reliably in rain, snow and at night.'),
      t('Система определяет марку, модель и тип транспортного средства: более 840 моделей и 8 типов ТС. Это позволяет строить аналитику по составу потока, а не только по факту нарушения.', 'The system identifies make, model and vehicle type: over 840 models and 8 vehicle types. That makes it possible to analyse traffic composition, not just violations.'),
      t('Технология доступна отдельно — библиотекой AutoSDK, которую можно встроить в чужой продукт без разработки компьютерного зрения с нуля.', 'The technology is available separately as the AutoSDK library, which can be embedded into third-party products without building computer vision from scratch.'),
    ],
  },
  its: {
    image: IMG.cordon,
    imageCaption: t('Опора с комплексом на участке дороги: типовая точка контроля', 'Roadside pole with an enforcement system: a typical control point'),
    details: [
      t('Дорожная система — это не только камера. Это опоры, электропитание, каналы связи, серверная часть и регламент обслуживания. Мы проектируем и разворачиваем всё это как единый объект.', 'A road system is more than a camera. It is poles, power, connectivity, the server side and a maintenance routine. We design and deploy all of it as a single asset.'),
      t('Десять этапов — от обследования площадки до приёмочных испытаний и интеграции с ЦОД. За каждый отвечает одна компания, поэтому нет ситуации, когда поставщик кивает на монтажника.', 'Ten stages — from site survey to acceptance testing and data centre integration. One company is accountable for each, so there is no finger-pointing between supplier and installer.'),
      t('После запуска объект остаётся под мониторингом: удалённая диагностика, управление инцидентами, выездные бригады и склад ЗИП.', 'After launch the site stays monitored: remote diagnostics, incident management, field crews and a spare parts stock.'),
    ],
  },
  smartcity: {
    image: IMG.sova,
    imageCaption: t('Городская камера видеонаблюдения в составе единой системы', 'Municipal surveillance camera within the unified system'),
    details: [
      t('Город получает не набор разрозненных подсистем, а один контур: камеры, платформа управления, видеоаналитика, каналы связи, электропитание, центр обработки данных и мониторинг.', 'The city gets a single loop rather than a set of disconnected subsystems: cameras, a management platform, video analytics, connectivity, power, a data centre and monitoring.'),
      t('Платформа разворачивается поверх существующего ситуационного центра и подключает любое видеооборудование — менять уже установленные камеры не нужно.', 'The platform deploys on top of an existing control room and connects any video equipment — already installed cameras do not need replacing.'),
      t('Модульная структура и открытый API позволяют добавлять подсистемы по мере роста города: парковки, весогабаритный контроль, контроль состояния дорог.', 'A modular architecture and open API allow subsystems to be added as the city grows: parking, weigh-in-motion, road condition monitoring.'),
    ],
  },
  residential: {
    image: IMG.astra,
    imageCaption: t('Оборудование видеонаблюдения для жилой территории', 'Surveillance equipment for a residential area'),
    details: [
      t('Жилой квартал закрывается видеонаблюдением и домофонами с распознаванием лиц, вынесенными в изолированный сегмент сети — данные жильцов не попадают в общий интернет.', 'A residential district is covered by surveillance and FaceID intercoms placed in an isolated network segment — residents’ data never reaches the public internet.'),
      t('Тот же контур обслуживает абонентский доступ: GPON и FTTB от 100 Мбит/с до 1 Гбит/с, беспроводной доступ и радиомост 60 ГГц там, где кабель не проложить.', 'The same loop serves subscriber access: GPON and FTTB from 100 Mbps to 1 Gbps, wireless access and a 60 GHz radio bridge where cable cannot be laid.'),
      t('Устройства работают с платформой, рассчитанной на большие массивы данных, — записи не теряются при нестабильной связи.', 'Devices run on a platform built for large data volumes — recordings are not lost when connectivity is unstable.'),
    ],
  },
  gov: {
    image: IMG.complex,
    imageCaption: t('Комплекс в составе государственной системы фиксации', 'A system operating within the national enforcement network'),
    details: [
      t('Фиксация имеет смысл только тогда, когда материал доходит до реестра правонарушений. Мы берём интеграцию на себя: форматы данных, протоколы обмена, регламенты передачи.', 'Enforcement only makes sense when the record reaches the offence register. We take integration on ourselves: data formats, exchange protocols and transfer procedures.'),
      t('Состав информационного пакета настраивается под требования заказчика, а не наоборот. Единый публичный HTTP-API расширяется по запросу.', 'The content of the data package is configured to the customer’s requirements, not the other way round. A single public HTTP API is extended on request.'),
      t('Метрология и сертификация — часть нашей работы: утверждение типа средств измерений, техническая документация, адаптация интерфейсов.', 'Metrology and certification are part of our job: type approval of measuring instruments, technical documentation and interface adaptation.'),
    ],
  },
  localization: {
    image: IMG.uralan,
    imageCaption: t('Сборка и настройка комплекса на производственной базе', 'System assembly and configuration at the manufacturing base'),
    details: [
      t('В Узбекистане работает полный локальный контур: сборка ПАК, входной контроль комплектующих, настройка, строительство и монтаж, мониторинг и сервис.', 'A complete local capability operates in Uzbekistan: system assembly, incoming inspection of components, configuration, construction and installation, monitoring and service.'),
      t('Локализация — это не только сборка. Это обучение местного персонала, локальное содержание в проекте и передача компетенций партнёру.', 'Localization is more than assembly. It is training local staff, local content in the project and transferring competence to the partner.'),
      t('Такой контур можно повторить в другой юрисдикции: мы работаем как технологический и производственный партнёр в совместных предприятиях.', 'The same loop can be reproduced in another jurisdiction: we work as a technology and manufacturing partner in joint ventures.'),
    ],
  },
};

// ───────────── Подробности компетенций и принципов команды ─────────────

const CAPABILITY_DETAILS = [
  [ // Видеоаналитика и ПО
    t('Распознавание номеров, нарушений и атрибутов транспорта, логика дорожных событий, библиотека AutoSDK и программное обеспечение комплексов W-SPACE.', 'Plate, violation and vehicle attribute recognition, road event logic, the AutoSDK library and W-SPACE system software.'),
    t('Открытые API позволяют встроить наши алгоритмы в чужую систему или подключить чужое оборудование к нашей платформе.', 'Open APIs make it possible to embed our algorithms into a third-party system or connect third-party equipment to our platform.'),
  ],
  [ // Электроника
    t('Встроенное программное обеспечение, конструкция изделий, коммуникационные и регистрационные блоки, серийная сборка.', 'Embedded software, product design, communication and recording units, serial assembly.'),
    t('Собственная схемотехника означает, что при изменении требований заказчика мы правим железо, а не ищем обходной путь в софте.', 'Owning the circuit design means that when requirements change we modify the hardware rather than work around it in software.'),
  ],
  [ // Метрология и сертификация
    t('Утверждение типа средств измерений, подготовка технической документации, адаптация интерфейсов и форматов данных под требования регулятора.', 'Type approval of measuring instruments, technical documentation, adaptation of interfaces and data formats to the regulator’s requirements.'),
    t('Без этой части материал фиксации не имеет юридической силы, поэтому она заложена в проект с самого начала, а не оформляется задним числом.', 'Without this the evidence has no legal force, so it is built into the project from the outset rather than added afterwards.'),
  ],
  [ // Инфраструктура полного цикла
    t('Обследование и проектирование, снабжение, опоры и электропитание, монтаж, калибровка, пусконаладка, приёмочные испытания.', 'Survey and design, procurement, poles and power, installation, calibration, commissioning and acceptance testing.'),
    t('Полевая часть — самая недооценённая в таких проектах: именно на ней обычно срываются сроки, если подрядчиков несколько.', 'Field work is the most underestimated part of such projects: it is where schedules usually slip when several contractors are involved.'),
  ],
  [ // Проектный и сервисный менеджмент
    t('Проектный офис, контроль бюджета и обязательств, мониторинг оборудования, управление инцидентами, выездные бригады, склад ЗИП.', 'PMO, budget and commitment control, equipment monitoring, incident management, field crews and a spare parts stock.'),
    t('Работа по SLA: анализ коренных причин неисправностей, плановая модернизация, один ответственный за результат.', 'SLA-based service: root cause analysis of failures, planned modernization and one party accountable for the result.'),
  ],
  [ // Коммерциализация и масштабирование
    t('Международные продажи, технический пресейл, OEM-лицензирование, проекты B2G и ГЧП, совместные предприятия.', 'International sales, technical presales, OEM licensing, B2G and PPP projects, joint ventures.'),
    t('Мы умеем упаковать технологию в модель, которая работает в конкретной юрисдикции: с местным содержанием, обучением и сервисом.', 'We can package the technology into a model that works in a specific jurisdiction: with local content, training and service.'),
  ],
];

const STRENGTH_DETAILS = [
  [t('Мы доводим технологию до продукта, производства, сервиса и работающего операционного контура, а не останавливаемся на прототипе.', 'We take technology through to a product, manufacturing, service and a working operational loop rather than stopping at a prototype.')],
  [t('Технология, экономика, регулирование, инфраструктура и эксплуатация рассматриваются одновременно — иначе проект спотыкается на том, о чём не подумали заранее.', 'Technology, economics, regulation, infrastructure and operation are considered at once — otherwise the project stumbles on what was not thought through.')],
  [t('R&D, производство, монтаж, IT, сервис и коммерция работают вокруг общего результата, а не каждый за свой участок.', 'R&D, manufacturing, installation, IT, service and sales work towards one result rather than each defending its own patch.')],
  [t('В инфраструктурных проектах участников много: заказчик, регулятор, инвестор, интегратор, местный партнёр. Мы синхронизируем их интересы до старта, а не по ходу.', 'Infrastructure projects have many parties: customer, regulator, investor, integrator, local partner. We align their interests before the start, not along the way.')],
  [t('Мы отвечаем не только за поставку, но и за запуск и работу в реальных полевых условиях — там, где мороз, пыль и нестабильное питание.', 'We are responsible not only for supply but for launch and operation in real field conditions — frost, dust and unstable power.')],
  [t('Требования одного рынка переводим на язык продукта, договора и локальной команды: технически, юридически и культурно.', 'We translate one market’s requirements into product, contract and local team terms: technically, legally and culturally.')],
];

// ───────────────────── Десятый продукт: каталог комплексов ─────────────────────

const CATALOG_PRODUCT = {
  id: 'catalog', number: '10', icon: 'LayoutList',
  title: t('Каталог комплексов по типам нарушений', 'Enforcement systems catalogue by violation type'),
  subtitle: t('Подбор оборудования под конкретную задачу', 'Choosing equipment for a specific task'),
  description: t(
    'Полный каталог серийных комплексов с разбивкой по типам фиксируемых нарушений: скорость, красный свет, парковка, полоса общественного транспорта, железнодорожные переезды. По каждой позиции — характеристики, техпаспорт и фотографии.',
    'The full catalogue of production systems broken down by violation type: speed, red light, parking, public transport lane, level crossings. Each item comes with specifications, a datasheet and photos.',
  ),
  features: [
    t('Подбор по типу нарушения, а не по названию модели', 'Selection by violation type rather than by model name'),
    t('Полные характеристики: дальность контроля, число полос, диапазон скоростей, защита корпуса', 'Full specifications: control range, number of lanes, speed range, ingress protection'),
    t('Фотографии оборудования на реальных объектах', 'Photos of the equipment on real sites'),
    t('Области применения каждого комплекса', 'Application areas for each system'),
    t('Наличие на складе и сроки поставки', 'Stock availability and delivery times'),
  ],
  tagsTitle: t('Типы фиксации', 'Violation types'),
  tags: [
    t('Скорость', 'Speed'), t('Красный свет', 'Red light'), t('Парковка', 'Parking'),
    t('Полоса «А»', 'Bus lane'), t('Ж/Д переезды', 'Level crossings'), t('Обочина', 'Hard shoulder'),
  ],
  meta: t('', ''),
  note: t('Каталог открывается отдельной страницей с фильтром по типу нарушения.', 'The catalogue opens as a separate page with a filter by violation type.'),
  link: 'catalog',
  image: IMG.complex,
  imageCaption: t('Линейка серийных комплексов фиксации нарушений', 'The production range of enforcement systems'),
};

// ─────────────── Блоки презентации, которых не хватало ───────────────

const SOFTWARE_FEATURES = {
  title: t('Ключевые особенности ПО комплексов', 'Key software capabilities'),
  items: [
    { icon: 'Car', title: t('Марка, модель и тип ТС', 'Make, model and vehicle type'), text: t('Более 840 моделей, 8 типов ТС', 'Over 840 models, 8 vehicle types') },
    { icon: 'FileCode', title: t('Гибкие информационные пакеты', 'Flexible data packages'), text: t('Состав данных под требования заказчика', 'Data set defined by the customer') },
    { icon: 'Lock', title: t('Защита и целостность данных', 'Data protection and integrity'), text: t('Контроль несанкционированных изменений', 'Protection against unauthorized changes') },
    { icon: 'ShieldCheck', title: t('Контроль целостности ПО', 'Software integrity check'), text: t('Проверка при каждой загрузке комплекса', 'Verified at every system boot') },
    { icon: 'Radio', title: t('Мониторинг оборудования', 'Hardware monitoring'), text: t('Автоматический контроль аппаратных модулей', 'Automatic monitoring of all hardware modules') },
    { icon: 'Plug', title: t('HTTP-API для интеграции', 'HTTP API for integration'), text: t('Единый публичный интерфейс, расширяемый', 'Single public interface, extendable on request') },
    { icon: 'Database', title: t('Локальная база данных', 'Local database'), text: t('Без потерь при нестабильных каналах связи', 'No data loss on unstable connections') },
    { icon: 'Video', title: t('Трансляция видео по RTSP', 'RTSP video streaming'), text: t('Передача потоков внешним потребителям', 'Streams delivered to external systems') },
    { icon: 'Search', title: t('Списки розыска и VPN', 'Watchlists and VPN'), text: t('Сверка ГРЗ, тревоги оператору, защищённые сети', 'Plate matching, operator alerts, secure networks') },
  ],
};

const FORM_FACTORS = {
  title: t('Варианты исполнения комплексов', 'System form factors'),
  note: t('Одна платформа — пять сценариев контроля.', 'One platform — five enforcement scenarios.'),
  items: [
    { icon: 'Gauge', title: t('Скоростной', 'Fixed speed camera'), text: t('Фиксация скорости двумя независимыми методами: радар Доплера и оптический анализ видео', 'Speed measured by two independent methods: Doppler radar and optical video analysis') },
    { icon: 'ParkingCircle', title: t('Парковочный', 'Parking'), text: t('Контроль припаркованных ТС на протяжённом участке улицы, поворотная камера', 'Monitoring of parked vehicles along an extended street section, PTZ camera') },
    { icon: 'TrafficCone', title: t('На перекрёсток', 'Intersection'), text: t('Несколько комплексов в гибкой конфигурации, синхронизация с контроллером светофора', 'Several units in a flexible configuration, synchronized with the traffic light controller') },
    { icon: 'Camera', title: t('Передвижной (тренога)', 'Portable (tripod)'), text: t('Автономный комплекс, фиксация нарушений в любом месте установки', 'Autonomous unit, enforcement anywhere it is set up') },
    { icon: 'Plane', title: t('Мобильный (люстра, БЛА)', 'Mobile (patrol car, UAV)'), text: t('Размещение на патрульном ТС или беспилотнике — в разработке', 'Mounted on a patrol vehicle or a drone — in development') },
  ],
};

// ─────────────────────────── применяем ───────────────────────────

const content = await file.read();

// Направления
for (const item of content.DIRECTIONS || []) {
  const extra = DIRECTION_DETAILS[item.id];
  if (extra) Object.assign(item, extra);
}

// Компетенции и принципы команды
(content.TEAM.capabilities || []).forEach((item, index) => {
  if (CAPABILITY_DETAILS[index]) item.details = CAPABILITY_DETAILS[index];
});
(content.TEAM.strengths || []).forEach((item, index) => {
  if (STRENGTH_DETAILS[index]) item.details = STRENGTH_DETAILS[index];
});

// Локальный контур и блок партнёра
const proofImages = [IMG.uralan, IMG.cordon, IMG.sova];
(content.COMPANY.proof.items || []).forEach((item, index) => {
  item.image = proofImages[index] || IMG.complex;
  item.imageCaption = item.title;
});

// Десятый продукт
const portfolio = content.PORTFOLIO || [];
if (!portfolio.some((p) => p.id === 'catalog')) portfolio.push(CATALOG_PRODUCT);
// Картинки продуктам
const productImages = {
  autosdk: IMG.trc, complexes: IMG.radar, egsv: IMG.sova, platform: IMG.astra,
  network: IMG.cordon, toll: IMG.uralan, uav: IMG.complex, stablecoin: IMG.parking, rwa: IMG.brav,
};
for (const product of portfolio) {
  if (!product.image) {
    product.image = productImages[product.id] || IMG.complex;
    product.imageCaption = product.subtitle;
  }
}
content.PORTFOLIO = portfolio;

// Дополнительные блоки продукта 02
content.SOFTWARE_FEATURES = SOFTWARE_FEATURES;
content.FORM_FACTORS = FORM_FACTORS;

file.write(content);
console.log('Направлений с подробностями:', Object.keys(DIRECTION_DETAILS).length);
console.log('Продуктов после добавления каталога:', content.PORTFOLIO.length);
console.log('Добавлены блоки: SOFTWARE_FEATURES, FORM_FACTORS');
