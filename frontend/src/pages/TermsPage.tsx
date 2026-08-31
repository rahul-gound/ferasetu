import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Database,
  FileText,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  Store
} from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';

type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; intro?: string; items: string[] }
  | { kind: 'note'; title: string; text: string; tone: 'blue' | 'amber' };

interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'definitions',
    title: 'Definitions',
    blocks: [
      { kind: 'paragraph', text: `In these Terms, the following meanings apply:` },
      {
        kind: 'list',
        items: [
          `FeraSetu, we, us, and our means the FeraSetu online software service and its authorized operators.`,
          `Services means the FeraSetu software, infrastructure, storefront tools, dashboards, analytics, AI features, documentation, support channels, updates, and related online services.`,
          `Merchant or you means a business or individual who registers for or uses the Services to operate a store or business presence.`,
          `Account means the merchant credentials and workspace used to access the Services.`,
          `Store or Storefront means a digital storefront or public business page configured by a Merchant through the Services.`,
          `Merchant Customer or End Customer means a person who visits, contacts, buys from, or otherwise transacts with a Merchant.`,
          `Content means text, images, product information, logos, audio, video, files, prompts, and other material submitted to or generated through the Services.`,
          `Merchant Data means business records, catalogs, customer information, orders, analytics, configuration, and other data associated with a Merchant Account or Store.`,
          `Fera AI means automated features that generate or process content, summaries, suggestions, translations, insights, or other outputs.`,
          `Subscription means a recurring or non-recurring right to use a paid version of the Services for a defined period.`,
          `Paid Plan means a plan for which FeraSetu charges a fee.`,
          `Trial or Beta Offer means a limited-time, limited-feature, promotional, beta, pilot, or free plan or pricing arrangement, as made available by FeraSetu.`,
          `Third-Party Services means providers, infrastructure, models, processors, tools, and services not operated by FeraSetu.`
        ]
      }
    ]
  },
  {
    id: 'eligibility',
    title: 'Eligibility and Authority',
    blocks: [
      {
        kind: 'paragraph',
        text: `The Services are intended for adults and business users. You may use the Services only if you have reached the legal age required in your jurisdiction and can lawfully enter a binding contract.`
      },
      {
        kind: 'paragraph',
        text: `If you act for a business, partnership, proprietorship, trust, organization, or other entity, you represent that you have the authority to accept these Terms on behalf of that entity and to bind it to these Terms.`
      },
      {
        kind: 'note',
        tone: 'blue',
        title: `Consistent with our Privacy Policy`,
        text: `The Services are intended for adults who have reached the age of majority in their jurisdiction. FeraSetu does not knowingly offer Accounts to children.`
      }
    ]
  },
  {
    id: 'software-provider',
    title: 'FeraSetu as a Software Provider — Not the Merchant',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu is an online software service that helps Merchants create and operate digital storefronts, publish catalogs, manage products and inventory, receive and manage orders, communicate with customers, review analytics, use Fera AI, and manage business information. FeraSetu is not a marketplace.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu is not the seller of products listed by Merchants. FeraSetu does not own Merchant inventory, does not set Merchant prices, and does not become a party to a sales contract between a Merchant and a Merchant Customer merely because FeraSetu software or infrastructure is used.`
      },
      {
        kind: 'paragraph',
        text: `The Merchant contracts directly with its customers. The Merchant is responsible for products, prices, inventory, fulfillment, shipping, taxes, refunds, returns, warranties, customer service, legal compliance, claims, and representations made to customers, except to the extent FeraSetu expressly assumes a specific responsibility in a separate written agreement or where liability cannot be excluded under applicable law.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu does not guarantee sales, revenue, customer demand, search ranking, conversion, or the success of any business strategy. Using the Services provides software infrastructure; it does not transfer responsibility for the Merchant's business decisions or transactions.`
      },
      {
        kind: 'note',
        tone: 'blue',
        title: `The basic distinction`,
        text: `FeraSetu provides the software infrastructure. You operate your business and remain responsible for your products and promises to customers.`
      }
    ]
  },
  {
    id: 'accounts',
    title: 'Account Registration and Security',
    blocks: [
      {
        kind: 'paragraph',
        text: `To use certain features, you may need to create an Account. You must provide accurate, current, and complete information and keep it updated. You may not create an Account using another person's identity or false business information.`
      },
      {
        kind: 'list',
        items: [
          `Protect your login credentials, one-time codes, recovery methods, and Account access.`,
          `Do not share Account credentials where the applicable plan or product design does not permit sharing.`,
          `You are responsible for activity carried out through your Account, unless the activity occurred because of a security failure for which FeraSetu is responsible under applicable law.`,
          `Notify support@ferasetu.com promptly if you suspect unauthorized access, credential compromise, or fraudulent Account activity.`,
          `Do not impersonate another person, business, platform employee, or representative.`,
          `FeraSetu may require reasonable verification for security, billing, legal, fraud-prevention, or regulatory purposes.`
        ]
      },
      {
        kind: 'paragraph',
        text: `FeraSetu may support authentication methods such as email and password, Google, Apple, Microsoft, or other providers. Authentication providers may change, may be temporarily unavailable, and are subject to their own terms and practices. FeraSetu does not promise that any particular authentication method will always remain available.`
      }
    ]
  },
  {
    id: 'merchant-responsibilities',
    title: 'Merchant Responsibilities',
    blocks: [
      {
        kind: 'paragraph',
        text: `You are responsible for conducting your business lawfully and for the accuracy of the information you publish through the Services. This includes, without limitation:`
      },
      {
        kind: 'list',
        items: [
          `The legality of your business, products, services, and sales methods.`,
          `Product descriptions, images, categories, prices, discounts, availability, and inventory accuracy.`,
          `Taxes, GST, and other applicable tax registrations, filings, collections, reporting, and remittances.`,
          `Licenses, permits, authorizations, and regulatory approvals required for your business or products.`,
          `Product safety, labeling, packaging, storage, handling, and applicable standards.`,
          `Shipping, delivery, fulfillment, tracking, cancellation, refund, return, warranty, and complaint handling.`,
          `Customer communications, consents, disclosures, receipts, and promises made to Merchant Customers.`,
          `Rights to use product images, brand names, trademarks, text, media, and other Content.`,
          `Compliance with applicable consumer, e-commerce, advertising, contract, data-protection, and other laws.`,
          `Lawful collection, notice, consent, use, sharing, retention, and deletion of customer information where required.`,
          `Honoring the terms you present to Merchant Customers.`
        ]
      },
      {
        kind: 'paragraph',
        text: `You must not use the Services for illegal, deceptive, fraudulent, infringing, abusive, harmful, or otherwise prohibited activity.`
      }
    ]
  },
  {
    id: 'merchant-content',
    title: 'Storefront Content and Merchant Content',
    blocks: [
      {
        kind: 'paragraph',
        text: `You retain ownership of Content and Merchant Data you upload or create, subject to these Terms and applicable law. FeraSetu does not claim ownership of your catalogs, photographs, business records, customer lists, or other business Content.`
      },
      {
        kind: 'paragraph',
        text: `To operate, secure, improve, and provide the Services, you grant FeraSetu a limited, non-exclusive, worldwide license to host, reproduce, transmit, display, index, and technically process Content as reasonably necessary to provide the Services, protect users and systems, comply with law, and perform support and maintenance.`
      },
      {
        kind: 'paragraph',
        text: `This license operates only to the extent necessary for those purposes. It narrows or ends when the Content is no longer needed for the Services, subject to backups, legal or regulatory obligations, dispute preservation, security investigation, and reasonable operational requirements.`
      },
      {
        kind: 'paragraph',
        text: `You represent that you have all rights, permissions, and consents needed to submit, publish, and process your Content through the Services.`
      }
    ]
  },
  {
    id: 'ferasetu-ip',
    title: 'Intellectual Property — FeraSetu',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu and its licensors own the FeraSetu software, source code, platform architecture, systems, trademarks, logos, interface design, documentation, proprietary technology, and FeraSetu-generated platform assets where applicable.`
      },
      {
        kind: 'paragraph',
        text: `These Terms provide a limited right to access and use the Services. They do not transfer FeraSetu intellectual property to you. You may not copy, resell, reverse engineer, decompile, alter, or create derivative works from the FeraSetu platform except as permitted by applicable law or a separate written agreement.`
      },
      {
        kind: 'note',
        tone: 'blue',
        title: `Two different ownership categories`,
        text: `You own your business Content and Merchant Data. FeraSetu owns the software and platform technology used to provide the Services.`
      }
    ]
  },
  {
    id: 'fera-ai',
    title: 'Fera AI and Automated Features',
    blocks: [
      {
        kind: 'paragraph',
        text: `Fera AI may generate product descriptions, marketing copy, translations, catalog content, suggestions, summaries, business insights, or other automated outputs. Fera AI is intended to help you work faster, not to replace your review or judgment.`
      },
      {
        kind: 'list',
        items: [
          `AI output can be inaccurate, incomplete, outdated, unsuitable, biased, or inappropriate for your business or jurisdiction.`,
          `You are responsible for reviewing AI output before publishing it or relying on it for a business decision.`,
          `Fera AI does not provide legal, financial, tax, medical, regulatory, audit, or other professional advice.`,
          `You remain responsible for published Content, product claims, pricing, compliance, and customer communications.`,
          `Availability, providers, models, limits, and behavior of automated features may change.`,
          `FeraSetu does not guarantee that AI output is unique, commercially effective, error-free, or fit for a particular purpose.`
        ]
      },
      {
        kind: 'note',
        tone: 'amber',
        title: `Review before publishing`,
        text: `Please treat AI-generated text as a draft. Check facts, prices, legal claims, tax treatment, language quality, and suitability before making it public.`
      }
    ]
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions, Plans, Trials, Beta Offers and Pricing',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu may offer free plans, Paid Plans, Trials, Beta Offers, promotional pricing, credits, or feature-specific purchases. The plan features, limits, billing period, and charges shown to you before payment govern that purchase, together with these Terms and any specific promotional terms.`
      },
      {
        kind: 'list',
        items: [
          `Paid Plans may be billed monthly, annually, or on another stated frequency.`,
          `Where you choose a recurring Subscription, you authorize FeraSetu or its payment processor to collect the stated charges on the stated schedule until the Subscription is cancelled or expires.`,
          `Displayed prices may exclude taxes unless expressly included. You are responsible for applicable taxes, duties, or charges to the extent required by law.`,
          `If payment fails, access to paid features may be suspended or reduced after any grace period or notice provided by the product.`,
          `You may change, upgrade, or downgrade plans where the product permits it. Changes may take effect immediately, at the end of the current period, or as disclosed in the product.`,
          `You may cancel a Subscription through available Account controls or by contacting support. Cancellation affects future billing as disclosed in the product and does not automatically erase your Account.`,
          `Trials, Beta Offers, credits, and promotional pricing may be time-limited, feature-limited, capacity-limited, or withdrawn under the conditions disclosed for that offer.`,
          `Promotional pricing may change or expire according to the applicable offer terms.`,
          `FeraSetu may change pricing for new purchases or renewals after reasonable notice where appropriate. Existing paid periods already purchased are not retroactively changed.`,
          `FeraSetu does not charge hidden platform fees. Fees and important conditions are disclosed before payment.`
        ]
      },
      {
        kind: 'paragraph',
        text: `Refunds are handled according to the applicable plan, order, promotional terms, support decision, and applicable law. FeraSetu does not state a universal no-refund policy.`
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payment Processing and Third-Party Payment Providers',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu may use Third-Party Services for subscription billing and related payment processing. Where applicable, these may include payment processors such as Razorpay or Stripe and payment rails such as UPI. Payment processing is subject to the processor's terms, privacy policy, limits, risk controls, and applicable law.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu does not knowingly store full payment card details. Sensitive payment credentials are handled by the applicable payment processor, and FeraSetu may receive transaction references or limited status information needed to provide support and reconcile billing.`
      },
      {
        kind: 'paragraph',
        text: `Payments for a FeraSetu Subscription are separate from payments made between a Merchant and a Merchant Customer. A Merchant Customer's payment method, chargeback, refund, dispute, or payment failure does not automatically cancel a Merchant's Subscription.`
      },
      {
        kind: 'paragraph',
        text: `You remain responsible for customer-facing payment arrangements, dispute handling, refunds, delivery confirmation, and compliance with payment and consumer rules, except where a separate written agreement expressly assigns responsibility to FeraSetu.`
      }
    ]
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    blocks: [
      { kind: 'paragraph', text: `You may use the Services only for lawful purposes. You must not:` },
      {
        kind: 'list',
        items: [
          `Violate applicable law, court order, or regulatory requirement.`,
          `Infringe another person's or business's intellectual property, privacy, contract, or other rights.`,
          `Sell, promote, or facilitate illegal, restricted, unsafe, fraudulent, deceptive, counterfeit, or unauthorized products or services.`,
          `Misrepresent affiliation, endorsement, identity, price, availability, certification, or business capability.`,
          `Create fake storefronts, fake reviews, fake demand, fake orders, or misleading scarcity.`,
          `Commit or facilitate payment fraud, chargeback abuse, phishing, impersonation, or financial crime.`,
          `Attempt unauthorized access to Accounts, systems, data, APIs, networks, or devices.`,
          `Distribute malware, malicious code, harmful files, or unauthorized tracking mechanisms.`,
          `Probe, scan, overload, bypass, or test the security or availability of the Services without authorization.`,
          `Perform denial-of-service activity, harmful automation, credential stuffing, scraping, excessive API use, or activity that degrades the platform.`,
          `Harass, threaten, defame, abuse, or harm another person or business.`,
          `Use the Services to evade sanctions, export controls, tax obligations, or legal process.`
        ]
      },
      {
        kind: 'paragraph',
        text: `FeraSetu may investigate suspected abuse and take proportionate action, including restricting a feature, suspending an Account, or terminating access, subject to applicable law.`
      }
    ]
  },
  {
    id: 'customer-data',
    title: 'Customer Data and Merchant Data',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu processes Account and Merchant Data to provide the Services, as described in the Privacy Policy. Merchant Customer information may be processed on behalf of Merchants to operate storefront, order, communication, analytics, AI, and related features.`
      },
      {
        kind: 'paragraph',
        text: `Merchants remain responsible for having the appropriate legal basis, notices, permissions, consents, contracts, retention practices, customer requests, and disclosures required for Merchant Customer data where applicable.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu processes data in accordance with the Privacy Policy, these Terms, applicable agreements, and applicable law. Nothing in these Terms overrides the Privacy Policy or limits rights that cannot be limited by contract.`
      },
      {
        kind: 'note',
        tone: 'blue',
        title: `Merchant control`,
        text: `You own your store and business data. Available export and account controls are described in the product and Privacy Policy.`
      }
    ]
  },
  {
    id: 'third-party-services',
    title: 'Third-Party Services',
    blocks: [
      {
        kind: 'paragraph',
        text: `The Services may depend on Third-Party Services for cloud hosting, authentication, payment processing, messaging, email, AI infrastructure, analytics, storage, security, and similar functions.`
      },
      {
        kind: 'paragraph',
        text: `Third parties operate under their own terms, security practices, availability models, and change processes. FeraSetu does not control them and does not guarantee their uninterrupted performance. Where a third-party failure affects a feature, FeraSetu will aim to communicate and restore functionality reasonably, but it may need to wait for the third party or use an alternative.`
      },
      {
        kind: 'paragraph',
        text: `This section does not excuse FeraSetu from obligations that cannot lawfully be excluded, and it does not remove your responsibility for third-party tools or services you choose to use independently.`
      }
    ]
  },
  {
    id: 'availability',
    title: 'Service Availability, Maintenance and Changes',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu aims to provide reliable Services. However, online software depends on networks, devices, browsers, providers, and operational systems, so downtime, maintenance, bugs, updates, and interruptions can occur.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu may perform scheduled or emergency maintenance, apply security updates, fix defects, change infrastructure, or temporarily disable a feature. Third-party outages may also affect functionality.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu may add, change, replace, or discontinue features. Important product changes may be communicated through the product, Account, email, or other appropriate channels. FeraSetu does not promise 100% uptime unless a separate written SLA applies.`
      }
    ]
  },
  {
    id: 'security',
    title: 'Security',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu uses reasonable technical and organizational safeguards appropriate to the Services. However, no internet-connected system is completely risk-free, and FeraSetu cannot promise that data or systems can never be compromised.`
      },
      {
        kind: 'paragraph',
        text: `You should protect your Account, devices, browser, credentials, and business systems. If you believe there is a security issue involving FeraSetu, contact security@ferasetu.com without exploiting, accessing, modifying, downloading, or disclosing another user's data.`
      }
    ]
  },
  {
    id: 'suspension-termination',
    title: 'Suspension and Termination',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu may suspend or terminate access where reasonably necessary for material breach, non-payment, fraud, illegal activity, security threats, abuse, repeated violations, risk to users or the platform, or legal or regulatory requirements, subject to applicable law.`
      },
      {
        kind: 'paragraph',
        text: `Where practical and appropriate, FeraSetu will give notice and an opportunity to cure non-critical violations. Immediate suspension may be appropriate for serious security incidents, fraud, illegal activity, urgent risk, or where notice is legally restricted.`
      },
      {
        kind: 'list',
        items: [
          `You may stop using the Services at any time and may cancel an available Subscription as described in these Terms.`,
          `After cancellation or termination, Store and storefront availability depend on Account status and plan. Public storefronts may become unavailable while Merchant Data is retained as described in the Privacy Policy.`,
          `Paid features may stop at the end of the current billing period or immediately where permitted by applicable law and the product's cancellation flow.`,
          `FeraSetu will not automatically delete all Merchant Data instantly. Retention may be required for legal, regulatory, billing, dispute, security, or reasonable operational reasons.`,
          `Provisions that naturally survive termination, including ownership, licenses needed for retention, payment obligations accrued, disclaimers, liability, indemnification, dispute resolution, and confidentiality, remain in effect.`
        ]
      }
    ]
  },
  {
    id: 'data-export',
    title: 'Data Export and Portability',
    blocks: [
      {
        kind: 'paragraph',
        text: `Where the product provides export functionality, you may export available Merchant Data and business records. Export options may depend on your plan, available product functionality, data format, Account status, legal requirements, and technical limitations.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu does not promise unlimited historical backups forever. You are responsible for exporting or separately preserving records you need for accounting, tax, legal, or business purposes where the Services do not provide indefinite retention.`
      }
    ]
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    blocks: [
      {
        kind: 'paragraph',
        text: `Except as expressly stated in these Terms or a separate written agreement, and to the maximum extent permitted by applicable law, the Services are provided on an as-is and as-available basis.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu does not guarantee specific revenue, sales volume, customer acquisition, search-engine ranking, conversion rate, uninterrupted availability, error-free operation, third-party information, AI accuracy, merchant legal compliance, or the success of any merchant business strategy.`
      },
      {
        kind: 'paragraph',
        text: `This document is not legal, tax, financial, regulatory, or professional advice. You should obtain qualified advice for your business requirements.`
      },
      {
        kind: 'paragraph',
        text: `Nothing in these Terms excludes or limits responsibilities or rights that cannot lawfully be excluded or limited.`
      }
    ]
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    blocks: [
      {
        kind: 'paragraph',
        text: `To the maximum extent permitted by applicable law, FeraSetu is not liable for indirect, incidental, special, punitive, exemplary, or consequential losses, lost profits, lost revenue, lost business opportunities, lost goodwill, or loss of data arising from use of the Services.`
      },
      {
        kind: 'paragraph',
        text: `Subject to applicable law and appropriate exclusions, FeraSetu's aggregate liability arising from or relating to the Services is limited to the total fees you paid or payable to FeraSetu for the Services during the twelve months preceding the event giving rise to the claim, or such higher amount as required by applicable law.`
      },
      {
        kind: 'paragraph',
        text: `This section does not limit liability for fraud, willful misconduct, or any other liability that cannot be excluded or limited under applicable law.`
      }
    ]
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    blocks: [
      {
        kind: 'paragraph',
        text: `To the extent permitted by applicable law, you will defend, indemnify, and hold harmless FeraSetu and its personnel from claims, damages, liabilities, losses, costs, and reasonable expenses arising from:`
      },
      {
        kind: 'list',
        items: [
          `Your products, services, prices, descriptions, fulfillment, taxes, or customer promises.`,
          `Your Content, including intellectual-property infringement, defamation, or unauthorized media.`,
          `Disputes between you and Merchant Customers.`,
          `Your violation of applicable law, these Terms, or third-party rights.`,
          `Fraud, chargeback abuse, or misuse of the Services carried out through your Account.`,
          `Your collection, use, or disclosure of Merchant Customer data.`
        ]
      },
      {
        kind: 'paragraph',
        text: `This indemnity does not apply to the extent a claim arises from FeraSetu's breach of these Terms or its violation of applicable law. FeraSetu will provide reasonable notice of a claim where legally permitted.`
      }
    ]
  },
  {
    id: 'merchant-customer-disputes',
    title: 'Disputes Between Merchants and Merchant Customers',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu generally is not a party to purchase agreements between Merchants and Merchant Customers. Merchants are responsible for handling their customer relationships, including questions, cancellations, refunds, returns, warranty claims, delivery problems, payment disputes, and complaints.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu may provide technical tools or limited support to help diagnose an issue, but that assistance does not make FeraSetu the seller, guarantor, insurer, or legal party to a Merchant transaction.`
      },
      {
        kind: 'paragraph',
        text: `Statutory rights of Merchant Customers remain subject to applicable law. Nothing in these Terms attempts to waive rights that cannot be waived.`
      }
    ]
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Dispute Resolution',
    blocks: [
      {
        kind: 'paragraph',
        text: `These Terms and disputes arising from or relating to the Services are governed by the laws of India, without regard to conflict-of-law rules that would apply another legal system.`
      },
      {
        kind: 'paragraph',
        text: `Before starting formal proceedings, the parties will try to resolve a dispute in good faith through support or another reasonable communication channel. If the dispute is not resolved, it may be brought before a court, tribunal, or arbitral forum with jurisdiction under applicable law.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu has not stated a registered office address, arbitration seat, or exclusive city in this online document. Those details can be finalized through a separate legal notice, order confirmation, or agreement without changing the substance of these Terms.`
      }
    ]
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu may update these Terms. The Last Updated date will show the current version, and material changes may receive additional notice where appropriate and practical.`
      },
      {
        kind: 'paragraph',
        text: `If you continue using the Services after an updated version becomes effective, you accept the updated Terms where such acceptance is legally valid. Continued use is not the only way FeraSetu may obtain valid acceptance where law requires another method.`
      },
      {
        kind: 'paragraph',
        text: `Minor corrections and clarifications may be made without separate consent. Changes that materially reduce core purchased functionality or create significant new obligations will be handled in accordance with applicable law and any notice provided for the relevant plan.`
      }
    ]
  },
  {
    id: 'miscellaneous',
    title: 'Miscellaneous Legal Provisions',
    blocks: [
      {
        kind: 'list',
        items: [
          `Severability: If a provision is unenforceable, the remaining provisions continue where possible, and the unenforceable provision is replaced by an enforceable provision that most closely reflects the original intent.`,
          `Waiver: A delay or failure to enforce a right is not a waiver unless expressly stated in writing.`,
          `Assignment: You may not assign these Terms or your Account without FeraSetu's prior written consent. FeraSetu may assign these Terms in connection with a merger, acquisition, restructuring, or sale of assets, subject to applicable law.`,
          `Entire agreement: These Terms, the Privacy Policy, applicable plan terms, and specific agreements for a purchase form the agreement for the Services.`,
          `Relationship: The parties are independent contractors. These Terms do not create a partnership, agency, employment, franchise, or joint venture.`,
          `Force majeure: FeraSetu is not responsible for delay or failure caused by events beyond reasonable control, to the extent permitted by law. This does not excuse payment obligations already accrued.`,
          `Survival: Sections that naturally survive termination remain in effect.`,
          `Notices: FeraSetu may send notices through Account channels, email, or the product interface. You may send notices to the applicable contact email in section 25.`,
          `Language: Communications and records may be provided electronically in English or another supported language where available.`,
          `Electronic acceptance: You may accept these Terms electronically, including through Account signup, checkout, or continued use where legally permitted.`
        ]
      }
    ]
  },
  {
    id: 'contact',
    title: 'Contact',
    blocks: [
      {
        kind: 'paragraph',
        text: `For questions about these Terms, your Account, billing, or the Services, contact FeraSetu through the channels below. FeraSetu operates as an online service and does not require a physical office address for routine online support.`
      },
      {
        kind: 'note',
        tone: 'amber',
        title: `Security reports`,
        text: `For responsible security disclosure, email security@ferasetu.com. Please do not exploit, access, modify, download, or disclose data belonging to other users while investigating a suspected vulnerability.`
      }
    ]
  }
];

const SUMMARY_CARDS = [
  {
    icon: Store,
    title: `FeraSetu provides software`,
    text: `We supply the platform, storefront tools, order management, AI features, and infrastructure.`
  },
  {
    icon: Scale,
    title: `You operate your business`,
    text: `You remain responsible for your products, prices, fulfillment, taxes, refunds, and customer promises.`
  },
  {
    icon: Database,
    title: `You own your store data`,
    text: `Your business Content and Merchant Data remain yours, subject to the operational license in these Terms.`
  },
  {
    icon: Sparkles,
    title: `Review AI output`,
    text: `Fera AI can help draft and organize content, but you should review it before publishing or relying on it.`
  },
  {
    icon: CheckCircle2,
    title: `Transparent commercial terms`,
    text: `Plan fees, limits, billing frequency, and cancellation behavior are disclosed before payment.`
  }
];

const CONTACTS = [
  { label: `General Support`, email: `support@ferasetu.com`, description: `Account, billing, product, and technical questions.` },
  { label: `Privacy`, email: `privacy@ferasetu.com`, description: `Privacy Policy, personal data, and privacy requests.` },
  { label: `Security`, email: `security@ferasetu.com`, description: `Responsible security disclosure and security concerns.` }
];

function LegalBlockView({ block }: { block: LegalBlock }): ReactNode {
  if (block.kind === 'paragraph') {
    return <p className='text-slate-600 leading-relaxed'>{block.text}</p>;
  }

  if (block.kind === 'list') {
    return (
      <div className='space-y-3'>
        {block.intro && <p className='text-slate-600 leading-relaxed'>{block.intro}</p>}
        <ul className='space-y-2.5'>
          {block.items.map(item => (
            <li key={item} className='flex gap-3 text-slate-600 leading-relaxed'>
              <span className='mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500' aria-hidden='true' />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const classes = block.tone === 'amber'
    ? 'border-amber-200 bg-amber-50/70 text-amber-900'
    : 'border-blue-200 bg-blue-50/70 text-blue-900';
  const Icon = block.tone === 'amber' ? AlertTriangle : CheckCircle2;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${classes}`}>
      <div className='mb-1.5 flex items-center gap-2 text-sm font-bold'>
        <Icon size={16} className='shrink-0' aria-hidden='true' />
        {block.title}
      </div>
      <p className='text-sm leading-relaxed'>{block.text}</p>
    </div>
  );
}

export default function TermsPage() {
  const { getLocalizedLink, translate } = useLanguage();
  const [activeSection, setActiveSection] = useState(TERMS_SECTIONS[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tocItems = TERMS_SECTIONS.map((section, index) => ({
    id: section.id,
    title: section.title,
    number: String(index + 1)
  }));

  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      const visibleEntries = entries.filter(entry => entry.isIntersecting);
      if (!visibleEntries.length) return;

      const sortedEntries = visibleEntries.sort(
        (first, second) => first.boundingClientRect.top - second.boundingClientRect.top
      );
      setActiveSection(sortedEntries[0].target.id);
    }, {
      rootMargin: '-100px 0px -60% 0px',
      threshold: [0, 0.2, 0.5]
    });

    TERMS_SECTIONS.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observerRef.current?.observe(element);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const y = element.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const renderTocButton = (item: { id: string; title: string; number: string }, isDesktop: boolean) => {
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        type='button'
        onClick={() => scrollToSection(item.id)}
        aria-current={isActive ? 'true' : undefined}
        className={`w-full rounded-xl text-left transition-all ${
          isDesktop
            ? `px-3 py-2 text-xs sm:text-sm flex items-start gap-2 ${
                isActive
                  ? 'bg-blue-50 font-bold text-blue-700 shadow-2xs'
                  : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            : `px-3.5 py-2.5 text-sm flex items-start gap-2.5 ${
                isActive
                  ? 'bg-blue-50 font-bold text-blue-700 border-l-4 border-blue-600'
                  : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
        }`}
      >
        <span className={`shrink-0 text-xs font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'} ${isDesktop ? 'mt-0.5' : 'mt-0.5 w-5'}`}>
          {item.number}.
        </span>
        <span className='leading-snug'>{item.title}</span>
      </button>
    );
  };

  return (
    <PublicLayout>
      <SEO
        title='Terms of Service — FeraSetu'
        description='The rights and responsibilities of merchants using the FeraSetu online software service, including storefronts, orders, AI features, billing, data ownership, and termination.'
        url='https://ferasetu.com/terms'
        type='website'
      />

      <section className='relative border-b border-slate-200 bg-gradient-to-b from-blue-50/40 via-white to-[#F8FAFC] pb-10 pt-12'>
        <div className='mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8'>
          <div className='max-w-4xl'>
            <Link
              to={getLocalizedLink('/')}
              className='group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600'
            >
              <ArrowLeft size={16} className='transition-transform group-hover:-translate-x-1' aria-hidden='true' />
              {translate('common.backToHome')}
            </Link>

            <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700'>
              <ShieldCheck size={14} className='text-blue-600' aria-hidden='true' />
              Merchant Agreement
            </div>

            <h1 className='mb-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl'>
              Terms of Service
            </h1>

            <p className='mb-6 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl'>
              These Terms explain how the FeraSetu software service works, what FeraSetu provides, what merchants are responsible for, and how Accounts, plans, data, AI features, disputes, and termination are handled.
            </p>

            <div className='flex flex-wrap items-center gap-4 border-t border-slate-200/80 pt-2 text-sm font-medium text-slate-500'>
              <span>
                Last Updated: <strong className='text-slate-700'>August 31, 2026</strong>
              </span>
              <span className='hidden text-slate-300 sm:inline'>•</span>
              <span>Online Software Service</span>
              <span className='hidden text-slate-300 sm:inline'>•</span>
              <span>Not a Marketplace</span>
            </div>
          </div>
        </div>
      </section>

      <div className='mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8'>
        <section aria-label='Important summary' className='mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {SUMMARY_CARDS.map(({ icon: Icon, title, text }) => (
            <div key={title} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs'>
              <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700'>
                <Icon size={20} aria-hidden='true' />
              </div>
              <h2 className='mb-1.5 text-base font-bold text-slate-900'>{title}</h2>
              <p className='text-sm leading-relaxed text-slate-600'>{text}</p>
            </div>
          ))}
        </section>

        <section className='mb-10 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6'>
          <div className='mb-3 flex items-center gap-2 text-base font-bold text-slate-900'>
            <FileText size={18} className='text-blue-600' aria-hidden='true' />
            Summary
          </div>
          <div className='space-y-3 text-sm leading-relaxed text-slate-600 sm:text-base'>
            <p>
              FeraSetu is an online software/SaaS platform for merchants and shopkeepers. These Terms govern access to and use of the Services by merchants, Account users, and other visitors where legally permitted.
            </p>
            <p>
              FeraSetu helps merchants operate digital storefronts and business tools, but FeraSetu is not a marketplace, is not the seller of merchant products, and does not own merchant inventory or control merchant prices. Merchants contract directly with their customers.
            </p>
            <p>
              By accessing or using the Services, you agree to these Terms where such agreement is legally permitted. If you do not agree, please do not use the Services. These Terms are separate from the FeraSetu Privacy Policy, which explains how data is handled.
            </p>
          </div>
        </section>

        <div className='mb-8 lg:hidden'>
          <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs'>
            <button
              type='button'
              onClick={() => setMobileMenuOpen(current => !current)}
              aria-expanded={mobileMenuOpen}
              aria-controls='terms-mobile-toc'
              className='flex w-full items-center justify-between bg-slate-50 px-5 py-4 text-left font-bold text-slate-900 transition-colors hover:bg-slate-100'
            >
              <span className='flex items-center gap-2 text-sm'>
                <FileText size={16} className='text-blue-600' aria-hidden='true' />
                Table of Contents
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-500 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden='true'
              />
            </button>
            {mobileMenuOpen && (
              <nav id='terms-mobile-toc' className='max-h-80 space-y-1 overflow-y-auto border-t border-slate-200 bg-white p-3' aria-label='Table of contents'>
                {tocItems.map(item => renderTocButton(item, false))}
              </nav>
            )}
          </div>
        </div>

        <div className='flex flex-col items-start gap-10 lg:flex-row'>
          <aside className='hidden w-72 shrink-0 lg:block'>
            <div className='sticky top-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs'>
              <div className='mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold tracking-tight text-slate-900'>
                <FileText size={16} className='text-blue-600' aria-hidden='true' />
                Table of Contents
              </div>
              <nav className='max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto pr-1' aria-label='Table of contents'>
                {tocItems.map(item => renderTocButton(item, true))}
              </nav>
            </div>
          </aside>

          <main className='min-w-0 flex-1 space-y-8'>
            {TERMS_SECTIONS.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className='scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8'
              >
                <h2 className='mb-5 flex items-start gap-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl'>
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-extrabold text-blue-700'>
                    {index + 1}
                  </span>
                  {section.title}
                </h2>
                <div className='space-y-4'>
                  {section.blocks.map((block, blockIndex) => (
                    <LegalBlockView key={blockIndex} block={block} />
                  ))}
                </div>
                {section.id === 'contact' && (
                  <div className='mt-6'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      {CONTACTS.map(contact => (
                        <div key={contact.email} className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                          <h3 className='mb-1.5 flex items-center gap-2 text-base font-bold text-slate-900'>
                            <Mail size={16} className='text-blue-600' aria-hidden='true' />
                            {contact.label}
                          </h3>
                          <p className='mb-3 text-sm leading-relaxed text-slate-600'>{contact.description}</p>
                          <a
                            href={`mailto:${contact.email}`}
                            className='inline-flex min-h-[40px] items-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50'
                          >
                            {contact.email}
                          </a>
                        </div>
                      ))}
                    </div>

                    <div className='mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5 text-sm font-semibold'>
                      <Link to={getLocalizedLink('/privacy')} className='rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700'>
                        Privacy Policy
                      </Link>
                      <Link to={getLocalizedLink('/support')} className='rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700'>
                        Support
                      </Link>
                      <Link to={getLocalizedLink('/')} className='rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700'>
                        FeraSetu Home
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </main>
        </div>
      </div>
    </PublicLayout>
  );
}
