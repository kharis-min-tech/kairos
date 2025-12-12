'use client';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Church Management System
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <span className="sr-only">View notifications</span>
            🔔
          </button>

          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">A</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium text-gray-900">
                Admin User
              </div>
              <div className="text-xs text-gray-500">admin@kairos.church</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
