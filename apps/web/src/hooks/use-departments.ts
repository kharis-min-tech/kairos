import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departments } from '@kairos/api-client';
import type { Department } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...departmentKeys.lists(), params] as const,
};

export function useDepartments(params?: ListParams) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => departments.list(params),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Department> & { branchId?: number; leadMemberId?: number; deputyMemberId?: number }) =>
      departments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useAssignDepartmentMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, memberId, adminOverride }: { deptId: number; memberId: number; adminOverride?: boolean }) =>
      departments.assignMember(deptId, { memberId, adminOverride }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useApproveDepartmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, requestId }: { deptId: number; requestId: number }) =>
      departments.approveRequest(deptId, { requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useDepartmentAlerts(id: number, threshold?: number) {
  return useQuery({
    queryKey: ['departments', id, 'alerts', threshold],
    queryFn: () => departments.getAlerts(id, { threshold }),
    enabled: id > 0,
  });
}
