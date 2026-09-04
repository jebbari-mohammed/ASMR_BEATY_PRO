import { useState, useEffect, useCallback } from 'react';
import { OnboardingStep, OnboardingStateV1 } from '@asmr/shared';
import { OnboardingService, INITIAL_ONBOARDING_STATE, logOnboardingAnalytics } from '../services/onboarding-machine';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingStateV1>(INITIAL_ONBOARDING_STATE);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function init() {
      const saved = await OnboardingService.loadState();
      setState(saved);
      setLoading(false);
      logOnboardingAnalytics('onboarding_resumed', { step: saved.currentStep });
    }
    init();
  }, []);

  const updateState = useCallback((partial: Partial<OnboardingStateV1>) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      OnboardingService.saveState(next);
      return next;
    });
  }, []);

  const next = useCallback((targetStep: OnboardingStep, updates?: Partial<OnboardingStateV1>) => {
    setState(prev => {
      const nextState: OnboardingStateV1 = {
        ...prev,
        ...updates,
        currentStep: targetStep,
        completedSteps: prev.completedSteps.includes(prev.currentStep)
          ? prev.completedSteps
          : [...prev.completedSteps, prev.currentStep]
      };
      OnboardingService.saveState(nextState);
      logOnboardingAnalytics('onboarding_step_transition', {
        from: prev.currentStep,
        to: targetStep
      });
      return nextState;
    });
  }, []);

  const back = useCallback(() => {
    setState(prev => {
      if (prev.completedSteps.length === 0) return prev;
      const history = [...prev.completedSteps];
      const previousStep = history.pop()!;
      const nextState: OnboardingStateV1 = {
        ...prev,
        currentStep: previousStep,
        completedSteps: history
      };
      OnboardingService.saveState(nextState);
      logOnboardingAnalytics('onboarding_step_back', {
        from: prev.currentStep,
        to: previousStep
      });
      return nextState;
    });
  }, []);

  const complete = useCallback(async () => {
    await OnboardingService.markCompleted();
    const finalState: OnboardingStateV1 = {
      ...state,
      currentStep: 'COMPLETED',
      completedAt: new Date().toISOString()
    };
    setState(finalState);
    await OnboardingService.saveState(finalState);
  }, [state]);

  const reset = useCallback(async () => {
    await OnboardingService.reset();
    setState(INITIAL_ONBOARDING_STATE);
  }, []);

  return {
    state,
    loading,
    updateState,
    next,
    back,
    complete,
    reset
  };
}
