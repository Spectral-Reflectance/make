import * as Select from '@radix-ui/react-select';

interface Option { value: string; label: string }

export function StyledSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return <div className="filament-select-field">
    <span className="filament-select-label">{label}</span>
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="filament-select-trigger" aria-label={label}>
        <Select.Value />
        <Select.Icon className="filament-select-icon" aria-hidden="true"><span /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="filament-select-content" position="popper" sideOffset={4} align="start">
          <Select.Viewport className="filament-select-viewport">
            {options.map((option) => <Select.Item className="filament-select-item" key={option.value} value={option.value}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="filament-select-check" aria-hidden="true">✓</Select.ItemIndicator>
            </Select.Item>)}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>;
}
