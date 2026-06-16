import "@servicenow/sdk/global";
import { ApplicationMenu, Record } from "@servicenow/sdk/core";

export const analyticsMenu = ApplicationMenu({
  $id: Now.ID["build-agent-analytics-menu"],
  title: "Build Agent Analytics",
  description: "Analytics dashboard for Build Agent conversations and usage",
  active: true,
});

export const dashboardModule = Record({
  $id: Now.ID["analytics-dashboard-module"],
  table: "sys_app_module",
  data: {
    title: "Analytics Dashboard",
    application: analyticsMenu,
    link_type: "DIRECT",
    query: "x_snc_build_agranx_analytics.do",
    hint: "View Build Agent analytics and statistics",
    active: true,
    order: 100,
  },
});
