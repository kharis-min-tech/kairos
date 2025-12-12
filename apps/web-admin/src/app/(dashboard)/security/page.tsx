export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-heading">
            Security & RBAC
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage roles, permissions, and access control
          </p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium">
          Add Role
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <p className="text-gray-500">
            Security and RBAC interface will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
}
