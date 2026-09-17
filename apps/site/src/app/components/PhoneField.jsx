// ---------------------------------------------------------------------------
// Поля контактов: телефон с кодом страны и проверка адреса почты.
//
// Правила номеров у каждой страны свои — где-то девять цифр, где-то
// одиннадцать, а в некоторых странах длина зависит от оператора. Писать
// такую таблицу руками бессмысленно: она устаревает и всегда с ошибками.
// Поэтому берём libphonenumber-js — ту же базу правил, что использует
// Google в Android.
//
// Названия стран не храним вовсе: их даёт сам браузер через Intl.DisplayNames,
// причём на языке, который выбран на сайте.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  getExampleNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';

// Флаг страны — это две буквы её кода, сдвинутые в область символов-флагов.
// Отдельные картинки для двухсот сорока стран не нужны.
function flagOf(country) {
  return country.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Сколько цифр в номере этой страны — берём из примера номера.
export function digitsFor(country) {
  try {
    const example = getExampleNumber(country, examples);
    return example ? example.nationalNumber.length : 0;
  } catch { return 0; }
}

export function countryList(language) {
  let names = null;
  try { names = new Intl.DisplayNames([language || 'ru'], { type: 'region' }); } catch { /* браузер постарше */ }
  return getCountries()
    .map((code) => ({
      code,
      flag: flagOf(code),
      dial: `+${getCountryCallingCode(code)}`,
      name: (names && names.of(code)) || code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, language || 'ru'));
}

// Проверка адреса почты. Без фанатизма: одна собака, точка в домене,
// никаких пробелов. Более строгая проверка отсекает живые адреса.
export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

// Полный номер в международном виде (+998901234567) или пустая строка.
export function phoneValue(country, national) {
  const parsed = parsePhoneNumberFromString(String(national || ''), country);
  return parsed && parsed.isValid() ? parsed.number : '';
}

export function isPhoneValid(country, national) {
  return Boolean(phoneValue(country, national));
}

// ---------------------------------------------------------------------------

export default function PhoneField({
  country,
  onCountryChange,
  value,
  onChange,
  language = 'ru',
  placeholder = '',
  inputClassName = '',
  labels = {},
}) {
  const [touched, setTouched] = useState(false);
  const countries = useMemo(() => countryList(language), [language]);
  const expected = digitsFor(country);
  const digits = String(value || '').replace(/\D/g, '').length;
  const valid = isPhoneValid(country, value);

  // Пока человек печатает, показываем номер так, как его принято писать
  // в выбранной стране: 90 123 45 67, а не сплошной строкой.
  const handleInput = (raw) => {
    const onlyDigits = String(raw).replace(/\D/g, '');
    // Лишние цифры просто не принимаем — подсказка снизу объясняет, сколько нужно.
    const limited = expected ? onlyDigits.slice(0, Math.max(expected, digits)) : onlyDigits;
    const shown = new AsYouType(country).input(limited);
    // Наверх отдаём и то, что видит человек, и готовый международный номер.
    // Так форме не нужно тянуть базу правил ради одной проверки.
    onChange(shown, phoneValue(country, shown));
  };

  return (
    <div>
      <div className="flex gap-2">
        {/* Список стран — обычный select: он одинаково работает на телефоне,
            где открывается родным колесом выбора, и на компьютере. */}
        <div className="relative shrink-0">
          <select
            value={country}
            onChange={(e) => { onCountryChange(e.target.value); onChange('', ''); }}
            className={`${inputClassName} w-[104px] appearance-none pr-7`}
            aria-label={labels.country || 'Страна'}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          className={`${inputClassName} min-w-0 flex-1`}
        />
      </div>

      {/* Подсказка меняется по ходу набора: сначала сколько цифр нужно,
          потом — всё ли в порядке. */}
      <div className="mt-1 text-[11px]">
        {digits === 0 && expected > 0 && (
          <span className="text-slate-500">
            {(labels.hint || 'Цифр в номере: {n}').replace('{n}', expected)}
          </span>
        )}
        {digits > 0 && !valid && (
          <span className={touched ? 'text-amber-400' : 'text-slate-500'}>
            {(labels.progress || 'Введено {a} из {n}').replace('{a}', digits).replace('{n}', expected || '?')}
          </span>
        )}
        {digits > 0 && valid && (
          <span className="text-emerald-400">{labels.ok || 'Номер верный'}</span>
        )}
      </div>
    </div>
  );
}
