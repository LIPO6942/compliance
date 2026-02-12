import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectorDialog from './ConnectorDialog';

describe('ConnectorDialog', () => {
  it('renders and submits addBranch form', async () => {
    const onSubmit = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConnectorDialog
        open={true}
        onOpenChange={() => {}}
        mode="addBranch"
        initialValue=""
        initialTaskName=""
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText('Label de la branche');
    fireEvent.change(input, { target: { value: 'Oui' } });

    const submit = screen.getByText('Ajouter');
    fireEvent.click(submit);

    // onSubmit is async — give a tick
    await new Promise((r) => setTimeout(r, 0));

    expect(onSubmit).toHaveBeenCalledWith({ value: 'Oui', taskName: '' });
  });
});
