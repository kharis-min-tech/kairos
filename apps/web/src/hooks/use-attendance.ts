import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendance } from '@kairos/api-client';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const attendanceKeys = {
  all: ['attendance'] as const,
  services: () => [...attendanceKeys.all, 'services'] as const,
  serviceList: (params?: ListParams) => [...attendanceKeys.services(), params] as const,
  fellowships: () => [...attendanceKeys.all, 'fellowships'] as const,
  fellowshipList: (params?: ListParams) => [...attendanceKeys.fellowships(), params] as const,
  trends: (params?: { branchId?: number; weeks?: number }) => [...attendanceKeys.all, 'trends', params] as const,
  missing: (params?: { branchId?: number; consecutiveAbsences?: number }) => [...attendanceKeys.all, 'missing', params] as const,
};

export function useServiceAttendance(params?: ListParams) {
  return useQuery({
    queryKey: attendanceKeys.serviceList(params),
    queryFn: () => attendance.listService(params),
  });
}

export function useFellowshipAttendance(params?: ListParams) {
  return useQuery({
    queryKey: attendanceKeys.fellowshipList(params),
    queryFn: () => attendance.listFellowship(params),
  });
}

export function useRecordServiceAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      serviceDate: string;
      serviceType: string;
      branchId: number;
      records: Array<{ memberId: number; status: string }>;
    }) => attendance.recordService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.services() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.trends() });
    },
  });
}

export function useRecordFellowshipAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      meetingDate: string;
      fellowshipId: number;
      location: string;
      notes?: string;
      records: Array<{ memberId: number; status: string }>;
    }) => attendance.recordFellowship(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.fellowships() });
    },
  });
}

export function useAttendanceTrends(params?: { branchId?: number; weeks?: number }) {
  return useQuery({
    queryKey: attendanceKeys.trends(params),
    queryFn: () => attendance.getTrends(params),
  });
}

export function useMissingMembers(params?: { branchId?: number; consecutiveAbsences?: number }) {
  return useQuery({
    queryKey: attendanceKeys.missing(params),
    queryFn: () => attendance.getMissingMembers(params),
  });
}
