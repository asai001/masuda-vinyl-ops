"use client";

import { useEffect, useMemo, useState } from "react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import LoadingModal from "@/components/LoadingModal";
import useMasterCrud from "@/hooks/useMasterCrud";
import ClientMasterTableView from "@/features/client-master/ui/ClientMasterTableView";
import DeleteClientDialog from "@/features/client-master/ui/DeleteClientDialog";
import EditClientModal from "@/features/client-master/ui/EditClientModal";
import NewClientModal from "@/features/client-master/ui/NewClientModal";
import type { NewClientInput, ClientRow } from "../types";
import { createClient, deleteClient, fetchClientRows, updateClient } from "../api/client";
import { CURRENCY_OPTION_ITEMS } from "@/constants/currency";

export default function ClientMasterView() {
  const {
    rows,
    replaceRows,
    isCreateOpen,
    editingRow,
    deletingRow,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    openDelete,
    closeDelete,
  } = useMasterCrud<ClientRow>([], (item, nextId) => ({
    ...item,
    id: nextId,
    clientId: item.clientId ?? `local_${nextId}`,
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<"create" | "edit" | "delete" | null>(null);

  const reload = async () => {
    const fetched = await fetchClientRows();
    replaceRows(fetched);
  };

  const handleCreate = (input: NewClientInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("create");
        setMutateError(null);
        closeCreate();

        await createClient(input);

        await reload();
        closeCreate();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create client";
        setMutateError(msg);
        closeCreate();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const handleEdit = (next: ClientRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("edit");
        setMutateError(null);
        closeEdit();

        await updateClient(next);

        await reload();
        closeEdit();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to update client";
        setMutateError(msg);
        closeEdit();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const handleDelete = (row: ClientRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("delete");
        setMutateError(null);
        closeDelete();

        await deleteClient(row.clientId);

        await reload();
        closeDelete();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete client";
        setMutateError(msg);
        closeDelete();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  // DynamoDB から取引先を取得
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchClientRows();
        if (!cancelled) {
          replaceRows(fetched);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load";
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceRows]);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    // 配列から重複を取り除いて、ユニークな値だけにするための関数
    const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
    const uniqueStrings = (values: Array<string | undefined>) => Array.from(new Set(values.filter(isNonEmptyString)));
    const toOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));

    // 以下のような select 用の値を生成
    // [{value: "材料", label: "材料"}, {value: "加工", label: "加工"}
    const categoryOptions = toOptions(uniqueStrings(rows.map((r) => r.category)));
    const regionOptions = toOptions(uniqueStrings(rows.map((r) => r.region)));
    const currencyOptions = CURRENCY_OPTION_ITEMS;
    const statusOptions = [
      { value: "active", label: "有効" },
      { value: "inactive", label: "無効" },
    ];

    return [
      { key: "category", label: "区分", type: "select", options: categoryOptions },
      { key: "region", label: "地域", type: "select", options: regionOptions },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "status", label: "ステータス", type: "select", options: statusOptions },
      { key: "name", label: "取引先", type: "text" },
      { key: "address", label: "住所", type: "text" },
      { key: "phone", label: "電話番号", type: "text" },
      { key: "taxId", label: "TAX ID", type: "text" },
    ];
  }, [rows]);

  const filterDefinitionMap = useMemo(() => {
    const map = new Map<string, FilterDefinition>();
    filterDefinitions.forEach((definition) => map.set(definition.key, definition));
    return map;
  }, [filterDefinitions]);

  const getOptions = (key: string) => filterDefinitionMap.get(key)?.options ?? [];

  const filteredRows = useMemo(() => {
    const groupedFilters = filters.reduce<Record<string, FilterRow[]>>((acc, filter) => {
      if (!filter.value && !filter.valueTo) {
        return acc;
      }
      if (!acc[filter.key]) {
        acc[filter.key] = [];
      }
      acc[filter.key].push(filter);
      return acc;
    }, {});

    return rows.filter((row) =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "category":
            return values.some((value) => value.value === row.category);
          case "region":
            return values.some((value) => value.value === row.region);
          case "currency":
            return values.some((value) => value.value === row.currency);
          case "status":
            return values.some((value) => value.value === row.status);
          case "name":
            return values.some((value) => row.name.toLowerCase().includes(value.value.toLowerCase()));
          case "address":
            return values.some((value) => row.address.toLowerCase().includes(value.value.toLowerCase()));
          case "phone":
            return values.some((value) => row.phone.toLowerCase().includes(value.value.toLowerCase()));
          case "taxId":
            return values.some((value) => (row.taxId ?? "").toLowerCase().includes(value.value.toLowerCase()));
          default:
            return true;
        }
      }),
    );
  }, [filters, rows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = rows.length;
    const activeCount = rows.filter((row) => row.status === "active").length;
    const inactiveCount = rows.filter((row) => row.status === "inactive").length;
    return [
      { label: "登録件数", value: totalCount, tone: "primary" },
      { label: "有効", value: activeCount, tone: "success" },
      { label: "無効", value: inactiveCount, tone: "muted" },
    ];
  }, [rows]);

  const handleEditDelete = (client: ClientRow) => {
    closeEdit();
    openDelete(client);
  };

  const savingMessage = mutatingAction === "delete" ? "削除中" : "保存中";

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
      />
      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          取引先マスタの取得に失敗しました。（{loadError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      <ClientMasterTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewClientModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        isSaving={mutating && mutatingAction === "create"}
        categoryOptions={getOptions("category")}
        regionOptions={getOptions("region")}
        statusOptions={getOptions("status")}
      />
      <EditClientModal
        key={editingRow?.clientId ?? "client-edit"}
        open={Boolean(editingRow)}
        client={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        isSaving={mutating && mutatingAction === "edit"}
        categoryOptions={getOptions("category")}
        regionOptions={getOptions("region")}
        statusOptions={getOptions("status")}
      />
      <DeleteClientDialog
        open={Boolean(deletingRow)}
        client={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
        isDeleting={mutating && mutatingAction === "delete"}
      />
      <LoadingModal open={mutating} message={savingMessage} />
    </div>
  );
}
