import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './table';

describe('Table', () => {
  it('renders table with rows', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>jane@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    // Check headers
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    
    // Check cells
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/jane smith/i)).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/i)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Empty body */}
        </TableBody>
      </Table>
    );
    
    // Headers should still be present
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    
    // No data cells should be present
    const cells = screen.queryAllByRole('cell');
    expect(cells).toHaveLength(0);
  });

  it('renders table with caption', () => {
    render(
      <Table>
        <TableCaption>User List</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    expect(screen.getByText(/user list/i)).toBeInTheDocument();
  });

  it('forwards props to table elements', () => {
    render(
      <Table data-testid="test-table" className="custom-table">
        <TableHeader>
          <TableRow data-testid="header-row">
            <TableHead className="custom-head">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-testid="body-row">
            <TableCell className="custom-cell" data-testid="test-cell">
              Test
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    expect(screen.getByTestId('test-table')).toBeInTheDocument();
    expect(screen.getByTestId('test-table')).toHaveClass('custom-table');
    expect(screen.getByTestId('header-row')).toBeInTheDocument();
    expect(screen.getByTestId('body-row')).toBeInTheDocument();
    expect(screen.getByTestId('test-cell')).toBeInTheDocument();
    expect(screen.getByTestId('test-cell')).toHaveClass('custom-cell');
  });
});

