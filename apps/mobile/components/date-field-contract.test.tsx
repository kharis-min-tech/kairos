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
 * The specific trap is `toISOString()`: it converts to UTC first, so a date
 * picked late in the evening east of Greenwich comes back as the following day.
 * `DatePicker` must read the local calendar fields instead.
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

describe('DatePicker → form engine value contract', () => {
  beforeEach(() => {
    mockPickedDate = new Date(2026, 0, 31, 23, 45);
  });

  it('emits the local calendar date as YYYY-MM-DD, not a UTC-shifted one', () => {
    const onChange = jest.fn();
    render(<DatePicker value="" onChange={onChange} placeholder="Select a date" />);
    // Opening the field mounts the stub, which fires its change immediately.
    fireEvent.press(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0];
    expect(emitted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 23:45 on 31 January. `toISOString().slice(0, 10)` would say 2026-02-01
    // anywhere east of Greenwich; the local calendar date is the 31st.
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
