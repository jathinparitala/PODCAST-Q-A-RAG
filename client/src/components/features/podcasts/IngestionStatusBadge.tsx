import React from 'react';
import { Badge } from '../../ui/Badge';

const statusMap: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'processing'; label: string }> = {
  pending: { variant: 'default', label: 'No Transcript' },
  processing: { variant: 'processing', label: 'Processing' },
  ready: { variant: 'success', label: 'Ready' },
  failed: { variant: 'danger', label: 'Failed' },
};

export const IngestionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusMap[status] || statusMap.pending;
  return <Badge variant={config.variant} dot size="sm">{config.label}</Badge>;
};
