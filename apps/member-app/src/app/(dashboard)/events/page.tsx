export default function EventsPage() {
  const events = [
    {
      id: 1,
      title: 'Sunday Service',
      date: '2024-01-14',
      time: '10:00 AM',
      location: 'Main Sanctuary',
      description: 'Weekly worship service with Pastor John',
      registered: true,
    },
    {
      id: 2,
      title: 'Youth Conference 2024',
      date: '2024-01-20',
      time: '6:00 PM',
      location: 'Fellowship Hall',
      description: 'Annual youth conference with special guest speakers',
      registered: false,
    },
    {
      id: 3,
      title: 'Community Outreach',
      date: '2024-01-27',
      time: '9:00 AM',
      location: 'City Center',
      description: 'Serving the community with food and prayer',
      registered: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <p className="text-gray-600">
          Discover and register for upcoming church events
        </p>
      </div>

      <div className="grid gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {event.title}
                </h3>
                <p className="text-gray-600 mt-1">{event.description}</p>
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Time:</span> {event.time}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Location:</span>{' '}
                    {event.location}
                  </p>
                </div>
              </div>
              <div className="ml-4">
                {event.registered ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Registered
                  </span>
                ) : (
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Register
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
