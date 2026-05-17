"use client";

import { useMemo, type ReactNode } from "react";
import { Autocomplete, TextField } from "@mui/material";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  helperText?: ReactNode;
  error?: boolean;
  disabled?: boolean;
  noOptionsText?: ReactNode;
};

const createFallbackOption = (value: string): SearchableSelectOption => ({
  value,
  label: value,
});

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  helperText,
  error = false,
  disabled = false,
  noOptionsText = "候補がありません",
}: SearchableSelectProps) {
  const optionMap = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const selectedOption = value ? optionMap.get(value) ?? createFallbackOption(value) : null;

  return (
    <Autocomplete
      size="small"
      fullWidth
      options={options}
      value={selectedOption}
      disabled={disabled}
      autoHighlight
      clearOnEscape
      handleHomeEndKeys
      selectOnFocus
      noOptionsText={noOptionsText}
      isOptionEqualToValue={(option, selected) => option.value === selected.value}
      getOptionLabel={(option) => option.label}
      onChange={(_, newValue) => onChange(newValue?.value ?? "")}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder={placeholder}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
}
