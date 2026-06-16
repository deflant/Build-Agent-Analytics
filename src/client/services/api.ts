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

/**
 * Fetch records from a table filtered by application scope, returning details.
 */
async function fetchByScope(table: string, appId: string, fields: string): Promise<any[]> {
  const params = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_query: `sys_scope=${appId}`,
    sysparm_fields: fields,
    sysparm_limit: "500",
  });
  const { result } = await request(`${BASE}/${table}?${params}`);
  return result || [];
}

export interface ComponentItem {
  sysId: string;
  name: string;
  url: string;
}

export interface AppComposition {
  tables: ComponentItem[];
  uiPages: ComponentItem[];
  workspaces: ComponentItem[];
  portals: ComponentItem[];
  widgets: ComponentItem[];
  flows: ComponentItem[];
}

/**
 * Build a URL for each component type.
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
    case "workspace": {
      const wsUrl = val(record.url);
      return wsUrl ? `/now/workspace/${wsUrl}` : `/now/workspace`;
    }
    case "portal": {
      const suffix = val(record.url_suffix);
      return suffix ? `/${suffix}` : `/sp`;
    }
    case "widget": {
      return `/sp_widget.do?sys_id=${sysId}`;
    }
    case "flow": {
      return `/now/workflow-studio/designer/flow/${sysId}`;
    }
    default:
      return "#";
  }
}

/**
 * Scan an application's scope to get its metadata components with details and URLs.
 */
export async function fetchAppComposition(appId: string): Promise<AppComposition> {
  const val = (field: any) => (typeof field === "string" ? field : field?.value || "");
  const disp = (field: any) => (typeof field === "string" ? field : field?.display_value || field?.value || "");

  const [tablesRaw, uiPagesRaw, workspacesRaw, portalsRaw, widgetsRaw, flowsRaw] = await Promise.all([
    fetchByScope("sys_db_object", appId, "sys_id,name,label"),
    fetchByScope("sys_ui_page", appId, "sys_id,name,description"),
    fetchByScope("sys_ux_app_config", appId, "sys_id,name,url,title"),
    fetchByScope("sp_portal", appId, "sys_id,title,url_suffix"),
    fetchByScope("sp_widget", appId, "sys_id,name,id"),
    fetchByScope("sys_hub_flow", appId, "sys_id,name"),
  ]);

  const mapItems = (records: any[], type: string, labelFn: (r: any) => string): ComponentItem[] =>
    records.map((r) => ({
      sysId: val(r.sys_id),
      name: labelFn(r),
      url: buildComponentUrl(type, r),
    }));

  return {
    tables: mapItems(tablesRaw, "table", (r) => disp(r.label) || disp(r.name)),
    uiPages: mapItems(uiPagesRaw, "ui_page", (r) => disp(r.name)),
    workspaces: mapItems(workspacesRaw, "workspace", (r) => disp(r.title) || disp(r.name)),
    portals: mapItems(portalsRaw, "portal", (r) => disp(r.title) || val(r.url_suffix)),
    widgets: mapItems(widgetsRaw, "widget", (r) => disp(r.name) || val(r.id)),
    flows: mapItems(flowsRaw, "flow", (r) => disp(r.name)),
  };
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
