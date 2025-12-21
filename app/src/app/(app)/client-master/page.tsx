"use client";

import React from "react";
import ToolBar from "@/components/ToolBar";
import ClientMasterTableView from "@/features/client-master/ClientMasterTableView";

export default function ClientMaster() {
  return (
    <div className="flex flex-col gap-6">
      <ToolBar />
      <ClientMasterTableView />
    </div>
  );
}
