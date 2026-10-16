import { WALKTHROUGHS } from "./tours";

const SEEN = "buzzzz.onboarding.seen";
const DONE = "buzzzz.onboarding.completed";

export function welcomeSeen() {
  try {
    return localStorage.getItem(SEEN) === "true";
  } catch {
    return false;
  }
}

export function completedWalkthroughs(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DONE) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (id): id is string =>
            typeof id === "string" && WALKTHROUGHS.some((tour) => tour.id === id),
        )
      : [];
  } catch {
    return [];
  }
}

export function saveWelcomeSeen() {
  try {
    localStorage.setItem(SEEN, "true");
  } catch {
    return;
  }
}

export function saveWalkthroughs(completed: string[]) {
  try {
    localStorage.setItem(DONE, JSON.stringify(completed));
  } catch {
    return;
  }
}
