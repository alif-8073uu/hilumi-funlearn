/** Existing accounts without the signup marker never receive the automatic tour. */
export function shouldShowOnboarding(signupVersion: unknown, completed: unknown): boolean {
  return signupVersion === 1 && completed !== true;
}