'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button, Badge, Spinner } from '@/components/ui';
import { souls } from '@kairos/api-client';
import type { Soul } from '@kairos/types';
import { AlertTriangle } from 'lucide-react';
import { SoulDetailModal } from './soul-detail-modal';
import { ConversionMemberForm } from './conversion-member-form';

const COLUMNS = ['New', 'Following Up', 'Interested', 'Converted'] as const;
type ColumnStatus = (typeof COLUMNS)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  'New': ['Following Up'],
  'Following Up': ['Interested', 'Not Interested'],
  'Interested': ['Converted', 'Not Interested'],
  'Converted': [],
};

const FOLLOW_UP_ALERT_DAYS = 3;

function daysSince(dateStr?: string | Date | null): number {
  if (!dateStr) return Infinity;
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function SoulCard({ soul, onClick }: { soul: Soul; onClick: () => void }) {
  const lastFollowUp = (soul as Soul & { lastFollowUpDate?: string }).lastFollowUpDate;
  const days = daysSince(lastFollowUp || soul.createdAt);
  const overdue = soul.status !== 'Converted' && soul.status !== 'Not Interested' && days >= FOLLOW_UP_ALERT_DAYS;

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('soulId', String(soul.soulId));
        e.dataTransfer.setData('currentStatus', soul.status);
      }}
      onClick={onClick}
      aria-label={`Soul: ${soul.firstName} ${soul.lastName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{soul.firstName} {soul.lastName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{soul.phone}</p>
        </div>
        {overdue && (
          <span title={`${days} days since last follow-up`} className="shrink-0 text-amber-500">
            <AlertTriangle size={16} />
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {days === Infinity ? 'No follow-up' : `${days}d since follow-up`}
      </p>
    </button>
  );
}

function KanbanColumn({
  status,
  soulsList,
  onDrop,
  onCardClick,
}: {
  status: ColumnStatus;
  soulsList: Soul[];
  onDrop: (soulId: number, fromStatus: string, toStatus: string) => void;
  onCardClick: (soul: Soul) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const soulId = Number(e.dataTransfer.getData('soulId'));
    const fromStatus = e.dataTransfer.getData('currentStatus');
    if (fromStatus !== status) {
      onDrop(soulId, fromStatus, status);
    }
  };

  const statusColors: Record<string, string> = {
    'New': 'bg-blue-50 border-blue-200',
    'Following Up': 'bg-yellow-50 border-yellow-200',
    'Interested': 'bg-purple-50 border-purple-200',
    'Converted': 'bg-green-50 border-green-200',
  };

  return (
    <div
      className={`flex flex-col rounded-lg border-2 p-3 min-h-[300px] transition-colors ${dragOver ? 'border-primary bg-purple-50' : statusColors[status] || 'border-gray-200'}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      role="region"
      aria-label={`${status} column`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{status}</h3>
        <Badge variant={status === 'Converted' ? 'default' : 'secondary'}>{soulsList.length}</Badge>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {soulsList.map((soul) => (
          <SoulCard key={soul.soulId} soul={soul} onClick={() => onCardClick(soul)} />
        ))}
        {soulsList.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No souls</p>
        )}
      </div>
    </div>
  );
}

export default function SoulsKanbanPage() {
  const [allSouls, setAllSouls] = useState<Soul[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [conversionSoul, setConversionSoul] = useState<Soul | null>(null);

  const fetchSouls = useCallback(async () => {
    try {
      const res = await souls.list({ limit: 200 });
      setAllSouls(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSouls(); }, [fetchSouls]);

  const handleDrop = async (soulId: number, fromStatus: string, toStatus: string) => {
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) return;

    // Intercept Converted — show pre-fill member registration form
    if (toStatus === 'Converted') {
      const soul = allSouls.find((s) => s.soulId === soulId);
      if (soul) setConversionSoul(soul);
      return;
    }

    // Optimistic update
    setAllSouls((prev) =>
      prev.map((s) => (s.soulId === soulId ? { ...s, status: toStatus as Soul['status'] } : s))
    );

    try {
      await souls.updateStatus(soulId, { status: toStatus });
    } catch {
      // Revert on failure
      setAllSouls((prev) =>
        prev.map((s) => (s.soulId === soulId ? { ...s, status: fromStatus as Soul['status'] } : s))
      );
    }
  };

  const handleConversionSuccess = async (memberId: number) => {
    if (!conversionSoul) return;
    try {
      await souls.updateStatus(conversionSoul.soulId, {
        status: 'Converted',
        convertedToMemberId: memberId,
      });
      setConversionSoul(null);
      fetchSouls();
    } catch {
      // Member was created but status update failed
      setConversionSoul(null);
      fetchSouls();
    }
  };

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = allSouls.filter((s) => s.status === col);
      return acc;
    },
    {} as Record<ColumnStatus, Soul[]>
  );

  return (
    <>
      <Breadcrumbs items={[{ label: 'Evangelism' }, { label: 'Souls' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Soul Tracking</h1>
        <Link href="/evangelism/souls/capture">
          <Button>+ Capture Soul</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col}
              status={col}
              soulsList={grouped[col]}
              onDrop={handleDrop}
              onCardClick={setSelectedSoul}
            />
          ))}
        </div>
      )}

      {selectedSoul && (
        <SoulDetailModal
          soul={selectedSoul}
          open={!!selectedSoul}
          onClose={() => setSelectedSoul(null)}
          onUpdate={fetchSouls}
        />
      )}

      {conversionSoul && (
        <ConversionMemberForm
          soul={conversionSoul}
          open={!!conversionSoul}
          onClose={() => setConversionSoul(null)}
          onSuccess={handleConversionSuccess}
        />
      )}
    </>
  );
}
