import React from 'react';
import SEOHead, { type SEOHeadProps } from './seo/SEOHead';

export type SEOProps = SEOHeadProps;

export default function SEO(props: SEOProps) {
  return <SEOHead {...props} />;
}
