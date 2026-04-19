'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useAuthStore } from '@/lib/auth-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Badge, Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, AlertCircle, Users } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface SoulCardData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  assignedMemberName?: string;
  daysSinceLastFollowUp?: number | null;
  outreachName?: string;
}

const KANBAN_STATUSES = ['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'];

function SoulCard({ 
  soul, 
  isDragging, 
  isSelected, 
  onToggleSelect, 
  canSelect 
}: { 
  soul: SoulCardData; 
  isDragging?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  canSelect?: boolean;
}) {
  const router = useRouter();
  
  // RAG Status: Red/Amber/Green based on follow-up timing
  const getRAGStatus = (status: string, daysSinceLastFollowUp: number | null | undefined) => {
    // Converted, Not Interested, Lost Contact = GREEN (no follow-up needed)
    if (status === 'Converted' || status === 'Not Interested' || status === 'Lost Contact') {
      return { label: 'All Good', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
    }

    // No follow-up logged yet = RED (critical)
    if (daysSinceLastFollowUp === null || daysSinceLastFollowUp === undefined) {
      return { label: 'Critical', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-l-rose-500' };
    }

    // New or Following Up: RED if >= 3 days, AMBER if 2 days, GREEN if < 2 days
    if (status === 'New' || status === 'Following Up') {
      if (daysSinceLastFollowUp >= 3) {
        return { label: 'Critical', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-l-rose-500' };
      } else if (daysSinceLastFollowUp >= 2) {
        return { label: 'Monitor', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-l-amber-500' };
      } else {
        return { label: 'All Good', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
      }
    }

    // Interested: RED if >= 5 days, AMBER if 3-4 days, GREEN if < 3 days
    if (status === 'Interested') {
      if (daysSinceLastFollowUp >= 5) {
        return { label: 'Critical', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-l-rose-500' };
      } else if (daysSinceLastFollowUp >= 3) {
        return { label: 'Monitor', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-l-amber-500' };
      } else {
        return { label: 'All Good', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
      }
    }

    // Default GREEN
    return { label: 'All Good', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
  };

  const ragStatus = getRAGStatus(soul.status, soul.daysSinceLastFollowUp);

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${ragStatus.borderColor} ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'border-2 border-primary' : ''}`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1" onClick={() => router.push(`/souls/${soul.id}`)}>
            {canSelect && onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(soul.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
            )}
            <div>
              <p className="font-semibold">
                {soul.firstName} {soul.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{soul.phone}</p>
            </div>
          </div>
          <Badge className={`${ragStatus.bgColor} ${ragStatus.textColor} text-xs font-semibold border-0`}>
            {ragStatus.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {soul.outreachName || 'Ad-hoc'}
          </Badge>
        </div>
        {soul.assignedMemberName && (
          <p className="text-xs text-muted-foreground">
            Assigned to: {soul.assignedMemberName}
          </p>
        )}
        {(soul.status === 'New' || soul.status === 'Following Up' || soul.status === 'Interested') && (
          <div className="text-xs text-muted-foreground">
            {soul.daysSinceLastFollowUp === null || soul.daysSinceLastFollowUp === undefined ? (
              <span>No follow-up logged</span>
            ) : (
              <span>Last contact: {soul.daysSinceLastFollowUp} day{soul.daysSinceLastFollowUp !== 1 ? 's' : ''} ago</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  status,
  souls,
  count,
  selectedSouls,
  onToggleSelect,
  canSelect,
}: {
  status: string;
  souls: SoulCardData[];
  count: number;
  selectedSouls?: Set<string>;
  onToggleSelect?: (id: string) => void;
  canSelect?: boolean;
}) {
  return (
    <div className="flex-1 min-w-[280px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{status}</CardTitle>
            <Badge variant="secondary">{count}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {souls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No souls in this stage
            </p>
          ) : (
            souls.map((soul) => (
              <div key={soul.id} data-soul-id={soul.id}>
                <SoulCard 
                  soul={soul} 
                  isSelected={selectedSouls?.has(soul.id)}
                  onToggleSelect={onToggleSelect}
                  canSelect={canSelect}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SoulsKanbanPage() {
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { souls, filters, loading, fetchSouls, updateSoulStatus, setFilters, updateSoulOptimistic } = useSoulsStore();
  const { activeRole } = useAuthStore();

  const [activeSoul, setActiveSoul] = useState<SoulCardData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSouls, setSelectedSouls] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignMemberId, setBulkAssignMemberId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const canBulkAssign = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (api) {
      fetchSouls(api);
    }
  }, [api, filters]);

  useEffect(() => {
    // Fetch members when bulk assign modal opens
    if (showBulkAssign && api && members.length === 0) {
      fetchMembers();
    }
  }, [showBulkAssign, api]);

  const fetchMembers = async () => {
    if (!api) return;
    setLoadingMembers(true);
    try {
      const response = await api.members.list({ page: 1, limit: 100 });
      if (response.success && response.data) {
        // PaginatedResponse has data array inside
        const membersList = response.data.data || [];
        setMembers(membersList.map((m: any) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast({
        title: 'Failed to load members',
        description: 'Could not fetch member list',
        variant: 'destructive',
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ search: value });
  };

  const toggleSoulSelection = (soulId: string) => {
    const newSelection = new Set(selectedSouls);
    if (newSelection.has(soulId)) {
      newSelection.delete(soulId);
    } else {
      newSelection.add(soulId);
    }
    setSelectedSouls(newSelection);
  };

  const selectAll = () => {
    setSelectedSouls(new Set(souls.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedSouls(new Set());
  };

  const handleBulkAssign = async () => {
    if (!api || selectedSouls.size === 0 || !bulkAssignMemberId) {
      toast({
        title: 'Invalid selection',
        description: 'Please select souls and a member to assign to',
        variant: 'destructive',
      });
      return;
    }

    setBulkAssigning(true);
    try {
      const response = await api.souls.bulkReassign({
        soulIds: Array.from(selectedSouls),
        assignedMemberId: bulkAssignMemberId,
      });

      if (response.success) {
        toast({
          title: 'Bulk assignment successful',
          description: `${response.data.reassignedCount} soul(s) reassigned`,
        });
        setSelectedSouls(new Set());
        setShowBulkAssign(false);
        setBulkAssignMemberId('');
        await fetchSouls(api);
      }
    } catch (error: any) {
      toast({
        title: 'Bulk assignment failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const soulId = event.active.id as string;
    const soul = souls.find((s) => s.id === soulId);
    if (soul) {
      setActiveSoul({
        id: soul.id,
        firstName: soul.firstName,
        lastName: soul.lastName,
        phone: soul.phone,
        status: soul.status,
        assignedMemberName: soul.assignedMemberName,
        daysSinceLastFollowUp: soul.daysSinceLastFollowUp,
        outreachName: soul.outreachName,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSoul(null);

    if (!over || !api) return;

    const soulId = active.id as string;
    const newStatus = over.id as string;
    const soul = souls.find((s) => s.id === soulId);

    if (!soul || soul.status === newStatus) return;

    // Optimistic update
    updateSoulOptimistic(soulId, { status: newStatus });

    try {
      await updateSoulStatus(api, soulId, newStatus);
      toast({
        title: 'Status updated',
        description: `Soul moved to ${newStatus}`,
      });
    } catch (error: any) {
      // Revert on error
      updateSoulOptimistic(soulId, { status: soul.status });
      toast({
        title: 'Failed to update status',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  // Group souls by status for Kanban columns
  const soulsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = souls.filter((soul) => soul.status === status);
    return acc;
  }, {} as Record<string, typeof souls>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Souls Pipeline</h1>
          <p className="text-muted-foreground">Track souls through the conversion journey</p>
        </div>
        <div className="flex gap-2">
          {canBulkAssign && selectedSouls.size > 0 && (
            <Button variant="outline" onClick={() => setShowBulkAssign(true)}>
              <Users className="mr-2 h-4 w-4" />
              Assign {selectedSouls.size} Soul{selectedSouls.size !== 1 ? 's' : ''}
            </Button>
          )}
          <Button onClick={() => router.push('/souls/capture')}>
            <Plus className="mr-2 h-4 w-4" />
            Capture Soul
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search souls..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {canBulkAssign && souls.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            {selectedSouls.size > 0 && (
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Assignment Modal */}
      {showBulkAssign && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Bulk Assign {selectedSouls.size} Soul{selectedSouls.size !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="bulkAssignMember" className="block text-sm font-medium mb-2">
                Assign to Member
              </label>
              {loadingMembers ? (
                <p className="text-sm text-muted-foreground">Loading members...</p>
              ) : (
                <select
                  id="bulkAssignMember"
                  value={bulkAssignMemberId}
                  onChange={(e) => setBulkAssignMemberId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Select the member to assign these souls to
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleBulkAssign} 
                disabled={bulkAssigning || !bulkAssignMemberId || loadingMembers}
              >
                {bulkAssigning ? 'Assigning...' : 'Assign Souls'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkAssign(false);
                  setBulkAssignMemberId('');
                }}
                disabled={bulkAssigning}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && souls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading souls...</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map((status) => (
              <div key={status} id={status} className="flex-1 min-w-[280px]">
                <KanbanColumn
                  status={status}
                  souls={soulsByStatus[status] || []}
                  count={soulsByStatus[status]?.length || 0}
                  selectedSouls={selectedSouls}
                  onToggleSelect={toggleSoulSelection}
                  canSelect={canBulkAssign}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeSoul ? <SoulCard soul={activeSoul} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {!loading && souls.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No souls found. Start by capturing your first soul!
          </p>
          <Button onClick={() => router.push('/souls/capture')}>
            <Plus className="mr-2 h-4 w-4" />
            Capture Soul
          </Button>
        </div>
      )}
    </div>
  );
}
