'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Heart, PhoneCall, MapPin, Calendar, User } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, Badge, Card, CardHeader, CardBody, StatCard, Spinner, Alert } from '@/components/ui';
import { outreach } from '@kairos/api-client';

interface Participant {
  memberId: string;
  firstName: string;
  lastName: string;
  role: string | null;
  notes: string | null;
  createdAt: string;
}

interface SoulEntry {
  soulId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: string;
  assignedWorker: { memberId: string; firstName: string; lastName: string } | null;
  followUpCount: number;
  lastFollowUpDate: string | null;
  followUpOutcomes: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface ProgramDetail {
  outreachId: string;
  branchId: string;
  programName: string;
  programDate: string;
  location: string;
  address: string | null;
  city: string | null;
  description: string | null;
  totalSoulsReached: number;
  notes: string | null;
  isCompleted: boolean;
  coordinator: { memberId: string; firstName: string; lastName: string } | null;
  participants: Participant[];
  souls: SoulEntry[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, 'active' | 'pending' | 'inactive' | 'error'> = {
  'New': 'pending',
  'Following Up': 'pending',
  'Interested': 'active',
  'Converted': 'active',
  'Not Interested': 'error',
};

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function OutreachProgramDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') ?? '';

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProgram = useCallback(async () => {
    setLoading(true);
    try {
      const data = await outreach.getProgram(id);
      setProgram(data as unknown as ProgramDetail);
    } catch {
      setError('Failed to load program details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !program) {
    return <Alert variant="error">{error || 'Program not found.'}</Alert>;
  }

  const totalFollowUps = program.souls.reduce((sum, s) => sum + s.followUpCount, 0);

  const outcomeTotals: Record<string, number> = {};
  for (const soul of program.souls) {
    for (const [status, count] of Object.entries(soul.followUpOutcomes)) {
      outcomeTotals[status] = (outcomeTotals[status] || 0) + count;
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Evangelism' },
          { label: 'Outreach Programs', href: '/evangelism/outreach' },
          { label: program.programName },
        ]}
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/evangelism/outreach')} aria-label="Back to programs">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{program.programName}</h1>
            <Badge variant={program.isCompleted ? 'inactive' : 'active'}>
              {program.isCompleted ? 'Completed' : 'Active'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(program.programDate)}</span>
            <span className="flex items-center gap-1"><MapPin size={14} /> {program.location}{program.city ? `, ${program.city}` : ''}</span>
            {program.coordinator && (
              <span className="flex items-center gap-1"><User size={14} /> {program.coordinator.firstName} {program.coordinator.lastName}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Users size={20} />} label="Attendees" value={program.participants.length} />
        <StatCard icon={<Heart size={20} />} label="Souls Won" value={program.totalSoulsReached} />
        <StatCard icon={<PhoneCall size={20} />} label="Follow-ups" value={totalFollowUps} />
      </div>

      {program.description && (
        <Card className="mb-6">
          <CardBody>
            <p className="text-sm text-gray-600">{program.description}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Participants ({program.participants.length})</h2>
          </CardHeader>
          <CardBody>
            {program.participants.length === 0 ? (
              <p className="text-sm text-gray-500">No participants registered.</p>
            ) : (
              <ul className="space-y-3">
                {program.participants.map((p) => (
                  <li key={p.memberId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{p.firstName} {p.lastName}</span>
                    {p.role && <Badge variant="info">{p.role}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Souls Captured ({program.souls.length})</h2>
          </CardHeader>
          <CardBody>
            {program.souls.length === 0 ? (
              <p className="text-sm text-gray-500">No souls captured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Assigned Worker</th>
                      <th className="pb-2 font-medium">Last Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {program.souls.map((soul) => (
                      <tr key={soul.soulId}>
                        <td className="py-2 text-gray-900">{soul.firstName} {soul.lastName}</td>
                        <td className="py-2">
                          <Badge variant={STATUS_BADGE[soul.status] || 'inactive'}>{soul.status}</Badge>
                        </td>
                        <td className="py-2 text-gray-600">
                          {soul.assignedWorker
                            ? `${soul.assignedWorker.firstName} ${soul.assignedWorker.lastName}`
                            : '—'}
                        </td>
                        <td className="py-2 text-gray-600">
                          {soul.lastFollowUpDate ? formatDate(soul.lastFollowUpDate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {Object.keys(outcomeTotals).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Follow-up Outcomes Summary</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              {Object.entries(outcomeTotals).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <Badge variant={status === 'Successful' ? 'active' : status === 'Not Interested' ? 'error' : 'pending'}>
                    {status}
                  </Badge>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
