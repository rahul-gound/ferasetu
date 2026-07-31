import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How quickly can I launch my store?',
    answer:
      'You can have a fully functional online store ready in minutes! Choose a template, customize it with your products and branding, and start selling immediately.',
  },
  {
    question: 'Do I need technical skills to use FeraSetu?',
    answer:
      'Absolutely not! FeraSetu is designed for non-technical users. Our intuitive drag-and-drop builder and pre-made templates make it easy for anyone to create a professional store.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'We support all major Indian payment gateways including Razorpay, PayU, and direct bank transfers. WhatsApp ordering also allows cash-on-delivery.',
  },
  {
    question: 'Can I integrate with my existing inventory system?',
    answer:
      'Yes! FeraSetu offers API integrations with popular inventory management systems. Our team can help you set up custom integrations.',
  },
  {
    question: 'What happens to my data if I cancel my subscription?',
    answer:
      'Your data is always yours. You can export all your store data and customer information at any time, even if you cancel.',
  },
  {
    question: 'Is there a way to migrate from another platform?',
    answer:
      'Yes, we offer free migration services. Our team will help you transfer your existing products and customer data to FeraSetu.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Frequently Asked <span className="text-orange-600">Questions</span>
          </h2>
          <p className="text-xl text-slate-600">
            Everything you need to know about FeraSetu.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <button
              key={index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full text-left"
            >
              <div className="p-6 bg-white rounded-lg border border-slate-200 hover:border-orange-300 transition-all duration-300">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-900">{faq.question}</h3>
                  <ChevronDown
                    size={24}
                    className={`flex-shrink-0 text-orange-600 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {openIndex === index && (
                  <p className="mt-4 text-slate-600 leading-relaxed">{faq.answer}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 p-8 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-200 text-center">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Still have questions?</h3>
          <p className="text-slate-600 mb-4">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <button className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition">
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
}
