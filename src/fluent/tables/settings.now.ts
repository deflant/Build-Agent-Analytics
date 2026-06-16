import "@servicenow/sdk/global";
import { Table, StringColumn, ReferenceColumn } from "@servicenow/sdk/core";

export const x_snc_build_agranx_settings = Table({
  name: "x_snc_build_agranx_settings",
  label: "Build Agent Analytics Settings",
  accessible_from: "public",
  actions: ["create", "read", "update", "delete"],
  allow_web_service_access: true,
  schema: {
    key: StringColumn({
      label: "Key",
      maxLength: 100,
      mandatory: true,
    }),
    value: StringColumn({
      label: "Value",
      maxLength: 8000,
    }),
    user: ReferenceColumn({
      label: "User",
      referenceTable: "sys_user",
      mandatory: true,
    }),
  },
});
