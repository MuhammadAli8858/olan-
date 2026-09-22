// ---------------------------------------------------------------------------
// Выбор картинки: можно загрузить файл с компьютера или вписать путь руками.
//
// Файл уходит на сервер и сохраняется в apps/site/public/products/.
// В контенте остаётся короткий путь вида /products/имя.png — такой же,
// как раньше при ручном вводе, поэтому ничего в сайте менять не нужно.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Plus, ImageOff, Loader2 } from 'lucide-react';
import { postJson, API_BASE_URL } from '../lib/api.js';
import { FRAMES, checkAgainstFrame, ratioLabel } from '../lib/imageFrames.js';

const MAX_MB = 10;

// Читает выбранный файл в строку data:image/...;base64,...
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });
}

// Короткий путь /products/... указывает на сервер, а не на саму админку.
// В продакшене это один и тот же адрес, а при разработке админка открыта
// на порту 9000, а картинки раздаёт сервер на 3001 — без этой поправки
// превью пыталось взять файл у админки и показывало битую иконку.
export function resolveMediaUrl(src) {
  const value = String(src || '');
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return value.startsWith('/') ? `${API_BASE_URL}${value}` : value;
}

// Предпросмотр в той же рамке, что на сайте, и с той же обрезкой.
// Раньше превью было квадратным и не показывало, что сайт срежет по краям.
// Теперь видно ровно то, что увидит посетитель, а реальный размер файла
// передаётся наверх — по нему строится предупреждение.
function Preview({ src, frame = FRAMES.default, onMeasure }) {
  const [broken, setBroken] = useState(false);
  // Новый путь — новая попытка. Раньше одна неудачная загрузка превью
  // запоминалась навсегда, и все следующие картинки тоже выглядели битыми.
  useEffect(() => { setBroken(false); if (onMeasure) onMeasure(null); }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const box = 'h-[72px] shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-black/40';
  const width = Math.round(72 * (frame.width / frame.height));

  if (!src || broken) {
    return (
      <div className={`${box} flex items-center justify-center text-slate-600`} style={{ width }}>
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className={box} style={{ width }} title="Так картинка будет обрезана на сайте">
      <img
        src={resolveMediaUrl(src)}
        alt=""
        onLoad={(e) => onMeasure && onMeasure({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

// Подсказка о нужном размере и, если картинка уже есть, разбор её размеров.
// Сначала — сколько на сколько загружать, затем — какого размера рамка
// на сайте: это те самые «400 × 300», которые видит посетитель.
function SizeHint({ frame = FRAMES.default, size }) {
  const warning = size ? checkAgainstFrame(size.width, size.height, frame) : null;
  const site = Array.isArray(frame.site) ? frame.site : [];
  return (
    <div className="space-y-1 text-[11px] leading-relaxed">
      <div className="text-slate-300">
        Загружайте фото: <b className="text-cyan-300">{frame.width} × {frame.height} px</b>
        {size && <span className="text-slate-500"> · сейчас {size.width} × {size.height} px</span>}
      </div>
      {site.length > 0 && (
        <div className="text-slate-400">
          На сайте рамка:{' '}
          {site.map((s, i) => (
            <span key={s.screen}>
              {i > 0 && ', '}
              <b className="text-slate-200">{s.width} × {s.height} px</b> на экране {s.screen} px
            </span>
          ))}
          . Файл нужен вдвое крупнее рамки — иначе на современных экранах фото будет мыльным.
        </div>
      )}
      {frame.where && <div className="text-slate-500">{frame.where}</div>}
      {warning && <div className="text-amber-400">⚠ {warning}</div>}
      {size && !warning && <div className="text-emerald-400">✓ Размер подходит — фото покажется полностью.</div>}
    </div>
  );
}

// Кнопка «Загрузить с компьютера». Возвращает путь через onUploaded.
export function UploadButton({ adminKey, onUploaded, label = 'Загрузить с компьютера', compact }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) { setError('Это не картинка.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Файл ${(file.size / 1048576).toFixed(1)} МБ — больше ${MAX_MB} МБ.`);
      return;
    }

    setBusy(true); setError('');
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await postJson('/api/admin/upload', { key: adminKey, name: file.name, dataUrl });
      onUploaded(res.path);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить файл.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current && inputRef.current.click()}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 text-cyan-300 transition hover:border-cyan-400 hover:text-white disabled:opacity-50 ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? 'Загружаю…' : label}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </>
  );
}

// Одна картинка: предпросмотр, поле пути, кнопка загрузки и подсказка по размеру.
export function ImageField({ adminKey, value, onChange, placeholder = '/products/file.png', frame = FRAMES.default }) {
  const [size, setSize] = useState(null);
  return (
    <div className="flex items-start gap-3">
      <Preview src={value} frame={frame} onMeasure={setSize} />
      <div className="min-w-0 flex-1 space-y-2">
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-cyan-500/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
        <div className="flex flex-wrap items-center gap-2">
          <UploadButton adminKey={adminKey} onUploaded={onChange} compact />
          {value && (
            <button type="button" onClick={() => onChange('')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-500/40 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" /> Убрать
            </button>
          )}
        </div>
        <SizeHint frame={frame} size={value ? size : null} />
      </div>
    </div>
  );
}

// Несколько картинок: список с предпросмотром и загрузкой.
export function ImageListEditor({ adminKey, items, onChange, placeholder = '/products/file.png', frame = FRAMES.default }) {
  const list = Array.isArray(items) ? items : [];
  const setAt = (index, value) => onChange(list.map((item, i) => (i === index ? value : item)));
  const removeAt = (index) => onChange(list.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <ImageListRow key={index} item={item} frame={frame} placeholder={placeholder}
          onChange={(v) => setAt(index, v)} onRemove={() => removeAt(index)} />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <UploadButton adminKey={adminKey} onUploaded={(path) => onChange([...list, path])} compact />
        <button type="button" onClick={() => onChange([...list, ''])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Вписать путь вручную
        </button>
      </div>
      {/* Общая подсказка — один раз под списком, а у каждой строки
          только разбор её собственного файла. */}
      {list.length === 0 && <SizeHint frame={frame} />}
    </div>
  );
}

// Строка списка: у каждой картинки свой размер, поэтому и разбор свой.
function ImageListRow({ item, frame, placeholder, onChange, onRemove }) {
  const [size, setSize] = useState(null);
  return (
    <div className="flex items-start gap-3">
      <Preview src={item} frame={frame} onMeasure={setSize} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            value={item || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-xl border border-cyan-500/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button type="button" onClick={onRemove}
            className="shrink-0 rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:border-red-500/40 hover:text-red-400"
            title="Удалить картинку">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <SizeHint frame={frame} size={item ? size : null} />
      </div>
    </div>
  );
}
