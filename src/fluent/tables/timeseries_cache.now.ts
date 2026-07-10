import "@servicenow/sdk/global";
import { Table, DateColumn, IntegerColumn, ReferenceColumn, StringColumn } from "@servicenow/sdk/core";

export const x_snc_build_agranx_timeseries_cache = Table({
  name: "x_snc_build_agranx_timeseries_cache",
  label: "TimeSeries Cache",
  accessible_from: "public",
  actions: ["create", "read", "update", "delete"],
  allow_web_service_access: true,
  schema: {
    period_date: DateColumn({
      label: "Period Date",
      mandatory: true,
    }),
    token_count: IntegerColumn({
      label: "Token Count",
    }),
    message_count: IntegerColumn({
      label: "Message Count",
    }),
    user: ReferenceColumn({
      label: "User",
      referenceTable: "sys_user",
      mandatory: true,
    }),
    application_id: StringColumn({
      label: "Application ID",
      maxLength: 32,
      mandatory: true,
    }),
  },
});
