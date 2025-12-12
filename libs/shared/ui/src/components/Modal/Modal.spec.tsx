import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './Modal';

// Mock body style changes
Object.defineProperty(document.body.style, 'overflow', {
  writable: true,
  value: '',
});

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should call onClose when overlay is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when overlay is clicked and closeOnOverlayClick is false', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />
    );

    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    fireEvent.click(overlay!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when Escape key is pressed and closeOnEscape is false', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should not call onClose when modal content is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const modalContent = screen.getByText('Modal content');
    fireEvent.click(modalContent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should render different sizes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(document.querySelector('.max-w-md')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="xl" />);
    expect(document.querySelector('.max-w-4xl')).toBeInTheDocument();
  });

  it('should restore body overflow when unmounted', () => {
    const { unmount } = render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('unset');
  });

  it('should accept custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />);

    expect(document.querySelector('.custom-modal')).toBeInTheDocument();
  });
});

describe('ModalHeader', () => {
  it('should render header content', () => {
    render(<ModalHeader>Header Title</ModalHeader>);

    expect(screen.getByText('Header Title')).toBeInTheDocument();
  });

  it('should render close button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<ModalHeader onClose={onClose}>Header Title</ModalHeader>);

    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not render close button when onClose is not provided', () => {
    render(<ModalHeader>Header Title</ModalHeader>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ModalContent', () => {
  it('should render content', () => {
    render(<ModalContent>Content goes here</ModalContent>);

    expect(screen.getByText('Content goes here')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    render(<ModalContent className="custom-content">Content</ModalContent>);

    expect(screen.getByText('Content').parentElement).toHaveClass(
      'custom-content'
    );
  });
});

describe('ModalFooter', () => {
  it('should render footer content', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Save</button>
      </ModalFooter>
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    render(<ModalFooter className="custom-footer">Footer</ModalFooter>);

    expect(screen.getByText('Footer').parentElement).toHaveClass(
      'custom-footer'
    );
  });
});
