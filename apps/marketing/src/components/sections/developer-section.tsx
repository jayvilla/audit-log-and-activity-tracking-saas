'use client';

import { Container } from '../ui/container';
import { Section } from '../ui/section';
import { Card, CardContent } from '../ui/card';
import { MotionDiv, MotionH2, MotionP, fadeSlideUp, useReducedMotion } from '../../lib/motion';

export function DeveloperSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Section spacing="lg">
      <Container size="lg">
        <MotionDiv
          className="mx-auto max-w-4xl"
          variants={prefersReducedMotion ? {} : fadeSlideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-12 text-center">
            <MotionH2
              className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl"
              variants={prefersReducedMotion ? {} : fadeSlideUp}
            >
              Developer-first
            </MotionH2>
            <MotionP
              className="text-lg text-[hsl(var(--muted-foreground))]"
              variants={prefersReducedMotion ? {} : fadeSlideUp}
            >
              Simple REST API. Get started in minutes.
            </MotionP>
          </div>

          <Card variant="bordered" className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-[hsl(var(--muted))]/30 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                POST /v1/audit-events
              </div>
              <pre className="overflow-x-auto bg-[hsl(var(--card))] p-6 text-sm text-[hsl(var(--foreground))]">
                <code>{`{
  "actor": "user:john.doe@example.com",
  "action": "create",
  "resource": "document:123",
  "metadata": {
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  }
}`}</code>
              </pre>
            </CardContent>
          </Card>
        </MotionDiv>
      </Container>
    </Section>
  );
}

