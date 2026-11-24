import { AppCopy } from '../../interfaces/check-in';

// English for the pages that have no journey to take JourneyCopy from. Where there is no adviser
// data (verify, link problem, locked, error) the text says "your adviser" and names nobody.
export const appCopy: AppCopy = {
  fallback: {
    back: 'Back',
    close: 'Close',
    contactLine: "Rather talk it through? Email me and we'll arrange a call.",
    emailAdviser: 'Email {adviser}',
    adviserLabel: 'Your adviser',
  },
  verify: {
    heading: 'Welcome to your check-in',
    legend: 'First, enter your date of birth',
    hint: 'For example, 27 3 1962',
    submit: 'Confirm',
    emptyDate: 'Enter your date of birth',
    incompleteDate: 'Enter a day, month and year',
    invalidDate: 'Enter a real date',
    wrongHeading: "That date doesn't match",
    wrongBody:
      'Check the date and try again. Use the date of birth of the person the email was sent to.',
    unreachableHeading: "We couldn't check that",
    unreachableBody: "We couldn't reach the service. Nothing has been lost, so please try again.",
  },
  statuses: {
    'link-problem': {
      heading: 'Please open the link in your email again',
      paragraphs: [
        "This page didn't open from your check-in link. Use the link in the email from your adviser. If you can't find it, contact your adviser.",
      ],
    },
    locked: {
      heading: "We've paused this check-in",
      paragraphs: [
        "That date didn't match too many times, so we've paused this check-in to keep your details safe. Please contact your adviser and they'll help you back in.",
      ],
    },
    'link-reissued': {
      heading: 'A new link is on its way',
      paragraphs: [
        'Your adviser has sent you a new check-in link. Please use the link in your latest email.',
      ],
    },
    'link-requested': {
      heading: "We've asked for a new link",
      paragraphs: [
        'Your adviser has been asked to send you a new check-in link. It will arrive by email.',
      ],
    },
    'already-completed': {
      heading: 'This check-in has already been completed',
      paragraphs: ['It was sent to {adviser} on {date}.'],
      aside: {
        heading: "Wasn't you?",
        body: "If you didn't send these answers, contact {adviser} straight away.",
      },
    },
    expired: {
      heading: 'This check-in link has expired',
      paragraphs: ['{adviser} can send you a new one. Please get in touch.'],
    },
    error: {
      heading: 'Something went wrong',
      paragraphs: [
        "We couldn't open your check-in. Please try the link in your email again later, or contact your adviser.",
      ],
    },
  },
  doneNeutralTitle: "Thank you. We've received your answers.",
  sendFailedHeading: "We couldn't send your answers",
  sendFailedBody: 'Nothing has been lost. Please check your connection and send them again.',
};
