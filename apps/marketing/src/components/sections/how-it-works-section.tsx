'use client';

import { Container } from '../ui/container';
import { Section } from '../ui/section';
import { MotionDiv, MotionH2, MotionP, fadeSlideUp, staggerContainer, useReducedMotion } from '../../lib/motion';

interface StepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function Step({ number, title, description, icon }: StepProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionDiv
      className="relative"
      variants={prefersReducedMotion ? {} : fadeSlideUp}
    >
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          {icon}
        </div>
        <div className="mb-2 text-sm font-medium text-[hsl(var(--accent2))]">
          Step {number}
        </div>
        <h3 className="mb-3 text-xl font-semibold text-[hsl(var(--foreground))]">
          {title}
        </h3>
        <p className="text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
    </MotionDiv>
  );
}

export function HowItWorksSection() {
  const prefersReducedMotion = useReducedMotion();

  const steps = [
    {
      number: '1',
      title: 'Ingest',
      description: 'Send audit events via REST API. Simple, secure, and designed for high throughput.',
      icon: (
        <svg
          className="h-8 w-8 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
    {
      number: '2',
      title: 'Investigate',
      description: 'Filter, search, and analyze events with powerful query capabilities. Find what you need in seconds.',
      icon: (
        <svg
          className="h-8 w-8 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      number: '3',
      title: 'Export/Stream',
      description: 'Export to CSV or JSON for compliance audits, or stream events in real-time via webhooks.',
      icon: (
        <svg
          className="h-8 w-8 text-[hsl(var(--accent2))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
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
            How it works
          </MotionH2>
          <MotionP
            className="text-lg text-[hsl(var(--muted-foreground))]"
            variants={prefersReducedMotion ? {} : fadeSlideUp}
          >
            Three simple steps to complete audit visibility
          </MotionP>
        </MotionDiv>

        <MotionDiv
          className="grid gap-12 md:grid-cols-3"
          variants={prefersReducedMotion ? {} : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {steps.map((step) => (
            <Step key={step.number} {...step} />
          ))}
        </MotionDiv>
      </Container>
    </Section>
  );
}

