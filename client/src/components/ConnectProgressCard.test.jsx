import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConnectProgressCard from './ConnectProgressCard';

const steps = [
  { key: 'network', label: 'Connecting to server' },
  { key: 'session', label: 'Establishing session' },
  { key: 'voice', label: 'Preparing voice' },
  { key: 'ready', label: 'Ready' },
];

describe('ConnectProgressCard', () => {
  it('renders current step and progress percent', () => {
    render(<ConnectProgressCard steps={steps} stage={1} />);

    expect(screen.getByText('Establishing session', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clamps stage above bounds to last step', () => {
    render(<ConnectProgressCard steps={steps} stage={99} />);
    expect(screen.getByText('Ready', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
