import React from 'react';
import { useRouter } from 'expo-router';
import { UnavailableFeature } from '../../src/components/UnavailableFeature';

export default function SpotJournalScreen() {
  const router = useRouter();
  return <UnavailableFeature
    eyebrow="PHOTO JOURNAL"
    title="Photo journaling is being prepared"
    description="Private photo storage and deletion are still being validated. Your daily routine record is available in Progress."
    icon="images-outline"
    onClose={() => router.back()}
  />;
}
