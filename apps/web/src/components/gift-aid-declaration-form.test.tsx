import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { GiftAidDeclarationTextResponse } from '@kairos/types';
import { GiftAidDeclarationForm } from './gift-aid-declaration-form';

const wording: GiftAidDeclarationTextResponse = {
  charityName: 'Kharis Ministries',
  charityNumber: '1139291',
  wordingVersion: '2026-11-v1',
  coverageLabels: {
    past_and_future: 'This gift, the past 4 years, and all future gifts',
    future: 'This gift and all future gifts',
    single: 'One gift only',
  },
  texts: {
    past_and_future:
      'I want to Gift Aid all qualifying gifts of money I make to Kharis Ministries today, in the future, and in the past 4 years.',
    future: 'I want to Gift Aid all qualifying gifts of money I make to Kharis Ministries today and in the future.',
  },
  notes: 'Kharis Ministries is a registered charity, number 1139291.',
};

const onSubmit = vi.fn();

/**
 * The declaration tick, named rather than found by role.
 *
 * There are two checkboxes on this form now — the declaration itself and the
 * "my bank account is in a different name" toggle — so `getByRole('checkbox')`
 * is ambiguous. Naming it also means a test that clicks the wrong box fails
 * with a missing-element error rather than silently declaring nothing.
 */
function declarationBox(): HTMLElement {
  return screen.getByRole('checkbox', { name: /Yes, I want to Gift Aid my gifts/ });
}

function bankDiffersBox(): HTMLElement {
  return screen.getByRole('checkbox', { name: /name on my bank account is different/i });
}

function fillValidDonor() {
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ade' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Bolarinwa' } });
  fireEvent.change(screen.getByLabelText('House name or number and street'), {
    target: { value: '12 High Street' },
  });
  fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: 'SE1 2AB' } });
}

beforeEach(() => {
  onSubmit.mockReset();
});

describe('GiftAidDeclarationForm', () => {
  it('renders the declaration wording served by the API, not its own copy', () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    expect(
      screen.getByText(/I want to Gift Aid all qualifying gifts of money/),
    ).toBeInTheDocument();
    expect(screen.getByText(/in the past 4 years/)).toBeInTheDocument();
  });

  it('starts with the confirmation box unticked', () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    expect(declarationBox()).not.toBeChecked();
  });

  it('will not submit without the tick: the opt-in IS the declaration', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fillValidDonor();
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => {
      expect(screen.getByText('Tick the box to make your declaration')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a postcode for a UK address', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ade' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Bolarinwa' } });
    fireEvent.change(screen.getByLabelText('House name or number and street'), {
      target: { value: '12 High Street' },
    });
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => {
      expect(screen.getByText(/needs your postcode/)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a malformed UK postcode', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fillValidDonor();
    fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: 'NOTAPOSTCODE' } });
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid UK postcode')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires an email on the public form, where it is the match handle', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} requireEmail />);
    fillValidDonor();
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => {
      expect(screen.getByText(/Enter your email address/)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a complete declaration', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fillValidDonor();
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      firstName: 'Ade',
      lastName: 'Bolarinwa',
      addressLine1: '12 High Street',
      postcode: 'SE1 2AB',
      coverage: 'past_and_future',
      confirmedDeclaration: true,
    });
  });

  it('offers the title as a dropdown, not a free-text box', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    const trigger = screen.getByLabelText('Title');
    // A button, not an input: HMRC's title column is 4 characters, and a
    // typed title overruns it.
    expect(trigger.tagName).toBe('BUTTON');

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Miss' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Miss' }));

    fillValidDonor();
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ title: 'Miss' });
  });

  it('puts the HMRC name guidance above the name fields, where it can still be read', () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    const guidance = screen.getByText(/as HM Revenue and Customs would know them/);
    const firstName = screen.getByLabelText('First name');
    // Node.compareDocumentPosition: FOLLOWING means the name field comes
    // after the guidance in document order.
    expect(
      guidance.compareDocumentPosition(firstName) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(/Margaret Jones/)).toBeInTheDocument();
  });

  it('submits without a maiden name, and carries one through when given', async () => {
    const { unmount } = render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fillValidDonor();
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // Blank optional fields are stripped rather than sent as ''.
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('maidenName');
    unmount();

    onSubmit.mockReset();
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fillValidDonor();
    fireEvent.change(screen.getByLabelText(/Maiden or previous name/), {
      target: { value: 'Okonkwo' },
    });
    fireEvent.click(declarationBox());
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ maidenName: 'Okonkwo' });
  });

  describe('the bank account name', () => {
    it('stays hidden until the donor says the names differ', () => {
      render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
      // Most donors' names match. Showing the field to all of them asks
      // everyone to stop and compare two strings in order to type the same
      // thing twice.
      expect(screen.queryByLabelText(/Name on your bank account/)).not.toBeInTheDocument();
      fireEvent.click(bankDiffersBox());
      expect(screen.getByLabelText(/Name on your bank account/)).toBeInTheDocument();
    });

    it('refuses to submit a ticked box with an empty field', async () => {
      // The one state worse than not asking: finance is told the names differ
      // and given nothing to reconcile with.
      render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
      fillValidDonor();
      fireEvent.click(bankDiffersBox());
      fireEvent.click(declarationBox());
      fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));
      await waitFor(() =>
        expect(screen.getByText(/Enter the name as it appears on your bank account/)).toBeInTheDocument(),
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('carries the name through, and never sends the tick itself', async () => {
      render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
      fillValidDonor();
      fireEvent.click(bankDiffersBox());
      fireEvent.change(screen.getByLabelText(/Name on your bank account/), {
        target: { value: 'MR A T BOLARINWA' },
      });
      fireEvent.click(declarationBox());
      fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ bankAccountName: 'MR A T BOLARINWA' });
      // UI state, not a field. The API has no column for it.
      expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('bankNameDiffers');
    });

    it('drops a name the donor typed and then changed their mind about', async () => {
      // Ticking, typing, and unticking is a withdrawal. Without the clear,
      // the form state still holds the name and finance records a mismatch
      // the donor explicitly took back.
      render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
      fillValidDonor();
      fireEvent.click(bankDiffersBox());
      fireEvent.change(screen.getByLabelText(/Name on your bank account/), {
        target: { value: 'MR A T BOLARINWA' },
      });
      fireEvent.click(bankDiffersBox());
      fireEvent.click(declarationBox());
      fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('bankAccountName');
    });

    it('ticks itself when a stored name is prefilled, and keeps it on submit', async () => {
      // Re-declaring is the common path. An unticked box above a prefilled
      // name would hide the field and then `stripBlanks` would drop the
      // value, losing it silently every time a donor re-declares.
      render(
        <GiftAidDeclarationForm
          wording={wording}
          onSubmit={onSubmit}
          defaults={{ bankAccountName: 'MR A T BOLARINWA' }}
        />,
      );
      expect(bankDiffersBox()).toBeChecked();
      expect(screen.getByLabelText(/Name on your bank account/)).toHaveValue('MR A T BOLARINWA');

      fillValidDonor();
      fireEvent.click(declarationBox());
      fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ bankAccountName: 'MR A T BOLARINWA' });
    });

    it('tells the donor the declared name is still the one HMRC gets', () => {
      // The field must not read as "change the name on my claim". It is a
      // reconciliation handle; the declaration stands in the declared name.
      render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
      fireEvent.click(bankDiffersBox());
      expect(screen.getByText(/that is the name we give to HM Revenue and Customs/)).toBeInTheDocument();
    });
  });

  it('warns an overseas donor that Gift Aid needs UK tax, and disables the postcode', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('United Kingdom'));
    fireEvent.click(screen.getByText('Ghana'));

    await waitFor(() => {
      expect(screen.getByText(/only be reclaimed where you pay UK Income Tax/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Postcode/)).toBeDisabled();
  });
});
