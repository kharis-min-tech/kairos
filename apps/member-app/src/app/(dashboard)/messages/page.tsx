export default function MessagesPage() {
  const messages = [
    {
      id: 1,
      from: 'Pastor John',
      subject: 'Welcome to our church family!',
      preview: 'We are so excited to have you join our community...',
      date: '2024-01-10',
      read: false,
    },
    {
      id: 2,
      from: 'Youth Ministry',
      subject: 'Youth Conference Registration Open',
      preview: "Don't miss out on this amazing opportunity to grow...",
      date: '2024-01-08',
      read: true,
    },
    {
      id: 3,
      from: 'Finance Team',
      subject: 'Year-end Giving Statement',
      preview: 'Your 2023 giving statement is now available...',
      date: '2024-01-05',
      read: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600">
          Stay connected with announcements and communications
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Inbox</h2>
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Compose
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                !message.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <p
                      className={`text-sm font-medium ${!message.read ? 'text-gray-900' : 'text-gray-600'}`}
                    >
                      {message.from}
                    </p>
                    {!message.read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        New
                      </span>
                    )}
                  </div>
                  <h3
                    className={`text-base font-medium mt-1 ${!message.read ? 'text-gray-900' : 'text-gray-700'}`}
                  >
                    {message.subject}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {message.preview}
                  </p>
                </div>
                <div className="ml-4 text-sm text-gray-500">
                  {new Date(message.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              New Message
            </span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              Archive All
            </span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-900">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
