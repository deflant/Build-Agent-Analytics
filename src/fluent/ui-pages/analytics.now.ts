import "@servicenow/sdk/global";
import { UiPage } from "@servicenow/sdk/core";
import page from "../../client/index.html";

export const analytics_page = UiPage({
  $id: Now.ID["analytics-page"],
  endpoint: "x_snc_build_agranx_analytics.do",
  html: page,
  direct: true,
});
