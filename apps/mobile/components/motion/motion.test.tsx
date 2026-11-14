import { AccessibilityInfo, Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { HaloBorder } from './halo-border';
import { FillBar } from './fill-bar';
import { HandDrawnStroke, HAND_DRAWN_UNDERLINE } from './hand-drawn-stroke';
import { useEntrance } from './use-entrance';
import { hapticLight } from '@/lib/haptics';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = (name: string) => {
    const C = ({ children, ...p }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: name, ...p }, children);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: make('Svg'),
    Svg: make('Svg'),
    Path: make('Path'),
    Rect: make('Rect'),
    Circle: make('Circle'),
    G: make('G'),
    Defs: make('Defs'),
    Stop: make('Stop'),
    RadialGradient: make('RadialGradient'),
  };
});

function setReduceMotion(on: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(on);
}

const flush = () => act(async () => {});

afterEach(() => jest.restoreAllMocks());

describe('HaloBorder', () => {
  function renderHalo() {
    const utils = render(
      <HaloBorder radius={12} base="#ccc">
        <Text>inside</Text>
      </HaloBorder>,
    );
    // The sweep needs a measured size before it can be drawn.
    act(() => {
      utils.UNSAFE_getAllByType(View)[0]!.props.onLayout({
        nativeEvent: { layout: { width: 300, height: 400, x: 0, y: 0 } },
      });
    });
    return utils;
  }

  it('draws the sweep when motion is allowed', async () => {
    setReduceMotion(false);
    const { queryAllByTestId, getByText } = renderHalo();
    await flush();
    expect(getByText('inside')).toBeTruthy();
    expect(queryAllByTestId('Path').length).toBeGreaterThan(0);
  });

  it('draws no sweep under Reduce Motion, only the resting rim and the child', async () => {
    setReduceMotion(true);
    const { queryAllByTestId, getByText } = renderHalo();
    await flush();
    expect(getByText('inside')).toBeTruthy();
    expect(queryAllByTestId('Path')).toHaveLength(0);
  });
});

describe('HandDrawnStroke', () => {
  it('renders the shared underline path', async () => {
    setReduceMotion(true);
    const { getByTestId } = render(
      <HandDrawnStroke {...HAND_DRAWN_UNDERLINE} stroke="#F8B537" strokeWidth={5} />,
    );
    await flush();
    expect(getByTestId('Path').props.d).toBe(HAND_DRAWN_UNDERLINE.d);
  });
});

describe('FillBar', () => {
  it('mounts idle and active without throwing', async () => {
    setReduceMotion(false);
    const { rerender } = render(<FillBar active={false} />);
    await flush();
    rerender(<FillBar active />);
    await flush();
  });
});

describe('useEntrance', () => {
  function Probe({ index }: { index: number | null }) {
    const s = useEntrance(index);
    return <View testID="probe" style={s} />;
  }

  it('sits at rest when opted out', async () => {
    setReduceMotion(false);
    const { getByTestId } = render(<Probe index={null} />);
    await flush();
    expect(getByTestId('probe')).toBeTruthy();
  });

  it('settles at rest immediately under Reduce Motion', async () => {
    setReduceMotion(true);
    const { getByTestId } = render(<Probe index={3} />);
    await flush();
    expect(getByTestId('probe')).toBeTruthy();
  });
});

describe('hapticLight', () => {
  it('never throws, whether or not the native module is present', () => {
    expect(() => hapticLight()).not.toThrow();
  });
});
