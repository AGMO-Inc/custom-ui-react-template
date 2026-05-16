import { Outlet, Link, useRouterState } from '@tanstack/react-router'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/map', label: 'Map' },
  { to: '/bridge', label: 'Bridge' },
  { to: '/external-api', label: 'External API' },
] as const

export function RootLayout() {
  const { location } = useRouterState()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-8">
            <span className="text-xl font-bold text-gray-900">
              SeamOS App Custom UI React Template
            </span>
            <div className="flex gap-4">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-sm font-medium ${
                    location.pathname === to
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
