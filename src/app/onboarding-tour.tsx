import { OnboardingTour } from "@/components/onboarding-tour";

/** First launch, before sign-in. Completing it flips the root guard to sign-in. */
export default function OnboardingTourScreen() {
  return <OnboardingTour mode="firstRun" />;
}
