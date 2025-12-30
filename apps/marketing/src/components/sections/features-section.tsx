'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Container } from '../ui/container';
import { Section } from '../ui/section';
import { MotionDiv, MotionH2, MotionP, fadeSlideUp, cardHover, staggerContainer, useReducedMotion } from '../../lib/motion';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionDiv
      variants={prefersReducedMotion ? {} : cardHover}
      initial="rest"
      whileHover="hover"
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
    >
      <Card variant="bordered">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--accent2))]/10">
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </MotionDiv>
  );
}

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion();

  const features = [
    {
      title: 'Append-only events',
      description: 'Immutable audit trail that can never be modified or deleted. Every event is permanently recorded with cryptographic integrity.',
      icon: (
        <svg
          className="h-6 w-6 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      title: 'Actor / Resource / Action model',
      description: 'Structured event model that captures who did what to which resource. Clear, consistent, and queryable.',
      icon: (
        <svg
          className="h-6 w-6 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      title: 'Fast filtering & search',
      description: 'Filter by event type, actor, resource, date range, and more. Full-text search across metadata for quick incident investigation.',
      icon: (
        <svg
          className="h-6 w-6 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      ),
    },
    {
      title: 'RBAC & org isolation',
      description: 'Fine-grained permissions ensure only authorized users can view, filter, and export audit logs. Perfect for compliance and security.',
      icon: (
        <svg
          className="h-6 w-6 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      title: 'CSV/JSON exports',
      description: 'Export audit logs in JSON or CSV format. Perfect for compliance audits, security reviews, and data analysis.',
      icon: (
        <svg
          className="h-6 w-6 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      title: 'Webhooks with retries',
      description: 'Get instant notifications when critical events occur. Configure webhooks with automatic retries and delivery status tracking.',
      icon: (
        <svg
          className="h-6 w-6 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <Section spacing="lg">
      <Container size="lg">
        <MotionDiv
          className="mb-16 text-center"
          variants={prefersReducedMotion ? {} : fadeSlideUp}
          initial="hidden"
          animate="visible"
        >
          <MotionH2
            className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl"
            variants={prefersReducedMotion ? {} : fadeSlideUp}
          >
            Everything you need for complete audit visibility
          </MotionH2>
          <MotionP
            className="text-lg text-[hsl(var(--muted-foreground))]"
            variants={prefersReducedMotion ? {} : fadeSlideUp}
          >
            Powerful features designed for security, compliance, and peace of mind
          </MotionP>
        </MotionDiv>

        <MotionDiv
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={prefersReducedMotion ? {} : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </MotionDiv>
      </Container>
    </Section>
  );
}

