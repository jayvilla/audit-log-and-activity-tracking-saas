import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './input';
import { useRef } from 'react';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const { result } = renderHook(() => useRef<HTMLInputElement>(null));
    const ref = result.current as RefObject<HTMLInputElement>;
    
    render(<Input ref={ref} data-testid="test-input" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute('data-testid', 'test-input');
  });

  it('forwards aria props', () => {
    render(
      <Input
        aria-label="Email input"
        aria-describedby="email-help"
        aria-invalid="true"
        aria-required="true"
      />
    );
    
    const input = screen.getByRole('textbox', { name: /email input/i });
    expect(input).toHaveAttribute('aria-label', 'Email input');
    expect(input).toHaveAttribute('aria-describedby', 'email-help');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('forwards other HTML attributes', () => {
    render(
      <Input
        type="email"
        placeholder="Enter email"
        id="email-input"
        className="custom-class"
        data-testid="email"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('id', 'email-input');
    expect(input).toHaveClass('custom-class');
    expect(input).toHaveAttribute('data-testid', 'email');
  });

  it('applies error styling when error prop is true', () => {
    render(<Input error data-testid="error-input" />);
    
    const input = screen.getByTestId('error-input');
    expect(input).toHaveClass('border-accent');
  });
});

