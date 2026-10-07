/**
 * Guards the value contract between the native date picker and the form engine.
 *
 * The mobile form renderer used to draw `date` fields as a plain text input with
 * a `YYYY-MM-DD` placeholder, which on a phone keyboard is a bad ask. It now
 * uses `DatePicker`, which hands back a string — and that is exactly where a
 * regression would hide. `buildFormPayload` only emits a field when its value is
 * a non-empty string, so a `Date` object would be silently *dropped* rather than
 * rejected, and a localised string ("31/01/2026") would sail through to the API
 * and fail there instead of here.
 *
 * The specific trap is `toISOString()`: it converts to UTC first, so the day it
 * reports is the day in London, not the day on the wall. That slips in both
 * directions. East of Greenwich (Lagos, or the UK on BST) UTC is behind, so a
 * date picked just after midnight comes back as the day BEFORE. West of it UTC
 * is ahead, so a date picked late in the evening comes back as the day AFTER.
 * Both of those are the whole month wrong on the 1st and the 31st.
 *
 * `DatePicker` must read the local calendar fields instead.
 *
 * The device's zone cannot be forced from in here — V8 caches it at startup, so
 * assigning `process.env.TZ` mid-run is ignored — and CI runs in UTC, where the
 * two views agree and a test that trusted the ambient zone would pass against
 * the very bug it names. So each case below stubs `toISOString` on the picked
 * Date to report the other day, which is exactly what a real device an hour off
 * Greenwich does. An implementation that reaches for it emits that day and
 * fails; one that reads the local fields is unaffected.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DatePicker } from '@kairos/ui-native';
import { BABY_NAMING_FORM, buildFormPayload, initialFormValues } from '@kairos/types';

// Drive the OS picker synchronously: render nothing, and fire the change the
// moment the stub mounts with whatever date the test wants to simulate.
let mockPickedDate = new Date(2026, 0, 31, 23, 45);
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    // Uppercase name so the hooks lint rule recognises it as a component.
    default: function MockDateTimePicker({
      onChange,
    }: {
      onChange: (e: unknown, d?: Date) => void;
    }) {
      React.useEffect(() => {
        onChange({ type: 'set' }, mockPickedDate);
      }, [onChange]);
      return null;
    },
  };
});

describe('DatePicker \u2192 form engine value contract', () => {
  beforeEach(() => {
    mockPickedDate = new Date(2026, 0, 31, 23, 45);
  });

  /**
   * Simulate picking `local` on a device whose UTC day is `utcDay` — the state
   * every device an hour either side of Greenwich is in for one hour a day.
   * Returns whatever DatePicker handed the form.
   */
  function pickOnDeviceOffsetFromUtc(
    local: [number, number, number, number, number],
    utcDay: string,
  ) {
    const picked = new Date(...local);
    Object.defineProperty(picked, 'toISOString', {
      value: () => `${utcDay}T00:00:00.000Z`,
    });
    mockPickedDate = picked;

    const onChange = jest.fn();
    render(<DatePicker value="" onChange={onChange} placeholder="Select a date" />);
    // Opening the field mounts the stub, which fires its change immediately.
    fireEvent.press(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledTimes(1);
    return onChange.mock.calls[0]![0] as string;
  }

  // Lagos is UTC+1 all year, and the UK is too from March to October.
  it('emits the local date east of Greenwich, where UTC is still on yesterday', () => {
    // Half past midnight on 1 February: UTC says the 31st of January.
    const emitted = pickOnDeviceOffsetFromUtc([2026, 1, 1, 0, 30], '2026-01-31');
    expect(emitted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(emitted).toBe('2026-02-01');
  });

  it('emits the local date west of Greenwich, where UTC is already on tomorrow', () => {
    // Quarter to midnight on 31 January: UTC says the 1st of February.
    const emitted = pickOnDeviceOffsetFromUtc([2026, 0, 31, 23, 45], '2026-02-01');
    expect(emitted).toBe('2026-01-31');
  });

  it('round-trips that string through buildFormPayload unchanged', () => {
    const base = initialFormValues(BABY_NAMING_FORM, new Date(2026, 0, 31));
    const payload = buildFormPayload(
      BABY_NAMING_FORM,
      {
        ...base,
        values: {
          ...base.values,
          babyFullName: 'Baby Doe',
          dateOfBirth: '2026-01-31',
          fathersName: 'John Doe',
          mothersName: 'Jane Doe',
          parentContactPhone: '0700',
        },
      },
      new Date(2026, 0, 31),
    );
    expect(payload.dateOfBirth).toBe('2026-01-31');
  });

  it('would drop a Date object rather than send one, which is why this is tested', () => {
    const base = initialFormValues(BABY_NAMING_FORM, new Date(2026, 0, 31));
    const payload = buildFormPayload(
      BABY_NAMING_FORM,
      {
        ...base,
        // Deliberately wrong, as a regression would be. The engine takes strings.
        values: { ...base.values, dateOfBirth: new Date() as unknown as string },
      },
      new Date(2026, 0, 31),
    );
    expect('dateOfBirth' in payload).toBe(false);
  });
});
