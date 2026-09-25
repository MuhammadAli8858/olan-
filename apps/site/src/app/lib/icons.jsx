// ---------------------------------------------------------------------------
// Иконки сайта.
//
// Раньше девять компонентов делали `import * as Icons from 'lucide-react'`, и в
// сайт попадали все 1500 иконок — 800 КБ скрипта, из которых нужно около 60.
// Теперь здесь собран список иконок, которые реально используются в контенте
// и в админке. Если в админке впишут иконку не из списка, она всё равно
// появится: полный набор подгрузится отдельным файлом только в этом случае.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award, BadgeCheck, Boxes, Building2, BusFront, Camera, Car, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, CircleDot, ClipboardCheck, Clock, Code2, Cog, Coins, Cpu, Database, ExternalLink, Expand, Eye,
  Factory, FileCode, FileText, Filter, Gauge, Globe, Handshake, HardHat, Headphones, Headset, ImageOff, Info, Landmark, Languages,
  LayoutGrid, LayoutList, Lightbulb, Link2, Lock, Mail, MapPin, Menu, MessageCircle, MessageSquare, MonitorPlay, Moon, Network, Package,
  ParkingCircle, Pause, Phone, Plane, Play, Plug, Quote, Radar, Radio, Route, ScanLine, Search, Send, Shield, ShieldAlert, ShieldCheck,
  ShoppingBag, SquareParking, Sun, Tag, TrafficCone, TrainFront, Truck, Users, Video, Wifi, X,
} from 'lucide-react';

export const ICONS = {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award, BadgeCheck, Boxes, Building2, BusFront, Camera, Car, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, CircleDot, ClipboardCheck, Clock, Code2, Cog, Coins, Cpu, Database, ExternalLink, Expand, Eye,
  Factory, FileCode, FileText, Filter, Gauge, Globe, Handshake, HardHat, Headphones, Headset, ImageOff, Info, Landmark, Languages,
  LayoutGrid, LayoutList, Lightbulb, Link2, Lock, Mail, MapPin, Menu, MessageCircle, MessageSquare, MonitorPlay, Moon, Network, Package,
  ParkingCircle, Pause, Phone, Plane, Play, Plug, Quote, Radar, Radio, Route, ScanLine, Search, Send, Shield, ShieldAlert, ShieldCheck,
  ShoppingBag, SquareParking, Sun, Tag, TrafficCone, TrainFront, Truck, Users, Video, Wifi, X,
};

let full = null;
let pending = null;
function loadFull() {
  if (!pending) pending = import('lucide-react').then((m) => { full = m; return m; });
  return pending;
}

function LazyIcon({ name, ...props }) {
  const [, bump] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!full) loadFull().then(() => { if (alive) bump((n) => n + 1); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const Found = (full && full[name]) || (full ? ICONS.Package : null);
  return Found ? <Found {...props} /> : <span style={{ display: 'inline-block', width: '1em', height: '1em' }} />;
}

const wrappers = new Map();
function resolve(name) {
  if (typeof name !== 'string' || !/^[A-Z][A-Za-z0-9]*$/.test(name)) return undefined;
  if (ICONS[name]) return ICONS[name];
  if (full && full[name]) return full[name];
  if (!wrappers.has(name)) {
    const Wrapper = (props) => <LazyIcon name={name} {...props} />;
    Wrapper.displayName = `Icon(${name})`;
    wrappers.set(name, Wrapper);
  }
  return wrappers.get(name);
}

// Замена `import * as Icons from 'lucide-react'`: Icons[name] работает как раньше.
export const Icons = new Proxy(ICONS, { get: (_, prop) => resolve(prop), has: () => true });

export function Icon({ name, fallback = 'Package', ...props }) {
  const Found = resolve(name) || ICONS[fallback] || ICONS.Package;
  return <Found aria-hidden="true" {...props} />;
}
