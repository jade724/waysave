/**
 * Defensive parsing of Open Charge Map POI payloads (shape varies by operator).
 */

export type OcmConnectionDetail = {
  connectorTitle: string;
  powerKw: number | null;
  currentLabel: string | null;
  isAC: boolean;
  isDC: boolean;
  statusTitle: string | null;
  usageTypeTitle: string | null;
};

export type OcmChargingDetails = {
  maxPowerKw: number | null;
  hasAC: boolean;
  hasDC: boolean;
  connections: OcmConnectionDetail[];
  usageCost: string | null;
  /** Operator / network website from OCM when listed (e.g. ESB, EasyGo). */
  operatorWebsiteUrl: string | null;
  accessComments: string | null;
  addressTitle: string | null;
  lastStatusUpdate: string | null;
  generalComments: string | null;
};

function inferAcDc(currentTitle: string): { ac: boolean; dc: boolean } {
  const t = currentTitle.toLowerCase();
  const dc =
    t.includes("ccs") ||
    t.includes("chademo") ||
    t.includes("combo") ||
    t.includes("tesla supercharger") ||
    /\bdc\b/.test(t);
  const ac =
    !dc &&
    (t.includes("type 2") ||
      t.includes("type2") ||
      t.includes("schuko") ||
      t.includes("single phase") ||
      t.includes("three phase") ||
      t.includes("iec 62196"));
  return { ac, dc };
}

export function extractOcmChargingDetails(raw: unknown): OcmChargingDetails {
  const empty: OcmChargingDetails = {
    maxPowerKw: null,
    hasAC: false,
    hasDC: false,
    connections: [],
    usageCost: null,
    operatorWebsiteUrl: null,
    accessComments: null,
    addressTitle: null,
    lastStatusUpdate: null,
    generalComments: null,
  };

  if (!raw || typeof raw !== "object") return empty;

  const o = raw as Record<string, unknown>;
  const addr = o.AddressInfo as Record<string, unknown> | undefined;
  const accessComments =
    typeof addr?.AccessComments === "string" ? addr.AccessComments.trim() : null;
  const addressTitle =
    typeof addr?.Title === "string" ? addr.Title : null;
  const generalComments =
    typeof o.GeneralComments === "string" ? o.GeneralComments.trim() : null;

  const lastStatusUpdate =
    typeof o.DateLastStatusUpdate === "string"
      ? o.DateLastStatusUpdate
      : typeof o.DateLastVerified === "string"
        ? o.DateLastVerified
        : null;

  const usageCost =
    typeof o.UsageCost === "string" && o.UsageCost.trim()
      ? o.UsageCost.trim()
      : null;

  const opInfo = o.OperatorInfo as { WebsiteURL?: string } | undefined;
  let operatorWebsiteUrl: string | null = null;
  if (typeof opInfo?.WebsiteURL === "string" && opInfo.WebsiteURL.trim()) {
    const u = opInfo.WebsiteURL.trim();
    if (/^https?:\/\//i.test(u)) operatorWebsiteUrl = u;
    else operatorWebsiteUrl = `https://${u}`;
  }

  const conns = o.Connections;
  if (!Array.isArray(conns)) {
    return {
      ...empty,
      usageCost,
      operatorWebsiteUrl,
      accessComments,
      addressTitle,
      lastStatusUpdate,
      generalComments,
    };
  }

  let maxKw: number | null = null;
  let hasAC = false;
  let hasDC = false;
  const connections: OcmConnectionDetail[] = [];

  for (const c of conns) {
    if (!c || typeof c !== "object") continue;
    const conn = c as Record<string, unknown>;

    const ct = conn.ConnectionType as { Title?: string; FormalName?: string } | undefined;
    const connectorTitle = (
      ct?.Title ||
      ct?.FormalName ||
      "Connector"
    ).trim();

    const cur = conn.CurrentType as { Title?: string } | undefined;
    const currentLabel =
      typeof cur?.Title === "string" ? cur.Title.trim() : null;

    let powerKw: number | null = null;
    if (typeof conn.PowerKW === "number" && Number.isFinite(conn.PowerKW)) {
      powerKw = conn.PowerKW;
    } else if (typeof conn.PowerKW === "string") {
      const n = parseFloat(conn.PowerKW);
      if (Number.isFinite(n)) powerKw = n;
    }
    if (powerKw != null && powerKw > 0) {
      maxKw = maxKw == null ? powerKw : Math.max(maxKw, powerKw);
    }

    const { ac, dc } = currentLabel
      ? inferAcDc(currentLabel)
      : { ac: false, dc: false };
    if (ac) hasAC = true;
    if (dc) hasDC = true;

    const st = conn.StatusType as { Title?: string } | undefined;
    const statusTitle =
      typeof st?.Title === "string" ? st.Title.trim() : null;

    const ut = conn.UsageType as { Title?: string } | undefined;
    const usageTypeTitle =
      typeof ut?.Title === "string" ? ut.Title.trim() : null;

    connections.push({
      connectorTitle,
      powerKw,
      currentLabel,
      isAC: ac,
      isDC: dc,
      statusTitle,
      usageTypeTitle,
    });
  }

  if (!hasAC && !hasDC && connections.length > 0) {
    hasAC = connections.some((x) => x.isAC);
    hasDC = connections.some((x) => x.isDC);
  }

  return {
    maxPowerKw: maxKw,
    hasAC,
    hasDC,
    connections,
    usageCost,
    operatorWebsiteUrl,
    accessComments,
    addressTitle,
    lastStatusUpdate,
    generalComments,
  };
}

export function extractOcmMaxPowerKw(raw: unknown): number | null {
  return extractOcmChargingDetails(raw).maxPowerKw;
}
