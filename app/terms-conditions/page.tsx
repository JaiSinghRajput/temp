'use client';

import { LegalPage } from "./_components/LegalPage";
import { termsAndConditionsData } from "./_components/terms";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle="Please read these terms carefully before using Dream Wedding Hub."
      sections={termsAndConditionsData}
    />
  );
}
