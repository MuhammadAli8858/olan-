// Переписывает тексты решений на продающие.
// Запуск: node scripts/update-solutions.mjs
//
// Все утверждения опираются на данные, которые уже есть на сайте:
// диапазон 1–330 км/ч, IP66, температура −40…+60 °C, гарантия 12 месяцев,
// срок службы 5 лет, 15 лет на рынке, 3000+ поставленных комплексов.
// Ничего сверх этого не придумано.

import { SiteDataFile } from '/home/claude/olan/server/siteDataFile.js';

const file = new SiteDataFile(
  '/home/claude/olan/apps/site/src/app/data/siteData.js',
  '/home/claude/olan/server/data/backups',
);

const TEXTS = {
  speed: {
    problem: {
      ru: 'Там, где за скоростью никто не следит, водитель разгоняется до тех пор, пока не случится ДТП. Экипаж стоит на посту два часа в сутки — остальные двадцать два участок живёт без контроля, и все об этом знают. Каждый месяц промедления — это новые аварии, разбирательства и счёт, который выставляет не бюджет, а жизнь.',
      uz: 'Tezlik nazorat qilinmaydigan joyda haydovchi baxtsiz hodisa yuz bermaguncha tezlashaveradi. Ekipaj sutkasiga ikki soat turadi — qolgan yigirma ikki soat uchastka nazoratsiz qoladi va buni hamma biladi. Har oylik kechikish — yangi avariyalar va byudjet emas, hayot toʻlaydigan hisob.',
      en: 'Where nobody watches the speed, drivers keep accelerating until a crash happens. A patrol car covers two hours a day — for the other twenty-two the road runs unchecked, and every driver knows it. Every month of delay means new accidents and a bill paid not by the budget but by people.',
      uk: 'Там, де за швидкістю ніхто не стежить, водій розганяється доти, доки не станеться ДТП. Екіпаж стоїть на посту дві години на добу — решту двадцять дві ділянка живе без контролю, і всі про це знають. Кожен місяць зволікання — це нові аварії й рахунок, який виставляє не бюджет, а життя.',
      zh: '在无人监管车速的路段，驾驶员会一直加速，直到事故发生。执勤车每天只能值守两小时，其余二十二小时路段处于失控状态，所有司机都心知肚明。每拖延一个月，就意味着新的事故，代价由生命而非预算承担。',
      kk: 'Жылдамдықты ешкім бақыламайтын жерде жүргізуші жол апаты болғанша үдете береді. Экипаж тәулігіне екі сағат тұрады — қалған жиырма екі сағат учаске бақылаусыз қалады, мұны бәрі біледі. Әр айлық кешігу — жаңа апаттар және бюджет емес, өмір төлейтін шот.',
      be: 'Там, дзе за хуткасцю ніхто не сочыць, кіроўца разганяецца датуль, пакуль не здарыцца ДТЗ. Экіпаж стаіць на пасту дзве гадзіны на суткі — астатнія дваццаць дзве ўчастак жыве без кантролю, і ўсе пра гэта ведаюць. Кожны месяц марудлівасці — гэта новыя аварыі і рахунак, які выстаўляе не бюджэт, а жыццё.',
    },
    solution: {
      ru: 'Комплекс OLAN закрывает участок круглосуточно: измеряет скорость каждой машины от 1 до 330 км/ч сразу на всех полосах, распознаёт номер и сам формирует материал с фото и видео. Оператор не нужен. Корпус IP66 работает от −40 °C до +60 °C — в снег, дождь и жару без обслуживания на месте. Срок службы 5 лет, гарантия 12 месяцев. Мы производим эти комплексы 15 лет и поставили больше 3000 штук: оборудование приходит настроенным, вам остаётся выбрать участок.',
      uz: 'OLAN majmuasi uchastkani kechayu kunduz yopadi: har bir avtomobil tezligini 1 dan 330 km/soatgacha barcha yoʻlaklarda oʻlchaydi, raqamni taniydi va foto hamda video bilan materialni oʻzi shakllantiradi. Operator kerak emas. IP66 korpus −40 °C dan +60 °C gacha ishlaydi — qor, yomgʻir va jazirama issiqda joyida xizmat koʻrsatishsiz. Xizmat muddati 5 yil, kafolat 12 oy. Biz bu majmualarni 15 yildan beri ishlab chiqaramiz va 3000 dan ortiq yetkazdik: jihoz sozlangan holda keladi, sizga faqat uchastkani tanlash qoladi.',
      en: 'The OLAN system covers the road around the clock: it measures every vehicle from 1 to 330 km/h across all lanes at once, reads the plate and builds the evidence package with photo and video by itself. No operator required. The IP66 housing works from −40 °C to +60 °C — through snow, rain and heat, with no on-site servicing. Service life 5 years, warranty 12 months. We have been building these systems for 15 years and delivered over 3,000 of them: the equipment arrives configured, you only choose the location.',
      uk: 'Комплекс OLAN закриває ділянку цілодобово: вимірює швидкість кожної машини від 1 до 330 км/год одразу на всіх смугах, розпізнає номер і сам формує матеріал із фото та відео. Оператор не потрібен. Корпус IP66 працює від −40 °C до +60 °C — у сніг, дощ і спеку без обслуговування на місці. Термін служби 5 років, гарантія 12 місяців. Ми виробляємо ці комплекси 15 років і поставили понад 3000 штук: обладнання приходить налаштованим, вам лишається обрати ділянку.',
      zh: 'OLAN 系统全天候守护路段：同时测量所有车道上每辆车 1 至 330 公里/小时的速度，识别车牌，并自动生成含照片和视频的证据材料。无需操作员。IP66 外壳可在 −40 °C 至 +60 °C 环境下工作，雨雪高温均无需现场维护。使用寿命 5 年，保修 12 个月。我们生产此类系统已有 15 年，交付超过 3000 套：设备到货即已配置完毕，您只需选定路段。',
      kk: 'OLAN кешені учаскені тәулік бойы жабады: әр көліктің жылдамдығын 1-ден 330 км/сағ дейін барлық жолақта бірден өлшейді, нөмірін таниды және фото мен бейнесі бар материалды өзі жасайды. Оператор қажет емес. IP66 корпусы −40 °C-тан +60 °C-қа дейін жұмыс істейді — қар, жаңбыр және ыстықта орнында қызмет көрсетусіз. Қызмет мерзімі 5 жыл, кепілдік 12 ай. Біз бұл кешендерді 15 жыл шығарамыз және 3000-нан астам жеткіздік: жабдық бапталған күйде келеді, сізге учаскені таңдау ғана қалады.',
      be: 'Комплекс OLAN закрывае ўчастак кругласутачна: вымярае хуткасць кожнай машыны ад 1 да 330 км/г адразу на ўсіх палосах, распазнае нумар і сам фарміруе матэрыял з фота і відэа. Аператар не патрэбны. Корпус IP66 працуе ад −40 °C да +60 °C — у снег, дождж і спёку без абслугоўвання на месцы. Тэрмін службы 5 гадоў, гарантыя 12 месяцаў. Мы вырабляем гэтыя комплексы 15 гадоў і паставілі больш за 3000 штук: абсталяванне прыходзіць наладжаным, вам застаецца выбраць участак.',
    },
  },

  trafficLight: {
    problem: {
      ru: 'Проезд на запрещающий сигнал заканчивается лобовым или боковым ударом — самыми тяжёлыми из всех. Те, кто проскакивает на красный, делают это не случайно, а каждый день, потому что уверены: никто не увидит. Пока на перекрёстке нет фиксации, эта уверенность оправдана.',
      uz: 'Taqiqlovchi signalda oʻtish peshona yoki yon zarba bilan tugaydi — bular eng ogʻir toʻqnashuvlar. Qizil chiroqda oʻtadiganlar buni tasodifan emas, har kuni qiladi, chunki hech kim koʻrmasligiga ishonadi. Chorrahada qayd etish boʻlmaguncha bu ishonch oʻrinli.',
      en: 'Running a red light ends in a head-on or side impact — the most severe collisions there are. Drivers who do it are not making a mistake; they do it daily because they are sure nobody is watching. Until the intersection is monitored, that confidence is justified.',
      uk: 'Проїзд на заборонний сигнал закінчується лобовим або бічним ударом — найважчими з усіх. Ті, хто проскакує на червоне, роблять це не випадково, а щодня, бо впевнені: ніхто не побачить. Поки на перехресті немає фіксації, ця впевненість виправдана.',
      zh: '闯红灯往往以正面或侧面碰撞收场，而这正是最严重的事故类型。闯红灯的司机并非偶然失误，他们每天如此，因为笃定无人监管。只要路口没有抓拍设备，这种笃定就是成立的。',
      kk: 'Тыйым салушы белгіде өту маңдай немесе бүйір соққысымен аяқталады — бұл ең ауыр соқтығыстар. Қызыл жарықта өтетіндер мұны кездейсоқ емес, күн сайын жасайды, өйткені ешкім көрмейді деп сенімді. Қиылыста тіркеу болмағанша, бұл сенім негізді.',
      be: 'Праезд на забараняльны сігнал заканчваецца франтальным або бакавым ударам — самымі цяжкімі з усіх. Тыя, хто праскоквае на чырвонае, робяць гэта не выпадкова, а штодня, бо ўпэўнены: ніхто не ўбачыць. Пакуль на скрыжаванні няма фіксацыі, гэтая ўпэўненасць апраўданая.',
    },
    solution: {
      ru: 'Комплекс синхронизируется с фазами светофора и фиксирует пересечение стоп-линии на запрещающий сигнал: кадр до линии, кадр после, видеофрагмент и распознанный номер — материал, к которому нечего предъявить. Один комплекс закрывает направления перекрёстка сразу и работает без оператора круглосуточно. Ставится на существующие опоры, а передачу данных в ваши реестры мы берём на себя.',
      uz: 'Majmua svetofor fazalari bilan sinxronlanadi va taqiqlovchi signalda stop-chiziqni kesib oʻtishni qayd etadi: chiziqqacha kadr, undan keyin kadr, video parcha va tanilgan raqam — daʼvo qilib boʻlmaydigan material. Bitta majmua chorrahaning yoʻnalishlarini bir vaqtda yopadi va operatorsiz kechayu kunduz ishlaydi. Mavjud ustunlarga oʻrnatiladi, maʼlumotlarni sizning reyestrlaringizga uzatishni biz oʻz zimmamizga olamiz.',
      en: 'The system syncs with the traffic light phases and records every crossing of the stop line on a prohibiting signal: a frame before the line, a frame after, a video clip and the recognised plate — evidence that leaves nothing to argue with. One unit covers several approaches to the intersection at once and runs unattended around the clock. It mounts on existing poles, and we handle the data transfer into your registries.',
      uk: 'Комплекс синхронізується з фазами світлофора й фіксує перетин стоп-лінії на заборонний сигнал: кадр до лінії, кадр після, відеофрагмент і розпізнаний номер — матеріал, до якого немає що пред’явити. Один комплекс закриває напрямки перехрестя одразу й працює без оператора цілодобово. Встановлюється на наявні опори, а передачу даних до ваших реєстрів ми беремо на себе.',
      zh: '系统与信号灯相位同步，记录在禁行信号下越过停止线的全过程：越线前一帧、越线后一帧、视频片段以及识别出的车牌——证据无可辩驳。一套设备可同时覆盖路口多个方向，全天候无人值守运行。可安装在现有立杆上，数据接入贵方系统由我们负责。',
      kk: 'Кешен бағдаршам фазаларымен синхрондалады және тыйым салушы белгіде тоқтау сызығын кесіп өтуді тіркейді: сызыққа дейінгі кадр, одан кейінгі кадр, бейне үзінді және танылған нөмір — дау айтуға болмайтын материал. Бір кешен қиылыстың бағыттарын бірден жабады және операторсыз тәулік бойы жұмыс істейді. Бар тіректерге орнатылады, деректерді сіздің тізілімдеріңізге беруді біз өз мойнымызға аламыз.',
      be: 'Комплекс сінхранізуецца з фазамі святлафора і фіксуе перасячэнне стоп-лініі на забараняльны сігнал: кадр да лініі, кадр пасля, відэафрагмент і распазнаны нумар — матэрыял, да якога няма што прад’явіць. Адзін комплекс закрывае напрамкі скрыжавання адразу і працуе без аператара кругласутачна. Ставіцца на існуючыя апоры, а перадачу даных у вашы рэестры мы бяром на сябе.',
    },
  },

  parking: {
    problem: {
      ru: 'Машины во втором ряду и на тротуарах сужают проезжую часть и выталкивают пешеходов на дорогу. В час пик одна такая улица встаёт целиком. Эвакуатор приезжает через сорок минут, нарушитель уезжает через пять — и завтра встаёт на то же место, потому что ничего не произошло.',
      uz: 'Ikkinchi qatorda va yoʻlkalarda turgan avtomobillar yoʻlni toraytiradi va piyodalarni yoʻlga chiqishga majbur qiladi. Tirbandlik vaqtida bunday koʻcha butunlay toʻxtaydi. Evakuator qirq daqiqada keladi, qoidabuzar besh daqiqada ketadi — ertaga esa yana oʻsha joyga turadi, chunki hech narsa boʻlmadi.',
      en: 'Cars in the second row and on pavements narrow the roadway and push pedestrians into traffic. At rush hour a single street like this stops completely. The tow truck arrives in forty minutes, the offender leaves in five — and parks in the same spot tomorrow, because nothing happened.',
      uk: 'Машини в другому ряду й на тротуарах звужують проїзну частину та виштовхують пішоходів на дорогу. У годину пік одна така вулиця стає повністю. Евакуатор приїжджає через сорок хвилин, порушник їде через п’ять — і завтра стає на те саме місце, бо нічого не сталося.',
      zh: '二排停车和人行道违停挤占车道，把行人逼上马路。高峰时段，一条这样的街道会彻底瘫痪。拖车四十分钟后才到，违停者五分钟就开走了——明天照旧停在原处，因为什么也没有发生。',
      kk: 'Екінші қатардағы және тротуардағы көліктер жол бөлігін тарылтып, жаяу жүргіншілерді жолға шығарады. Кептеліс кезінде мұндай көше толығымен тұрып қалады. Эвакуатор қырық минуттан кейін келеді, бұзушы бес минутта кетеді — ертең сол жерге қайта тұрады, өйткені ештеңе болмады.',
      be: 'Машыны ў другім радзе і на тратуарах звужаюць праезную частку і выштурхваюць пешаходаў на дарогу. У гадзіну пік адна такая вуліца становіцца цалкам. Эвакуатар прыязджае праз сорак хвілін, парушальнік з’язджае праз пяць — і заўтра становіцца на тое ж месца, бо нічога не адбылося.',
    },
    solution: {
      ru: 'Комплекс сам видит транспорт в зоне контроля, засекает время стоянки, распознаёт номер и формирует материал о нарушении — без инспектора и без эвакуатора. Одна точка закрывает целый участок улицы и работает круглосуточно, включая ночь и непогоду. Улица разгружается уже в первые недели: люди перестают парковаться там, где фиксация неотвратима, а не там, где сегодня нет наряда.',
      uz: 'Majmua nazorat zonasidagi transportni oʻzi koʻradi, turish vaqtini belgilaydi, raqamni taniydi va qoidabuzarlik haqidagi materialni shakllantiradi — inspektorsiz va evakuatorsiz. Bitta nuqta butun koʻcha uchastkasini yopadi va kechasi hamda yomon ob-havoda ham kechayu kunduz ishlaydi. Koʻcha dastlabki haftalardayoq boʻshaydi: odamlar qayd etish muqarrar boʻlgan joyda toʻxtashni bas qiladi.',
      en: 'The system sees vehicles in the controlled zone by itself, measures how long they stay, reads the plate and prepares the violation record — no inspector, no tow truck. A single installation covers a whole stretch of street and works around the clock, at night and in bad weather. The street clears within the first weeks: people stop parking where enforcement is certain, rather than where no patrol happens to be today.',
      uk: 'Комплекс сам бачить транспорт у зоні контролю, фіксує час стоянки, розпізнає номер і формує матеріал про порушення — без інспектора та евакуатора. Одна точка закриває цілу ділянку вулиці й працює цілодобово, включно з ніччю та негодою. Вулиця розвантажується вже в перші тижні: люди перестають паркуватися там, де фіксація невідворотна.',
      zh: '系统自动识别管控区内的车辆，记录停放时长，读取车牌并生成违法材料——无需交警，无需拖车。一个点位即可覆盖整条街道，昼夜及恶劣天气均可运行。数周之内街道即可恢复通畅：当处罚变得确定无疑，司机自然不再违停。',
      kk: 'Кешен бақылау аймағындағы көлікті өзі көреді, тұрақ уақытын белгілейді, нөмірін таниды және бұзушылық туралы материалды жасайды — инспекторсыз және эвакуаторсыз. Бір нүкте бүкіл көше учаскесін жабады және түнде де, қолайсыз ауа райында да тәулік бойы жұмыс істейді. Көше алғашқы апталарда-ақ босайды.',
      be: 'Комплекс сам бачыць транспарт у зоне кантролю, фіксуе час стаянкі, распазнае нумар і фарміруе матэрыял пра парушэнне — без інспектара і эвакуатара. Адзін пункт закрывае цэлы ўчастак вуліцы і працуе кругласутачна, уключаючы ноч і непагадзь. Вуліца разгружаецца ўжо ў першыя тыдні.',
    },
  },

  railwayCrossings: {
    problem: {
      ru: 'Переезд — единственное место на дороге, где ошибка одного водителя стоит не его машины, а состава и десятков жизней. Выезд на запрещающий сигнал и проезд без остановки у знака STOP случаются здесь каждый день и заканчиваются катастрофой ровно один раз. После неё вопрос «почему не поставили фиксацию» задают уже другим тоном.',
      uz: 'Kesishma — yoʻldagi yagona joy, bu yerda bitta haydovchining xatosi uning mashinasiga emas, poyezd va oʻnlab hayotlarga tushadi. Taqiqlovchi signalda chiqish va STOP belgisida toʻxtamay oʻtish bu yerda har kuni sodir boʻladi va faqat bir marta halokat bilan tugaydi. Undan keyin «nega qayd etish oʻrnatilmagan» degan savol boshqa ohangda beriladi.',
      en: 'A level crossing is the one place on the road where one driver’s mistake costs not his car but a train and dozens of lives. Entering on a prohibiting signal and passing a STOP sign without stopping happen here every day and end in disaster exactly once. After that, the question “why was there no enforcement” is asked in a very different tone.',
      uk: 'Переїзд — єдине місце на дорозі, де помилка одного водія коштує не його машини, а составу й десятків життів. Виїзд на заборонний сигнал і проїзд без зупинки біля знака STOP трапляються тут щодня й закінчуються катастрофою рівно один раз. Після неї питання «чому не поставили фіксацію» ставлять уже іншим тоном.',
      zh: '道口是道路上唯一一处：一名司机的失误付出的代价不是他的车，而是一列火车和数十条生命。闯禁行信号、遇 STOP 标志不停车在这里每天都在发生，而酿成灾难只需一次。事后，“为什么没有装抓拍设备”这个问题的语气会截然不同。',
      kk: 'Өткел — жолдағы жалғыз орын, мұнда бір жүргізушінің қатесі оның көлігіне емес, құрамға және ондаған өмірге түседі. Тыйым салушы белгіде шығу және STOP белгісінде тоқтамай өту мұнда күн сайын болады және дәл бір рет апатпен аяқталады.',
      be: 'Пераезд — адзінае месца на дарозе, дзе памылка аднаго кіроўцы каштуе не яго машыны, а саставу і дзясяткаў жыццяў. Выезд на забараняльны сігнал і праезд без прыпынку каля знака STOP здараюцца тут штодня і заканчваюцца катастрофай роўна адзін раз.',
    },
    solution: {
      ru: 'Комплекс контролирует переезд круглосуточно: фиксирует выезд на запрещающий сигнал и проезд без остановки у стоп-линии, сохраняет фото, видео и распознанный номер. Переезд обычно стоит в поле, поэтому это принципиально: корпус IP66, работа от −40 °C до +60 °C, без обслуживания на месте, срок службы 5 лет. Здесь комплекс окупается не суммой штрафов, а тем, что не произошло.',
      uz: 'Majmua kesishmani kechayu kunduz nazorat qiladi: taqiqlovchi signalda chiqishni va stop-chiziqda toʻxtamay oʻtishni qayd etadi, foto, video va tanilgan raqamni saqlaydi. Kesishma odatda dala oʻrtasida boʻladi, shuning uchun bu muhim: IP66 korpus, −40 °C dan +60 °C gacha ishlash, joyida xizmat koʻrsatishsiz, xizmat muddati 5 yil. Bu yerda majmua jarimalar summasi bilan emas, sodir boʻlmagan halokat bilan oʻzini oqlaydi.',
      en: 'The system watches the crossing around the clock: it records entry on a prohibiting signal and passing the stop line without stopping, storing photo, video and the recognised plate. Crossings usually stand out in open country, which makes this decisive: IP66 housing, operation from −40 °C to +60 °C, no on-site servicing, 5-year service life. Here the system pays for itself not through fines but through the accident that never happened.',
      uk: 'Комплекс контролює переїзд цілодобово: фіксує виїзд на заборонний сигнал і проїзд без зупинки біля стоп-лінії, зберігає фото, відео та розпізнаний номер. Переїзд зазвичай стоїть у полі, тому це принципово: корпус IP66, робота від −40 °C до +60 °C, без обслуговування на місці, термін служби 5 років. Тут комплекс окупається не сумою штрафів, а тим, що не сталося.',
      zh: '系统全天候监控道口：记录闯禁行信号以及在停止线前不停车通过的行为，保存照片、视频和识别出的车牌。道口通常位于旷野，因此这一点至关重要：IP66 外壳，−40 °C 至 +60 °C 运行，无需现场维护，使用寿命 5 年。在这里，设备的价值不在于罚款金额，而在于那场没有发生的事故。',
      kk: 'Кешен өткелді тәулік бойы бақылайды: тыйым салушы белгіде шығуды және тоқтау сызығында тоқтамай өтуді тіркейді, фото, бейне және танылған нөмірді сақтайды. Өткел әдетте далада тұрады, сондықтан бұл маңызды: IP66 корпус, −40 °C-тан +60 °C-қа дейін жұмыс, орнында қызмет көрсетусіз, қызмет мерзімі 5 жыл.',
      be: 'Комплекс кантралюе пераезд кругласутачна: фіксуе выезд на забараняльны сігнал і праезд без прыпынку каля стоп-лініі, захоўвае фота, відэа і распазнаны нумар. Пераезд звычайна стаіць у полі, таму гэта прынцыпова: корпус IP66, праца ад −40 °C да +60 °C, без абслугоўвання на месцы, тэрмін службы 5 гадоў.',
    },
  },

  buss: {
    problem: {
      ru: 'Выделенная полоса имеет смысл ровно до тех пор, пока по ней едет кто попало. Автобус встаёт в общий поток, расписание рассыпается, люди возвращаются в личные машины — и город получает ещё больше пробок, уже заплатив за разметку и знаки. Полоса, которую никто не контролирует, работает против города.',
      uz: 'Ajratilgan yoʻlak faqat unda kim popa yurmaguncha maʼnoga ega. Avtobus umumiy oqimga tushadi, jadval buziladi, odamlar shaxsiy mashinalarga qaytadi — shahar esa belgilash va belgilarga pul toʻlab boʻlib, yana koʻproq tirbandlik oladi. Hech kim nazorat qilmaydigan yoʻlak shaharga qarshi ishlaydi.',
      en: 'A dedicated lane makes sense only as long as it is not used by everyone. The bus joins the general traffic, the timetable falls apart, people go back to their cars — and the city gets even more congestion, having already paid for the markings and signs. A lane nobody enforces works against the city.',
      uk: 'Виділена смуга має сенс рівно доти, доки нею їде не будь-хто. Автобус стає в загальний потік, розклад розсипається, люди повертаються в особисті машини — і місто отримує ще більше заторів, уже заплативши за розмітку та знаки. Смуга, яку ніхто не контролює, працює проти міста.',
      zh: '公交专用道只有在别人不占用时才有意义。公交车汇入普通车流，时刻表随之崩溃，市民重新开回私家车——城市在为标线和标志付费之后，反而更加拥堵。无人监管的专用道，实际上是在与城市作对。',
      kk: 'Бөлінген жолақ онда кім көрінген жүрмегенше ғана мағыналы. Автобус жалпы ағынға түседі, кесте бұзылады, адамдар жеке көліктеріне қайтады — қала таңбалау мен белгілерге ақы төлеп қойып, одан да көп кептеліс алады.',
      be: 'Вылучаная паласа мае сэнс роўна датуль, пакуль па ёй едзе не хто папала. Аўтобус становіцца ў агульны паток, расклад рассыпаецца, людзі вяртаюцца ў асабістыя машыны — і горад атрымлівае яшчэ больш затораў, ужо заплаціўшы за разметку і знакі.',
    },
    solution: {
      ru: 'Комплекс W-Space A фиксирует каждый выезд на полосу «А» с фото, видео и распознанным номером, отличая общественный транспорт от личного. Полоса начинает работать так, как задумывалась: автобусы идут по расписанию, а пассажиры возвращаются в общественный транспорт. Оборудование сертифицировано и поставляется под ключ — от проекта размещения до передачи данных в ваши системы.',
      uz: 'W-Space A majmuasi «A» yoʻlagiga har bir chiqishni foto, video va tanilgan raqam bilan qayd etadi, jamoat transportini shaxsiydan farqlaydi. Yoʻlak oʻylanganidek ishlay boshlaydi: avtobuslar jadval boʻyicha yuradi, yoʻlovchilar jamoat transportiga qaytadi. Jihoz sertifikatlangan va kalit topshirish sharti bilan yetkaziladi — joylashtirish loyihasidan tortib maʼlumotlarni sizning tizimlaringizga uzatishgacha.',
      en: 'The W-Space A system records every entry into lane “A” with photo, video and the recognised plate, telling public transport apart from private cars. The lane starts doing what it was built for: buses keep to the timetable and passengers come back to public transport. The equipment is certified and delivered turnkey — from the siting design to the data feed into your systems.',
      uk: 'Комплекс W-Space A фіксує кожен виїзд на смугу «А» з фото, відео та розпізнаним номером, відрізняючи громадський транспорт від особистого. Смуга починає працювати так, як задумувалася: автобуси йдуть за розкладом, а пасажири повертаються в громадський транспорт. Обладнання сертифіковане й постачається під ключ.',
      zh: 'W-Space A 系统对每一次驶入“A”车道的行为进行抓拍，提供照片、视频和识别车牌，并区分公共交通与私家车。专用道由此回归本义：公交准点运行，乘客重新回到公共交通。设备已通过认证，交钥匙交付——从选址设计到接入贵方系统的数据传输。',
      kk: 'W-Space A кешені «А» жолағына әр шығуды фото, бейне және танылған нөмірмен тіркейді, қоғамдық көлікті жекеден ажыратады. Жолақ ойластырылғандай жұмыс істей бастайды: автобустар кесте бойынша жүреді, жолаушылар қоғамдық көлікке қайтады. Жабдық сертификатталған және кілт тапсыру шартымен жеткізіледі.',
      be: 'Комплекс W-Space A фіксуе кожны выезд на паласу «А» з фота, відэа і распазнаным нумарам, адрозніваючы грамадскі транспарт ад асабістага. Паласа пачынае працаваць так, як задумвалася: аўтобусы ідуць па раскладзе, а пасажыры вяртаюцца ў грамадскі транспарт. Абсталяванне сертыфікаванае і пастаўляецца пад ключ.',
    },
  },
};

const content = await file.read();
let updated = 0;

for (const solution of content.VIOLATION_SOLUTIONS) {
  const texts = TEXTS[solution.id];
  if (!texts) {
    console.log(`  пропущено (нет текста): ${solution.id}`);
    continue;
  }
  solution.problem = { ...solution.problem, ...texts.problem };
  solution.solution = { ...solution.solution, ...texts.solution };
  updated += 1;
  console.log(`  обновлено: ${solution.id}`);
}

file.write(content);
console.log(`\nГотово. Решений обновлено: ${updated}. Резервная копия — в server/data/backups/.`);
