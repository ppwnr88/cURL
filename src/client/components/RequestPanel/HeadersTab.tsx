import { KeyValueTable } from '../KeyValueTable';
import type { KeyValuePair } from '../../types/index';

interface Props {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
}

export function HeadersTab({ headers, onChange }: Props) {
  return (
    <div className="p-2">
      <KeyValueTable
        pairs={headers}
        onChange={onChange}
        keyPlaceholder="Header-Name"
        valuePlaceholder="value"
      />
    </div>
  );
}
