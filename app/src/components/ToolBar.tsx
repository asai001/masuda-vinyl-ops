"use client";

import React, { useState } from "react";
import { Button, InputAdornment, MenuItem, Paper, Select, TextField } from "@mui/material";
import { Plus, Search } from "lucide-react";

const categories = [
  { value: "all", label: "すべて" },
  { value: "materials", label: "材料" },
  { value: "processing", label: "加工" },
  { value: "logistics", label: "物流" },
  { value: "customer", label: "顧客" },
];

export default function ToolBar() {
  const [category, setCategory] = useState("all");

  return (
    <Paper elevation={0} className="border border-gray-200 rounded-xl p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:flex-1">
          <TextField
            fullWidth
            size="small"
            placeholder="検索"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} className="text-gray-400" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: { md: 480 } }}
          />
          <Select
            size="small"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            sx={{ minWidth: { sm: 120 } }}
          >
            {categories.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </div>
        <Button variant="contained" startIcon={<Plus size={16} />} className="w-fit whitespace-nowrap">
          追加
        </Button>
      </div>
    </Paper>
  );
}
