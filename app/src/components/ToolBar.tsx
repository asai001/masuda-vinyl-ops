"use client";

import React, { useMemo } from "react";
import { Button, IconButton, MenuItem, Paper, Select, TextField } from "@mui/material";
import { Plus, X } from "lucide-react";

type FilterOption = {
  value: string;
  label: string;
};

export type FilterDefinition = {
  key: string;
  label: string;
  type: "select" | "text" | "range" | "date-range";
  options?: FilterOption[];
};

export type FilterRow = {
  id: number;
  key: string;
  value: string;
  valueTo?: string;
};

type ToolBarProps = {
  filterDefinitions: FilterDefinition[];
  filters: FilterRow[];
  onFiltersChange: (filters: FilterRow[]) => void;
  onCreate: () => void;
  createLabel?: string;
  rightActions?: React.ReactNode;
};

const createFilterRow = (id: number, key: string): FilterRow => ({
  id,
  key,
  value: "",
  valueTo: "",
});

export default function ToolBar({
  filterDefinitions,
  filters,
  onFiltersChange,
  onCreate,
  createLabel = "新規登録",
  rightActions,
}: ToolBarProps) {
  const initialKey = filterDefinitions[0]?.key ?? "";

  const filterDefinitionMap = useMemo(() => {
    const map = new Map<string, FilterDefinition>();
    filterDefinitions.forEach((definition) => map.set(definition.key, definition));
    return map;
  }, [filterDefinitions]);

  const handleAddFilter = () => {
    if (!initialKey) {
      return;
    }
    const nextId = filters.length ? Math.max(...filters.map((filter) => filter.id)) + 1 : 1;
    onFiltersChange([...filters, createFilterRow(nextId, initialKey)]);
  };

  const handleRemoveFilter = (id: number) => {
    onFiltersChange(filters.filter((filter) => filter.id !== id));
  };

  const handleFilterKeyChange = (id: number, key: string) => {
    onFiltersChange(filters.map((filter) => (filter.id === id ? { ...filter, key, value: "", valueTo: "" } : filter)));
  };

  const handleFilterValueChange = (id: number, value: string) => {
    onFiltersChange(filters.map((filter) => (filter.id === id ? { ...filter, value } : filter)));
  };

  const handleFilterRangeChange = (id: number, field: "value" | "valueTo", value: string) => {
    onFiltersChange(filters.map((filter) => (filter.id === id ? { ...filter, [field]: value } : filter)));
  };

  return (
    <Paper elevation={0} className="border border-gray-200 rounded-xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="outlined" size="small" startIcon={<Plus size={16} />} onClick={handleAddFilter}>
            フィルタ追加
          </Button>
          <div className="flex items-center gap-2">
            {rightActions}
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              className="w-fit whitespace-nowrap"
              onClick={onCreate}
            >
              {createLabel}
            </Button>
          </div>
        </div>

        {filters.length ? (
          <div className="flex flex-col gap-3">
            {filters.map((filter) => {
              const definition = filterDefinitionMap.get(filter.key);
              return (
                <div key={filter.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  size="small"
                  value={filter.key}
                  onChange={(event) => handleFilterKeyChange(filter.id, event.target.value)}
                  sx={{ minWidth: { sm: 160 } }}
                >
                  {filterDefinitions.map((definitionOption) => (
                    <MenuItem key={definitionOption.key} value={definitionOption.key}>
                      {definitionOption.label}
                    </MenuItem>
                  ))}
                </Select>
                {definition?.type === "select" ? (
                  <Select
                    size="small"
                    value={filter.value}
                    onChange={(event) => handleFilterValueChange(filter.id, event.target.value)}
                    displayEmpty
                    sx={{ minWidth: { sm: 200 } }}
                    renderValue={(selected) => {
                      if (!selected) {
                        return <span className="text-gray-400">値を選択</span>;
                      }
                      const option = definition.options?.find((item) => item.value === selected);
                      return option?.label ?? selected;
                    }}
                  >
                    {definition.options?.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                ) : definition?.type === "range" ? (
                  <div className="flex items-center gap-2">
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: "0.1" }}
                      placeholder="最小"
                      value={filter.value}
                      onChange={(event) => handleFilterRangeChange(filter.id, "value", event.target.value)}
                      sx={{ width: 120 }}
                    />
                    <span className="text-gray-400">〜</span>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: "0.1" }}
                      placeholder="最大"
                      value={filter.valueTo ?? ""}
                      onChange={(event) => handleFilterRangeChange(filter.id, "valueTo", event.target.value)}
                      sx={{ width: 120 }}
                    />
                  </div>
                ) : definition?.type === "date-range" ? (
                  <div className="flex items-center gap-2">
                    <TextField
                      size="small"
                      type="date"
                      placeholder="年/月/日"
                      value={filter.value}
                      onChange={(event) => handleFilterRangeChange(filter.id, "value", event.target.value)}
                      sx={{ width: 160 }}
                    />
                    <span className="text-gray-400">〜</span>
                    <TextField
                      size="small"
                      type="date"
                      placeholder="年/月/日"
                      value={filter.valueTo ?? ""}
                      onChange={(event) => handleFilterRangeChange(filter.id, "valueTo", event.target.value)}
                      sx={{ width: 160 }}
                    />
                  </div>
                ) : (
                  <TextField
                    size="small"
                    placeholder="値を入力"
                    value={filter.value}
                    onChange={(event) => handleFilterValueChange(filter.id, event.target.value)}
                    sx={{ minWidth: { sm: 200 } }}
                  />
                )}
                <IconButton
                  size="small"
                  onClick={() => handleRemoveFilter(filter.id)}
                  aria-label="remove filter"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </IconButton>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Paper>
  );
}
