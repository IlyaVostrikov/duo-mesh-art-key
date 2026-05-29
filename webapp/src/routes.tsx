import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { AppPage, HomePage, RootLayout } from './pages'
import { DashboardHome } from './pages/dashboard/DashboardHome'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AppPage,
})

// Artist onboarding
const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding/artist',
  component: () => (
    <section className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-bold mb-6">Стать художником</h1>
      <p className="text-muted-foreground mb-4">
        Заполните профиль художника, чтобы получить выставочный зал и начать публиковать работы.
      </p>
      {/* Full onboarding wizard goes here — multi-step form with artist info + first artwork */}
      <div className="grid gap-4 p-6 bg-card border rounded-xl">
        <p className="text-muted-foreground">Мастер онбординга будет доступен после запуска БД.</p>
      </div>
    </section>
  ),
})

// Dashboard routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardHome,
})

const dashboardArtworksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/artworks',
  component: () => (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Мои работы</h1>
      <p className="text-muted-foreground">Управление произведениями — загрузка, редактирование, статусы.</p>
      <div className="mt-6 p-6 bg-card border rounded-xl">
        <p className="text-muted-foreground">Панель управления работами будет доступна после запуска БД.</p>
      </div>
    </section>
  ),
})

const dashboardHallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/hall',
  component: () => (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Выставочный зал</h1>
      <p className="text-muted-foreground">Настройка виртуальной галереи — описание, обложка, порядок работ.</p>
      <div className="mt-6 p-6 bg-card border rounded-xl">
        <p className="text-muted-foreground">Редактор зала будет доступен после запуска БД.</p>
      </div>
    </section>
  ),
})

const dashboardSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/settings',
  component: () => (
    <section className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Настройки профиля</h1>
      <p className="text-muted-foreground">Редактирование Artist Statement, контактов, платёжных реквизитов.</p>
    </section>
  ),
})

const dashboardSalesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/sales',
  component: () => (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Продажи</h1>
      <p className="text-muted-foreground">История продаж и выплат.</p>
    </section>
  ),
})

// Collection routes
const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection',
  component: () => (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Моя коллекция</h1>
      <p className="text-muted-foreground">Приобретённые работы и сертификаты.</p>
    </section>
  ),
})

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection/saved',
  component: () => (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Сохранённое</h1>
      <p className="text-muted-foreground">Избранные работы.</p>
    </section>
  ),
})

const followingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/following',
  component: () => (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold mb-4">Подписки</h1>
      <p className="text-muted-foreground">Отслеживаемые художники.</p>
    </section>
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  appRoute,
  onboardingRoute,
  dashboardRoute,
  dashboardArtworksRoute,
  dashboardHallRoute,
  dashboardSettingsRoute,
  dashboardSalesRoute,
  collectionRoute,
  savedRoute,
  followingRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
