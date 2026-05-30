import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import crypto from 'node:crypto'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://superuser:superpassword@localhost:54329/duo_mesh?schema=public'

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const SEED_PASSWORD_HASH = await Bun.password.hash('password123', { algorithm: 'argon2id' })

// ─── Shared helpers ───

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  return JSON.stringify(sorted)
}

function sha256hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
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
  artworkId: string
  sequence: number
  eventType: string
  actor: string
  occurredAt: string
  prevRecordHash: string
}): string {
  return sha256hex(canonicalJSON(record))
}

const YEAR = new Date().getFullYear()

// ─── Types ───

interface ArtistSeed {
  slug: string
  email: string
  displayName: string
  bioRu: string
  bioEn: string
  statementRu: string
  statementEn: string
  location: string
  websiteUrl: string
  tier: 'FREE' | 'PRO' | 'GALLERY'
  verified: boolean
  socialLinks: Record<string, string>
  hall: {
    slug: string
    titleRu: string
    titleEn: string
    descriptionRu: string
    descriptionEn: string
    coverImageUrl: string
  }
  artworks: ArtworkSeed[]
}

interface ArtworkSeed {
  slug: string
  titleRu: string
  titleEn: string
  descriptionRu: string
  descriptionEn: string
  year: number
  medium: string
  dimensions: string
  category: string
  styleTags: string[]
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  software?: string
  isScanned?: boolean
  polyCount?: number
  price: number | null
  status: string
  editionType: string
  // Provenance extras beyond genesis
  extraProvenance?: { type: string; toEmail: string }[]
}

// ─── Data ───

const ARTISTS: ArtistSeed[] = [
  {
    slug: 'elena-volkova',
    email: 'elena.volkova@duomesh.art',
    displayName: 'Elena Volkova',
    bioRu: 'Елена Волкова — абстрактный живописец из Санкт-Петербурга, работающая с цветовым полем и жестовой абстракцией. Выпускница Академии Штиглица. Её холсты находятся в частных коллекциях России, Германии и ОАЭ.',
    bioEn: 'Elena Volkova is an abstract painter from St. Petersburg working with colour field and gestural abstraction. Graduate of the Stieglitz Academy. Her canvases are held in private collections across Russia, Germany, and the UAE.',
    statementRu: 'Цвет — это не описание, а событие. Каждый холст для меня — поле напряжения между контролем и отпусканием. Я не иллюстрирую эмоции; я создаю условия, в которых они возникают у зрителя самостоятельно.',
    statementEn: 'Colour is not a description but an event. Each canvas for me is a field of tension between control and release. I do not illustrate emotions; I create the conditions in which they arise for the viewer independently.',
    location: 'Санкт-Петербург, Россия',
    websiteUrl: 'https://elenavolkova.art',
    tier: 'GALLERY',
    verified: true,
    socialLinks: { instagram: '@volkova_abstract', telegram: '@evolkova' },
    hall: {
      slug: 'volkova-gallery',
      titleRu: 'Зал Волковой',
      titleEn: 'Volkova Gallery',
      descriptionRu: 'Пространство цвета и жеста. Избранные работы абстрактного направления 2020–2026.',
      descriptionEn: 'A space of colour and gesture. Selected abstract works from 2020–2026.',
      coverImageUrl: '',
    },
    artworks: [
      { slug: 'cosmic-drift', titleRu: 'Космический дрейф', titleEn: 'Cosmic Drift', descriptionRu: 'Масштабное полотно, вдохновлённое туманностью Ориона. Слои лазурного, кобальтового и белого создают ощущение бесконечного движения.', descriptionEn: 'A large-scale canvas inspired by the Orion Nebula. Layers of azure, cobalt, and white create a sense of infinite motion.', year: 2025, medium: 'Холст, акрил', dimensions: '180×240 см', category: 'PAINTING', styleTags: ['abstract', 'colour field', 'gestural'], mediaType: 'IMAGE_2D', price: 4500, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'silent-shores', titleRu: 'Тихие берега', titleEn: 'Silent Shores', descriptionRu: 'Минималистичная работа на стыке абстракции и пейзажа. Тёплые охры и размытые линии горизонта.', descriptionEn: 'A minimalist work at the intersection of abstraction and landscape. Warm ochres and blurred horizon lines.', year: 2024, medium: 'Холст, масло', dimensions: '120×150 см', category: 'PAINTING', styleTags: ['abstract', 'minimalist', 'landscape'], mediaType: 'IMAGE_2D', price: 3200, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
      { slug: 'crimson-pulse', titleRu: 'Пульс кармина', titleEn: 'Crimson Pulse', descriptionRu: 'Динамическая композиция, построенная на ритмических ударах красного по глубокому синему фону.', descriptionEn: 'A dynamic composition built on rhythmic strikes of red against a deep blue background.', year: 2026, medium: 'Холст, акрил, пастель', dimensions: '150×150 см', category: 'PAINTING', styleTags: ['abstract', 'expressive', 'gestural'], mediaType: 'IMAGE_2D', price: 5200, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector1@duomesh.art' }] },
      { slug: 'golden-thread', titleRu: 'Золотая нить', titleEn: 'Golden Thread', descriptionRu: 'Медитативная работа с тончайшими золотыми линиями поверх многослойного серого фона.', descriptionEn: 'A meditative work with the finest gold lines over a multi-layered grey background.', year: 2023, medium: 'Холст, смешанная техника', dimensions: '100×130 см', category: 'MIXED_MEDIA', styleTags: ['abstract', 'meditative', 'mixed media'], mediaType: 'IMAGE_2D', price: 2800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'storm-front', titleRu: 'Фронт бури', titleEn: 'Storm Front', descriptionRu: 'Крупный формат, передающий напряжение перед грозой. Тяжёлые серые массы сталкиваются с проблесками света.', descriptionEn: 'A large format conveying the tension before a thunderstorm. Heavy grey masses collide with flashes of light.', year: 2025, medium: 'Холст, масло', dimensions: '200×200 см', category: 'PAINTING', styleTags: ['abstract', 'atmospheric', 'large-scale'], mediaType: 'IMAGE_2D', price: 6800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'embers-of-form', titleRu: 'Тлеющая форма', titleEn: 'Embers of Form', descriptionRu: 'Завершающая работу серия «Пожары». Тлеющие угли цвета на чёрном поле с едва заметной геометрией.', descriptionEn: 'The closing work of the Fires series. Smouldering embers of colour on a black field with barely visible geometry.', year: 2026, medium: 'Холст, акрил, уголь', dimensions: '140×180 см', category: 'PAINTING', styleTags: ['abstract', 'dark', 'geometric'], mediaType: 'IMAGE_2D', price: 5900, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'maxim-drozdov',
    email: 'maxim.drozdov@duomesh.art',
    displayName: 'Maxim Drozdov',
    bioRu: 'Максим Дроздов — цифровой художник-сюрреалист из Берлина. Выпускник программы New Media в Университете искусств Берлина. Работает на стыке 3D-моделирования, генеративных алгоритмов и цифровой живописи.',
    bioEn: 'Maxim Drozdov is a digital surrealist artist based in Berlin. Graduate of the New Media programme at Berlin University of the Arts. Works at the intersection of 3D modelling, generative algorithms, and digital painting.',
    statementRu: 'Сюрреализм — не фантазия, а обострённая реальность. Мои работы начинаются с данных: спутниковые снимки, медицинские сканы, архивы. Алгоритм становится соавтором, но финальный выбор всегда за мной.',
    statementEn: 'Surrealism is not fantasy but heightened reality. My works begin with data: satellite imagery, medical scans, archives. The algorithm becomes a co-author, but the final choice is always mine.',
    location: 'Берлин, Германия',
    websiteUrl: 'https://drozdov.studio',
    tier: 'PRO',
    verified: true,
    socialLinks: { instagram: '@drozdov_digital', website: 'https://drozdov.studio' },
    hall: {
      slug: 'drozdov-lab',
      titleRu: 'Лаборатория Дроздова',
      titleEn: 'Drozdov Lab',
      descriptionRu: 'Цифровой сюрреализм на границе кода и воображения. Генеративные ландшафты и пост-цифровые портреты.',
      descriptionEn: 'Digital surrealism at the border of code and imagination. Generative landscapes and post-digital portraits.',
      coverImageUrl: '',
    },
    artworks: [
      { slug: 'neon-nocturne', titleRu: 'Неоновый ноктюрн', titleEn: 'Neon Nocturne', descriptionRu: 'Плотный цифровой коллаж, где анатомические формы встречаются с неоновой геометрией киберпанка.', descriptionEn: 'A dense digital collage where anatomical forms meet cyberpunk neon geometry.', year: 2025, medium: 'Цифровая живопись, печать на алюминии', dimensions: '90×120 см', category: 'DIGITAL', styleTags: ['surreal', 'cyberpunk', 'digital'], mediaType: 'IMAGE_2D', price: 2400, status: 'LISTED', editionType: 'LIMITED', extraProvenance: [] },
      { slug: 'data-ghosts', titleRu: 'Призраки данных', titleEn: 'Data Ghosts', descriptionRu: 'Генеративная работа, визуализирующая удалённые твиты как призрачные фигуры в пространстве.', descriptionEn: 'A generative work visualising deleted tweets as ghostly figures in space.', year: 2026, medium: 'Генеративное искусство, печать на Hahnemühle', dimensions: '100×100 см', category: 'DIGITAL', styleTags: ['surreal', 'generative', 'conceptual'], mediaType: 'IMAGE_2D', price: 3100, status: 'IN_EXHIBITION', editionType: 'LIMITED' },
      { slug: 'anatomie-du-reve', titleRu: 'Анатомия сна', titleEn: 'Anatomie du Rêve', descriptionRu: 'Детализированная работа, сочетающая ренессансную анатомию с глитч-эстетикой и пиксельной деградацией.', descriptionEn: 'A detailed work combining Renaissance anatomy with glitch aesthetics and pixel degradation.', year: 2024, medium: 'Цифровая живопись, печать на холсте', dimensions: '120×160 см', category: 'DIGITAL', styleTags: ['surreal', 'anatomical', 'glitch'], mediaType: 'IMAGE_2D', price: 2800, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector2@duomesh.art' }] },
      { slug: 'synthetic-garden', titleRu: 'Синтетический сад', titleEn: 'Synthetic Garden', descriptionRu: 'Ботаническая фантазия, где каждый лист сгенерирован отдельной нейросетью, а композиция собрана вручную.', descriptionEn: 'A botanical fantasy where every leaf was generated by a separate neural network and the composition assembled by hand.', year: 2026, medium: 'AI-ассистированная цифровая живопись', dimensions: '150×150 см', category: 'DIGITAL', styleTags: ['surreal', 'botanical', 'AI-assisted'], mediaType: 'IMAGE_2D', price: 4200, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'threshold', titleRu: 'Порог', titleEn: 'Threshold', descriptionRu: 'Масштабная работа о границе между физическим и цифровым: фотограмметрический скан студии художника, растворённый в волнах глитча.', descriptionEn: 'A large-scale work about the boundary between physical and digital: a photogrammetric scan of the artistʼs studio dissolved in glitch waves.', year: 2025, medium: 'Фотограмметрия, цифровая обработка', dimensions: '200×130 см', category: 'DIGITAL', styleTags: ['surreal', 'photogrammetry', 'glitch'], mediaType: 'IMAGE_2D', price: 5600, status: 'LISTED', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'anna-sokolova',
    email: 'anna.sokolova@duomesh.art',
    displayName: 'Anna Sokolova',
    bioRu: 'Анна Соколова — фотограф из Москвы, выпускница Школы Родченко. Снимает на среднеформатную плёнку, работает с темами памяти, отсутствия и архитектурного пространства.',
    bioEn: 'Anna Sokolova is a photographer from Moscow, graduate of the Rodchenko School. Shoots medium-format film, working with themes of memory, absence, and architectural space.',
    statementRu: 'Фотография — это не запечатление, а извлечение. Я проявляю не изображение, а время, которое плёнка впитала вместе со светом. Каждый отпечаток — это решение о том, что оставить видимым.',
    statementEn: 'Photography is not capture but extraction. I develop not the image but the time the film absorbed along with the light. Each print is a decision about what to leave visible.',
    location: 'Москва, Россия',
    websiteUrl: '',
    tier: 'PRO',
    verified: true,
    socialLinks: { instagram: '@sokolova_darkroom' },
    hall: {
      slug: 'sokolova-chamber',
      titleRu: 'Камера Соколовой',
      titleEn: 'Sokolova Chamber',
      descriptionRu: 'Монохромная фотография на границе документа и абстракции. Серебряные отпечатки и архитектурные серии.',
      descriptionEn: 'Monochrome photography at the boundary of document and abstraction. Silver prints and architectural series.',
      coverImageUrl: '',
    },
    artworks: [
      { slug: 'staircase-iii', titleRu: 'Лестница III', titleEn: 'Staircase III', descriptionRu: 'Часть архитектурной серии. Винтовая лестница модернистского здания, снятая как абстрактная геометрия света и тени.', descriptionEn: 'Part of the architectural series. A spiral staircase in a modernist building, shot as abstract geometry of light and shadow.', year: 2024, medium: 'Серебряно-желатиновый отпечаток', dimensions: '60×80 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'architectural', 'abstract'], mediaType: 'IMAGE_2D', price: 1800, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'winter-palace', titleRu: 'Безлюдный Эрмитаж', titleEn: 'Winter Palace', descriptionRu: 'Серия снимков пустых залов Эрмитажа до открытия. Свет, пространство и тишина как главные герои.', descriptionEn: 'A series of empty Hermitage halls before opening. Light, space, and silence as the protagonists.', year: 2023, medium: 'Серебряно-желатиновый отпечаток', dimensions: '80×80 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'architectural', 'documentary'], mediaType: 'IMAGE_2D', price: 2200, status: 'IN_EXHIBITION', editionType: 'LIMITED' },
      { slug: 'found-silence', titleRu: 'Найденная тишина', titleEn: 'Found Silence', descriptionRu: 'Натюрморт из забытых предметов в заброшенной мастерской. Естественный свет, длинная выдержка.', descriptionEn: 'A still life of forgotten objects in an abandoned workshop. Natural light, long exposure.', year: 2025, medium: 'Пигментная печать', dimensions: '70×90 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'still life', 'atmospheric'], mediaType: 'IMAGE_2D', price: 1500, status: 'LISTED', editionType: 'OPEN' },
      { slug: 'metro-diptych', titleRu: 'Метро (диптих)', titleEn: 'Metro Diptych', descriptionRu: 'Две фотографии московского метрополитена: утренний час пик и ночная пустота. Диптих продаётся только вместе.', descriptionEn: 'Two photographs of the Moscow Metro: morning rush hour and nighttime emptiness. Diptych sold only together.', year: 2026, medium: 'Серебряно-желатиновые отпечатки', dimensions: '50×70 см (каждая)', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'urban', 'diptych'], mediaType: 'IMAGE_2D', price: 3500, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'afterimage', titleRu: 'Послесвечение', titleEn: 'Afterimage', descriptionRu: 'Экспериментальная работа с многократной экспозицией: портрет, растворённый в архитектурном пространстве.', descriptionEn: 'An experimental multiple-exposure work: a portrait dissolved into architectural space.', year: 2026, medium: 'Пигментная печать', dimensions: '90×110 см', category: 'PHOTOGRAPHY', styleTags: ['monochrome', 'experimental', 'portrait'], mediaType: 'IMAGE_2D', price: 2600, status: 'LISTED', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'daria-lys',
    email: 'daria.lys@duomesh.art',
    displayName: 'Daria Lys',
    bioRu: 'Дарья Лыс — художница смешанной техники из Киева. Работает с печатной графикой, коллажем и найденными объектами. Участница биеннале молодого искусства в Варшаве (2025).',
    bioEn: 'Daria Lys is a mixed-media artist from Kyiv. Works with printmaking, collage, and found objects. Participant of the Young Art Biennale in Warsaw (2025).',
    statementRu: 'Я работаю с тем, что было выброшено: старые книги, карты, билеты, письма. Моя практика — это археология повседневности. Каждая работа собирается из фрагментов чужих историй в новое высказывание.',
    statementEn: 'I work with what has been discarded: old books, maps, tickets, letters. My practice is an archaeology of the everyday. Each work assembles fragments of othersʼ stories into a new statement.',
    location: 'Киев, Украина',
    websiteUrl: 'https://daria-lys.art',
    tier: 'FREE',
    verified: false,
    socialLinks: { instagram: '@lys_print' },
    hall: {
      slug: 'lys-atelier',
      titleRu: 'Ателье Лыс',
      titleEn: 'Lys Atelier',
      descriptionRu: 'Смешанная техника, печатная графика и найденные объекты. Археология повседневности.',
      descriptionEn: 'Mixed media, printmaking, and found objects. An archaeology of the everyday.',
      coverImageUrl: '',
    },
    artworks: [
      { slug: 'letters-never-sent', titleRu: 'Письма, которых не было', titleEn: 'Letters Never Sent', descriptionRu: 'Коллаж из фрагментов реальных писем 1940-х годов, найденных на блошином рынке, и ручной печати.', descriptionEn: 'A collage of fragments of real 1940s letters found at a flea market, combined with hand-printing.', year: 2025, medium: 'Коллаж, линогравюра, найденные объекты', dimensions: '60×80 см', category: 'MIXED_MEDIA', styleTags: ['contemporary', 'collage', 'found objects'], mediaType: 'IMAGE_2D', price: 1200, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'map-of-departures', titleRu: 'Карта убытий', titleEn: 'Map of Departures', descriptionRu: 'Старая географическая карта, поверх которой — слои трафаретной печати с маршрутами, которых больше нет.', descriptionEn: 'An old geographical map overlaid with screen-printed routes that no longer exist.', year: 2024, medium: 'Трафаретная печать, найденная карта', dimensions: '90×120 см', category: 'PRINT', styleTags: ['contemporary', 'printmaking', 'conceptual'], mediaType: 'IMAGE_2D', price: 1600, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector3@duomesh.art' }] },
      { slug: 'archive-of-rain', titleRu: 'Архив дождя', titleEn: 'Archive of Rain', descriptionRu: 'Серия из четырёх малых работ, документирующих дождь через отпечатки капель на старой бумаге.', descriptionEn: 'A series of four small works documenting rain through droplet prints on aged paper.', year: 2026, medium: 'Монотипия, найденная бумага', dimensions: '30×40 см (каждая)', category: 'PRINT', styleTags: ['contemporary', 'monotype', 'series'], mediaType: 'IMAGE_2D', price: 2000, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'fragments-of-light', titleRu: 'Осколки света', titleEn: 'Fragments of Light', descriptionRu: 'Коллаж с использованием слюды и полупрозрачных материалов, создающий эффект витража.', descriptionEn: 'A collage using mica and translucent materials, creating a stained-glass effect.', year: 2025, medium: 'Коллаж, слюда, акрил', dimensions: '80×80 см', category: 'MIXED_MEDIA', styleTags: ['contemporary', 'collage', 'light'], mediaType: 'IMAGE_2D', price: 1400, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
    ],
  },
  {
    slug: 'viktor-iron',
    email: 'viktor.iron@duomesh.art',
    displayName: 'Viktor Iron',
    bioRu: 'Виктор Айрон — 3D-скульптор из Екатеринбурга, выпускник Уральского архитектурного колледжа. Специализируется на фигуративной 3D-скульптуре и фотограмметрических сканах. Его цифровые скульптуры существуют как GLB-модели, готовые к AR-просмотру и печати.',
    bioEn: 'Viktor Iron is a 3D sculptor from Yekaterinburg, graduate of the Ural Architecture College. Specialises in figurative 3D sculpture and photogrammetric scans. His digital sculptures exist as GLB models ready for AR viewing and 3D printing.',
    statementRu: '3D-скульптура — это не симуляция физического объекта, а новая материальность. Мои работы существуют на границе цифрового и тактильного: их можно повернуть, осветить, напечатать или оставить в виртуальном пространстве навсегда.',
    statementEn: '3D sculpture is not a simulation of a physical object but a new materiality. My works exist at the boundary of the digital and the tactile: they can be rotated, lit, printed, or left in virtual space forever.',
    location: 'Екатеринбург, Россия',
    websiteUrl: 'https://viktor-iron.art',
    tier: 'GALLERY',
    verified: true,
    socialLinks: { instagram: '@viktor_iron_3d', sketchfab: '@viktor_iron' },
    hall: {
      slug: 'iron-forge',
      titleRu: 'Кузница Айрона',
      titleEn: 'Iron Forge',
      descriptionRu: 'Цифровая скульптура нового века. Фигуративные GLB-модели, фотограмметрия и AR-экспонаты.',
      descriptionEn: 'Digital sculpture for the new century. Figurative GLB models, photogrammetry, and AR exhibits.',
      coverImageUrl: '',
    },
    artworks: [
      { slug: 'bronze-echo', titleRu: 'Бронзовый отголосок', titleEn: 'Bronze Echo', descriptionRu: 'Цифровая реконструкция античного шлема с процедурной патиной. Модель оптимизирована для AR и WebXR.', descriptionEn: 'A digital reconstruction of an ancient helmet with procedural patina. Model optimised for AR and WebXR.', year: 2026, medium: 'Blender, Substance Painter', dimensions: 'GLB, ~40K tris', category: 'SCULPTURE', styleTags: ['3D', 'sculpture', 'historical', 'AR-ready'], mediaType: 'MODEL_3D', software: 'BLENDER', isScanned: false, polyCount: 40000, price: 3800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'scanned-figure', titleRu: 'Скан натуры №4', titleEn: 'Life Scan No. 4', descriptionRu: 'Фотограмметрический скан фигуры танцовщика, замершего в движении. 127 камер, обработано в RealityCapture.', descriptionEn: 'A photogrammetric scan of a dancer frozen in motion. 127 cameras, processed in RealityCapture.', year: 2025, medium: 'Фотограмметрия (127 камер), RealityCapture', dimensions: 'GLB, ~80K tris', category: 'SCULPTURE', styleTags: ['3D', 'figurative', 'scan', 'AR-ready'], mediaType: 'MODEL_3D', software: 'SCAN', isScanned: true, polyCount: 80000, price: 5200, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'digital-double', titleRu: 'Цифровой двойник', titleEn: 'Digital Double', descriptionRu: 'Автопортрет в 3D: детальный скан головы художника, преобразованный в футуристический шлем.', descriptionEn: 'A 3D self-portrait: a detailed scan of the artistʼs head transformed into a futuristic helmet.', year: 2026, medium: 'Фотограмметрия, ZBrush', dimensions: 'GLB, ~60K tris', category: 'SCULPTURE', styleTags: ['3D', 'portrait', 'scan', 'futuristic'], mediaType: 'MODEL_3D', software: 'SCAN', isScanned: true, polyCount: 60000, price: 4600, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
      { slug: 'frozen-gesture', titleRu: 'Замороженный жест', titleEn: 'Frozen Gesture', descriptionRu: 'Абстрактная 3D-форма, вырастающая из жеста руки. Скульптура сделана в ZBrush с нуля.', descriptionEn: 'An abstract 3D form growing from a hand gesture. Sculpted from scratch in ZBrush.', year: 2026, medium: 'ZBrush, Blender (рендер)', dimensions: 'GLB, ~25K tris', category: 'SCULPTURE', styleTags: ['3D', 'abstract', 'gesture', 'AR-ready'], mediaType: 'MODEL_3D', software: 'ZBRUSH', isScanned: false, polyCount: 25000, price: 3400, status: 'LISTED', editionType: 'LIMITED' },
    ],
  },
  {
    slug: 'kira-nova',
    email: 'kira.nova@duomesh.art',
    displayName: 'Kira Nova',
    bioRu: 'Кира Нова — new media художница из Тбилиси. Работает на стыке цифровой живописи, 3D-моделирования и интерактивных инсталляций. Резидент Ars Electronica 2025.',
    bioEn: 'Kira Nova is a new media artist from Tbilisi. Works at the intersection of digital painting, 3D modelling, and interactive installations. Ars Electronica 2025 resident.',
    statementRu: 'New media — это не про технологии, а про новый способ видеть. Я смешиваю 2D и 3D не как медиумы, а как режимы мышления. Картина может начаться как холст, а закончиться как GLB. Или наоборот.',
    statementEn: 'New media is not about technology but about a new way of seeing. I mix 2D and 3D not as media but as modes of thinking. A painting can begin as a canvas and end as a GLB. Or vice versa.',
    location: 'Тбилиси, Грузия',
    websiteUrl: 'https://kiranova.io',
    tier: 'PRO',
    verified: true,
    socialLinks: { instagram: '@kira_nova_media', twitter: '@kiranova' },
    hall: {
      slug: 'nova-nexus',
      titleRu: 'Нексус Новы',
      titleEn: 'Nova Nexus',
      descriptionRu: 'New media на стыке 2D и 3D. Цифровая живопись, интерактивные модели и смешанные инсталляции.',
      descriptionEn: 'New media at the intersection of 2D and 3D. Digital painting, interactive models, and mixed installations.',
      coverImageUrl: '',
    },
    artworks: [
      { slug: 'lucid-dream', titleRu: 'Осознанный сон', titleEn: 'Lucid Dream', descriptionRu: 'Цифровая живопись с элементами 3D-рендера. Пейзаж, который не существует, но кажется знакомым.', descriptionEn: 'Digital painting with 3D render elements. A landscape that does not exist but feels familiar.', year: 2026, medium: 'Цифровая живопись, OctaneRender', dimensions: '120×160 см (печать)', category: 'DIGITAL', styleTags: ['new media', 'dreamlike', 'hybrid'], mediaType: 'IMAGE_2D', price: 2900, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'hybrid-flora', titleRu: 'Гибридная флора', titleEn: 'Hybrid Flora', descriptionRu: 'Серия из трёх цифровых работ, где ботаническая иллюстрация встречается с 3D-моделированием.', descriptionEn: 'A series of three digital works where botanical illustration meets 3D modelling.', year: 2025, medium: 'Цифровая живопись, Blender', dimensions: '80×100 см (каждая)', category: 'DIGITAL', styleTags: ['new media', 'botanical', 'series'], mediaType: 'IMAGE_2D', price: 3600, status: 'LISTED', editionType: 'LIMITED' },
      { slug: 'portal-v2', titleRu: 'Портал v2', titleEn: 'Portal v2', descriptionRu: 'Интерактивная 3D-работа, совмещающая цифровую живопись с AR-слоем. Зритель может «войти» в картину через телефон.', descriptionEn: 'An interactive 3D work combining digital painting with an AR layer. The viewer can "enter" the painting through their phone.', year: 2026, medium: 'Blender, WebXR', dimensions: 'GLB, ~30K tris', category: 'MIXED_MEDIA', styleTags: ['new media', 'interactive', 'AR', 'hybrid'], mediaType: 'MODEL_3D', software: 'BLENDER', isScanned: false, polyCount: 30000, price: 4800, status: 'LISTED', editionType: 'UNIQUE' },
      { slug: 'glitch-portrait', titleRu: 'Глитч-портрет', titleEn: 'Glitch Portrait', descriptionRu: 'Цифровой портрет, прошедший через серию намеренных повреждений данных. Эстетика ошибки как художественный приём.', descriptionEn: 'A digital portrait passed through a series of intentional data corruptions. Error aesthetics as an artistic device.', year: 2024, medium: 'Цифровая живопись, data-bending', dimensions: '90×90 см (печать)', category: 'DIGITAL', styleTags: ['new media', 'glitch', 'portrait'], mediaType: 'IMAGE_2D', price: 2100, status: 'SOLD', editionType: 'UNIQUE', extraProvenance: [{ type: 'PRIMARY_SALE', toEmail: 'collector4@duomesh.art' }] },
      { slug: 'mesh-poem', titleRu: 'Меш-поэма', titleEn: 'Mesh Poem', descriptionRu: '3D-скульптура, вырастающая из текста стихотворения Мандельштама. Каждая буква — вершина меша.', descriptionEn: 'A 3D sculpture growing from the text of a Mandelstam poem. Each letter is a mesh vertex.', year: 2026, medium: 'ZBrush, генеративный дизайн', dimensions: 'GLB, ~35K tris', category: 'SCULPTURE', styleTags: ['new media', 'generative', 'typography', 'AR-ready'], mediaType: 'MODEL_3D', software: 'ZBRUSH', isScanned: false, polyCount: 35000, price: 4100, status: 'IN_EXHIBITION', editionType: 'UNIQUE' },
    ],
  },
]

// ─── Collector dummy users for provenance ───

const COLLECTORS: { email: string; displayName: string }[] = [
  { email: 'collector1@duomesh.art', displayName: 'Alexei Morozov' },
  { email: 'collector2@duomesh.art', displayName: 'Sophie Lambert' },
  { email: 'collector3@duomesh.art', displayName: 'Dmitry Volkov' },
  { email: 'collector4@duomesh.art', displayName: 'Marta Nowak' },
]

// ─── Main seed logic ───

async function main() {
  console.log('\n🎨 DUO MESH — Seed Database\n')

  // Upsert collectors
  for (const c of COLLECTORS) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: { displayName: c.displayName },
      create: {
        email: c.email,
        passwordHash: SEED_PASSWORD_HASH,
        displayName: c.displayName,
        role: 'COLLECTOR',
      },
    })
  }

  const total = { artworks: 0, artKeys: 0, provenance: 0 }

  for (const artistData of ARTISTS) {
    console.log(`── ${artistData.displayName} (${artistData.slug}) ──`)

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: artistData.email },
      update: {
        displayName: artistData.displayName,
        role: 'ARTIST',
      },
      create: {
        email: artistData.email,
        passwordHash: SEED_PASSWORD_HASH,
        displayName: artistData.displayName,
        role: 'ARTIST',
        bio: `${artistData.bioRu}\n\n---\n\n${artistData.bioEn}`,
        socialLinks: artistData.socialLinks,
      },
    })

    // Upsert Artist
    const artist = await prisma.artist.upsert({
      where: { userId: user.id },
      update: {
        artistStatement: `${artistData.statementRu}\n\n---\n\n${artistData.statementEn}`,
        websiteUrl: artistData.websiteUrl,
        location: artistData.location,
        verified: artistData.verified,
        tier: artistData.tier,
      },
      create: {
        userId: user.id,
        artistStatement: `${artistData.statementRu}\n\n---\n\n${artistData.statementEn}`,
        websiteUrl: artistData.websiteUrl,
        location: artistData.location,
        verified: artistData.verified,
        tier: artistData.tier,
      },
    })

    // Upsert ExhibitionHall
    await prisma.exhibitionHall.upsert({
      where: { slug: artistData.hall.slug },
      update: {
        title: `${artistData.hall.titleRu} / ${artistData.hall.titleEn}`,
        description: `${artistData.hall.descriptionRu}\n\n${artistData.hall.descriptionEn}`,
        coverImageUrl: artistData.hall.coverImageUrl || `seed/artworks/${artistData.artworks[0].slug}/poster.jpg`,
        isPublished: true,
      },
      create: {
        artistId: artist.id,
        slug: artistData.hall.slug,
        title: `${artistData.hall.titleRu} / ${artistData.hall.titleEn}`,
        description: `${artistData.hall.descriptionRu}\n\n${artistData.hall.descriptionEn}`,
        coverImageUrl: artistData.hall.coverImageUrl || `seed/artworks/${artistData.artworks[0].slug}/poster.jpg`,
        isPublished: true,
      },
    })

    // Upsert Artworks
    for (const awData of artistData.artworks) {
      const posterUrl = `seed/artworks/${awData.slug}/poster.jpg`
      const modelUrl = awData.mediaType === 'MODEL_3D' ? `seed/artworks/${awData.slug}/model.glb` : null

      const artwork = await prisma.artwork.upsert({
        where: { id: makeDeterministicId(artistData.slug, awData.slug) },
        update: {
          title: `${awData.titleRu} / ${awData.titleEn}`,
          description: `${awData.descriptionRu}\n\n---\n\n${awData.descriptionEn}`,
          year: awData.year,
          medium: awData.medium,
          dimensions: awData.dimensions,
          category: awData.category as any,
          styleTags: awData.styleTags,
          mediaType: awData.mediaType,
          posterUrl,
          modelUrl,
          software: (awData.software as any) ?? null,
          isScanned: awData.isScanned ?? false,
          polyCount: awData.polyCount ?? null,
          price: awData.price,
          status: awData.status as any,
          editionType: awData.editionType as any,
        },
        create: {
          id: makeDeterministicId(artistData.slug, awData.slug),
          artistId: artist.id,
          title: `${awData.titleRu} / ${awData.titleEn}`,
          description: `${awData.descriptionRu}\n\n---\n\n${awData.descriptionEn}`,
          year: awData.year,
          medium: awData.medium,
          dimensions: awData.dimensions,
          category: awData.category as any,
          styleTags: awData.styleTags,
          images: [posterUrl],
          mediaType: awData.mediaType,
          posterUrl,
          modelUrl,
          software: (awData.software as any) ?? null,
          isScanned: awData.isScanned ?? false,
          polyCount: awData.polyCount ?? null,
          price: awData.price,
          status: awData.status as any,
          editionType: awData.editionType as any,
        },
      })

      // Upsert ArtKey
      const keyCode = makeKeyCode(YEAR, `${artistData.slug}/${awData.slug}`)
      const ownerKey = makeOwnerKey(`${artistData.slug}/${awData.slug}`)

      const existingArtKey = await prisma.artKey.findUnique({ where: { keyCode } })
      let artKey = existingArtKey

      if (!existingArtKey) {
        const integrityHash = computeIntegrityHash(artwork.id, keyCode, artist.id, artwork.createdAt.toISOString())

        artKey = await prisma.artKey.create({
          data: {
            artworkId: artwork.id,
            keyCode,
            ownerKey,
            certificateHash: sha256hex(`${artwork.id}:${keyCode}:${ownerKey}:${artwork.createdAt.toISOString()}`),
            integrityHash,
          },
        })
        total.artKeys++
      }

      // Upsert ProvenanceRecords
      const existingProv = await prisma.provenanceRecord.findFirst({
        where: { artworkId: artwork.id, sequence: 0 },
      })

      if (!existingProv) {
        const issuedAt = artwork.createdAt.toISOString()

        // Genesis record
        const genesisHash = computeRecordHash({
          artworkId: artwork.id,
          sequence: 0,
          eventType: 'CREATION',
          actor: artist.id,
          occurredAt: issuedAt,
          prevRecordHash: artKey!.integrityHash,
        })

        await prisma.provenanceRecord.create({
          data: {
            artworkId: artwork.id,
            artKeyId: artKey!.id,
            sequence: 0,
            toUserId: user.id,
            transferType: 'CREATION',
            recordHash: genesisHash,
            prevRecordHash: artKey!.integrityHash,
          },
        })
        total.provenance++

        let prevHash = genesisHash

        // Extra provenance records (LISTED, SOLD, etc.)
        if (awData.extraProvenance) {
          for (let i = 0; i < awData.extraProvenance.length; i++) {
            const ep = awData.extraProvenance[i]
            const collector = COLLECTORS.find((c) => c.email === ep.toEmail)
            const collectorUser = await prisma.user.findUnique({ where: { email: ep.toEmail } })
            if (!collectorUser) continue

            const seq = i + 1
            const transferType = ep.type as any
            const occurredAt = new Date(Date.now() + seq * 86400000).toISOString()

            const recHash = computeRecordHash({
              artworkId: artwork.id,
              sequence: seq,
              eventType: ep.type,
              actor: collectorUser.id,
              occurredAt,
              prevRecordHash: prevHash,
            })

            await prisma.provenanceRecord.create({
              data: {
                artworkId: artwork.id,
                artKeyId: artKey!.id,
                sequence: seq,
                fromUserId: seq === 1 ? user.id : undefined,
                toUserId: collectorUser.id,
                transferType,
                price: awData.price ?? undefined,
                recordHash: recHash,
                prevRecordHash: prevHash,
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

  console.log(`\n✅ Seed complete: ${total.artworks} artworks, ${total.artKeys} art keys, ${total.provenance} provenance records\n`)
}

function makeDeterministicId(artistSlug: string, artworkSlug: string): string {
  // Deterministic UUIDv7-like ID from slug combo — stable across re-runs
  const hash = sha256hex(`${artistSlug}/${artworkSlug}`)
  // Format as UUID: 8-4-4-4-12
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-7${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
