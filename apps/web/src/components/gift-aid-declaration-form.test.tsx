import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { GiftAidDeclarationTextResponse } from '@kairos/types';
import { GiftAidDeclarationForm } from './gift-aid-declaration-form';

const wording: GiftAidDeclarationTextResponse = {
  charityName: 'Kharis Ministries',
  charityNumber: '1139291',
  wordingVersion: '2026-10-v1',
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
    expect(screen.getByRole('checkbox')).not.toBeChecked();
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
    fireEvent.click(screen.getByRole('checkbox'));
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
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid UK postcode')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires an email on the public form, where it is the match handle', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} requireEmail />);
    fillValidDonor();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Make my Gift Aid declaration/ }));

    await waitFor(() => {
      expect(screen.getByText(/Enter your email address/)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a complete declaration', async () => {
    render(<GiftAidDeclarationForm wording={wording} onSubmit={onSubmit} />);
    fillValidDonor();
    fireEvent.click(screen.getByRole('checkbox'));
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
