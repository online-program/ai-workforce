import { EmployeeOnboardingProfile } from '../types.ts';

export const DEFAULT_SALES_MANAGER_ONBOARDING: EmployeeOnboardingProfile = {
  employeeId: 'sales_coordinator',
  role: 'Alpha',
  customName: 'Alpha',
  objective:
    'AI Sales Manager — Turn website conversations into real sales opportunities 24/7 with intelligent qualification and verified knowledge.',
  onboardedAt: new Date().toISOString(),
  status: 'ACTIVE',
};

const STORAGE_PREFIX = 'aiw_employee_onboarding_';

export function getEmployeeOnboarding(roleId: string = 'sales_coordinator'): EmployeeOnboardingProfile {
  if (typeof window === 'undefined') return DEFAULT_SALES_MANAGER_ONBOARDING;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${roleId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.customName && parsed.objective) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load employee onboarding from sessionStorage:', e);
  }
  return DEFAULT_SALES_MANAGER_ONBOARDING;
}

export function saveEmployeeOnboarding(profile: EmployeeOnboardingProfile): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${profile.employeeId}`, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('aiw_employee_onboarded', { detail: profile }));
  } catch (e) {
    console.warn('Failed to save employee onboarding to sessionStorage:', e);
  }
}
