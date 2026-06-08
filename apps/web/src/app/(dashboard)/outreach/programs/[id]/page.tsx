'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@kairos/ui';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, MapPin, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { formatShortDate } from '@/lib/date-format';
import { useConfirm } from '@/components/confirm-dialog';

interface ProgramParticipant {
  memberId: string;
  memberName: string;
  branchName?: string;
  role?: string;
}

interface ProgramSoul {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  assignedMemberId?: string;
}

interface ProgramDetail {
  id: string;
  programName: string;
  branchId: string;
  branchName: string;
  programDate: string;
  location: string;
  city?: string;
  address?: string;
  coordinatorName?: string;
  description?: string;
  totalSoulsReached?: number;
  isCompleted: boolean;
  isOpenToAllBranches?: boolean;
  createdBy?: string;
  creatorRole?: string;
  participants?: ProgramParticipant[];
  souls?: ProgramSoul[];
  statistics?: {
    totalWorkers?: number;
    soulsByStatus?: Record<string, number>;
    conversionRate?: number;
  };
}

interface UnregisteredMember {
  id: string;
  firstName: string;
  lastName: string;
  branchName?: string;
  homeBranchId?: string;
  isActive: boolean;
}

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApi();
  const { toast } = useToast();
  const { activeRole, user } = useAuthStore();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [unregisteredMembers, setUnregisteredMembers] = useState<UnregisteredMember[]>([]);
  const [highlightSection, setHighlightSection] = useState<string | null>(null);

  const isMember = activeRole === 'member';
  const canManageProgram = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';
  const canRegister = activeRole === 'member' || activeRole === 'pastor' || activeRole === 'leader';
  
  // Debug: Log user and program creator info
  useEffect(() => {
    if (program && user) {
      console.log('Program detail - User ID:', user.id, 'Created By:', program.createdBy, 'Match:', user.id === program.createdBy);
    }
  }, [program, user]);
  
  // Can only register if:
  // 1. User is a member (always can register for their branch programs)
  // 2. User is pastor/leader AND (program is from their branch OR program is open to all branches) AND user didn't create the program
  // Note: If createdBy is null/undefined, allow registration (program was created before tracking was added)
  const userCreatedProgram = program && program.createdBy && program.createdBy === user?.id;
  const canRegisterForProgram = program && (
    isMember || 
    (canRegister && (program.branchId === user?.homeBranchId || program.isOpenToAllBranches) && !userCreatedProgram)
  );

  useEffect(() => {
    if (api && params.id) {
      fetchProgram();
    }
  }, [api, params.id]);

  useEffect(() => {
    // Handle scroll-to parameter
    const scrollTo = searchParams.get('scrollTo');
    if (scrollTo && program) {
      setTimeout(() => {
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightSection(scrollTo);
          // Remove highlight after animation
          setTimeout(() => setHighlightSection(null), 2000);
        }
      }, 300);
    }
  }, [searchParams, program]);

  const fetchProgram = async () => {
    if (!api || !params.id) return;
    setLoading(true);
    try {
      const response = await api.outreach.programs.get(params.id as string);
      if (response.success) {
        setProgram(response.data);
        // Check if current user is already registered
        if (user?.id && response.data.participants) {
          const registered = response.data.participants.some(
            (p: ProgramParticipant) => p.memberId === user.id
          );
          setIsRegistered(registered);
        }

        // Fetch unregistered members for admin/pastor/leader
        if (!isMember && response.data.branchId) {
          fetchUnregisteredMembers(
            response.data.branchId, 
            response.data.participants || [],
            response.data.isOpenToAllBranches || false
          );
        }
      }
    } catch (error: unknown) {
      toast({
        title: 'Failed to load program',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnregisteredMembers = async (branchId: string, participants: ProgramParticipant[], isOpenToAllBranches: boolean) => {
    if (!api) return;
    try {
      // Fetch all members - use max limit of 500 (API constraint)
      const response = await api.members.list({ page: 1, limit: 500 });
      if (response.success && response.data) {
        // Extract members from paginated response
        const allMembers = response.data.data || [];
        const registeredIds = new Set(participants.map((p: ProgramParticipant) => p.memberId));
        
        // For open-to-all-branches programs: show all active members
        // For branch-specific programs: show only members from that branch
        const unregistered = allMembers.filter(
          (member: UnregisteredMember) => {
            const isActive = member.isActive;
            const notRegistered = !registeredIds.has(member.id);
            const branchMatch = isOpenToAllBranches || member.homeBranchId === branchId;
            
            return isActive && notRegistered && branchMatch;
          }
        );
        
        console.log('Unregistered members:', {
          total: allMembers.length,
          registered: registeredIds.size,
          unregistered: unregistered.length,
          isOpenToAllBranches
        });
        
        setUnregisteredMembers(unregistered);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch unregistered members:', error);
      // Silently fail - just show empty list
      setUnregisteredMembers([]);
    }
  };

  const handleMarkComplete = async () => {
    if (!api || !program) return;

    const ok = await confirm({
      title: `Mark "${program.programName}" as completed?`,
      description: 'The program will be archived. You can still view its souls and history.',
      confirmLabel: 'Mark complete',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await api.outreach.programs.update(program.id, { isCompleted: true });
      toast({
        title: 'Program marked as completed',
      });
      await fetchProgram();
    } catch (error: unknown) {
      toast({
        title: 'Failed to update program',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!api || !program || !user?.id) return;

    setLoading(true);
    try {
      await api.outreach.programs.registerWorker(program.id, {
        memberId: user.id,
      });
      toast({
        title: 'Successfully registered',
        description: 'You have been registered for this program',
      });
      await fetchProgram();
    } catch (error: unknown) {
      toast({
        title: 'Failed to register',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !program) {
    return (
      <div className="container max-w-5xl mx-auto py-6 space-y-6" aria-busy="true" aria-live="polite">
        <div>
          <div className="mb-2 h-4 w-32 animate-pulse rounded bg-muted/40" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted/60" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
              <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div role="alert" className="container mx-auto py-6">
        <div className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Program not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6 space-y-6">
      {confirmDialog}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{program.programName}</h1>
          <p className="text-muted-foreground">{program.branchName}</p>
        </div>
        {program.isCompleted ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        ) : (
          <div className="flex gap-2">
            {canRegisterForProgram && !isRegistered && (
              <Button onClick={handleRegister} disabled={loading}>
                Register for Program
              </Button>
            )}
            {canRegisterForProgram && isRegistered && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Registered
              </Badge>
            )}
            {canManageProgram && (
              <Button onClick={handleMarkComplete} disabled={loading} variant="outline">
                Mark as Completed
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatShortDate(program.programDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {program.location}
                {program.city && `, ${program.city}`}
              </span>
            </div>
            {program.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{program.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Coordinator: {program.coordinatorName}</span>
            </div>
            {!isMember && program.totalSoulsReached !== undefined && (
              <div className="pt-2 mt-2">
                <p className="text-sm text-muted-foreground">Souls Reached</p>
                <p className="text-2xl font-bold">{program.totalSoulsReached}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!isMember ? (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {program.statistics && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Workers</p>
                    <p className="text-xl font-semibold">{program.statistics.totalWorkers || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Souls by Status</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {program.statistics.soulsByStatus && Object.entries(program.statistics.soulsByStatus).map(([status, count]: [string, number]) => (
                        <div key={status} className="flex justify-between text-sm">
                          <span>{status}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {program.statistics.conversionRate !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-xl font-semibold">{program.statistics.conversionRate}%</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : canRegisterForProgram ? (
          <Card>
            <CardHeader>
              <CardTitle>Your Registration Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {program.isCompleted ? (
                <div>
                  <p className="text-muted-foreground mb-3">This program has been completed</p>
                  {isRegistered ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">You participated in this program</p>
                        <p className="text-sm text-muted-foreground">Thank you for your service</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">You did not participate in this program</p>
                  )}
                </div>
              ) : isRegistered ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">You are registered</p>
                    <p className="text-sm text-muted-foreground">You are participating in this program</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-3">You are not registered for this program yet</p>
                  <Button onClick={handleRegister} disabled={loading} className="w-full">
                    Register Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {program.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{program.description}</p>
          </CardContent>
        </Card>
      )}

      {!isMember && (
        <div 
          id="participants"
          className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 ${
            highlightSection === 'participants' 
              ? 'ring-2 ring-primary rounded-lg p-1' 
              : ''
          }`}
        >
          <Card className={highlightSection === 'participants' ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Registered Workers ({program.participants?.length || 0})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {program.participants && program.participants.length > 0 ? (
                <div className="space-y-2">
                  {program.participants.map((participant: ProgramParticipant) => (
                    <div 
                      key={participant.memberId} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-foreground/5 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">{participant.memberName}</span>
                        </div>
                        {participant.branchName && (
                          <span className="text-xs text-muted-foreground ml-6">
                            {participant.branchName}
                          </span>
                        )}
                      </div>
                      {participant.role && (
                        <Badge variant="outline">
                          {participant.role}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No workers registered yet</p>
              )}
            </CardContent>
          </Card>

          <Card className={highlightSection === 'participants' ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Not Registered Yet ({unregisteredMembers.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {unregisteredMembers.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unregisteredMembers.map((member: UnregisteredMember) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-foreground/5 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </span>
                        {member.branchName && (
                          <span className="text-xs text-muted-foreground">
                            {member.branchName}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Not Registered
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">All active members are registered</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Souls Captured</CardTitle>
            <Link href={`/souls?outreachId=${program.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {program.souls && program.souls.length > 0 ? (
            <div className="space-y-2">
              {program.souls
                .filter((soul: ProgramSoul) => !isMember || soul.assignedMemberId === user?.id)
                .slice(0, 5)
                .map((soul: ProgramSoul) => (
                  <Link key={soul.id} href={`/souls/${soul.id}`}>
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg hover:bg-foreground/5 cursor-pointer">
                      <div>
                        <p className="font-medium">{soul.firstName} {soul.lastName}</p>
                        <p className="text-sm text-muted-foreground">{soul.phone}</p>
                      </div>
                      <Badge variant="secondary">{soul.status}</Badge>
                    </div>
                  </Link>
                ))}
              {program.souls.filter((soul: ProgramSoul) => !isMember || soul.assignedMemberId === user?.id).length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  And {program.souls.filter((soul: ProgramSoul) => !isMember || soul.assignedMemberId === user?.id).length - 5} more...
                </p>
              )}
              {isMember && program.souls.filter((soul: ProgramSoul) => soul.assignedMemberId === user?.id).length === 0 && (
                <p className="text-sm text-muted-foreground">You haven't captured any souls in this program yet</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No souls captured yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
