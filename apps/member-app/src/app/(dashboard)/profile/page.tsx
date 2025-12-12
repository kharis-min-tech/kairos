'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, City, State 12345',
    birthDate: '1990-01-15',
    memberSince: '2020-03-01',
    emergencyContact: 'Jane Doe - (555) 987-6543',
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Implement save logic
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Personal Information
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First Name
              </label>
              {isEditing ? (
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              ) : (
                <p className="mt-1 text-gray-900">{profile.firstName}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name
              </label>
              {isEditing ? (
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              ) : (
                <p className="mt-1 text-gray-900">{profile.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              {isEditing ? (
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              ) : (
                <p className="mt-1 text-gray-900">{profile.email}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone
              </label>
              {isEditing ? (
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              ) : (
                <p className="mt-1 text-gray-900">{profile.phone}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Address
            </label>
            {isEditing ? (
              <input
                id="address"
                type="text"
                name="address"
                value={profile.address}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="birthDate"
                className="block text-sm font-medium text-gray-700"
              >
                Birth Date
              </label>
              {isEditing ? (
                <input
                  id="birthDate"
                  type="date"
                  name="birthDate"
                  value={profile.birthDate}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {new Date(profile.birthDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700">
                Member Since
              </span>
              <p className="mt-1 text-gray-900">
                {new Date(profile.memberSince).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="emergencyContact"
              className="block text-sm font-medium text-gray-700"
            >
              Emergency Contact
            </label>
            {isEditing ? (
              <input
                id="emergencyContact"
                type="text"
                name="emergencyContact"
                value={profile.emergencyContact}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile.emergencyContact}</p>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
