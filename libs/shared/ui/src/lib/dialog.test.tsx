import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';

describe('Dialog', () => {
  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Test description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    
    const trigger = screen.getByRole('button', { name: /open dialog/i });
    expect(trigger).toBeInTheDocument();
    
    // Dialog should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    
    // Click trigger to open
    await user.click(trigger);
    
    // Dialog should now be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/test dialog/i)).toBeInTheDocument();
    expect(screen.getByText(/test description/i)).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    
    // Dialog should be open initially
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Find and click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    // Dialog should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when DialogClose component is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogClose>Cancel</DialogClose>
        </DialogContent>
      </Dialog>
    );
    
    // Dialog should be open initially
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Click DialogClose button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    // Dialog should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('can be controlled with open prop', () => {
    const { rerender } = render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    
    // Dialog should not be visible when open={false}
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    
    // Update to open={true}
    rerender(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    
    // Dialog should now be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/controlled dialog/i)).toBeInTheDocument();
  });
});

