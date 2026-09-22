// ---------------------------------------------------------------------------
// Рамки, в которых сайт показывает загруженные картинки.
//
// Сайт вписывает фото в рамку заданной пропорции и обрезает всё, что не
// поместилось (object-cover). Если пропорции картинки и рамки расходятся,
// теряются края: широкий снимок экрана в рамке 4:3 лишается боков.
//
// Размеры взяты из вёрстки сайта, а не придуманы:
//   направления, продукты группы, проекты, профиль компании — aspect-[4/3];
//   приборы — карточка каталога h-60 (от 5:4 до 3:2 в зависимости от
//   ширины экрана), страница решения 4:3, окно прибора — во всю колонку.
// Для приборов 4:3 — лучший компромисс: срез по краям минимальный.
// ---------------------------------------------------------------------------

export const FRAMES = {
  default: {
    width: 1600,
    height: 1200,
    where: '',
  },
  products: {
    width: 1600,
    height: 1200,
    where: 'Показывается в карточке каталога, на странице решения и в окне прибора. '
      + 'Рамка на разных экранах немного разная, поэтому держите прибор в центре, '
      + 'с запасом по краям.',
  },
  projects: {
    width: 1600,
    height: 1200,
    where: 'Карточка проекта в рамке 4:3. По клику фото открывается целиком.',
  },
  directions: {
    width: 1600,
    height: 1200,
    where: 'Справа на странице направления, в рамке 4:3.',
  },
  portfolio: {
    width: 1600,
    height: 1200,
    where: 'На странице продукта в рамке 4:3. По клику открывается целиком.',
  },
  company: {
    width: 1600,
    height: 1200,
    where: 'На страницах разделов «О компании», в рамке 4:3.',
  },
  unused: {
    width: 1600,
    height: 1200,
    where: 'Сейчас этот блок на сайте не выводится — картинку можно не загружать.',
  },
};

// Человеческое название пропорции: 16:9 понятнее, чем 1.78.
const KNOWN = [
  [1, '1:1'], [5 / 4, '5:4'], [4 / 3, '4:3'], [3 / 2, '3:2'], [16 / 10, '16:10'],
  [16 / 9, '16:9'], [2, '2:1'], [21 / 9, '21:9'], [4 / 5, '4:5'], [3 / 4, '3:4'],
  [2 / 3, '2:3'], [9 / 16, '9:16'],
];

export function ratioLabel(width, height) {
  if (!width || !height) return '';
  const ratio = width / height;
  const [value, label] = KNOWN.reduce((best, item) => (
    Math.abs(item[0] - ratio) < Math.abs(best[0] - ratio) ? item : best
  ));
  return Math.abs(value - ratio) / value < 0.03 ? label : ratio.toFixed(2).replace('.', ',') + ':1';
}

// Разбор загруженной картинки против рамки. Возвращает null, если всё
// в порядке, или текст предупреждения, если края обрежутся или фото мелкое.
export function checkAgainstFrame(width, height, frame = FRAMES.default) {
  if (!width || !height) return null;
  const target = frame.width / frame.height;
  const ratio = width / height;
  const notes = [];

  const diff = Math.abs(ratio - target) / target;
  if (diff > 0.08) {
    // Какая доля картинки уйдёт за край рамки.
    const lost = ratio > target ? 1 - target / ratio : 1 - ratio / target;
    const side = ratio > target ? 'слева и справа' : 'сверху и снизу';
    notes.push(
      `пропорции ${ratioLabel(width, height)}, а рамка ${ratioLabel(frame.width, frame.height)} — `
      + `обрежется около ${Math.round(lost * 100)}% ${side}`,
    );
  }

  if (width < frame.width / 2) {
    notes.push(`картинка маленькая, ${width} px по ширине — на большом экране будет нечёткой`);
  }

  return notes.length ? notes.join('; ') : null;
}
