'use client';

import { LegalPage } from "../terms-conditions/_components/LegalPage";
import { refundPolicyData } from "./refundPolicyData";

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      subtitle="Please review our refund guidelines before making a purchase."
      sections={refundPolicyData}
    />
  );
}
