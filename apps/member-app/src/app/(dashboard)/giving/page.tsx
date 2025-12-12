export default function GivingPage() {
  const givingHistory = [
    {
      id: 1,
      date: '2024-01-07',
      amount: 100,
      type: 'Tithe',
      method: 'Credit Card',
    },
    {
      id: 2,
      date: '2023-12-31',
      amount: 250,
      type: 'Special Offering',
      method: 'Bank Transfer',
    },
    {
      id: 3,
      date: '2023-12-24',
      amount: 100,
      type: 'Tithe',
      method: 'Credit Card',
    },
  ];

  const totalGiving = givingHistory.reduce((sum, gift) => sum + gift.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Giving</h1>
        <p className="text-gray-600">
          Manage your donations and view giving history
        </p>
      </div>

      {/* Giving Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Total This Year
          </h3>
          <p className="text-3xl font-bold text-accent-600">
            ${totalGiving.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Last Gift</h3>
          <p className="text-2xl font-semibold text-gray-900">$100</p>
          <p className="text-sm text-gray-500">January 7, 2024</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Pledge Progress
          </h3>
          <p className="text-2xl font-semibold text-gray-900">75%</p>
          <p className="text-sm text-gray-500">$1,250 of $1,667</p>
        </div>
      </div>

      {/* Quick Give */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Make a Gift</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-md font-medium transition-colors">
            $25
          </button>
          <button className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-md font-medium transition-colors">
            $50
          </button>
          <button className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-md font-medium transition-colors">
            $100
          </button>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-md font-medium transition-colors">
            Custom
          </button>
        </div>
      </div>

      {/* Giving History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Giving History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {givingHistory.map((gift) => (
                <tr key={gift.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(gift.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${gift.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gift.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gift.method}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
