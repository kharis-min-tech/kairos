import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SafeguardingSection } from './safeguarding-section';

// ── Mock the hooks ─────────────────────────────────────────
const mockUpsert = vi.fn();
let healthRecordState: {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
};
let upsertState: { isPending: boolean; error: Error | null };

vi.mock('@/hooks/use-members', () => ({
  useMemberHealthRecord: () => healthRecordState,
  useUpsertMemberHealthRecord: () => ({
    mutate: mockUpsert,
    isPending: upsertState.isPending,
    error: upsertState.error,
  }),
}));

const fullRecord = {
  id: 'hr-1',
  memberId: 'member-1',
  branchId: 'branch-1',
  medicalConditions: 'Asthma',
  allergies: 'Peanuts',
  medications: 'Inhaler',
  dietaryNeeds: 'Vegetarian',
  additionalNotes: 'Carries an EpiPen',
  photoMediaConsent: true,
  medicalTreatmentConsent: false,
  dataProcessingConsent: null,
  consentRecordedBy: 'admin-1',
  consentDate: '2026-05-01',
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  healthRecordState = { data: fullRecord, isLoading: false, error: null };
  upsertState = { isPending: false, error: null };
});

describe('SafeguardingSection — redacted (no access)', () => {
  it('renders a locked placeholder and no health values', () => {
    render(<SafeguardingSection memberId="member-1" redacted canEdit={false} />);

    expect(screen.getByText(/safeguarding access/i)).toBeInTheDocument();
    // sensitive values must NOT be rendered
    expect(screen.queryByText('Asthma')).not.toBeInTheDocument();
    expect(screen.queryByText('Peanuts')).not.toBeInTheDocument();
    // no edit affordance
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});

describe('SafeguardingSection — full access', () => {
  it('renders the health record fields', () => {
    render(<SafeguardingSection memberId="member-1" redacted={false} canEdit />);

    expect(screen.getByText('Asthma')).toBeInTheDocument();
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
    expect(screen.getByText('Inhaler')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Carries an EpiPen')).toBeInTheDocument();
  });

  it('renders the three consent states as Granted / Declined / Not recorded', () => {
    render(<SafeguardingSection memberId="member-1" redacted={false} canEdit />);

    // photoMediaConsent: true → Granted
    expect(screen.getByText(/photo.*media/i).closest('div')).toHaveTextContent(/granted/i);
    // medicalTreatmentConsent: false → Declined
    expect(screen.getByText(/medical treatment/i).closest('div')).toHaveTextContent(/declined/i);
    // dataProcessingConsent: null → Not recorded
    expect(screen.getByText(/data processing/i).closest('div')).toHaveTextContent(/not recorded/i);
  });

  it('shows a loading state', () => {
    healthRecordState = { data: undefined, isLoading: true, error: null };
    render(<SafeguardingSection memberId="member-1" redacted={false} canEdit />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('surfaces the API error message', () => {
    healthRecordState = { data: undefined, isLoading: false, error: new Error('boom') };
    render(<SafeguardingSection memberId="member-1" redacted={false} canEdit />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('submits the right UpsertHealthRecordRequest shape including tri-state consent', async () => {
    render(<SafeguardingSection memberId="member-1" redacted={false} canEdit />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // edit a text field
    const allergies = screen.getByLabelText(/allergies/i);
    fireEvent.change(allergies, { target: { value: 'Shellfish' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const payload = mockUpsert.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.allergies).toBe('Shellfish');
    expect(payload.medicalConditions).toBe('Asthma');
    // tri-state consent preserved
    expect(payload.photoMediaConsent).toBe(true);
    expect(payload.medicalTreatmentConsent).toBe(false);
    expect(payload.dataProcessingConsent).toBeNull();
  });

  it('does not render an edit button when canEdit is false', () => {
    render(<SafeguardingSection memberId="member-1" redacted={false} canEdit={false} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});
