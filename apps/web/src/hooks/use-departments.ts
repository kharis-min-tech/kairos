'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Global catalogue ───────────────────────────────────────

export function useGlobalDepartments() {
  return useQuery({
    queryKey: ['departments', 'global'],
    queryFn: async () => {
      const res = await api.departments.listGlobal();
      return res.data!;
    },
  });
}

// ── Branch departments (list / detail) ─────────────────────

interface DepartmentListParams {
  page?: number;
  limit?: number;
  branchId?: string;
  departmentId?: string;
  memberId?: string;
}

export function useDepartments(params?: DepartmentListParams) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: async () => {
      const res = await api.departments.list(params);
      return res.data!;
    },
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: async () => {
      const res = await api.departments.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useMyDepartments() {
  return useQuery({
    queryKey: ['departments', 'mine'],
    queryFn: async () => {
      const res = await api.departments.mine();
      return res.data!;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      branchId: string;
      departmentId: string;
      leadMemberId: string;
      deputyMemberId?: string | null;
      description?: string | null;
      startDate?: string;
    }) => {
      const res = await api.departments.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        leadMemberId: string;
        deputyMemberId: string | null;
        description: string | null;
        endDate: string | null;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.departments.update(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useDeactivateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.departments.deactivate(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

// ── Members ────────────────────────────────────────────────

export function useDepartmentMembers(branchDeptId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'members'],
    queryFn: async () => {
      const res = await api.departments.members.list(branchDeptId);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useAddDepartmentMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      data,
    }: {
      branchDeptId: string;
      data: { memberId: string; notes?: string };
    }) => {
      const res = await api.departments.members.add(branchDeptId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useRemoveDepartmentMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      memberId,
    }: {
      branchDeptId: string;
      memberId: string;
    }) => {
      await api.departments.members.remove(branchDeptId, memberId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

// ── Join Requests ──────────────────────────────────────────

export function useMyDepartmentJoinRequests() {
  return useQuery({
    queryKey: ['departments', 'me', 'join-requests'],
    queryFn: async () => {
      const res = await api.departments.joinRequests.listMine();
      return res.data!;
    },
  });
}

export function useDepartmentJoinRequests(branchDeptId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'join-requests'],
    queryFn: async () => {
      const res = await api.departments.joinRequests.list(branchDeptId);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useCreateDepartmentJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      data,
    }: {
      branchDeptId: string;
      data: { notes?: string };
    }) => {
      const res = await api.departments.joinRequests.create(branchDeptId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useReviewDepartmentJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data: { decision: 'approved' | 'rejected'; reviewNotes?: string };
    }) => {
      // Legacy shim: 'approved' is no longer a single-step action; treat as reject for safety.
      const res = await api.departments.joinRequests.reject(branchDeptId, requestId, {
        reviewNotes: data.reviewNotes,
      });
      void data.decision;
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

// ── Recruitment pipeline mutations ─────────────────────────

export function useScheduleDepartmentInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data: {
        interviewScheduledAt: string;
        interviewFormat: 'in_person' | 'virtual';
        interviewLocation?: string;
        interviewerOneId: string;
        interviewerTwoId?: string;
      };
    }) => {
      const res = await api.departments.joinRequests.scheduleInterview(
        branchDeptId,
        requestId,
        data,
      );
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useRecordDepartmentInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data: { interviewOutcome: 'pass' | 'fail'; interviewNotes?: string };
    }) => {
      const res = await api.departments.joinRequests.recordInterview(
        branchDeptId,
        requestId,
        data,
      );
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useExtendDepartmentOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data: { offerExpiresAt?: string; offerMessage?: string; probationDays?: number };
    }) => {
      const res = await api.departments.joinRequests.extendOffer(
        branchDeptId,
        requestId,
        data,
      );
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useRespondToDepartmentOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data: { offerResponse: 'accepted' | 'declined' };
    }) => {
      const res = await api.departments.joinRequests.respondToOffer(
        branchDeptId,
        requestId,
        data,
      );
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useWithdrawDepartmentJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
    }: {
      branchDeptId: string;
      requestId: string;
    }) => {
      const res = await api.departments.joinRequests.withdraw(branchDeptId, requestId);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useRejectDepartmentJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data?: { reviewNotes?: string };
    }) => {
      const res = await api.departments.joinRequests.reject(branchDeptId, requestId, data ?? {});
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useEvaluateDepartmentProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      requestId,
      data,
    }: {
      branchDeptId: string;
      requestId: string;
      data: { probationOutcome: 'passed' | 'failed'; probationNotes?: string };
    }) => {
      const res = await api.departments.joinRequests.evaluateProbation(
        branchDeptId,
        requestId,
        data,
      );
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

// ── Followups ──────────────────────────────────────────────

export function useDepartmentFollowups(
  branchDeptId: string,
  params?: { memberId?: string; from?: string; to?: string },
) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'followups', params],
    queryFn: async () => {
      const res = await api.departments.followups.listForDepartment(branchDeptId, params);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useOverdueFollowups(branchDeptId: string, days?: number) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'followups', 'overdue', days],
    queryFn: async () => {
      const res = await api.departments.followups.listOverdue(branchDeptId, days);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useMemberFollowups(branchDeptId: string, memberId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'members', memberId, 'followups'],
    queryFn: async () => {
      const res = await api.departments.followups.listForMember(branchDeptId, memberId);
      return res.data!;
    },
    enabled: !!branchDeptId && !!memberId,
  });
}

interface CreateFollowupInput {
  contactedAt?: string;
  contactMethod: string;
  contactStatus: string;
  durationMinutes?: number | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  assignedToId?: string | null;
}

export function useCreateDepartmentFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      memberId,
      data,
    }: {
      branchDeptId: string;
      memberId: string;
      data: CreateFollowupInput;
    }) => {
      const res = await api.departments.followups.create(branchDeptId, memberId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'followups'] });
      qc.invalidateQueries({
        queryKey: ['departments', vars.branchDeptId, 'members', vars.memberId, 'followups'],
      });
    },
  });
}

export function useUpdateDepartmentFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      followupId,
      data,
    }: {
      branchDeptId: string;
      followupId: string;
      data: Partial<CreateFollowupInput>;
    }) => {
      const res = await api.departments.followups.update(branchDeptId, followupId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'followups'] });
    },
  });
}

export function useDeleteDepartmentFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      followupId,
    }: {
      branchDeptId: string;
      followupId: string;
    }) => {
      const res = await api.departments.followups.delete(branchDeptId, followupId);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'followups'] });
    },
  });
}

// ── Uniforms ───────────────────────────────────────────────

export function useDepartmentOutfits(
  branchDeptId: string,
  params?: { isActive?: boolean; genderTarget?: string },
) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'outfits', params],
    queryFn: async () => {
      const res = await api.departments.uniforms.listOutfits(branchDeptId, params);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useUniformSchedule(
  branchDeptId: string,
  params?: { from?: string; to?: string },
) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'uniform-schedule', params],
    queryFn: async () => {
      const res = await api.departments.uniforms.listSchedule(branchDeptId, params);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useUpcomingUniform(branchDeptId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'uniform-schedule', 'upcoming'],
    queryFn: async () => {
      const res = await api.departments.uniforms.upcoming(branchDeptId);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

interface CreateOutfitInput {
  name: string;
  imageUrl: string;
  genderTarget?: string;
  notes?: string | null;
}

export function useCreateOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, data }: { branchDeptId: string; data: CreateOutfitInput }) => {
      const res = await api.departments.uniforms.createOutfit(branchDeptId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'outfits'] });
    },
  });
}

export function useUpdateOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      outfitId,
      data,
    }: {
      branchDeptId: string;
      outfitId: string;
      data: Partial<CreateOutfitInput & { isActive: boolean }>;
    }) => {
      const res = await api.departments.uniforms.updateOutfit(branchDeptId, outfitId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'outfits'] });
    },
  });
}

export function useDeactivateOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, outfitId }: { branchDeptId: string; outfitId: string }) => {
      const res = await api.departments.uniforms.deactivateOutfit(branchDeptId, outfitId);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'outfits'] });
    },
  });
}

interface AssignScheduleInput {
  outfitId: string;
  serviceDate: string;
  genderTarget?: string;
  notes?: string | null;
}

export function useAssignUniform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, data }: { branchDeptId: string; data: AssignScheduleInput }) => {
      const res = await api.departments.uniforms.assignSchedule(branchDeptId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'uniform-schedule'] });
    },
  });
}

export function useRemoveUniformAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchDeptId,
      assignmentId,
    }: {
      branchDeptId: string;
      assignmentId: string;
    }) => {
      const res = await api.departments.uniforms.removeAssignment(branchDeptId, assignmentId);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'uniform-schedule'] });
    },
  });
}

// ── Rota: Templates ────────────────────────────────────────

export function useRotaTemplates(branchDeptId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'rota-templates'],
    queryFn: async () => {
      const res = await api.departments.rota.listTemplates(branchDeptId);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useCreateRotaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, data }: { branchDeptId: string; data: { name: string; weekday: number; defaultStartTime?: string | null; notes?: string | null } }) => {
      const res = await api.departments.rota.createTemplate(branchDeptId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates'] });
    },
  });
}

export function useUpdateRotaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId, data }: { branchDeptId: string; templateId: string; data: Partial<{ name: string; weekday: number; defaultStartTime: string | null; notes: string | null; isActive: boolean }> }) => {
      const res = await api.departments.rota.updateTemplate(branchDeptId, templateId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates'] });
    },
  });
}

export function useDeactivateRotaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId }: { branchDeptId: string; templateId: string }) => {
      await api.departments.rota.deactivateTemplate(branchDeptId, templateId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates'] });
    },
  });
}

// ── Rota: Slots ────────────────────────────────────────────

export function useRotaSlots(branchDeptId: string, templateId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'rota-templates', templateId, 'slots'],
    queryFn: async () => {
      const res = await api.departments.rota.listSlots(branchDeptId, templateId);
      return res.data!;
    },
    enabled: !!branchDeptId && !!templateId,
  });
}

export function useCreateRotaSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId, data }: { branchDeptId: string; templateId: string; data: { roleName: string; positionsRequired?: number; notes?: string | null; sortOrder?: number } }) => {
      const res = await api.departments.rota.createSlot(branchDeptId, templateId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates', vars.templateId, 'slots'] });
    },
  });
}

export function useDeleteRotaSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId, slotId }: { branchDeptId: string; templateId: string; slotId: string }) => {
      await api.departments.rota.deleteSlot(branchDeptId, templateId, slotId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates', vars.templateId, 'slots'] });
    },
  });
}

// ── Rota: Pool ─────────────────────────────────────────────

export function useRotaPool(branchDeptId: string, templateId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'rota-templates', templateId, 'pool'],
    queryFn: async () => {
      const res = await api.departments.rota.listPool(branchDeptId, templateId);
      return res.data!;
    },
    enabled: !!branchDeptId && !!templateId,
  });
}

export function useAddRotaPoolMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId, data }: { branchDeptId: string; templateId: string; data: { memberId: string; preferredRoleName?: string | null; weight?: number; notes?: string | null } }) => {
      const res = await api.departments.rota.addPoolMember(branchDeptId, templateId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates', vars.templateId, 'pool'] });
    },
  });
}

export function useRemoveRotaPoolMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId, poolMemberId }: { branchDeptId: string; templateId: string; poolMemberId: string }) => {
      await api.departments.rota.removePoolMember(branchDeptId, templateId, poolMemberId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-templates', vars.templateId, 'pool'] });
    },
  });
}

// ── Rota: Generation & Instances ───────────────────────────

export function useGenerateRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, templateId, data }: { branchDeptId: string; templateId: string; data: { weeks: number; startDate: string } }) => {
      const res = await api.departments.rota.generate(branchDeptId, templateId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-instances'] });
    },
  });
}

export function useRotaInstances(branchDeptId: string, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'rota-instances', params],
    queryFn: async () => {
      const res = await api.departments.rota.listInstances(branchDeptId, params);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useRotaInstance(branchDeptId: string, instanceId: string) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'rota-instances', instanceId],
    queryFn: async () => {
      const res = await api.departments.rota.getInstance(branchDeptId, instanceId);
      return res.data!;
    },
    enabled: !!branchDeptId && !!instanceId,
  });
}

export function useUpdateRotaInstanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, instanceId, data }: { branchDeptId: string; instanceId: string; data: { status: 'Draft' | 'Published' | 'Cancelled'; notes?: string | null } }) => {
      const res = await api.departments.rota.updateInstanceStatus(branchDeptId, instanceId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-instances'] });
    },
  });
}

export function useUpdateRotaAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, instanceId, assignmentId, data }: { branchDeptId: string; instanceId: string; assignmentId: string; data: Partial<{ memberId: string | null; status: 'Assigned' | 'Confirmed' | 'Declined' | 'Swapped' | 'Open'; notes: string | null }> }) => {
      const res = await api.departments.rota.updateAssignment(branchDeptId, instanceId, assignmentId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-instances', vars.instanceId] });
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-instances'] });
    },
  });
}

// ── Rota: Swap requests ────────────────────────────────────

export function useCreateRotaSwapRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, instanceId, assignmentId, data }: { branchDeptId: string; instanceId: string; assignmentId: string; data: { proposedMemberId?: string | null; reason?: string | null } }) => {
      const res = await api.departments.rota.createSwapRequest(branchDeptId, instanceId, assignmentId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-swap-requests'] });
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-instances', vars.instanceId] });
    },
  });
}

export function useRotaSwapRequests(branchDeptId: string, params?: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled' }) {
  return useQuery({
    queryKey: ['departments', branchDeptId, 'rota-swap-requests', params],
    queryFn: async () => {
      const res = await api.departments.rota.listSwapRequests(branchDeptId, params);
      return res.data!;
    },
    enabled: !!branchDeptId,
  });
}

export function useReviewRotaSwapRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchDeptId, requestId, data }: { branchDeptId: string; requestId: string; data: { decision: 'approved' | 'rejected'; reviewNotes?: string | null } }) => {
      const res = await api.departments.rota.reviewSwapRequest(branchDeptId, requestId, data);
      return res.data!;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-swap-requests'] });
      qc.invalidateQueries({ queryKey: ['departments', vars.branchDeptId, 'rota-instances'] });
    },
  });
}

// ── My Rota (cross-dept upcoming duties) ───────────────────

export function useMyRota(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['me', 'rota', params],
    queryFn: async () => {
      const res = await api.me.rota(params);
      return res.data!;
    },
  });
}
