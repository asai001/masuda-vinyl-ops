"use client";

import { useMemo, useState } from "react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import ClientMasterTableView from "@/features/client-master/ClientMasterTableView";
import { clientRows } from "@/mock/clientMasterData";

const statusLabels: Record<string, string> = {
  active: "有効",
  inactive: "無効",
};

export default function ClientMasterView() {
  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));

    const categoryOptions = uniqueValues(clientRows.map((row) => row.category)).map((value) => ({
      value,
      label: value,
    }));
    const regionOptions = uniqueValues(clientRows.map((row) => row.region)).map((value) => ({
      value,
      label: value,
    }));
    const currencyOptions = uniqueValues(clientRows.map((row) => row.currency)).map((value) => ({
      value,
      label: value,
    }));
    const statusOptions = uniqueValues(clientRows.map((row) => row.status)).map((value) => ({
      value,
      label: statusLabels[value] ?? value,
    }));

    return [
      { key: "category", label: "区分", type: "select", options: categoryOptions },
      { key: "region", label: "地域", type: "select", options: regionOptions },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "status", label: "ステータス", type: "select", options: statusOptions },
      { key: "name", label: "仕入先", type: "text" },
    ];
  }, []);

  const [filters, setFilters] = useState<FilterRow[]>([]);

  const rows = useMemo(() => {
    const groupedFilters = filters.reduce<Record<string, string[]>>((acc, filter) => {
      if (!filter.value) {
        return acc;
      }
      if (!acc[filter.key]) {
        acc[filter.key] = [];
      }
      acc[filter.key].push(filter.value);
      return acc;
    }, {});

    return clientRows.filter((row) =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "category":
            return values.includes(row.category);
          case "region":
            return values.includes(row.region);
          case "currency":
            return values.includes(row.currency);
          case "status":
            return values.includes(row.status);
          case "name":
            return values.some((value) => row.name.toLowerCase().includes(value.toLowerCase()));
          default:
            return true;
        }
      })
    );
  }, [filters]);

  return (
    <div className="flex flex-col gap-6">
      <ToolBar filterDefinitions={filterDefinitions} filters={filters} onFiltersChange={setFilters} />
      <ClientMasterTableView rows={rows} />
    </div>
  );
}
