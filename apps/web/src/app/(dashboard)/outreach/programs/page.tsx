'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOutreachStore } from '@/stores/outreach-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@kairos/ui';
import { Plus, Search, UserPlus, CheckCircle2, Users } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';
import { formatShortDate } from '@/lib/date-format';

type ProgramTab = 'active' | 'completed';

export default function OutreachProgramsPage() {
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { activeRole, user } = useAuthStore();
  const {
    programs,
    filters,
    pagination,
    loading,
    error,
    fetchPrograms,
    setFilters,
    setPage,
  } = useOutreachStore();

  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProgramTab>('active');

  const canCreateProgram = activeRole === 'admin' || (activeRole as string) === 'pastor' || (activeRole as string) === 'leader';
  const isMember = activeRole === 'member';
  const canRegister = activeRole === 'member' || (activeRole as string) === 'pastor' || (activeRole as string) === 'leader';

  // Initialize - fetch programs with proper branch isolation
  useEffect(() => {
    if (api) {
      // Don't set any filters - let backend handle branch isolation
      fetchPrograms(api);
    }
  }, [api]);

  // Fetch programs when filters or page changes
  useEffect(() => {
    if (api) {
      console.log('Fetching programs - filters:', filters, 'page:', pagination.page);
      fetchPrograms(api);
    }
  }, [api, filters, pagination.page]);

  // Refresh programs when page comes into focus (e.g., after navigating back)
  useEffect(() => {
    const handleFocus = () => {
      if (api) {
        console.log('Page focused - refreshing programs');
        fetchPrograms(api);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [api, fetchPrograms]);

  const handleSearch = (value: string) => {
    setFilters({ search: value });
  };

  const handleTabChange = (tab: ProgramTab) => {
    setActiveTab(tab);
    setPage(1); // Reset to first page when changing tabs
  };

  const handleCreateProgram = () => {
    router.push('/outreach/programs/new');
  };

  const handleViewProgram = (id: string, scrollTo?: string) => {
    if (scrollTo) {
      router.push(`/outreach/programs/${id}?scrollTo=${scrollTo}`);
    } else {
      router.push(`/outreach/programs/${id}`);
    }
  };

  const handleQuickRegister = async (e: React.MouseEvent, programId: string) => {
    e.stopPropagation();
    
    if (!api || !user?.id) return;

    setRegistering(programId);
    try {
      await api.outreach.programs.registerWorker(programId, {
        memberId: user.id,
      });

      toast({
        title: 'Registration successful',
        description: 'You have been registered for this outreach program',
      });

      // Refresh programs list to update registration status
      await fetchPrograms(api);
    } catch (error: unknown) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setRegistering(null);
    }
  };

  // Apply client-side filtering to ensure correct programs show in each tab
  const filteredPrograms = programs.filter((program) => {
    if (activeTab === 'active') {
      return program.isCompleted === false;
    } else {
      return program.isCompleted === true;
    }
  });

  // Count programs for each tab from ALL programs (not just filtered)
  const activeCount = programs.filter((p) => p.isCompleted === false).length;
  const completedCount = programs.filter((p) => p.isCompleted === true).length;

  console.log('Programs page - Tab:', activeTab, 'Total programs:', programs.length, 'Active count:', activeCount, 'Completed count:', completedCount, 'Filtered:', filteredPrograms.length);
  console.log('Programs in list:', programs.map((p) => ({ name: p.programName, isCompleted: p.isCompleted })));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Outreach Programs</h1>
          <p className="text-muted-foreground">Manage evangelism programs and activities</p>
        </div>
        {canCreateProgram && (
          <Button onClick={handleCreateProgram}>
            <Plus className="mr-2 h-4 w-4" />
            Create Program
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-muted rounded-lg p-1 inline-flex gap-1">
        <button
          onClick={() => handleTabChange('active')}
          className={`px-4 py-2 font-medium transition-colors rounded-lg flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Programs
          <Badge variant={activeTab === 'active' ? 'default' : 'secondary'} className="ml-1">
            {activeCount}
          </Badge>
        </button>
        <button
          onClick={() => handleTabChange('completed')}
          className={`px-4 py-2 font-medium transition-colors rounded-lg flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Past Programs
          <Badge variant={activeTab === 'completed' ? 'default' : 'secondary'} className="ml-1">
            {completedCount}
          </Badge>
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs..."
            value={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Coordinator</TableHead>
              {!isMember && <TableHead>Souls Reached</TableHead>}
              {!isMember && <TableHead>Registered</TableHead>}
              <TableHead>Status</TableHead>
              {canRegister && <TableHead>Registration</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && filteredPrograms.length === 0 ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} aria-busy="true">
                    <TableCell colSpan={canRegister ? 8 : 7} className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-1/4 animate-pulse rounded bg-muted/60" />
                        <div className="h-4 w-1/6 animate-pulse rounded bg-muted/40" />
                        <div className="h-4 w-1/5 animate-pulse rounded bg-muted/40" />
                        <div className="ml-auto h-7 w-16 animate-pulse rounded bg-muted/40" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : filteredPrograms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canRegister ? 8 : 7} className="text-center py-8">
                  {activeTab === 'active' 
                    ? 'No active programs currently.' 
                    : 'No past programs found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPrograms.map((program) => {
                // Registration logic:
                // 1. Members: Can always register for programs in their branch
                // 2. Pastor/Leader: Can ONLY register if:
                //    - Admin created the program AND
                //    - Coordinator is "Kharis" (not a specific person)
                const userCreatedProgram = program.createdBy && program.createdBy === user?.id;
                
                // For pastor/leader: can only register if admin created it AND coordinator is "Kharis"
                const isKharisCoordinator = program.coordinatorName === 'Kharis';
                const canRegisterForProgram = isMember || 
                  (canRegister && !userCreatedProgram && program.creatorRole === 'admin' && isKharisCoordinator);

                console.log('Program render:', {
                  name: program.programName,
                  createdBy: program.createdBy,
                  createdByName: program.createdByName,
                  creatorRole: program.creatorRole,
                  coordinatorName: program.coordinatorName,
                  isKharisCoordinator,
                  userId: user?.id,
                  activeRole,
                  userCreatedProgram,
                  canRegisterForProgram,
                  isMember,
                  shouldShowCreatorName: ((activeRole as string) === 'leader' || (activeRole as string) === 'pastor') && program.createdByName
                });

                return (
                <TableRow
                  key={program.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewProgram(program.id)}
                >
                  <TableCell className="font-medium">{program.programName}</TableCell>
                  <TableCell>
                    {formatShortDate(program.programDate)}
                  </TableCell>
                  <TableCell>{program.location}</TableCell>
                  <TableCell>{program.coordinatorName || 'Not assigned'}</TableCell>
                  {!isMember && <TableCell>{program.totalSoulsReached}</TableCell>}
                  {!isMember && (
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProgram(program.id, 'participants');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted font-semibold text-sm transition-colors"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {program.participantCount || 0} / {program.totalMembers || 0}
                      </button>
                    </TableCell>
                  )}
                  <TableCell>
                    {program.isCompleted ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  {canRegister && (
                    <TableCell>
                      {/* Show registration status */}
                      {program.isRegistered ? (
                        <Badge variant="default" className="bg-emerald-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Registered
                        </Badge>
                      ) : userCreatedProgram ? (
                        <span className="text-xs text-muted-foreground">You created this</span>
                      ) : program.createdByName ? (
                        <span className="text-xs text-muted-foreground">Created by {program.createdByName}</span>
                      ) : (
                        <Badge variant="outline">Not Registered</Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      {/* Show register button if user can register and hasn't registered yet and program is active */}
                      {canRegisterForProgram && !program.isRegistered && !program.isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleQuickRegister(e, program.id)}
                          disabled={registering === program.id}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          {registering === program.id ? 'Registering...' : 'Register'}
                        </Button>
                      )}
                      
                      {/* Show creator name for admin: Always show who created it */}
                      {activeRole === 'admin' && program.createdByName && !program.isRegistered && (
                        <span className="text-xs text-muted-foreground">
                          Created by {program.createdByName}
                        </span>
                      )}
                      
                      {/* Show "Registration closed" for completed programs */}
                      {program.isCompleted && !program.isRegistered && (
                        <span className="text-xs text-muted-foreground">
                          Registration closed
                        </span>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProgram(program.id);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => setPage(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPage(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
