/**
 * The Kingdom Service application sheet, on mobile.
 *
 * Mobile had no way to apply to a department at all — the empty state told
 * members to go "via your branch admin" while the API and the web app both
 * accepted self-applications. So the people most likely to be holding a
 * phone were the ones who could not apply.
 *
 * What these tests guard is the pair of required answers. The declaration and
 * the printed signature are the whole point of the form: a leader later relies
 * on this row to say somebody undertook to serve. A sheet that let either one
 * through empty would file an undertaking nobody made, and the API would 400
 * anyway — so the gate has to hold here, before the request is sent.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DepartmentApplySheet } from './department-apply-sheet';

function renderSheet(onSubmit = jest.fn()) {
  render(
    <DepartmentApplySheet
      open
      departmentName="Worship"
      submitting={false}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

const submitButton = () => screen.getByText('Submit application');
const declaration = () => screen.getByRole('checkbox');
const signatureInput = () => screen.getByPlaceholderText('Your full name');

describe('DepartmentApplySheet', () => {
  it('refuses to submit with neither the declaration nor a signature', () => {
    const onSubmit = renderSheet();
    fireEvent.press(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses to submit with the declaration but no signature', () => {
    const onSubmit = renderSheet();
    fireEvent.press(declaration());
    fireEvent.press(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses to submit with a signature but no declaration', () => {
    const onSubmit = renderSheet();
    fireEvent.changeText(signatureInput(), 'Ada Lovelace');
    fireEvent.press(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a signature that is only whitespace', () => {
    // Otherwise a space bar counts as signing your name.
    const onSubmit = renderSheet();
    fireEvent.press(declaration());
    fireEvent.changeText(signatureInput(), '   ');
    fireEvent.press(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits once both are given, trimming the signature', () => {
    const onSubmit = renderSheet();
    fireEvent.press(declaration());
    fireEvent.changeText(signatureInput(), '  Ada Lovelace  ');
    fireEvent.press(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      declarationAccepted: true,
      signatureName: 'Ada Lovelace',
      experience: undefined,
      profession: undefined,
      notes: undefined,
    });
  });

  it('sends the optional answers when they are filled in', () => {
    const onSubmit = renderSheet();
    fireEvent.changeText(
      screen.getByPlaceholderText('Anything relevant — in or outside church.'),
      'Two years on the media desk',
    );
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Radiographer'), 'Radiographer');
    fireEvent.press(declaration());
    fireEvent.changeText(signatureInput(), 'Ada Lovelace');
    fireEvent.press(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: 'Two years on the media desk',
        profession: 'Radiographer',
      }),
    );
  });

  it('lets the declaration be unticked again', () => {
    // Tapping the row toggles; a member who changes their mind must be able
    // to take the undertaking back rather than be locked into submitting.
    const onSubmit = renderSheet();
    fireEvent.changeText(signatureInput(), 'Ada Lovelace');
    fireEvent.press(declaration());
    fireEvent.press(declaration());
    fireEvent.press(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
