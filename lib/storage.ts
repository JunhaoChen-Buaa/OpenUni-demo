import { defaultProfile, type UserProfile } from "@/lib/mock-data";

const PROFILE_KEY = "openuni-profile";
const REMINDER_KEY = "openuni-reminder-enabled";
const SIGNAL_ACTIONS_KEY = "openuni-signal-actions";
const PRODUCT_MODE_KEY = "openuni-product-mode";

export type ProductMode = "tutorial" | "formal";

export type SignalActionState = {
  planned: boolean;
  watchLater: boolean;
  shareCount: number;
  lastSharedAt: string | null;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function defaultSignalActionState(): SignalActionState {
  return {
    planned: false,
    watchLater: false,
    shareCount: 0,
    lastSharedAt: null,
  };
}

function readSignalActionMap(): Record<string, SignalActionState> {
  if (!isBrowser()) {
    return {};
  }

  const raw = window.localStorage.getItem(SIGNAL_ACTIONS_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, SignalActionState>;
  } catch {
    return {};
  }
}

function writeSignalActionMap(map: Record<string, SignalActionState>) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SIGNAL_ACTIONS_KEY, JSON.stringify(map));
}

export function getStoredProfile(): UserProfile | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: UserProfile) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function setReminderEnabled(value: boolean) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(REMINDER_KEY, JSON.stringify(value));
}

export function getReminderEnabled() {
  if (!isBrowser()) {
    return false;
  }

  return window.localStorage.getItem(REMINDER_KEY) === "true";
}

export function getSignalActionState(signalId: string) {
  const map = readSignalActionMap();
  return map[signalId] ?? defaultSignalActionState();
}

export function setSignalPlanned(signalId: string, planned: boolean) {
  const map = readSignalActionMap();
  const nextState = {
    ...defaultSignalActionState(),
    ...(map[signalId] ?? {}),
    planned,
  };

  if (planned) {
    nextState.watchLater = false;
  }

  map[signalId] = nextState;
  writeSignalActionMap(map);
  return nextState;
}

export function setSignalWatchLater(signalId: string, watchLater: boolean) {
  const map = readSignalActionMap();
  const nextState = {
    ...defaultSignalActionState(),
    ...(map[signalId] ?? {}),
    watchLater,
  };

  if (watchLater) {
    nextState.planned = false;
  }

  map[signalId] = nextState;
  writeSignalActionMap(map);
  return nextState;
}

export function incrementSignalShare(signalId: string) {
  const map = readSignalActionMap();
  const current = map[signalId] ?? defaultSignalActionState();
  const nextState: SignalActionState = {
    ...current,
    shareCount: current.shareCount + 1,
    lastSharedAt: new Date().toISOString(),
  };

  map[signalId] = nextState;
  writeSignalActionMap(map);
  return nextState;
}

export function getStoredProductMode(): ProductMode | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(PRODUCT_MODE_KEY);
  if (raw === "tutorial" || raw === "formal") {
    return raw;
  }

  return null;
}

export function saveProductMode(mode: ProductMode) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(PRODUCT_MODE_KEY, mode);
}
