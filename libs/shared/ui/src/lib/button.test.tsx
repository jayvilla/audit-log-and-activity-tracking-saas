import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('forwards props to button element', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(
      <Button onClick={handleClick} data-testid="test-button">
        Click
      </Button>
    );
    
    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('prevents click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
    
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards className and other HTML attributes', () => {
    render(
      <Button className="custom-class" aria-label="Custom label" id="test-id">
        Button
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /custom label/i });
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveAttribute('id', 'test-id');
  });

  it('renders as link when href is provided', () => {
    render(
      <Button href="/test">Link Button</Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});

