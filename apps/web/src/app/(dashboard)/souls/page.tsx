'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useAuthStore } from '@/lib/auth-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CustomSelect } from '@kairos/ui';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, Check, ChevronDown } from 'lucide-react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  getSoulDisposition,
  getSoulDropRule,
  getSoulLane,
  SOUL_PIPELINE_LANES,
} from './_components/drag-rules';

interface SoulCardData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  assignedMemberName?: string;
  assignedMemberAvatar?: string;
  daysSinceLastFollowUp?: number | null;
  outreachName?: string;
}

const KANBAN_STATUSES = [...SOUL_PIPELINE_LANES];

type RAGLabel = 'Critical' | 'Monitor' | 'On Track';

// RAG Status: Red/Amber/Green based on follow-up timing
function getRAGStatus(status: string, daysSinceLastFollowUp: number | null | undefined) {
    const CRITICAL = { label: 'Critical' as RAGLabel, bgColor: 'bg-rose-100 dark:bg-rose-950/50', textColor: 'text-rose-700 dark:text-rose-300', borderColor: 'border-l-rose-500', dotColor: 'bg-rose-500' };
    const MONITOR  = { label: 'Monitor'  as RAGLabel, bgColor: 'bg-amber-100 dark:bg-amber-950/50', textColor: 'text-amber-700 dark:text-amber-300', borderColor: 'border-l-amber-500', dotColor: 'bg-amber-500' };
    const ON_TRACK = { label: 'On Track' as RAGLabel, bgColor: 'bg-emerald-100 dark:bg-emerald-950/50', textColor: 'text-emerald-700 dark:text-emerald-300', borderColor: 'border-l-emerald-500', dotColor: 'bg-emerald-500' };

    // Converted, Not Interested, Lost Contact = GREEN (no follow-up needed)
    if (status === 'Converted' || status === 'Not Interested' || status === 'Lost Contact') {
      return ON_TRACK;
    }

    // No follow-up logged yet = RED (critical)
    if (daysSinceLastFollowUp === null || daysSinceLastFollowUp === undefined) {
      return CRITICAL;
    }

    // New or Following Up: RED if >= 3 days, AMBER if 2 days, GREEN if < 2 days
    if (status === 'New' || status === 'Following Up') {
      if (daysSinceLastFollowUp >= 3) return CRITICAL;
      if (daysSinceLastFollowUp >= 2) return MONITOR;
      return ON_TRACK;
    }

    // Interested: RED if >= 5 days, AMBER if 3-4 days, GREEN if < 3 days
    if (status === 'Interested') {
      if (daysSinceLastFollowUp >= 5) return CRITICAL;
      if (daysSinceLastFollowUp >= 3) return MONITOR;
      return ON_TRACK;
    }

    // Default GREEN
    return ON_TRACK;
}

function SoulCard({ 
  soul, 
  isDragging, 
  isSelected, 
  onToggleSelect, 
  canSelect,
  variant = 'default',
}: { 
  soul: SoulCardData; 
  isDragging?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  canSelect?: boolean;
  variant?: 'default' | 'preview';
}) {
  const router = useRouter();
  
  const ragStatus = getRAGStatus(soul.status, soul.daysSinceLastFollowUp);
  const disposition = getSoulDisposition(soul.status);

  // Initials fallback for assignee avatar
  const assigneeInitials = soul.assignedMemberName
    ? soul.assignedMemberName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : null;

  return (
    <Card
      className={
        variant === 'preview'
          ? 'pointer-events-none w-[280px] rotate-[1deg] border-[#5D3FD3]/15 bg-background/80 opacity-80 shadow-[0_16px_34px_rgba(15,23,42,0.14)] ring-1 ring-[#5D3FD3]/10 backdrop-blur-sm'
          : `cursor-pointer hover:shadow-ambient transition-shadow select-none ${
              isDragging ? 'opacity-50' : ''
            }`
      }
    >
      <CardContent className="p-3">
        {/* Zone 1 — identity + RAG */}
        <div
          className="flex items-start gap-2"
          onClick={() => router.push(`/souls/${soul.id}`)}
        >
          {canSelect && onToggleSelect && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onToggleSelect(soul.id); }}
              className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-foreground/10 border border-foreground/60 shadow-[0_0_0_2px_hsl(var(--foreground)/0.15)]'
                  : 'border border-foreground/30 bg-transparent hover:border-foreground/50'
              }`}
              aria-label={isSelected ? 'Deselect soul' : 'Select soul'}
            >
              {isSelected && <Check className="h-3 w-3 text-foreground" strokeWidth={2.5} />}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${ragStatus.dotColor}`} />
              <p className="font-semibold leading-tight">{soul.firstName} {soul.lastName}</p>
            </div>
            <p className="text-xs text-muted-foreground">{soul.phone}</p>
            {disposition && (
              <span
                className={`mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  disposition === 'Interested'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : disposition === 'Not Interested'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300'
                }`}
              >
                {disposition}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="my-2.5 border-foreground/10" />

        {/* Zone 2 — assignee + follow-up log */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            {soul.assignedMemberName ? (
              <>
                {soul.assignedMemberAvatar ? (
                  <img
                    src={soul.assignedMemberAvatar}
                    alt={soul.assignedMemberName}
                    className="h-6 w-6 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="h-6 w-6 rounded bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {assigneeInitials}
                  </span>
                )}
                <span className="text-xs text-muted-foreground truncate">{soul.assignedMemberName}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unassigned</span>
            )}
          </div>
          {(soul.status === 'New' || soul.status === 'Following Up' || soul.status === 'Interested') && (
            <p className="text-xs text-muted-foreground">
              {soul.daysSinceLastFollowUp === null || soul.daysSinceLastFollowUp === undefined
                ? 'No follow-up logged'
                : soul.daysSinceLastFollowUp === 0
                  ? 'Last contact: Today'
                  : `Last contact: ${soul.daysSinceLastFollowUp} day${soul.daysSinceLastFollowUp !== 1 ? 's' : ''} ago`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DraggableSoulCard({
  soul,
  isSelected,
  onToggleSelect,
  canSelect,
}: {
  soul: SoulCardData;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  canSelect?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: soul.id,
    data: { status: soul.status },
    disabled: !!isSelected,
  });

  return (
    <div
      ref={setNodeRef}
      {...(!isSelected ? attributes : {})}
      {...(!isSelected ? listeners : {})}
    >
      <SoulCard
        soul={soul}
        isDragging={isDragging}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        canSelect={canSelect}
      />
    </div>
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
  const { setNodeRef, isOver, active } = useDroppable({ id: status });
  const fromStatus = active?.data.current?.status as string | undefined;
  const dropRule = getSoulDropRule(fromStatus, status);
  const isValidDropTarget = isOver && dropRule.allowed;
  const isInvalidDropTarget = isOver && !!fromStatus && !dropRule.allowed && fromStatus !== status;

  return (
    <div className="flex-1 min-w-[280px]">
      <Card className="bg-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{status}</CardTitle>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded text-xs font-semibold bg-foreground/10 text-foreground/60">{count}</span>
          </div>
        </CardHeader>
        <CardContent
          ref={setNodeRef}
          className={`space-y-2 px-2 pb-2 pt-0 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin rounded-md transition-colors ${
            isValidDropTarget
              ? 'bg-primary/5 ring-2 ring-[#5D3FD3]/35 shadow-inner'
              : isInvalidDropTarget
                ? 'bg-muted/70 ring-1 ring-foreground/10'
                : ''
          }`}
        >
          {souls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No souls in this stage
            </p>
          ) : (
            souls.map((soul) => (
              <div key={soul.id} data-soul-id={soul.id}>
                <DraggableSoulCard
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

  type SortOption = 'date-added' | 'name' | 'last-contact';

  const [activeSoul, setActiveSoul] = useState<SoulCardData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ragFilter, setRagFilter] = useState<RAGLabel | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMembers = async () => {
    if (!api) return;
    setLoadingMembers(true);
    try {
      const response = await api.members.list({ page: 1, limit: 100 });
      if (response.success && response.data) {
        // PaginatedResponse has data array inside
        const membersList = response.data.data || [];
        setMembers(membersList.map((m) => ({
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
          description: `${response.data?.reassignedCount ?? 0} soul(s) reassigned`,
        });
        setSelectedSouls(new Set());
        setShowBulkAssign(false);
        setBulkAssignMemberId('');
        await fetchSouls(api);
      }
    } catch (error: unknown) {
      toast({
        title: 'Bulk assignment failed',
        description: error instanceof Error ? error.message : 'An error occurred',
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

    if (!soul) return;

    const dropRule = getSoulDropRule(soul.status, newStatus);
    if (!dropRule.allowed) {
      if (dropRule.reason) {
        toast({
          title: 'Move not available',
          description: dropRule.reason,
          variant: 'destructive',
        });
      }
      return;
    }

    // Optimistic update
    updateSoulOptimistic(soulId, { status: newStatus });

    try {
      await updateSoulStatus(api, soulId, newStatus);
      toast({
        title: 'Status updated',
        description: `Soul moved to ${newStatus}`,
      });
    } catch (error: unknown) {
      // Revert on error
      updateSoulOptimistic(soulId, { status: soul.status });
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDragCancel = () => {
    setActiveSoul(null);
  };

  // Derive unique outreach sources for the dropdown
  const uniqueSources = [...new Set(souls.map((s) => s.outreachName || 'Ad-hoc'))].sort();

  // Apply RAG filter -> source filter -> sort, then group by journey lane for Kanban columns.
  const ragFiltered = ragFilter === 'All'
    ? souls
    : souls.filter((s) => getRAGStatus(s.status, s.daysSinceLastFollowUp).label === ragFilter);

  const sourceFiltered = sourceFilter === 'All'
    ? ragFiltered
    : ragFiltered.filter((s) => (s.outreachName || 'Ad-hoc') === sourceFilter);

  const filteredSouls = [...sourceFiltered].sort((a, b) => {
    if (sortBy === 'name') {
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    }
    if (sortBy === 'last-contact') {
      const aVal = a.daysSinceLastFollowUp ?? Infinity;
      const bVal = b.daysSinceLastFollowUp ?? Infinity;
      return aVal - bVal;
    }
    // 'date-added': preserve server order (id is sequential)
    return 0;
  });

  const soulsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = filteredSouls.filter((soul) => getSoulLane(soul.status) === status);
    return acc;
  }, {} as Record<string, typeof souls>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">Souls Pipeline</h1>
          <p className="text-muted-foreground">Track souls through the conversion journey</p>
        </div>
        <div className="flex gap-2">
          {canBulkAssign && selectedSouls.size > 0 && (
            <Button variant="outline" onClick={() => setShowBulkAssign(true)}>
              <Users className="mr-2 h-4 w-4" />
              Assign {selectedSouls.size} Soul{selectedSouls.size !== 1 ? 's' : ''}
            </Button>
          )}
          <Button onClick={() => router.push('/souls/capture')} className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0">
            <Plus className="mr-2 h-4 w-4" />
            Capture Soul
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
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

        {/* RAG Status Filter + Sort */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* RAG segmented control */}
          <div className="flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06]">
            {([
              { label: 'All' as const,      display: 'All Souls', dotColor: null },
              { label: 'Critical' as const, display: 'Critical',  dotColor: 'bg-rose-500' },
              { label: 'Monitor'  as const, display: 'Monitor',   dotColor: 'bg-amber-500' },
              { label: 'On Track' as const, display: 'On Track',  dotColor: 'bg-emerald-500' },
            ]).map(({ label, display, dotColor }) => {
              const isActive = ragFilter === label;
              const count = label === 'All'
                ? souls.length
                : souls.filter((s) => getRAGStatus(s.status, s.daysSinceLastFollowUp).label === label).length;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRagFilter(label === ragFilter && label !== 'All' ? 'All' : label)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {dotColor && (
                    <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                  )}
                  {display}
                  <span className={`${isActive ? 'opacity-60' : 'opacity-50'}`}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Source filter dropdown + Sort By segmented control */}
          <div className="flex items-center gap-4">
            {uniqueSources.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Source</span>
                <div ref={sourceDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSourceDropdownOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#f0f0f3] dark:bg-white/[0.06] text-xs font-semibold text-foreground transition-colors hover:bg-[#e4e4e8] dark:hover:bg-white/[0.10]"
                  >
                    <span>{sourceFilter === 'All' ? 'All Outreach Programs' : sourceFilter}</span>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${sourceDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {sourceDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl bg-white dark:bg-[#1c1c1f] shadow-lg border border-foreground/[0.08] py-1 overflow-hidden">
                      {(['All', ...uniqueSources] as const).map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => { setSourceFilter(source); setSourceDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors ${
                            sourceFilter === source
                              ? 'bg-primary/10 text-primary dark:bg-[#5D3FD3]/20 dark:text-violet-300'
                              : 'text-foreground hover:bg-foreground/[0.05]'
                          }`}
                        >
                          {source === 'All' ? 'All Outreach Programs' : source}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sort</span>
            <div className="flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06]">
              {([
                { value: 'date-added' as const,   label: 'Date Added' },
                { value: 'name' as const,          label: 'Name' },
                { value: 'last-contact' as const,  label: 'Last Contact' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortBy(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    sortBy === value
                      ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Bulk Assignment Modal */}
      {showBulkAssign && (
        <Card className="bg-primary/5">
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
                <CustomSelect
                  id="bulkAssignMember"
                  value={bulkAssignMemberId}
                  onValueChange={setBulkAssignMemberId}
                  placeholder="Select a member"
                  options={members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
                />
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
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
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
            {activeSoul ? <SoulCard soul={activeSoul} variant="preview" /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {!loading && souls.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No souls found. Start by capturing your first soul!
          </p>
          <Button onClick={() => router.push('/souls/capture')} className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0">
            <Plus className="mr-2 h-4 w-4" />
            Capture Soul
          </Button>
        </div>
      )}
    </div>
  );
}
