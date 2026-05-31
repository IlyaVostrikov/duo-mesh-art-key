import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { AppPage, RootLayout } from './pages'
import { LandingPage } from './pages/landing'
import { LoginPage } from './pages/LoginPage'
import { DashboardHome } from './pages/dashboard/DashboardHome'
import { ModelViewer3D } from './components/artwork/ModelViewer3D'
import { GalleryPage } from './pages/gallery/GalleryPage'
import { HallPage } from './pages/hall/HallPage'
import { ArtworkDetailPage } from './pages/artwork/ArtworkDetailPage'
import { ArtistOnboarding } from './pages/onboarding/ArtistOnboarding'
import { VerifyIndexPage } from './pages/verify/VerifyIndexPage'
import { VerifyResultPage } from './pages/verify/VerifyResultPage'
import { DashboardArtworks } from './pages/dashboard/DashboardArtworks'
import { DashboardHallSettings } from './pages/dashboard/DashboardHallSettings'
import { DashboardHallLayout } from './pages/dashboard/DashboardHallLayout'
import { DashboardProfileSettings } from './pages/dashboard/DashboardProfileSettings'
import { DashboardSales } from './pages/dashboard/DashboardSales'
import { CollectionPage } from './pages/collection/CollectionPage'
import { SavedPage } from './pages/collection/SavedPage'
import { FollowingPage } from './pages/collection/FollowingPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminArtworks } from './pages/admin/AdminArtworks'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

// ─── DUO MESH Surface Routes ───

const galleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gallery',
  component: GalleryPage,
})

const hallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hall/$hallSlug',
  component: HallPage,
})

const artworkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/artwork/$artworkId',
  component: ArtworkDetailPage,
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
  component: ArtistOnboarding,
})

// Verification routes
const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify',
  component: VerifyIndexPage,
})

const verifyKeyCodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify/$keyCode',
  component: VerifyResultPage,
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
  component: DashboardArtworks,
})

const dashboardHallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/hall',
  component: DashboardHallSettings,
})

const dashboardHallLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/hall/layout',
  component: DashboardHallLayout,
})

const dashboardSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/settings',
  component: DashboardProfileSettings,
})

const dashboardSalesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/sales',
  component: DashboardSales,
})

// Collection routes
const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection',
  component: CollectionPage,
})

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection/saved',
  component: SavedPage,
})

// 3D viewer spike — test route for model-viewer integration
const viewer3dRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/viewer/3d',
  component: () => {
    const demoModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'
    const demoPoster = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.jpg'
    return (
      <section className="mx-auto w-full max-w-4xl px-5 py-8">
        <h1 className="text-2xl font-bold mb-2">3D Viewer Spike</h1>
        <p className="text-muted-foreground mb-6">Проверка интеграции @google/model-viewer с seed-моделью.</p>
        <div className="rounded-xl overflow-hidden border bg-black" style={{ height: '70vh' }} data-lenis-prevent>
          <ModelViewer3D modelUrl={demoModel} posterUrl={demoPoster} iosSrc={demoModel.replace('.glb', '.usdz')} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Модель: DamagedHelmet (glTF-Sample-Assets, CC-BY 4.0).<br />
          Проверить: орбита (drag), зум (scroll), авто-rotate, poster до загрузки.
        </p>
      </section>
    )
  },
})

const followingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/following',
  component: FollowingPage,
})

// Admin routes
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboard,
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: AdminUsers,
})

const adminArtworksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/artworks',
  component: AdminArtworks,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute,
  galleryRoute,
  hallRoute,
  artworkRoute,
  viewer3dRoute,
  onboardingRoute,
  dashboardRoute,
  dashboardArtworksRoute,
  dashboardHallRoute,
  dashboardHallLayoutRoute,
  dashboardSettingsRoute,
  dashboardSalesRoute,
  collectionRoute,
  savedRoute,
  followingRoute,
  adminRoute,
  adminUsersRoute,
  adminArtworksRoute,
  verifyRoute,
  verifyKeyCodeRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
