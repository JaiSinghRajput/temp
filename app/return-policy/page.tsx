'use client';

import { LegalPage } from "../terms-conditions/_components/LegalPage";
import { returnPolicyData } from "./returnPolicyData";

export default function ReturnPolicyPage() {
  return (
    <LegalPage
      title="Return & Exchange Policy"
      subtitle="Please review our return and exchange guidelines before placing an order."
      sections={returnPolicyData}
    />
  );
}
