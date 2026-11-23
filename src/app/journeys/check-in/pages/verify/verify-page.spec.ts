import { HttpTestingController } from '@angular/common/http/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { openPage } from '../../../../testing/journey-harness';
import routes from '../../check-in.routes';

async function openVerify() {
  const page = await openPage(routes, '/start');
  const user = userEvent.setup();
  const enter = async (day: string, month: string, year: string) => {
    for (const [label, value] of [
      ['Day', day],
      ['Month', month],
      ['Year', year],
    ]) {
      const box = screen.getByLabelText(label);
      await user.clear(box);
      if (value) await user.type(box, value);
    }
  };
  const confirm = () => user.click(screen.getByRole('button', { name: 'Confirm' }));
  return { ...page, user, enter, confirm };
}

const noRequests = (http: HttpTestingController) => http.expectNone('/client/verification');

describe('Verify page', () => {
  it('asks for the date of birth, labelled for autofill', async () => {
    await openVerify();
    screen.getByRole('heading', { level: 1, name: 'Welcome to your check-in' });
    screen.getByRole('group', { name: 'First, enter your date of birth' });
    expect(screen.getByLabelText('Day').getAttribute('autocomplete')).toBe('bday-day');
  });

  it('names no adviser, because it does not know whose check-in this is', async () => {
    await openVerify();
    expect(screen.queryByRole('group', { name: 'Your adviser' })).toBeNull();
    expect(screen.queryByText('Something urgent or worrying you?')).toBeNull();
  });

  it('asks for a date when none is entered, and sends nothing', async () => {
    const { http, confirm } = await openVerify();
    await confirm();
    screen.getByText(/Enter your date of birth/);
    noRequests(http);
  });

  it('asks for the missing parts of a half-entered date, and sends nothing', async () => {
    const { http, enter, confirm } = await openVerify();
    await enter('17', '', '');
    await confirm();
    screen.getByText(/Enter a day, month and year/);
    noRequests(http);
  });

  it('clears the message as soon as the date changes', async () => {
    const { enter, confirm } = await openVerify();
    await confirm();
    await enter('17', '04', '1983');
    expect(screen.queryByText(/Enter your date of birth/)).toBeNull();
  });

  it('sends the date as an ISO date together with the token from the link', async () => {
    const { http, enter, confirm } = await openVerify();
    await enter('17', '04', '1983');
    await confirm();
    const request = http.expectOne('/client/verification');
    expect(request.request.body).toEqual({ token: 'synthetic-token', dateOfBirth: '1983-04-17' });
  });

  it('says so, without blaming the client, when the date does not match', async () => {
    const { http, enter, confirm, settle } = await openVerify();
    await enter('14', '03', '1978');
    await confirm();
    http.expectOne('/client/verification').flush(
      {
        error: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'No match',
        requestId: 'r1',
        reason: 'verification_failed',
      },
      { status: 401, statusText: 'Unauthorized' },
    );
    await settle();
    screen.getByText("That date doesn't match");
    screen.getByRole('button', { name: 'Confirm' });
  });

  it('shows the pending state while the date is checked, so a second press does nothing', async () => {
    const { http, enter, confirm } = await openVerify();
    await enter('17', '04', '1983');
    await confirm();
    await confirm();
    http.expectOne('/client/verification');
    http.expectNone('/client/verification');
  });
});
