import { KeyValueTable } from '../KeyValueTable';
import type { KeyValuePair } from '../../types/index';

interface Props {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
}

export function ParamsTab({ params, onChange }: Props) {
  return (
    <div className="p-2">
      <KeyValueTable
        pairs={params}
        onChange={onChange}
        keyPlaceholder="param"
        valuePlaceholder="value"
      />
    </div>
  );
}
