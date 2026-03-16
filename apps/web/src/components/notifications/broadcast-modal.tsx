'use client';


import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal, Button, TextInput, SelectInput, Textarea } from '@/components/ui';
import { useBroadcastNotification } from '@/hooks/use-notifications';

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Message is required').max(2000),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  targetScope: z.enum(['All', 'Branch', 'Region', 'Department', 'Fellowship', 'Role', 'Leadership']),
  targetId: z.string().optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

interface BroadcastModalProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
];

const SCOPE_OPTIONS = [
  { value: 'All', label: 'All Members' },
  { value: 'Branch', label: 'Branch' },
  { value: 'Region', label: 'Region' },
  { value: 'Department', label: 'Department' },
  { value: 'Fellowship', label: 'Fellowship' },
  { value: 'Role', label: 'Role' },
  { value: 'Leadership', label: 'Leadership' },
];

export function BroadcastModal({ open, onClose }: BroadcastModalProps) {
  const broadcast = useBroadcastNotification();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema as never),
    defaultValues: {
      title: '',
      body: '',
      priority: 'Normal',
      targetScope: 'All',
    },
  });

  const targetScope = watch('targetScope');
  const needsTargetId = targetScope !== 'All' && targetScope !== 'Leadership';

  const onSubmit = (values: BroadcastFormValues) => {
    broadcast.mutate(
      {
        title: values.title,
        body: values.body,
        priority: values.priority,
        targetScope: values.targetScope,
        targetId: values.targetId ? Number(values.targetId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Broadcast sent successfully');
          reset();
          onClose();
        },
        onError: () => {
          toast.error('Failed to send broadcast');
        },
      },
    );
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Broadcast Message"
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={broadcast.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {broadcast.isPending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <SelectInput
          label="Send To"
          options={SCOPE_OPTIONS}
          error={errors.targetScope?.message}
          {...register('targetScope')}
        />

        {needsTargetId && (
          <TextInput
            label={`${targetScope} ID`}
            placeholder={`Enter ${targetScope.toLowerCase()} ID`}
            error={errors.targetId?.message}
            {...register('targetId')}
          />
        )}

        <SelectInput
          label="Priority Level"
          options={PRIORITY_OPTIONS}
          error={errors.priority?.message}
          {...register('priority')}
        />

        <TextInput
          label="Title"
          placeholder="Notification title"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Message"
          placeholder="Type your message here..."
          error={errors.body?.message}
          rows={4}
          {...register('body')}
        />
      </form>
    </Modal>
  );
}
