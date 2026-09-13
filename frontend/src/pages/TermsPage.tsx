import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Mail,
  Scale,
  ShieldCheck
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
          `FeraSetu AI means automated features that generate or process content, summaries, suggestions, translations, insights, or other outputs.`,
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
    title: 'Marketplace & Merchant of Record Disclaimer — Software Provider Only',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu provides technical infrastructure only. We are not a party to any transaction between store owners and buyers. Store owners hold 100% liability for taxes, consumer protection laws, shipping, and product safety.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu is not a merchant of record, broker, auctioneer, or marketplace seller. We do not manufacture, inspect, package, warrant, store, or deliver products listed on merchant storefronts. All sales, delivery contracts, refund agreements, and commercial promises are formed solely and directly between the merchant and the end customer.`
      },
      {
        kind: 'note',
        tone: 'blue',
        title: `Absolute Separation of Liability`,
        text: `FeraSetu supplies the digital toolset. You operate your independent commercial business and retain 100% legal, regulatory, and operational liability for your catalog, storefront, and transactions.`
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
    title: 'FeraSetu AI and Automated Features',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu AI may generate product descriptions, marketing copy, translations, catalog content, suggestions, summaries, business insights, or other automated outputs. FeraSetu AI is intended to help you work faster, not to replace your review or judgment.`
      },
      {
        kind: 'list',
        items: [
          `AI output can be inaccurate, incomplete, outdated, unsuitable, biased, or inappropriate for your business or jurisdiction.`,
          `You are responsible for reviewing AI output before publishing it or relying on it for a business decision.`,
          `FeraSetu AI does not provide legal, financial, tax, medical, regulatory, audit, or other professional advice.`,
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
        text: `Strict No-Refund Policy: All subscription fees, plan charges, add-on storage, and AI credit purchases are final and strictly non-refundable once billed. FeraSetu does not provide cash refunds, partial refunds, or prorated credits for any unused subscription periods, plan downgrades, account terminations, or early cancellations. You may cancel your subscription at any time through your account settings to prevent future automatic renewals. Upon cancellation, your existing access will continue until the conclusion of your current prepaid billing cycle. FeraSetu does not offer a money-back guarantee under any circumstances.`
      },
      {
        kind: 'note',
        tone: 'amber',
        title: `Strict No-Refund Policy`,
        text: `All subscription fees and credit pack purchases are final and non-refundable. You may cancel anytime to stop future renewals, but no refunds or prorated credits are issued for active or past billing periods.`
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payment Processing and Third-Party Payment Providers',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu may use Third-Party Services for subscription billing and related payment processing. Where applicable, these may include payment processors such as Cashfree, Razorpay, or Stripe and payment rails such as UPI. Payment processing is subject to the processor's terms, privacy policy, limits, risk controls, and applicable law.`
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
    title: 'Acceptable Use Policy (AUP) & Immediate Termination',
    blocks: [
      { kind: 'paragraph', text: `You may use the Services only for lawful purposes. You must not:` },
      {
        kind: 'list',
        items: [
          `Violate applicable local, national, or international law, court order, or regulatory requirement.`,
          `Infringe another person's or business's intellectual property, trademark, copyright, privacy, contract, or other rights.`,
          `Sell, promote, or facilitate illegal, restricted, unsafe, hazardous, counterfeit, unapproved pharmaceuticals, weapons, adult content, or unauthorized products or services.`,
          `Misrepresent affiliation, endorsement, identity, price, availability, certification, or business capability.`,
          `Create fake storefronts, fake reviews, fake demand, fraudulent orders, or deceptive scarcity.`,
          `Commit or facilitate payment fraud, chargeback abuse, phishing, impersonation, money laundering, or financial crime.`,
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
        text: `Absolute Right of Termination: FeraSetu retains the absolute, unilateral right to instantly terminate, freeze, or suspend any store, storefront, or Account suspected of fraud, spam, intellectual property infringement, or selling prohibited or unlawful items, immediately and without prior notice, and without any liability to issue a refund of subscription fees or account credits.`
      },
      {
        kind: 'note',
        tone: 'amber',
        title: `Zero-Tolerance Enforcement`,
        text: `Engaging in fraudulent activity or listing illegal products results in immediate, permanent store removal and forfeiture of all service fees without refund.`
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
    title: '"As-Is" Service & Disclaimer of All Warranties',
    blocks: [
      {
        kind: 'paragraph',
        text: `TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, THE SERVICES, PLATFORM, DOCUMENTATION, AND ALL OUTPUTS (INCLUDING FERASETU AI) ARE PROVIDED ON AN "AS-IS" AND "AS-AVAILABLE" BASIS, WITH ALL FAULTS AND DEFECTS.`
      },
      {
        kind: 'paragraph',
        text: `FERASETU EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, QUIET ENJOYMENT, AND NON-INFRINGEMENT.`
      },
      {
        kind: 'paragraph',
        text: `WE MAKE NO WARRANTY, COMMITMENT, OR UPTIME GUARANTEE THAT THE SERVICES WILL MEET YOUR SPECIFIC COMMERCIAL REQUIREMENTS, BE UNINTERRUPTED, SECURE, BUG-FREE, ACCURATE, COMPLETE, OR FREE OF HARMFUL COMPONENTS OR DATA LOSS.`
      },
      {
        kind: 'note',
        tone: 'amber',
        title: `Commercial Independence`,
        text: `You acknowledge that you independently assess the suitability of the software for your retail business operations.`
      }
    ]
  },
  {
    id: 'liability',
    title: 'Absolute Limitation of Liability',
    blocks: [
      {
        kind: 'paragraph',
        text: `TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL FERASETU, ITS DIRECTORS, EMPLOYEES, AFFILIATES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS INTERRUPTION) ARISING FROM OR RELATED TO YOUR USE OF THE SERVICES.`
      },
      {
        kind: 'paragraph',
        text: `CAP ON AGGREGATE LIABILITY: TO THE MAXIMUM EXTENT PERMITTED BY LAW, FERASETU'S TOTAL CUMULATIVE AND AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES (WHETHER IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) IS STRICTLY CAPPED AT AND SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU TO FERASETU IN THE PRECEDING TWELVE (12) MONTHS, OR $50 USD (OR THE DIRECT EQUIVALENT IN INDIAN RUPEES AT THE PREVAILING EXCHANGE RATE), WHICHEVER IS LOWER.`
      }
    ]
  },
  {
    id: 'indemnification',
    title: 'Full Indemnification & Legal Defense',
    blocks: [
      {
        kind: 'paragraph',
        text: `You agree to defend, indemnify, and hold harmless FeraSetu, its parent company, officers, directors, employees, contractors, and agents from and against any and all claims, demands, liabilities, damages, losses, settlements, judgments, costs, and expenses (including reasonable attorneys' fees and court costs) arising out of or related to:`
      },
      {
        kind: 'list',
        items: [
          `Your store, storefront, products, services, descriptions, fulfillment, shipping, taxation, warranties, or customer representations.`,
          `Any dispute, chargeback, transaction, or controversy between you and any of your Merchant Customers or third-party suppliers.`,
          `Your violation of any applicable domestic, international, or local consumer protection, health, safety, tax, or e-commerce law.`,
          `Any actual or alleged infringement or misappropriation of any third-party intellectual property rights, copyright, trademark, trade secret, or privacy rights by your store content, catalogs, images, or media.`,
          `Your violation of our Acceptable Use Policy, fraud, willful misconduct, or unauthorized access carried out through your account credentials.`
        ]
      },
      {
        kind: 'paragraph',
        text: `If a merchant's storefront, actions, or products subject FeraSetu to regulatory fines, civil lawsuits, or legal defense costs, the merchant assumes 100% of the associated financial burden, including all legal defense fees incurred by FeraSetu.`
      }
    ]
  },
  {
    id: 'merchant-customer-disputes',
    title: 'Disputes Between Merchants and Merchant Customers',
    blocks: [
      {
        kind: 'paragraph',
        text: `FeraSetu is strictly not a party to any contract or dispute between merchants and their buyers. Merchants are solely responsible for handling questions, cancellations, refunds, returns, warranty claims, delivery delays, payment disputes, and consumer complaints.`
      },
      {
        kind: 'paragraph',
        text: `FeraSetu does not act as an arbitrator, mediator, guarantor, or insurer for commercial transactions conducted via merchant stores.`
      }
    ]
  },
  {
    id: 'governing-law',
    title: 'Exclusive Governing Law & Jurisdiction',
    blocks: [
      {
        kind: 'paragraph',
        text: `These Terms shall be governed by the laws of India. You irrevocably agree that the courts of Maharashtra, India, hold exclusive jurisdiction over any disputes, overriding any local laws of your residing country.`
      },
      {
        kind: 'paragraph',
        text: `You expressly waive any objections to jurisdiction or venue in such courts on the grounds of inconvenient forum, personal jurisdiction, or otherwise.`
      }
    ]
  },
  {
    id: 'arbitration-class-action',
    title: 'Mandatory Binding Arbitration & Class Action Waiver',
    blocks: [
      {
        kind: 'paragraph',
        text: `PLEASE READ CAREFULLY: THIS SECTION CONTAINS A BINDING ARBITRATION CLAUSE AND WAIVER OF CLASS ACTION RIGHTS APPLICABLE TO ALL USERS GLOBALLY.`
      },
      {
        kind: 'paragraph',
        text: `Any dispute, controversy, or claim arising out of or relating to these Terms or the Services shall be finally resolved by individual binding arbitration administered in Maharashtra, India, in the English language, under the Arbitration and Conciliation Act, 1996 (as amended).`
      },
      {
        kind: 'paragraph',
        text: `CLASS ACTION WAIVER: YOU AND FERASETU AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING IN THE UNITED STATES, THE EUROPEAN UNION, INDIA, OR ANY OTHER JURISDICTION. YOU EXPRESSLY WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.`
      },
      {
        kind: 'note',
        tone: 'amber',
        title: `Waiver of Jury Trial and Class Proceedings`,
        text: `All disputes must be adjudicated individually through arbitration in Maharashtra, India. Class-action litigation is strictly waived.`
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

const CONTACT_CARDS = [
  {
    label: `General Support`,
    email: `support@ferasetu.com`,
    description: `Account, billing, product, and technical questions.`
  },
  {
    label: `Privacy`,
    email: `privacy@ferasetu.com`,
    description: `Privacy Policy, personal data, and privacy requests.`
  },
  {
    label: `Security`,
    email: `security@ferasetu.com`,
    description: `Responsible security disclosure and security concerns.`
  }
];

function LegalBlockView({ block }: { block: LegalBlock }): ReactNode {
  if (block.kind === 'paragraph') {
    return <p>{block.text}</p>;
  }

  if (block.kind === 'list') {
    return (
      <div className='space-y-3'>
        {block.intro && <p>{block.intro}</p>}
        <ul className='list-disc pl-5 space-y-2 text-sm text-slate-600'>
          {block.items.map(item => (
            <li key={item}>{item}</li>
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
    <div className={`rounded-xl border p-4 text-sm leading-relaxed ${classes}`}>
      <div className='mb-1.5 flex items-center gap-2 font-bold'>
        <Icon size={16} className='shrink-0' aria-hidden='true' />
        {block.title}
      </div>
      <p>{block.text}</p>
    </div>
  );
}

function EmailCopyButton({
  email,
  label,
  copiedEmail,
  onCopyEmail
}: {
  email: string;
  label: string;
  copiedEmail: string | null;
  onCopyEmail: (email: string) => void;
}) {
  const handleCopy = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onCopyEmail(email);
  };

  const copied = copiedEmail === email;

  return (
    <div className='flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100/70 sm:flex-row sm:items-center'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600'>
          <Mail size={18} />
        </div>
        <div>
          <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>{label}</span>
          <div className='break-all font-semibold text-slate-900'>
            <a href={`mailto:${email}`} className='text-blue-600 hover:underline'>
              {email}
            </a>
          </div>
        </div>
      </div>
      <div className='flex items-center gap-2 self-start sm:self-auto'>
        <button
          onClick={handleCopy}
          type='button'
          aria-label={`Copy ${email} address`}
          className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-95'
        >
          {copied ? (
            <>
              <Check size={14} className='text-emerald-600' />
              <span className='font-semibold text-emerald-600'>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} className='text-slate-500' />
              <span>Copy</span>
            </>
          )}
        </button>
        <a
          href={`mailto:${email}`}
          className='inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-2xs transition-all hover:bg-blue-700 active:scale-95'
        >
          Send Email
        </a>
      </div>
    </div>
  );
}

export default function TermsPage() {
  const { getLocalizedLink, translate } = useLanguage();
  const [activeSection, setActiveSection] = useState(TERMS_SECTIONS[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
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

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    window.setTimeout(() => setCopiedEmail(null), 2000);
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
              <span className='inline-flex items-center gap-1.5 font-semibold text-emerald-600'>
                <CheckCircle2 size={15} /> Clear &amp; Fair
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className='mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8'>
        <div className='mb-8 lg:hidden'>
          <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs'>
            <button
              type='button'
              onClick={() => setMobileMenuOpen(current => !current)}
              aria-expanded={mobileMenuOpen}
              aria-controls='mobile-toc'
              className='flex w-full items-center justify-between bg-slate-50 px-5 py-4 text-left font-bold text-slate-900 transition-colors hover:bg-slate-100'
            >
              <span className='flex items-center gap-2 text-sm'>
                <FileText size={16} className='text-blue-600' aria-hidden='true' />
                Table of Contents (
                {tocItems.find((item) => item.id === activeSection)?.number || '1'}.{' '}
                {tocItems.find((item) => item.id === activeSection)?.title || 'Definitions'}
                )
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-500 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden='true'
              />
            </button>
            {mobileMenuOpen && (
              <nav id='mobile-toc' className='max-h-80 space-y-1 overflow-y-auto border-t border-slate-200 bg-white p-3' aria-label='Table of contents'>
                {tocItems.map(item => renderTocButton(item, false))}
              </nav>
            )}
          </div>
        </div>

        <div className='flex flex-col items-start gap-10 lg:flex-row'>
          <aside className='sticky top-28 hidden w-72 shrink-0 lg:block'>
            <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs'>
              <div className='mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold tracking-tight text-slate-900'>
                <FileText size={16} className='text-blue-600' aria-hidden='true' />
                <span>Table of Contents</span>
              </div>
              <nav className='max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto pr-1' aria-label='Table of contents'>
                {tocItems.map(item => renderTocButton(item, true))}
              </nav>
            </div>

            <div className='mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-2xs'>
              <h4 className='mb-2 text-xs font-bold uppercase tracking-wider text-slate-500'>Terms Questions?</h4>
              <p className='mb-3 text-xs leading-relaxed text-slate-600'>
                Contact our support team directly:
              </p>
              <a
                href='mailto:support@ferasetu.com'
                className='inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition-colors hover:text-blue-700'
              >
                <Mail size={14} /> support@ferasetu.com
              </a>
            </div>
          </aside>

          <main className='min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-6 font-normal leading-relaxed text-slate-700 shadow-2xs sm:p-10 lg:p-12'>
            {TERMS_SECTIONS.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={
                  index === 0
                    ? 'scroll-mt-28 space-y-4'
                    : 'scroll-mt-28 space-y-5 border-t border-slate-100 pt-10'
                }
              >
                <div className='flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-600'>
                  <Scale size={18} /> Section {index + 1}
                </div>
                <h2 className='text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl'>
                  {index + 1}. {section.title}
                </h2>
                <div className='space-y-4'>
                  {section.blocks.map((block, blockIndex) => (
                    <LegalBlockView key={blockIndex} block={block} />
                  ))}
                </div>
                {section.id === 'contact' && (
                  <div className='space-y-4 pt-4'>
                    <div className='space-y-4 pt-2'>
                      {CONTACT_CARDS.map(contact => (
                        <div key={contact.email}>
                          <h3 className='mb-1 text-lg font-bold text-slate-900'>{contact.label}</h3>
                          <p className='mb-3 text-sm text-slate-600'>{contact.description}</p>
                          <EmailCopyButton
                            email={contact.email}
                            label={contact.label}
                            copiedEmail={copiedEmail}
                            onCopyEmail={copyEmail}
                          />
                        </div>
                      ))}
                    </div>

                    <div className='space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                      <h3 className='text-base font-bold text-slate-900'>Terms Questions</h3>
                      <p className='text-sm leading-relaxed text-slate-600'>
                        When contacting FeraSetu about these Terms, include your Account email and a short description of the question. This helps us route the request to the appropriate team.
                      </p>
                    </div>

                    <div className='space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                      <h3 className='text-base font-bold text-slate-900'>No Physical Address Required for Online Support</h3>
                      <p className='text-sm leading-relaxed text-slate-600'>
                        FeraSetu operates as an online service. Support for these Terms is handled through the contact methods above and available product support channels.
                      </p>
                    </div>

                    <div className='flex flex-wrap gap-3 border-t border-slate-100 pt-5 text-sm font-semibold'>
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
