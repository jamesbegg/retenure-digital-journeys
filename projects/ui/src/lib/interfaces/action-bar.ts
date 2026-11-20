export type ActionBarActions =
  | { kind: 'single'; primary: string; link?: string }
  | { kind: 'pair'; secondary: string; primary: string; link?: string }
  | { kind: 'edit'; cancel: string; save: string; link?: string };
