/**
 * Seed database with demo artists, artworks, halls, keys and provenance.
 * Called via POST /admin/seed-db (protected by SEED_TOKEN).
 */
import crypto from 'node:crypto'
import type { DbClient } from '../db'

// ── Helpers ──

function sha256hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function makeDeterministicId(artistSlug: string, artworkSlug: string): string {
  const hash = sha256hex(`${artistSlug}/${artworkSlug}`)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-7${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {} as Record<string, unknown>)
  return JSON.stringify(sorted)
}

function makeKeyCode(year: number, seed: string): string {
  return `DUO-${year}-${sha256hex(seed).slice(0, 8).toUpperCase()}`
}

function makeOwnerKey(seed: string): string {
  const h = sha256hex(seed).toUpperCase()
  return `X${h.slice(0, 8)}-${h.slice(8, 16)}`
}

function computeIntegrityHash(artworkId: string, keyCode: string, artistId: string, issuedAt: string): string {
  return sha256hex(canonicalJSON({ artworkId, keyCode, artistId, issuedAt }))
}

function computeRecordHash(record: {
  artworkId: string; sequence: number; eventType: string; actor: string
  occurredAt: string; prevRecordHash: string
}): string {
  return sha256hex(canonicalJSON(record))
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `$2b$10$${salt.toString('base64').replace(/=+$/, '')}${key.toString('base64').replace(/=+$/, '')}`
}

const YEAR = new Date().getFullYear()

// ── Poster / Model URLs ──

const POSTER_URLS: Record<string, string> = {
  'cosmic-drift': '/assets/posters/cosmic-drift.jpg',
  'silent-shores': '/assets/posters/silent-shores.jpg',
  'crimson-pulse': '/assets/posters/crimson-pulse.jpg',
  'golden-thread': '/assets/posters/golden-thread.jpg',
  'storm-front': '/assets/posters/storm-front.jpg',
  'embers-of-form': '/assets/posters/embers-of-form.jpg',
  'anatomie-du-reve': '/assets/posters/anatomie-du-reve.jpg',
  'synthetic-garden': '/assets/posters/synthetic-garden.jpg',
  'threshold': '/assets/posters/threshold.jpg',
  'staircase-iii': '/assets/posters/staircase-iii.jpg',
  'winter-palace': '/assets/posters/winter-palace.jpg',
  'found-silence': '/assets/posters/found-silence.jpg',
  'afterimage': '/assets/posters/afterimage.jpg',
  'letters-never-sent': '/assets/posters/letters-never-sent.jpg',
  'map-of-departures': '/assets/posters/map-of-departures.jpg',
  'archive-of-rain': '/assets/posters/archive-of-rain.jpg',
  'fragments-of-light': '/assets/posters/fragments-of-light.jpg',
  'lucid-dream': '/assets/posters/lucid-dream.jpg',
  'hybrid-flora': '/assets/posters/hybrid-flora.jpg',
  'glitch-portrait': '/assets/posters/glitch-portrait.jpg',
  'neon-nocturne': '/assets/posters/data-ghosts.jpg',
  'data-ghosts': '/assets/posters/data-ghosts.jpg',
  'metro-diptych': '/assets/posters/metro-diptych.jpg',
  'frozen-gesture': '/assets/posters/frozen-gesture.svg',
}

const MODEL_URLS: Record<string, string> = {
  // All GLB model files were deleted — no 3D models available
}

// ── Data ──

interface ArtworkData {
  slug: string; titleRu: string; titleEn: string; descriptionRu: string; descriptionEn: string
  year: number; medium: string; dimensions: string; category: string; styleTags: string[]
  mediaType: 'IMAGE_2D' | 'MODEL_3D'; software?: string; isScanned?: boolean
  polyCount?: number; price: number | null; status: string; editionType: string
  extraProvenance?: { type: string; toEmail: string }[]
}

interface ArtistData {
  slug: string; email: string; displayName: string
  bioRu: string; bioEn: string; statementRu: string; statementEn: string
  location: string; websiteUrl: string; tier: string; verified: boolean
  socialLinks: Record<string, string>
  hall: { slug: string; titleRu: string; titleEn: string; descriptionRu: string; descriptionEn: string; coverImageUrl: string }
  artworks: ArtworkData[]
}

const ARTISTS: ArtistData[] = [
  {
    slug: 'elena-volkova', email: 'elena.volkova@duomesh.art', displayName: 'Elena Volkova',
    bioRu: 'Елена Волкова — абстрактный живописец из Санкт-Петербурга. Выпускница Академии Штиглица. Её холсты находятся в частных коллекциях России, Германии и ОАЭ.',
    bioEn: 'Elena Volkova is an abstract painter from St. Petersburg. Graduate of the Stieglitz Academy. Her canvases are held in private collections across Russia, Germany, and the UAE.',
    statementRu: 'Цвет — это не описание, а событие. Каждый холст для меня — поле напряжения между контролем и отпусканием.',
    statementEn: 'Colour is not a description but an event. Each canvas for me is a field of tension between control and release.',
    location: 'Санкт-Петербург, Россия', websiteUrl: 'https://elenavolkova.art', tier: 'GALLERY', verified: true,
    socialLinks: { instagram: '@volkova_abstract', telegram: '@evolkova' },
    hall: { slug: 'volkova-gallery', titleRu: 'Зал Волковой', titleEn: 'Volkova Gallery', descriptionRu: 'Пространство цвета и жеста. Избранные работы 2020–2026.', descriptionEn: 'A space of colour and gesture. Selected abstract works from 2020–2026.', coverImageUrl: '' },
    artworks: [
      { slug: 'cosmic-drift', titleRu: 'Космический дрейф', titleEn: 'Cosmic Drift', descriptionRu: 'Масштабное полотно, вдохновлённое туманностью Ориона.', descriptionEn: 'A large-scale canvas inspired by the Orion Nebula.', year: 2025, medium: 'Холст, акрил', dimensions: '180×240 см', category: 'PAINTING', styleTags: ['abstract', 'colour field', 'gestural'], mediaType: 'IMAGE_2D', price: 4500, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'silent-shores', titleRu: 'Тихие берега', titleEn: 'Silent Shores', descriptionRu: 'Минималистичная работа на стыке абстракции и пейзажа.', descriptionEn: 'A minimalist work at the intersection of abstraction and landscape.', year: 2024, medium: 'Холст, масло', dimensions: '120×150 см', category: 'PAINTING', styleTags: ['abstract', 'minimalist', 'landscape'], mediaType: 'IMAGE_2D', price: 3200, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
      { slug: 'crimson-pulse', titleRu: 'Пульс кармина', titleEn: 'Crimson Pulse', descriptionRu: 'Динамическая композиция на ритмических ударах красного.', descriptionEn: 'A dynamic composition built on rhythmic strikes of red.', year: 2026, medium: 'Холст, акрил, пастель', dimensions: '150×150 см', category: 'PAINTING', styleTags: ['abstract', 'expressive', 'gestural'], mediaType: 'IMAGE_2D', price: 5200, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector1@duomesh.art' }] },
      { slug: 'golden-thread', titleRu: 'Золотая нить', titleEn: 'Golden Thread', descriptionRu: 'Медитативная работа с тончайшими золотыми линиями.', descriptionEn: 'A meditative work with the finest gold lines.', year: 2023, medium: 'Холст, смешанная техника', dimensions: '100×130 см', category: 'MIXED_MEDIA', styleTags: ['abstract', 'meditative', 'mixed media'], mediaType: 'IMAGE_2D', price: 2800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'storm-front', titleRu: 'Фронт бури', titleEn: 'Storm Front', descriptionRu: 'Крупный формат, передающий напряжение перед грозой.', descriptionEn: 'A large format conveying the tension before a thunderstorm.', year: 2025, medium: 'Холст, масло', dimensions: '200×200 см', category: 'PAINTING', styleTags: ['abstract', 'atmospheric', 'large-scale'], mediaType: 'IMAGE_2D', price: 6800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'embers-of-form', titleRu: 'Тлеющая форма', titleEn: 'Embers of Form', descriptionRu: 'Тлеющие угли цвета на чёрном поле с едва заметной геометрией.', descriptionEn: 'Smouldering embers of colour on a black field.', year: 2026, medium: 'Холст, акрил, уголь', dimensions: '140×180 см', category: 'PAINTING', styleTags: ['abstract', 'dark', 'geometric'], mediaType: 'IMAGE_2D', price: 5900, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'maxim-drozdov', email: 'maxim.drozdov@duomesh.art', displayName: 'Maxim Drozdov',
    bioRu: 'Максим Дроздов — цифровой художник-сюрреалист из Берлина. Выпускник программы New Media в Университете искусств Берлина.',
    bioEn: 'Maxim Drozdov is a digital surrealist artist based in Berlin. Graduate of the New Media programme at Berlin University of the Arts.',
    statementRu: 'Сюрреализм — не фантазия, а обострённая реальность. Мои работы начинаются с данных.',
    statementEn: 'Surrealism is not fantasy but heightened reality. My works begin with data.',
    location: 'Берлин, Германия', websiteUrl: 'https://drozdov.studio', tier: 'PRO', verified: true,
    socialLinks: { instagram: '@drozdov_digital', website: 'https://drozdov.studio' },
    hall: { slug: 'drozdov-lab', titleRu: 'Лаборатория Дроздова', titleEn: 'Drozdov Lab', descriptionRu: 'Цифровой сюрреализм на границе кода и воображения.', descriptionEn: 'Digital surrealism at the border of code and imagination.', coverImageUrl: '/assets/posters/anatomie-du-reve.jpg' },
    artworks: [
      { slug: 'neon-nocturne', titleRu: 'Неоновый ноктюрн', titleEn: 'Neon Nocturne', descriptionRu: 'Анатомические формы встречаются с неоновой геометрией киберпанка.', descriptionEn: 'Anatomical forms meet cyberpunk neon geometry.', year: 2025, medium: 'Цифровая живопись, печать на алюминии', dimensions: '90×120 см', category: 'DIGITAL', styleTags: ['surreal', 'cyberpunk', 'digital'], mediaType: 'IMAGE_2D', price: 2400, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'data-ghosts', titleRu: 'Призраки данных', titleEn: 'Data Ghosts', descriptionRu: 'Генеративная работа, визуализирующая удалённые твиты.', descriptionEn: 'A generative work visualising deleted tweets.', year: 2026, medium: 'Генеративное искусство, печать на Hahnemühle', dimensions: '100×100 см', category: 'DIGITAL', styleTags: ['surreal', 'generative', 'conceptual'], mediaType: 'IMAGE_2D', price: 3100, status: 'IN_EXHIBITION', editionType: 'LIMITED' },
      { slug: 'anatomie-du-reve', titleRu: 'Анатомия сна', titleEn: 'Anatomie du Rêve', descriptionRu: 'Ренессансная анатомия с глитч-эстетикой.', descriptionEn: 'Renaissance anatomy with glitch aesthetics.', year: 2024, medium: 'Цифровая живопись, печать на холсте', dimensions: '120×160 см', category: 'DIGITAL', styleTags: ['surreal', 'anatomical', 'glitch'], mediaType: 'IMAGE_2D', price: 2800, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector2@duomesh.art' }] },
      { slug: 'synthetic-garden', titleRu: 'Синтетический сад', titleEn: 'Synthetic Garden', descriptionRu: 'Ботаническая фантазия, каждый лист сгенерирован нейросетью.', descriptionEn: 'A botanical fantasy, each leaf generated by a neural network.', year: 2026, medium: 'AI-ассистированная цифровая живопись', dimensions: '150×150 см', category: 'DIGITAL', styleTags: ['surreal', 'botanical', 'AI-assisted'], mediaType: 'IMAGE_2D', price: 4200, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'threshold', titleRu: 'Порог', titleEn: 'Threshold', descriptionRu: 'Фотограмметрический скан студии, растворённый в волнах глитча.', descriptionEn: 'A photogrammetric scan of the studio dissolved in glitch waves.', year: 2025, medium: 'Фотограмметрия, цифровая обработка', dimensions: '200×130 см', category: 'DIGITAL', styleTags: ['surreal', 'photogrammetry', 'glitch'], mediaType: 'IMAGE_2D', price: 5600, status: 'LISTED', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'anna-sokolova', email: 'anna.sokolova@duomesh.art', displayName: 'Anna Sokolova',
    bioRu: 'Анна Соколова — фотограф из Москвы, выпускница Школы Родченко. Снимает на среднеформатную плёнку.',
    bioEn: 'Anna Sokolova is a photographer from Moscow, graduate of the Rodchenko School. Shoots medium-format film.',
    statementRu: 'Фотография — это не запечатление, а извлечение. Я проявляю не изображение, а время.',
    statementEn: 'Photography is not capture but extraction. I develop not the image but the time.',
    location: 'Москва, Россия', websiteUrl: '', tier: 'PRO', verified: true,
    socialLinks: { instagram: '@sokolova_darkroom' },
    hall: { slug: 'sokolova-chamber', titleRu: 'Камера Соколовой', titleEn: 'Sokolova Chamber', descriptionRu: 'Монохромная фотография на границе документа и абстракции.', descriptionEn: 'Monochrome photography at the boundary of document and abstraction.', coverImageUrl: '' },
    artworks: [
      { slug: 'staircase-iii', titleRu: 'Лестница III', titleEn: 'Staircase III', descriptionRu: 'Винтовая лестница модернистского здания как абстрактная геометрия.', descriptionEn: 'A spiral staircase as abstract geometry of light and shadow.', year: 2024, medium: 'Серебряно-желатиновый отпечаток', dimensions: '60×80 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'architectural', 'abstract'], mediaType: 'IMAGE_2D', price: 1800, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'winter-palace', titleRu: 'Безлюдный Эрмитаж', titleEn: 'Winter Palace', descriptionRu: 'Пустые залы Эрмитажа до открытия. Свет и тишина как главные герои.', descriptionEn: 'Empty Hermitage halls before opening. Light and silence as protagonists.', year: 2023, medium: 'Серебряно-желатиновый отпечаток', dimensions: '80×80 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'architectural', 'documentary'], mediaType: 'IMAGE_2D', price: 2200, status: 'IN_EXHIBITION', editionType: 'LIMITED' },
      { slug: 'found-silence', titleRu: 'Найденная тишина', titleEn: 'Found Silence', descriptionRu: 'Натюрморт из забытых предметов в заброшенной мастерской.', descriptionEn: 'A still life of forgotten objects in an abandoned workshop.', year: 2025, medium: 'Пигментная печать', dimensions: '70×90 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'still life', 'atmospheric'], mediaType: 'IMAGE_2D', price: 1500, status: 'LISTED', editionType: 'OPEN' },
      { slug: 'metro-diptych', titleRu: 'Метро (диптих)', titleEn: 'Metro Diptych', descriptionRu: 'Московское метро: утренний час пик и ночная пустота.', descriptionEn: 'Moscow Metro: morning rush and nighttime emptiness.', year: 2026, medium: 'Серебряно-желатиновые отпечатки', dimensions: '50×70 см (каждая)', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'urban', 'diptych'], mediaType: 'IMAGE_2D', price: 3500, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'afterimage', titleRu: 'Послесвечение', titleEn: 'Afterimage', descriptionRu: 'Многократная экспозиция: портрет, растворённый в архитектуре.', descriptionEn: 'Multiple exposure: a portrait dissolved into architectural space.', year: 2026, medium: 'Пигментная печать', dimensions: '90×110 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'experimental', 'portrait'], mediaType: 'IMAGE_2D', price: 2600, status: 'LISTED', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'daria-lys', email: 'daria.lys@duomesh.art', displayName: 'Daria Lys',
    bioRu: 'Дарья Лыс — художница смешанной техники из Киева. Работает с печатной графикой и найденными объектами.',
    bioEn: 'Daria Lys is a mixed-media artist from Kyiv. Works with printmaking and found objects.',
    statementRu: 'Я работаю с тем, что было выброшено: старые книги, карты, билеты, письма.',
    statementEn: 'I work with what has been discarded: old books, maps, tickets, letters.',
    location: 'Киев, Украина', websiteUrl: 'https://daria-lys.art', tier: 'FREE', verified: false,
    socialLinks: { instagram: '@lys_print' },
    hall: { slug: 'lys-atelier', titleRu: 'Ателье Лыс', titleEn: 'Lys Atelier', descriptionRu: 'Смешанная техника, печатная графика и найденные объекты.', descriptionEn: 'Mixed media, printmaking, and found objects.', coverImageUrl: '' },
    artworks: [
      { slug: 'letters-never-sent', titleRu: 'Письма, которых не было', titleEn: 'Letters Never Sent', descriptionRu: 'Коллаж из фрагментов писем 1940-х и ручной печати.', descriptionEn: 'Collage of 1940s letter fragments and hand-printing.', year: 2025, medium: 'Коллаж, линогравюра', dimensions: '60×80 см', category: 'MIXED_MEDIA', styleTags: ['contemporary', 'collage', 'found objects'], mediaType: 'IMAGE_2D', price: 1200, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'map-of-departures', titleRu: 'Карта убытий', titleEn: 'Map of Departures', descriptionRu: 'Старая карта с трафаретной печатью маршрутов, которых больше нет.', descriptionEn: 'An old map overlaid with routes that no longer exist.', year: 2024, medium: 'Трафаретная печать, найденная карта', dimensions: '90×120 см', category: 'PRINT', styleTags: ['contemporary', 'printmaking', 'conceptual'], mediaType: 'IMAGE_2D', price: 1600, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector3@duomesh.art' }] },
      { slug: 'archive-of-rain', titleRu: 'Архив дождя', titleEn: 'Archive of Rain', descriptionRu: 'Четыре работы, документирующие дождь через отпечатки капель.', descriptionEn: 'Four works documenting rain through droplet prints.', year: 2026, medium: 'Монотипия, найденная бумага', dimensions: '30×40 см (каждая)', category: 'PRINT', styleTags: ['contemporary', 'monotype', 'series'], mediaType: 'IMAGE_2D', price: 2000, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'fragments-of-light', titleRu: 'Осколки света', titleEn: 'Fragments of Light', descriptionRu: 'Коллаж со слюдой, создающий эффект витража.', descriptionEn: 'Collage with mica creating a stained-glass effect.', year: 2025, medium: 'Коллаж, слюда, акрил', dimensions: '80×80 см', category: 'MIXED_MEDIA', styleTags: ['contemporary', 'collage', 'light'], mediaType: 'IMAGE_2D', price: 1400, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'viktor-iron', email: 'viktor.iron@duomesh.art', displayName: 'Viktor Iron',
    bioRu: 'Виктор Айрон — 3D-скульптор из Екатеринбурга. Специализируется на фигуративной 3D-скульптуре и фотограмметрии.',
    bioEn: 'Viktor Iron is a 3D sculptor from Yekaterinburg. Specialises in figurative 3D sculpture and photogrammetry.',
    statementRu: '3D-скульптура — это не симуляция, а новая материальность.',
    statementEn: '3D sculpture is not a simulation but a new materiality.',
    location: 'Екатеринбург, Россия', websiteUrl: 'https://viktor-iron.art', tier: 'GALLERY', verified: true,
    socialLinks: { instagram: '@viktor_iron_3d', sketchfab: '@viktor_iron' },
    hall: { slug: 'iron-forge', titleRu: 'Кузница Айрона', titleEn: 'Iron Forge', descriptionRu: 'Цифровая скульптура нового века. GLB-модели, фотограмметрия и AR.', descriptionEn: 'Digital sculpture for the new century. GLB models, photogrammetry, and AR.', coverImageUrl: '/assets/posters/frozen-gesture.svg' },
    artworks: [
      { slug: 'bronze-echo', titleRu: 'Бронзовый отголосок', titleEn: 'Bronze Echo', descriptionRu: 'Цифровая реконструкция античного шлема с процедурной патиной.', descriptionEn: 'Digital reconstruction of an ancient helmet with procedural patina.', year: 2026, medium: 'Blender, Substance Painter', dimensions: 'GLB, ~40K tris', category: 'SCULPTURE', styleTags: ['3D', 'sculpture', 'historical', 'AR-ready'], mediaType: 'MODEL_3D', software: 'BLENDER', isScanned: false, polyCount: 40000, price: 3800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'scanned-figure', titleRu: 'Скан натуры №4', titleEn: 'Life Scan No. 4', descriptionRu: 'Фотограмметрический скан танцовщика. 127 камер, RealityCapture.', descriptionEn: 'Photogrammetric scan of a dancer. 127 cameras, RealityCapture.', year: 2025, medium: 'Фотограмметрия (127 камер), RealityCapture', dimensions: 'GLB, ~80K tris', category: 'SCULPTURE', styleTags: ['3D', 'figurative', 'scan', 'AR-ready'], mediaType: 'MODEL_3D', software: 'SCAN', isScanned: true, polyCount: 80000, price: 5200, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'digital-double', titleRu: 'Цифровой двойник', titleEn: 'Digital Double', descriptionRu: 'Автопортрет в 3D: скан головы, преобразованный в футуристический шлем.', descriptionEn: '3D self-portrait: a head scan transformed into a futuristic helmet.', year: 2026, medium: 'Фотограмметрия, ZBrush', dimensions: 'GLB, ~60K tris', category: 'SCULPTURE', styleTags: ['3D', 'portrait', 'scan', 'futuristic'], mediaType: 'MODEL_3D', software: 'SCAN', isScanned: true, polyCount: 60000, price: 4600, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
      { slug: 'frozen-gesture', titleRu: 'Замороженный жест', titleEn: 'Frozen Gesture', descriptionRu: 'Абстрактная 3D-форма из жеста руки. ZBrush с нуля.', descriptionEn: 'Abstract 3D form from a hand gesture. ZBrush from scratch.', year: 2026, medium: 'ZBrush, Blender (рендер)', dimensions: 'GLB, ~25K tris', category: 'SCULPTURE', styleTags: ['3D', 'abstract', 'gesture', 'AR-ready'], mediaType: 'MODEL_3D', software: 'ZBRUSH', isScanned: false, polyCount: 25000, price: 3400, status: 'LISTED', editionType: 'LIMITED' },
    ],
  },
  {
    slug: 'kira-nova', email: 'kira.nova@duomesh.art', displayName: 'Kira Nova',
    bioRu: 'Кира Нова — new media художница из Тбилиси. Резидент Ars Electronica 2025.',
    bioEn: 'Kira Nova is a new media artist from Tbilisi. Ars Electronica 2025 resident.',
    statementRu: 'New media — это не про технологии, а про новый способ видеть.',
    statementEn: 'New media is not about technology but about a new way of seeing.',
    location: 'Тбилиси, Грузия', websiteUrl: 'https://kiranova.io', tier: 'PRO', verified: true,
    socialLinks: { instagram: '@kira_nova_media', twitter: '@kiranova' },
    hall: { slug: 'nova-nexus', titleRu: 'Нексус Новы', titleEn: 'Nova Nexus', descriptionRu: 'New media на стыке 2D и 3D.', descriptionEn: 'New media at the intersection of 2D and 3D.', coverImageUrl: '' },
    artworks: [
      { slug: 'lucid-dream', titleRu: 'Осознанный сон', titleEn: 'Lucid Dream', descriptionRu: 'Цифровая живопись с элементами 3D-рендера.', descriptionEn: 'Digital painting with 3D render elements.', year: 2026, medium: 'Цифровая живопись, OctaneRender', dimensions: '120×160 см (печать)', category: 'DIGITAL', styleTags: ['new media', 'dreamlike', 'hybrid'], mediaType: 'IMAGE_2D', price: 2900, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'hybrid-flora', titleRu: 'Гибридная флора', titleEn: 'Hybrid Flora', descriptionRu: 'Ботаническая иллюстрация встречается с 3D-моделированием.', descriptionEn: 'Botanical illustration meets 3D modelling.', year: 2025, medium: 'Цифровая живопись, Blender', dimensions: '80×100 см (каждая)', category: 'DIGITAL', styleTags: ['new media', 'botanical', 'series'], mediaType: 'IMAGE_2D', price: 3600, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'portal-v2', titleRu: 'Портал v2', titleEn: 'Portal v2', descriptionRu: 'Интерактивная 3D-работа с AR-слоем.', descriptionEn: 'Interactive 3D work with AR layer.', year: 2026, medium: 'Blender, WebXR', dimensions: 'GLB, ~30K tris', category: 'MIXED_MEDIA', styleTags: ['new media', 'interactive', 'AR', 'hybrid'], mediaType: 'MODEL_3D', software: 'BLENDER', isScanned: false, polyCount: 30000, price: 4800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'glitch-portrait', titleRu: 'Глитч-портрет', titleEn: 'Glitch Portrait', descriptionRu: 'Цифровой портрет через намеренные повреждения данных.', descriptionEn: 'Digital portrait through intentional data corruption.', year: 2024, medium: 'Цифровая живопись, data-bending', dimensions: '90×90 см', category: 'DIGITAL', styleTags: ['new media', 'glitch', 'portrait'], mediaType: 'IMAGE_2D', price: 2100, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector4@duomesh.art' }] },
      { slug: 'mesh-poem', titleRu: 'Меш-поэма', titleEn: 'Mesh Poem', descriptionRu: '3D-скульптура из текста стихотворения Мандельштама.', descriptionEn: '3D sculpture from a Mandelstam poem text.', year: 2026, medium: 'ZBrush, генеративный дизайн', dimensions: 'GLB, ~35K tris', category: 'SCULPTURE', styleTags: ['new media', 'generative', 'typography', 'AR-ready'], mediaType: 'MODEL_3D', software: 'ZBRUSH', isScanned: false, polyCount: 35000, price: 4100, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
    ],
  },
]

const COLLECTORS: { email: string; displayName: string }[] = [
  { email: 'collector1@duomesh.art', displayName: 'Alexei Morozov' },
  { email: 'collector2@duomesh.art', displayName: 'Sophie Lambert' },
  { email: 'collector3@duomesh.art', displayName: 'Dmitry Volkov' },
  { email: 'collector4@duomesh.art', displayName: 'Marta Nowak' },
]

export async function runSeed(prisma: DbClient): Promise<{ artworks: number; artKeys: number; provenance: number }> {
  const total = { artworks: 0, artKeys: 0, provenance: 0 }

  // Upsert collectors
  for (const c of COLLECTORS) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: { displayName: c.displayName },
      create: {
        email: c.email,
        passwordHash: hashPassword('password123'),
        displayName: c.displayName,
        role: 'COLLECTOR',
      },
    })
  }

  for (const artistData of ARTISTS) {
    console.log(`── ${artistData.displayName} (${artistData.slug}) ──`)

    const user = await prisma.user.upsert({
      where: { email: artistData.email },
      update: { displayName: artistData.displayName, role: 'ARTIST' },
      create: {
        email: artistData.email,
        passwordHash: hashPassword('password123'),
        displayName: artistData.displayName,
        role: 'ARTIST',
        bio: `${artistData.bioRu}\n\n---\n\n${artistData.bioEn}`,
        socialLinks: artistData.socialLinks,
      },
    })

    const artist = await prisma.artist.upsert({
      where: { userId: user.id },
      update: {
        artistStatement: `${artistData.statementRu}\n\n---\n\n${artistData.statementEn}`,
        websiteUrl: artistData.websiteUrl,
        location: artistData.location,
        verified: artistData.verified,
        tier: artistData.tier as any,
      },
      create: {
        userId: user.id,
        artistStatement: `${artistData.statementRu}\n\n---\n\n${artistData.statementEn}`,
        websiteUrl: artistData.websiteUrl,
        location: artistData.location,
        verified: artistData.verified,
        tier: artistData.tier as any,
      },
    })

    await prisma.exhibitionHall.upsert({
      where: { slug: artistData.hall.slug },
      update: {
        title: `${artistData.hall.titleRu} / ${artistData.hall.titleEn}`,
        description: `${artistData.hall.descriptionRu}\n\n${artistData.hall.descriptionEn}`,
        coverImageUrl: artistData.hall.coverImageUrl || POSTER_URLS[artistData.artworks[0].slug] || '',
        isPublished: true,
      },
      create: {
        artistId: artist.id,
        slug: artistData.hall.slug,
        title: `${artistData.hall.titleRu} / ${artistData.hall.titleEn}`,
        description: `${artistData.hall.descriptionRu}\n\n${artistData.hall.descriptionEn}`,
        coverImageUrl: artistData.hall.coverImageUrl || POSTER_URLS[artistData.artworks[0].slug] || '',
        isPublished: true,
      },
    })

    for (const awData of artistData.artworks) {
      const posterUrl = POSTER_URLS[awData.slug] ?? ''
      const modelUrl = awData.mediaType === 'MODEL_3D' ? (MODEL_URLS[awData.slug] ?? null) : null

      const artwork = await prisma.artwork.upsert({
        where: { id: makeDeterministicId(artistData.slug, awData.slug) },
        update: {
          title: `${awData.titleRu} / ${awData.titleEn}`,
          description: `${awData.descriptionRu}\n\n---\n\n${awData.descriptionEn}`,
          year: awData.year, medium: awData.medium, dimensions: awData.dimensions,
          category: awData.category as any, styleTags: awData.styleTags,
          mediaType: awData.mediaType, posterUrl, modelUrl,
          software: (awData.software as any) ?? null,
          isScanned: awData.isScanned ?? false, polyCount: awData.polyCount ?? null,
          price: awData.price, status: awData.status as any, editionType: awData.editionType as any,
        },
        create: {
          id: makeDeterministicId(artistData.slug, awData.slug),
          artistId: artist.id,
          title: `${awData.titleRu} / ${awData.titleEn}`,
          description: `${awData.descriptionRu}\n\n---\n\n${awData.descriptionEn}`,
          year: awData.year, medium: awData.medium, dimensions: awData.dimensions,
          category: awData.category as any, styleTags: awData.styleTags,
          images: [posterUrl], mediaType: awData.mediaType, posterUrl, modelUrl,
          software: (awData.software as any) ?? null,
          isScanned: awData.isScanned ?? false, polyCount: awData.polyCount ?? null,
          price: awData.price, status: awData.status as any, editionType: awData.editionType as any,
        },
      })

      const keyCode = makeKeyCode(YEAR, `${artistData.slug}/${awData.slug}`)
      const ownerKey = makeOwnerKey(`${artistData.slug}/${awData.slug}`)
      const existingArtKey = await prisma.artKey.findUnique({ where: { keyCode } })
      let artKey = existingArtKey

      if (!existingArtKey) {
        const integrityHash = computeIntegrityHash(artwork.id, keyCode, artist.id, artwork.createdAt.toISOString())
        artKey = await prisma.artKey.create({
          data: {
            artworkId: artwork.id, keyCode, ownerKey,
            certificateHash: sha256hex(`${artwork.id}:${keyCode}:${ownerKey}:${artwork.createdAt.toISOString()}`),
            integrityHash, issuedAt: artwork.createdAt,
          },
        })
        total.artKeys++
      }

      const existingProv = await prisma.provenanceRecord.findFirst({ where: { artworkId: artwork.id, sequence: 0 } })
      if (!existingProv) {
        const issuedAt = artwork.createdAt.toISOString()
        const genesisHash = computeRecordHash({ artworkId: artwork.id, sequence: 0, eventType: 'CREATION', actor: artist.id, occurredAt: issuedAt, prevRecordHash: artKey!.integrityHash })

        await prisma.provenanceRecord.create({
          data: {
            artworkId: artwork.id, artKeyId: artKey!.id, sequence: 0,
            toUserId: user.id, transferType: 'CREATION',
            recordHash: genesisHash, prevRecordHash: artKey!.integrityHash,
            occurredAt: issuedAt,
          },
        })
        total.provenance++

        let prevHash = genesisHash
        if (awData.extraProvenance) {
          for (let i = 0; i < awData.extraProvenance.length; i++) {
            const ep = awData.extraProvenance[i]
            const collectorUser = await prisma.user.findUnique({ where: { email: ep.toEmail } })
            if (!collectorUser) continue

            const seq = i + 1
            const nextOccurredAt = new Date(Date.now() + seq * 86400000).toISOString()
            const recHash = computeRecordHash({ artworkId: artwork.id, sequence: seq, eventType: ep.type, actor: collectorUser.id, occurredAt: nextOccurredAt, prevRecordHash: prevHash })

            await prisma.provenanceRecord.create({
              data: {
                artworkId: artwork.id, artKeyId: artKey!.id, sequence: seq,
                fromUserId: seq === 1 ? user.id : undefined,
                toUserId: collectorUser.id, transferType: ep.type as any,
                price: awData.price ?? undefined,
                recordHash: recHash, prevRecordHash: prevHash,
                occurredAt: nextOccurredAt,
              },
            })
            total.provenance++
            prevHash = recHash
          }
        }
      }

      total.artworks++
      console.log(`  ✓ ${awData.slug} [${awData.mediaType}]`)
    }
  }

  return total
}
