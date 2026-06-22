declare const window: any;

const BASE = "/api/now/table";

async function request(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-UserToken": window.g_ck,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postRecord(table: string, data: any) {
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-UserToken": window.g_ck,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API POST error: ${res.status}`);
  return res.json();
}

async function patchRecord(table: string, sysId: string, data: any) {
  const res = await fetch(`${BASE}/${table}/${sysId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-UserToken": window.g_ck,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API PATCH error: ${res.status}`);
  return res.json();
}

// ─── Settings API ──────────────────────────────────────────────────────────────

const SETTINGS_TABLE = "x_snc_build_agranx_settings";

function getCurrentUserId(): string {
  return window.NOW?.user?.userID || window.g_user_id || "";
}

export async function fetchSettings(key: string): Promise<any> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  const params = new URLSearchParams({
    sysparm_query: `key=${key}^user=${userId}`,
    sysparm_fields: "sys_id,key,value,user",
    sysparm_limit: "1",
  });
  const { result } = await request(`${BASE}/${SETTINGS_TABLE}?${params}`);
  if (result && result.length > 0) {
    try {
      return JSON.parse(result[0].value);
    } catch {
      return result[0].value;
    }
  }
  return null;
}

export async function saveSettings(key: string, value: any): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;
  const jsonValue = JSON.stringify(value);

  // Check if record exists
  const params = new URLSearchParams({
    sysparm_query: `key=${key}^user=${userId}`,
    sysparm_fields: "sys_id",
    sysparm_limit: "1",
  });
  const { result } = await request(`${BASE}/${SETTINGS_TABLE}?${params}`);

  if (result && result.length > 0) {
    const sysId = typeof result[0].sys_id === "string" ? result[0].sys_id : result[0].sys_id?.value;
    await patchRecord(SETTINGS_TABLE, sysId, { value: jsonValue });
  } else {
    await postRecord(SETTINGS_TABLE, { key, value: jsonValue, user: userId });
  }
}

// ─── Aggregate / Stats API ─────────────────────────────────────────────────────

const STATS_BASE = "/api/now/stats";

/**
 * Get the total record count for a table using the ServiceNow Aggregate API.
 * Much more efficient than downloading all records just to count them.
 */
export async function fetchTableCount(table: string, query = ""): Promise<number> {
  const params = new URLSearchParams({ sysparm_count: "true" });
  if (query) params.set("sysparm_query", query);
  const { result } = await request(`${STATS_BASE}/${table}?${params}`);
  if (result && result.stats && result.stats.count !== undefined) {
    return parseInt(result.stats.count, 10) || 0;
  }
  return 0;
}

/**
 * Get the count of distinct values for a field on a table (e.g., unique application_ids).
 */
export async function fetchDistinctCount(table: string, field: string, query = ""): Promise<number> {
  const params = new URLSearchParams({
    sysparm_count: "true",
    sysparm_group_by: field,
  });
  if (query) params.set("sysparm_query", query);
  const { result } = await request(`${STATS_BASE}/${table}?${params}`);
  // group_by returns an array of groups, the number of groups = distinct values
  if (Array.isArray(result)) {
    return result.length;
  }
  return 0;
}

export interface KpiCounts {
  conversations: number;
  messages: number;
  apps: number;
  checkpoints: number;
}

/**
 * Fetch all KPI counts in parallel using the Aggregate API for real platform data.
 */
export async function fetchKpiCounts(): Promise<KpiCounts> {
  const [conversations, messages, apps, checkpoints] = await Promise.all([
    fetchTableCount("sn_build_agent_conversation"),
    fetchTableCount("sn_build_agent_message"),
    fetchDistinctCount("sn_build_agent_conversation", "application_id", "application_idISNOTEMPTY"),
    fetchTableCount("sn_build_agent_checkpoint"),
  ]);
  return { conversations, messages, apps, checkpoints };
}

// ─── Conversations API ─────────────────────────────────────────────────────────

export async function fetchConversations(query = "") {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_fields:
      "sys_id,title,application_id,application_name,user,state,last_message_at,sys_created_on,client,ba_variant_type",
  });
  if (query) params.set("sysparm_query", query);
  else params.set("sysparm_query", "ORDERBYDESClast_message_at");
  const { result } = await request(
    `${BASE}/sn_build_agent_conversation?${params}`
  );
  return result || [];
}

export async function fetchConversation(id: string) {
  const params = new URLSearchParams({ sysparm_display_value: "all" });
  const { result } = await request(
    `${BASE}/sn_build_agent_conversation/${id}?${params}`
  );
  return result;
}

export async function fetchMessages(conversationId: string) {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_query: `conversation=${conversationId}^ORDERBYsequence`,
    sysparm_fields: "sys_id,sequence,content,checkpoint,sub_agent_id,sys_created_on",
  });
  const { result } = await request(
    `${BASE}/sn_build_agent_message?${params}`
  );
  return result || [];
}

export async function fetchCheckpoints(conversationId: string) {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_query: `conversation=${conversationId}^ORDERBYsequence`,
    sysparm_fields: "sys_id,name,change_summary,status,sequence",
  });
  const { result } = await request(
    `${BASE}/sn_build_agent_checkpoint?${params}`
  );
  return result || [];
}

export async function fetchAllMessages() {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_fields: "sys_id,conversation",
  });
  const { result } = await request(
    `${BASE}/sn_build_agent_message?${params}`
  );
  return result || [];
}

export async function fetchAllCheckpoints() {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_fields: "sys_id,conversation",
  });
  const { result } = await request(
    `${BASE}/sn_build_agent_checkpoint?${params}`
  );
  return result || [];
}

/**
 * Fetch application names from sys_app table by their sys_ids.
 * Used to resolve "Unknown" application names.
 */
export async function fetchAppNames(appIds: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  if (appIds.length === 0) return nameMap;

  const query = `sys_idIN${appIds.join(",")}`;
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_query: query,
    sysparm_fields: "sys_id,name",
  });
  const { result } = await request(`${BASE}/sys_app?${params}`);
  if (result) {
    result.forEach((app: any) => {
      const id = typeof app.sys_id === "string" ? app.sys_id : app.sys_id?.value || "";
      const name = typeof app.name === "string" ? app.name : app.name?.display_value || app.name?.value || "";
      if (id && name) nameMap.set(id, name);
    });
  }
  return nameMap;
}

export interface AppInfo {
  name: string;
  description: string;
}

/**
 * Fetch application names and descriptions from sys_app table by their sys_ids.
 * Used for search-by-description in the Applications view.
 */
export async function fetchAppDetails(appIds: string[]): Promise<Map<string, AppInfo>> {
  const detailMap = new Map<string, AppInfo>();
  if (appIds.length === 0) return detailMap;

  const query = `sys_idIN${appIds.join(",")}`;
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_query: query,
    sysparm_fields: "sys_id,name,short_description",
  });
  const { result } = await request(`${BASE}/sys_app?${params}`);
  if (result) {
    result.forEach((app: any) => {
      const id = typeof app.sys_id === "string" ? app.sys_id : app.sys_id?.value || "";
      const name = typeof app.name === "string" ? app.name : app.name?.display_value || app.name?.value || "";
      const description = typeof app.short_description === "string"
        ? app.short_description
        : app.short_description?.display_value || app.short_description?.value || "";
      if (id) detailMap.set(id, { name, description });
    });
  }
  return detailMap;
}

/**
 * Fetch records from a table filtered by application scope, returning details.
 * Returns an empty array gracefully if the table does not exist on the instance
 * (e.g. a plugin is not installed), preventing 400 errors from breaking the scan.
 */
async function fetchByScope(table: string, appId: string, fields: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      sysparm_display_value: "all",
      sysparm_query: `sys_scope=${appId}`,
      sysparm_fields: fields,
      sysparm_limit: "500",
    });
    const { result } = await request(`${BASE}/${table}?${params}`);
    return result || [];
  } catch {
    // Table may not exist on this instance (plugin not installed, etc.)
    return [];
  }
}

export interface ComponentItem {
  sysId: string;
  name: string;
  url: string;
}

export interface AppComposition {
  // Data Model
  tables: ComponentItem[];
  // Server-Side Logic
  businessRules: ComponentItem[];
  scriptIncludes: ComponentItem[];
  scheduledJobs: ComponentItem[];
  fixScripts: ComponentItem[];
  // Client-Side Logic
  clientScripts: ComponentItem[];
  uiActions: ComponentItem[];
  uiPolicies: ComponentItem[];
  // Security
  acls: ComponentItem[];
  roles: ComponentItem[];
  // Automation
  flows: ComponentItem[];
  notifications: ComponentItem[];
  events: ComponentItem[];
  dataPolicies: ComponentItem[];
  // User Interface
  uiPages: ComponentItem[];
  workspaces: ComponentItem[];
  portals: ComponentItem[];
  widgets: ComponentItem[];
  appMenus: ComponentItem[];
  modules: ComponentItem[];
  // Integration
  restOperations: ComponentItem[];
  // Configuration
  properties: ComponentItem[];
  // Service Catalog
  catalogItems: ComponentItem[];
  // Testing
  atfTests: ComponentItem[];
}

/**
 * Build a URL for each component type.
 * Uses reliable record-form URLs (/{table}.do?sys_id=X) for types
 * where the "live" URL is version-dependent or not directly resolvable.
 */
function buildComponentUrl(type: string, record: any): string {
  const val = (field: any) => (typeof field === "string" ? field : field?.value || "");
  const sysId = val(record.sys_id);

  switch (type) {
    case "table": {
      const tableName = val(record.name);
      return `/${tableName}_list.do`;
    }
    case "ui_page": {
      const pageName = val(record.name);
      return `/${pageName}.do`;
    }
    case "workspace":
      return `/sys_ux_app_config.do?sys_id=${sysId}`;
    case "portal": {
      const suffix = val(record.url_suffix);
      return suffix ? `/${suffix}` : `/sp_portal.do?sys_id=${sysId}`;
    }
    case "widget":
      return `/sp_widget.do?sys_id=${sysId}`;
    case "flow":
      return `/sys_hub_flow.do?sys_id=${sysId}`;
    case "business_rule":
      return `/sys_script.do?sys_id=${sysId}`;
    case "script_include":
      return `/sys_script_include.do?sys_id=${sysId}`;
    case "client_script":
      return `/sys_script_client.do?sys_id=${sysId}`;
    case "ui_action":
      return `/sys_ui_action.do?sys_id=${sysId}`;
    case "ui_policy":
      return `/sys_ui_policy.do?sys_id=${sysId}`;
    case "acl":
      return `/sys_security_acl.do?sys_id=${sysId}`;
    case "role":
      return `/sys_user_role.do?sys_id=${sysId}`;
    case "notification":
      return `/sysevent_email_action.do?sys_id=${sysId}`;
    case "scheduled_job":
      return `/sysauto_script.do?sys_id=${sysId}`;
    case "fix_script":
      return `/sys_script_fix.do?sys_id=${sysId}`;
    case "rest_operation":
      return `/sys_ws_operation.do?sys_id=${sysId}`;
    case "property":
      return `/sys_properties.do?sys_id=${sysId}`;
    case "catalog_item":
      return `/sc_cat_item.do?sys_id=${sysId}`;
    case "event":
      return `/sysevent_register.do?sys_id=${sysId}`;
    case "data_policy":
      return `/sys_data_policy.do?sys_id=${sysId}`;
    case "atf_test":
      return `/sys_atf_test.do?sys_id=${sysId}`;
    case "app_menu":
      return `/sys_app_application.do?sys_id=${sysId}`;
    case "module":
      return `/sys_app_module.do?sys_id=${sysId}`;
    default:
      return "#";
  }
}

/**
 * Scan an application's scope to get ALL its metadata components with details and URLs.
 */
export async function fetchAppComposition(appId: string): Promise<AppComposition> {
  const val = (field: any) => (typeof field === "string" ? field : field?.value || "");
  const disp = (field: any) => (typeof field === "string" ? field : field?.display_value || field?.value || "");

  const [
    tablesRaw,
    businessRulesRaw,
    scriptIncludesRaw,
    scheduledJobsRaw,
    fixScriptsRaw,
    clientScriptsRaw,
    uiActionsRaw,
    uiPoliciesRaw,
    aclsRaw,
    rolesRaw,
    flowsRaw,
    notificationsRaw,
    eventsRaw,
    dataPoliciesRaw,
    uiPagesRaw,
    workspacesRaw,
    portalsRaw,
    widgetsRaw,
    appMenusRaw,
    modulesRaw,
    restOperationsRaw,
    propertiesRaw,
    catalogItemsRaw,
    atfTestsRaw,
  ] = await Promise.all([
    fetchByScope("sys_db_object", appId, "sys_id,name,label"),
    fetchByScope("sys_script", appId, "sys_id,name,collection"),
    fetchByScope("sys_script_include", appId, "sys_id,name,api_name"),
    fetchByScope("sysauto_script", appId, "sys_id,name"),
    fetchByScope("sys_script_fix", appId, "sys_id,name"),
    fetchByScope("sys_script_client", appId, "sys_id,name,table"),
    fetchByScope("sys_ui_action", appId, "sys_id,name,table"),
    fetchByScope("sys_ui_policy", appId, "sys_id,short_description,table"),
    fetchByScope("sys_security_acl", appId, "sys_id,name,type"),
    fetchByScope("sys_user_role", appId, "sys_id,name,description"),
    fetchByScope("sys_hub_flow", appId, "sys_id,name"),
    fetchByScope("sysevent_email_action", appId, "sys_id,name,event_name"),
    fetchByScope("sysevent_register", appId, "sys_id,event_name,table"),
    fetchByScope("sys_data_policy", appId, "sys_id,short_description,model_table"),
    fetchByScope("sys_ui_page", appId, "sys_id,name,description"),
    fetchByScope("sys_ux_app_config", appId, "sys_id,name,title"),
    fetchByScope("sp_portal", appId, "sys_id,title,url_suffix"),
    fetchByScope("sp_widget", appId, "sys_id,name,id"),
    fetchByScope("sys_app_application", appId, "sys_id,title"),
    fetchByScope("sys_app_module", appId, "sys_id,title,name"),
    fetchByScope("sys_ws_operation", appId, "sys_id,name,http_method"),
    fetchByScope("sys_properties", appId, "sys_id,name,description"),
    fetchByScope("sc_cat_item", appId, "sys_id,name,short_description"),
    fetchByScope("sys_atf_test", appId, "sys_id,name,description"),
  ]);

  const mapItems = (records: any[], type: string, labelFn: (r: any) => string): ComponentItem[] =>
    records.map((r) => ({
      sysId: val(r.sys_id),
      name: labelFn(r),
      url: buildComponentUrl(type, r),
    }));

  return {
    tables: mapItems(tablesRaw, "table", (r) => disp(r.label) || disp(r.name)),
    businessRules: mapItems(businessRulesRaw, "business_rule", (r) => disp(r.name)),
    scriptIncludes: mapItems(scriptIncludesRaw, "script_include", (r) => disp(r.name) || disp(r.api_name)),
    scheduledJobs: mapItems(scheduledJobsRaw, "scheduled_job", (r) => disp(r.name)),
    fixScripts: mapItems(fixScriptsRaw, "fix_script", (r) => disp(r.name)),
    clientScripts: mapItems(clientScriptsRaw, "client_script", (r) => disp(r.name)),
    uiActions: mapItems(uiActionsRaw, "ui_action", (r) => disp(r.name)),
    uiPolicies: mapItems(uiPoliciesRaw, "ui_policy", (r) => disp(r.short_description)),
    acls: mapItems(aclsRaw, "acl", (r) => disp(r.name) || val(r.type)),
    roles: mapItems(rolesRaw, "role", (r) => disp(r.name)),
    flows: mapItems(flowsRaw, "flow", (r) => disp(r.name)),
    notifications: mapItems(notificationsRaw, "notification", (r) => disp(r.name)),
    events: mapItems(eventsRaw, "event", (r) => disp(r.event_name)),
    dataPolicies: mapItems(dataPoliciesRaw, "data_policy", (r) => disp(r.short_description)),
    uiPages: mapItems(uiPagesRaw, "ui_page", (r) => disp(r.name)),
    workspaces: mapItems(workspacesRaw, "workspace", (r) => disp(r.title) || disp(r.name)),
    portals: mapItems(portalsRaw, "portal", (r) => disp(r.title) || val(r.url_suffix)),
    widgets: mapItems(widgetsRaw, "widget", (r) => disp(r.name) || val(r.id)),
    appMenus: mapItems(appMenusRaw, "app_menu", (r) => disp(r.title)),
    modules: mapItems(modulesRaw, "module", (r) => disp(r.title) || disp(r.name)),
    restOperations: mapItems(restOperationsRaw, "rest_operation", (r) => `${val(r.http_method)} ${disp(r.name)}`),
    properties: mapItems(propertiesRaw, "property", (r) => disp(r.name)),
    catalogItems: mapItems(catalogItemsRaw, "catalog_item", (r) => disp(r.name)),
    atfTests: mapItems(atfTestsRaw, "atf_test", (r) => disp(r.name)),
  };
}

// ─── TimeSeries Cache API ──────────────────────────────────────────────────────

const TIMESERIES_TABLE = "x_snc_build_agranx_timeseries_cache";

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  tokenCount: number;
  messageCount: number;
}

export interface TimeSeriesApp {
  id: string;
  name: string;
}

export async function fetchTimeSeriesApps(): Promise<TimeSeriesApp[]> {
  const params = new URLSearchParams({
    sysparm_query: "application_idISNOTEMPTY^ORDERBYapplication_name",
    sysparm_fields: "application_id,application_name",
    sysparm_limit: "500",
  });
  const { result } = await request(`${BASE}/sn_build_agent_conversation?${params}`);
  if (!result) return [];
  const seen = new Set<string>();
  const apps: TimeSeriesApp[] = [];
  for (const r of result) {
    // application_id is a plain string field (not a reference)
    const id = typeof r.application_id === "string" ? r.application_id : r.application_id?.value || "";
    const appName = typeof r.application_name === "string" ? r.application_name : r.application_name?.value || "";
    if (id && !seen.has(id)) {
      seen.add(id);
      apps.push({ id, name: appName || "" });
    }
  }
  // Always resolve names from sys_app (application_name is often null)
  const allIds = apps.map((a) => a.id);
  if (allIds.length > 0) {
    const nameMap = await fetchAppNames(allIds);
    for (const app of apps) {
      if (nameMap.has(app.id)) {
        app.name = nameMap.get(app.id)!;
      } else if (!app.name) {
        app.name = app.id; // fallback to sys_id if unresolvable
      }
    }
  }
  // Sort by resolved name
  apps.sort((a, b) => a.name.localeCompare(b.name));
  return apps;
}

export async function fetchTimeSeriesCache(appId: string): Promise<TimeSeriesPoint[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const params = new URLSearchParams({
    sysparm_query: `user=${userId}^application_id=${appId}^ORDERBYperiod_date`,
    sysparm_fields: "sys_id,period_date,token_count,message_count",
    sysparm_limit: "365",
  });
  const { result } = await request(`${BASE}/${TIMESERIES_TABLE}?${params}`);
  return (result || []).map((r: any) => ({
    date: typeof r.period_date === "string" ? r.period_date : r.period_date?.value || "",
    tokenCount: parseInt(typeof r.token_count === "string" ? r.token_count : r.token_count?.value || "0") || 0,
    messageCount: parseInt(typeof r.message_count === "string" ? r.message_count : r.message_count?.value || "0") || 0,
  }));
}

export async function saveTimeSeriesPoint(point: TimeSeriesPoint, appId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;
  // Check if a record exists for this date/user/app
  const params = new URLSearchParams({
    sysparm_query: `user=${userId}^period_date=${point.date}^application_id=${appId}`,
    sysparm_fields: "sys_id",
    sysparm_limit: "1",
  });
  const { result } = await request(`${BASE}/${TIMESERIES_TABLE}?${params}`);
  const data = {
    period_date: point.date,
    token_count: String(point.tokenCount),
    message_count: String(point.messageCount),
    user: userId,
    application_id: appId,
  };
  if (result && result.length > 0) {
    const sysId = typeof result[0].sys_id === "string" ? result[0].sys_id : result[0].sys_id?.value;
    await patchRecord(TIMESERIES_TABLE, sysId, data);
  } else {
    await postRecord(TIMESERIES_TABLE, data);
  }
}

export async function fetchMessagesForTimeSeries(appId: string): Promise<any[]> {
  // First fetch conversation sys_ids for the given app
  const convoParams = new URLSearchParams({
    sysparm_query: `application_id=${appId}`,
    sysparm_fields: "sys_id",
    sysparm_limit: "500",
  });
  const { result: convos } = await request(`${BASE}/sn_build_agent_conversation?${convoParams}`);
  if (!convos || convos.length === 0) return [];
  const convoIds = convos.map((c: any) => (typeof c.sys_id === "string" ? c.sys_id : c.sys_id?.value || "")).filter(Boolean);
  if (convoIds.length === 0) return [];

  // Then fetch messages for those conversations
  const msgParams = new URLSearchParams({
    sysparm_query: `conversationIN${convoIds.join(",")}^ORDERBYsys_created_on`,
    sysparm_fields: "sys_id,content,sys_created_on",
    sysparm_limit: "10000",
  });
  const { result: messages } = await request(`${BASE}/sn_build_agent_message?${msgParams}`);
  return messages || [];
}

// ─── Task Telemetry API ────────────────────────────────────────────────────────

export async function fetchTaskTelemetry(query = "") {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_fields:
      "sys_id,user,request,task_type,status,agent_status,start_time,end_time,total_time,build_fix_cycles,build_fix_errors,rollbacks,lines_added,lines_edited,lines_deleted,metadata_types,sys_created_on",
  });
  if (query) params.set("sysparm_query", query);
  else params.set("sysparm_query", "ORDERBYDESCstart_time");
  const { result } = await request(
    `${BASE}/sn_build_agent_task_telemetry?${params}`
  );
  return result || [];
}

export async function fetchEventTelemetry(taskId: string) {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_query: `event_id=${taskId}^ORDERBYstart_time`,
    sysparm_fields: "sys_id,name,status,start_time,end_time,total_time,build_fix_cycles,errors",
  });
  const { result } = await request(
    `${BASE}/sn_build_agent_event_telemetry?${params}`
  );
  return result || [];
}
