import { render } from '@testing-library/react-native';
// A real QueryClient: the screen's own query drives what the row renders.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityScreen from './community';

const mockMembersList = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...p }: { children?: React.ReactNode }) =>
      React.createElement(View, p, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = () => React.createElement(View);
  return { Search: icon, ChevronRight: icon };
});

jest.mock('@/lib/api-client', () => ({
  api: {
    members: { list: (...a: unknown[]) => mockMembersList(...a) },
    fellowships: { list: jest.fn() },
    departments: { listGlobal: jest.fn(), list: jest.fn() },
  },
}));

function renderScreen() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CommunityScreen />
    </QueryClientProvider>,
  );
}

/**
 * Exactly the shape `GET /api/members` now returns to a caller holding none of
 * the directory capabilities — an ordinary member, which is who this tab is
 * for. No email, phone, address or emergency contacts: the withheld fields are
 * absent, not null.
 */
const coreRow = {
  id: 'm-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  photoUrl: null,
  homeBranchId: 'b-1',
  branchName: 'Kharis London Central',
  memberType: 'member',
  isMinor: false,
  redacted: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Community tab — People segment on the projected row', () => {
  it('renders a row from the core projection alone', async () => {
    mockMembersList.mockResolvedValue({ success: true, data: { data: [coreRow] } });
    const { findByText } = renderScreen();

    expect(await findByText('Ada Lovelace')).toBeTruthy();
    expect(await findByText('Kharis London Central')).toBeTruthy();
  });

  it('still shows a second line when the row has no branchName', async () => {
    // The meta line used to be `branchName ?? email`. With email withheld, a
    // row without a resolved branch would have rendered a blank second line —
    // and a browse list should not be displaying an email address anyway.
    const { branchName: _branchName, ...noBranch } = coreRow;
    mockMembersList.mockResolvedValue({ success: true, data: { data: [noBranch] } });
    const { findByText } = renderScreen();

    expect(await findByText('Ada Lovelace')).toBeTruthy();
    expect(await findByText('Member')).toBeTruthy();
  });

  it('never renders an email, even if one somehow comes back', async () => {
    mockMembersList.mockResolvedValue({
      success: true,
      data: { data: [{ ...coreRow, branchName: undefined, email: 'ada@example.com' }] },
    });
    const { findByText, queryByText } = renderScreen();

    expect(await findByText('Ada Lovelace')).toBeTruthy();
    expect(queryByText('ada@example.com')).toBeNull();
  });
});
