import { JourneyCopy } from '@retenure/ui';
import { JourneyStage } from './journey-service';

// The stages that show a calm page of their own, with app-owned text.
export type StatusStage = Exclude<JourneyStage, 'verify' | 'loading' | 'ready' | 'done'>;

export interface StatusCopy {
  heading: string;
  paragraphs: string[];
  // A second section under the paragraphs, on its own card.
  aside?: { heading: string; body: string };
}

export interface CheckInProgress {
  label: string;
  step: number;
  total: number;
}

// Used where there is no journey, and so no JourneyCopy, to take them from.
export type FallbackCopy = Pick<
  JourneyCopy,
  'back' | 'close' | 'contactLine' | 'emailAdviser' | 'adviserLabel'
>;

export interface AppCopy {
  fallback: FallbackCopy;
  verify: {
    heading: string;
    legend: string;
    hint: string;
    submit: string;
    emptyDate: string;
    incompleteDate: string;
    invalidDate: string;
    wrongHeading: string;
    wrongBody: string;
    unreachableHeading: string;
    unreachableBody: string;
  };
  statuses: Record<StatusStage, StatusCopy>;
  doneNeutralTitle: string;
  sendFailedHeading: string;
  sendFailedBody: string;
}
