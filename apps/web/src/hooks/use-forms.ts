import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forms } from '@kairos/api-client';
import type { Form } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const formKeys = {
  all: ['forms'] as const,
  lists: () => [...formKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...formKeys.lists(), params] as const,
  details: () => [...formKeys.all, 'detail'] as const,
  detail: (id: number) => [...formKeys.details(), id] as const,
  submissions: (formId: number, params?: ListParams) => [...formKeys.all, 'submissions', formId, params] as const,
  templates: (params?: ListParams) => [...formKeys.all, 'templates', params] as const,
};

export function useForms(params?: ListParams) {
  return useQuery({
    queryKey: formKeys.list(params),
    queryFn: () => forms.list(params),
  });
}

export function useForm(id: number) {
  return useQuery({
    queryKey: formKeys.detail(id),
    queryFn: () => forms.get(id),
    enabled: id > 0,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Form>) => forms.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.lists() });
    },
  });
}

export function useSubmitForm() {
  return useMutation({
    mutationFn: ({ formId, data }: { formId: number; data: Record<string, unknown> }) =>
      forms.submit(formId, data),
  });
}

export function useFormSubmissions(formId: number, params?: ListParams) {
  return useQuery({
    queryKey: formKeys.submissions(formId, params),
    queryFn: () => forms.listSubmissions(formId, params),
    enabled: formId > 0,
  });
}

export function useFormTemplates(params?: ListParams) {
  return useQuery({
    queryKey: formKeys.templates(params),
    queryFn: () => forms.listTemplates(params),
  });
}
