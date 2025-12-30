'use client';

import { Container } from '../ui/container';
import { Section } from '../ui/section';
import { MotionDiv, MotionH2, MotionP, fadeSlideUp, useReducedMotion } from '../../lib/motion';

export function SecuritySection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Section spacing="lg" className="bg-[hsl(var(--muted))]/30">
      <Container size="lg">
        <MotionDiv
          className="mx-auto max-w-3xl text-center"
          variants={prefersReducedMotion ? {} : fadeSlideUp}
          initial="hidden"
          animate="visible"
        >
          <MotionH2
            className="mb-6 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl"
            variants={prefersReducedMotion ? {} : fadeSlideUp}
          >
            Security & Compliance
          </MotionH2>
          <MotionP
            className="text-lg leading-relaxed text-[hsl(var(--muted-foreground))]"
            variants={prefersReducedMotion ? {} : fadeSlideUp}
          >
            Every audit log is designed for complete auditability. Append-only architecture ensures
            events cannot be modified or deleted after creation. Role-based access control provides
            fine-grained permissions for viewing and exporting logs. For organizations requiring
            additional security guarantees, tamper-evident logging with cryptographic verification
            can be enabled to detect any unauthorized modifications.
          </MotionP>
        </MotionDiv>
      </Container>
    </Section>
  );
}

