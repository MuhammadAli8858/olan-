// ---------------------------------------------------------------------------
// Выбор картинки: можно загрузить файл с компьютера или вписать путь руками.
//
// Файл уходит на сервер и сохраняется в apps/site/public/products/.
// В контенте остаётся короткий путь вида /products/имя.png — такой же,
// как раньше при ручном вводе, поэтому ничего в сайте менять не нужно.
// ---------------------------------------------------------------------------

import { useRef, useState } from 'react';
import { Upload, Trash2, Plus, ImageOff, Loader2 } from 'lucide-react';
import { postJson } from '../lib/api.js';

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

// Маленький предпросмотр. Если картинки нет — показываем заглушку.
function Preview({ src }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-black/40 text-slate-600">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className="h-14 w-14 shrink-0 rounded-xl border border-slate-800 bg-black/40 object-cover"
    />
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

// Одна картинка: предпросмотр, поле пути и кнопка загрузки.
export function ImageField({ adminKey, value, onChange, placeholder = '/products/file.png' }) {
  return (
    <div className="flex items-center gap-3">
      <Preview src={value} />
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
      </div>
    </div>
  );
}

// Несколько картинок: список с предпросмотром и загрузкой.
export function ImageListEditor({ adminKey, items, onChange, placeholder = '/products/file.png' }) {
  const list = Array.isArray(items) ? items : [];
  const setAt = (index, value) => onChange(list.map((item, i) => (i === index ? value : item)));
  const removeAt = (index) => onChange(list.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {list.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <Preview src={item} />
          <input
            value={item || ''}
            onChange={(e) => setAt(index, e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-xl border border-cyan-500/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button type="button" onClick={() => removeAt(index)}
            className="shrink-0 rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:border-red-500/40 hover:text-red-400"
            title="Удалить картинку">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <UploadButton adminKey={adminKey} onUploaded={(path) => onChange([...list, path])} compact />
        <button type="button" onClick={() => onChange([...list, ''])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Вписать путь вручную
        </button>
      </div>
    </div>
  );
}
