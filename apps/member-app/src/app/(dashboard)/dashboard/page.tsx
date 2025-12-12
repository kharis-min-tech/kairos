export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Member Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here&apos;s what&apos;s happening in your church
          community.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upcoming Events
          </h3>
          <p className="text-3xl font-bold text-primary-600">3</p>
          <p className="text-sm text-gray-500">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">My Giving</h3>
          <p className="text-3xl font-bold text-accent-600">$1,250</p>
          <p className="text-sm text-gray-500">This year</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fellowship</h3>
          <p className="text-lg font-semibold text-gray-900">Young Adults</p>
          <p className="text-sm text-gray-500">Next meeting: Sunday</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
              <p className="text-sm text-gray-600">
                Registered for Sunday Service
              </p>
              <span className="text-xs text-gray-400">2 days ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-accent-600 rounded-full"></div>
              <p className="text-sm text-gray-600">Made a donation</p>
              <span className="text-xs text-gray-400">1 week ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <p className="text-sm text-gray-600">
                Joined Young Adults Fellowship
              </p>
              <span className="text-xs text-gray-400">2 weeks ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
