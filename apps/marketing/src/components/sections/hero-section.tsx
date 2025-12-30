'use client';

import { Button } from '../ui/button';
import { Container } from '../ui/container';
import { Section } from '../ui/section';
import { MotionDiv, MotionH1, MotionP, fadeSlideUp, staggerContainer, useReducedMotion } from '../../lib/motion';
import HeroVisual from '../three/HeroVisual';

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Section spacing="xl" className="relative overflow-hidden">
      <Container size="lg">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Content */}
          <MotionDiv
            className="text-center lg:text-left"
            variants={prefersReducedMotion ? {} : staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <MotionH1
              className="mb-6 text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-6xl lg:text-7xl"
              variants={prefersReducedMotion ? {} : fadeSlideUp}
            >
              Audit logs you can trust.
            </MotionH1>
            <MotionP
              className="mb-8 text-xl text-[hsl(var(--muted-foreground))] sm:text-2xl"
              variants={prefersReducedMotion ? {} : fadeSlideUp}
            >
              Append-only logs with role-based access control, export capabilities, and webhook integrations.
            </MotionP>
            <MotionDiv
              className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
              variants={prefersReducedMotion ? {} : fadeSlideUp}
            >
              <Button size="lg" variant="default" href="/dashboard">
                View Dashboard
              </Button>
              <Button size="lg" variant="outline" href="/docs">
                Read Docs
              </Button>
            </MotionDiv>
          </MotionDiv>

          {/* Right: 3D Visual */}
          <div className="relative h-[400px] lg:h-[500px]">
            <div className="absolute inset-0 pointer-events-none">
              <HeroVisual />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

