export default function FellowshipsPage() {
  const fellowships = [
    {
      id: 1,
      name: 'Young Adults',
      description: 'Fellowship for ages 18-35',
      leader: 'Pastor Mike',
      meetingTime: 'Sundays 6:00 PM',
      location: 'Room 201',
      members: 25,
      joined: true,
    },
    {
      id: 2,
      name: 'Married Couples',
      description: 'Fellowship for married couples',
      leader: 'Pastor Sarah',
      meetingTime: 'Fridays 7:00 PM',
      location: 'Fellowship Hall',
      members: 18,
      joined: false,
    },
    {
      id: 3,
      name: "Men's Group",
      description: "Men's fellowship and Bible study",
      leader: 'Deacon James',
      meetingTime: 'Saturdays 8:00 AM',
      location: 'Conference Room',
      members: 12,
      joined: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fellowships</h1>
        <p className="text-gray-600">
          Connect with small groups and build meaningful relationships
        </p>
      </div>

      <div className="grid gap-6">
        {fellowships.map((fellowship) => (
          <div key={fellowship.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {fellowship.name}
                  </h3>
                  {fellowship.joined && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Member
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-1">{fellowship.description}</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Leader:</span>{' '}
                    {fellowship.leader}
                  </div>
                  <div>
                    <span className="font-medium">Meeting:</span>{' '}
                    {fellowship.meetingTime}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>{' '}
                    {fellowship.location}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    <span className="font-medium">Members:</span>{' '}
                    {fellowship.members}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                {fellowship.joined ? (
                  <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Leave Group
                  </button>
                ) : (
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Join Group
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* My Fellowship Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            My Fellowship Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Young Adults Meeting
                </p>
                <p className="text-sm text-gray-500">
                  Next meeting: Sunday, January 14 at 6:00 PM
                </p>
              </div>
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm transition-colors">
                RSVP
              </button>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Last attended:</span> January 7,
                2024
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Attendance rate:</span> 85% (17 of
                20 meetings)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
