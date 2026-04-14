import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement HTMLDialogElement methods.
// The real showModal() sets the 'open' attribute so the dialog is visible;
// without it, jsdom treats the dialog (and its children) as hidden/inert.
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});
