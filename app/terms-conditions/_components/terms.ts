export type LegalSectionData = {
  id: string;
  title: string;
  points: string[];
};

export const termsAndConditionsData: LegalSectionData[] = [
  {
    id: 'use-of-website',
    title: '1. Use of Website',
    points: [
      'You must be at least 18 years old or use the site under parental or legal guardian supervision.',
      'All information provided by you must be accurate and current.',
      'You agree not to use this website for any unlawful purpose or in violation of these terms.',
    ],
  },
  {
    id: 'products-pricing',
    title: '2. Products & Pricing',
    points: [
      'All products listed are subject to availability.',
      'Prices may change without prior notice.',
      'We reserve the right to cancel or refuse orders placed with incorrect pricing or information.',
    ],
  },
  {
    id: 'order-cancellation',
    title: '3. Order Acceptance & Cancellation',
    points: [
      'Order confirmation does not signify final acceptance.',
      'Orders may be canceled due to quantity limitations, inaccuracies, or suspected fraud.',
      'Any canceled orders will be refunded promptly.',
    ],
  },
  {
    id: 'shipping',
    title: '4. Shipping & Delivery',
    points: [
      'Shipping timelines are estimates and may vary.',
      'We are not responsible for delays caused by courier partners, weather, or external factors.',
      'Tracking details will be provided once your order is shipped.',
    ],
  },
  {
    id: 'returns',
    title: '5. Returns & Refunds',
    points: [
      'Returns are accepted within 7 days of delivery if items are unused and in original packaging.',
      'Refunds are processed after inspection and approval.',
      'Customized or perishable items are non-returnable unless damaged or defective.',
    ],
  },
  {
    id: 'intellectual-property',
    title: '6. Intellectual Property',
    points: [
      'All website content including text, images, logos, and designs belongs to Dream Wedding Hub.',
      'You may not reproduce or exploit any content without prior written permission.',
    ],
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    points: [
      'We are not liable for direct or indirect losses arising from website usage.',
      'We are not responsible for delays or interruptions caused by technical or third-party issues.',
    ],
  },
  {
    id: 'privacy',
    title: '8. Privacy Policy',
    points: [
      'By using this website, you agree to our Privacy Policy.',
      'The Privacy Policy governs how your personal data is collected and used.',
    ],
  },
  {
    id: 'changes',
    title: '9. Changes to Terms',
    points: [
      'These Terms & Conditions may be updated at any time without prior notice.',
      'You are encouraged to review this page periodically.',
    ],
  },
];
