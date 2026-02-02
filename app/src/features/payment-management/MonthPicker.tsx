"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { InputAdornment, Popover, TextField } from "@mui/material";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

type ParsedValue = {
  year: number;
  month: number;
};

const months = Array.from({ length: 12 }, (_, index) => index + 1);

const parseYearMonth = (value: string): ParsedValue | null => {
  const matched = value.match(/^(\d{4})-(\d{2})$/);
  if (!matched) {
    return null;
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }
  return { year, month };
};

const formatYearMonthLabel = (value: string) => {
  const parsed = parseYearMonth(value);
  if (!parsed) {
    return "";
  }
  return `${parsed.year}年${parsed.month}月`;
};

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const parsed = useMemo(() => parseYearMonth(value), [value]);
  const [displayYear, setDisplayYear] = useState(() => parsed?.year ?? new Date().getFullYear());
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);
  const selectedMonth = parsed?.month ?? null;
  const selectedYear = parsed?.year ?? displayYear;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setDisplayYear(parsed?.year ?? new Date().getFullYear());
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMonthSelect = (month: number) => {
    const nextValue = `${displayYear}-${String(month).padStart(2, "0")}`;
    onChange(nextValue);
    handleClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDisplayYear(parsed?.year ?? new Date().getFullYear());
      setAnchorEl(event.currentTarget);
    }
  };

  return (
    <>
      <TextField
        size="small"
        value={formatYearMonthLabel(value)}
        placeholder="YYYY-MM"
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        sx={{
          width: { xs: "100%", sm: 150 },
          "& .MuiInputBase-root": { cursor: "pointer" },
          "& .MuiInputBase-input": { cursor: "pointer" },
        }}
        slotProps={{
          htmlInput: {
            readOnly: true,
            className: "cursor-pointer",
          },
          input: {
            endAdornment: (
              <InputAdornment position="end" className="cursor-pointer">
                <Calendar size={18} className="text-gray-400" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            className: "rounded-2xl border border-gray-200 bg-white shadow-lg",
          },
        }}
      >
        <div className="w-72 p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
              onClick={() => setDisplayYear((prev) => prev - 1)}
              aria-label="前年"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-base font-semibold text-gray-900">{displayYear}年</div>
            <button
              type="button"
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
              onClick={() => setDisplayYear((prev) => prev + 1)}
              aria-label="翌年"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {months.map((month) => {
              const isSelected = selectedYear === displayYear && selectedMonth === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthSelect(month)}
                  className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-pressed={isSelected}
                >
                  {month}月
                </button>
              );
            })}
          </div>
        </div>
      </Popover>
    </>
  );
}
