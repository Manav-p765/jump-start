export const supportPageDefinitions = {
  privacyPolicy: {
    key: "privacyPolicy",
    title: "Privacy Policy",
    path: "/privacy-policy",
    contentType: "text",
  },
  termsOfService: {
    key: "termsOfService",
    title: "Terms of Service",
    path: "/terms-of-service",
    contentType: "text",
  },
  faqs: {
    key: "faqs",
    title: "FAQs",
    path: "/faqs",
    contentType: "faq",
  },
};

export const fallbackSupportPages = {
  privacyPolicy: {
    ...supportPageDefinitions.privacyPolicy,
    enabled: true,
    summary: `How ${company.brandName} collects, uses, and protects student information.`,
    items: [
      "We collect only the information needed to create your account, run assessments, and generate your report.",
      "Assessment responses and profile details are used to prepare reports, recommendations, and support services.",
      "Personal information is not sold to third parties and is shared only when required to deliver the service.",
    ],
  },
  termsOfService: {
    ...supportPageDefinitions.termsOfService,
    enabled: true,
    summary: `Rules and responsibilities for using ${company.brandName} assessments and reports.`,
    items: [
      "Assessment purchases unlock access to the selected package and related report features.",
      "Users must provide accurate information and must not misuse or disrupt the platform.",
      "Reports and recommendations are guidance tools and should be combined with professional advice where appropriate.",
    ],
  },
  faqs: {
    ...supportPageDefinitions.faqs,
    enabled: true,
    summary: "Answers to common questions about tests, reports, and admin review.",
    items: [],
    faqItems: [
      {
        heading: "How long does admin review take?",
        content: "Most submitted reports are reviewed within 48 hours.",
      },
      {
        heading: "Can I see my result before approval?",
        content: "Published reports appear only after admin approval is complete.",
      },
      {
        heading: "Where can I find my purchased tests?",
        content: "Purchased packages are listed in your dashboard and results area.",
      },
    ],
  },
};
