"use client";
import { useAtom, useAtomValue } from "jotai";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import useUpscaylVersion from "@/components/hooks/use-upscayl-version";
import useSystemInfo from "@/components/hooks/use-system-info";
import { ImageFormat } from "@/lib/valid-formats";
import { logAtom } from "@/atoms/log-atom";
import { localeAtom } from "@/atoms/translations-atom";
import {
  autoUpdateAtom,
  compressionAtom,
  copyMetadataAtom,
  customModelsPathAtom,
  enableContributionAtom,
  gpuIdAtom,
  overwriteAtom,
  rememberOutputFolderAtom,
  saveImageAsAtom,
  tileSizeAtom,
  ttaModeAtom,
  turnOffNotificationsAtom,
} from "@/atoms/user-settings-atom";
import { gpuListAtom, showPreferencesAtom } from "@/atoms/studio-atoms";
import { C } from "./theme";

const LOCALES: Record<string, string> = {
  ar: "العربية",
  en: "English",
  tr: "Türkçe",
  ru: "Русский",
  uk: "Українська",
  ja: "日本語",
  zh: "简体中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  vi: "Tiếng Việt",
  pt: "Português (PT)",
  ptBR: "Português (BR)",
  id: "Bahasa Indonesia",
  caVAL: "Català",
  hu: "Magyar",
  pl: "Polski",
};

const sectionStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderBottom: "1px solid #22262d",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const Label = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontSize: 10, letterSpacing: 0.6, color: C.textFaint }}>
    {children}
  </span>
);
const Row = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}
  >
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: C.text }}>{label}</span>
      {hint && (
        <span style={{ fontSize: 10.5, color: C.textMute }}>{hint}</span>
      )}
    </span>
    <span style={{ flex: "none" }}>{children}</span>
  </div>
);
const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <span
    onClick={onClick}
    style={{
      cursor: "pointer",
      width: 34,
      height: 18,
      borderRadius: 10,
      background: on ? C.accentBtn : C.border2,
      display: "flex",
      alignItems: "center",
      padding: 2,
      justifyContent: on ? "flex-end" : "flex-start",
    }}
  >
    <span
      style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff" }}
    />
  </span>
);
const selectStyle: React.CSSProperties = {
  height: 30,
  minWidth: 150,
  maxWidth: 220,
  border: `1px solid ${C.border2}`,
  borderRadius: 5,
  background: C.input,
  color: C.text,
  fontSize: 12,
  padding: "0 8px",
  cursor: "pointer",
};

const PreferencesDialog = () => {
  const [open, setOpen] = useAtom(showPreferencesAtom);
  const version = useUpscaylVersion();
  const { systemInfo } = useSystemInfo();

  const [gpuId, setGpuId] = useAtom(gpuIdAtom);
  const gpuList = useAtomValue(gpuListAtom);
  const [tileSize, setTileSize] = useAtom(tileSizeAtom);
  const [tta, setTta] = useAtom(ttaModeAtom);
  const [format, setFormat] = useAtom(saveImageAsAtom);
  const [compression, setCompression] = useAtom(compressionAtom);
  const [remember, setRemember] = useAtom(rememberOutputFolderAtom);
  const [overwrite, setOverwrite] = useAtom(overwriteAtom);
  const [copyMeta, setCopyMeta] = useAtom(copyMetadataAtom);
  const [customModelsPath, setCustomModelsPath] = useAtom(customModelsPathAtom);
  const [locale, setLocale] = useAtom(localeAtom);
  const [autoUpdate, setAutoUpdate] = useAtom(autoUpdateAtom);
  const [noNotifications, setNoNotifications] = useAtom(
    turnOffNotificationsAtom,
  );
  const [contribute, setContribute] = useAtom(enableContributionAtom);
  const logData = useAtomValue(logAtom);

  const browseModels = async () => {
    const path = await window.electron.invoke(
      ELECTRON_COMMANDS.SELECT_CUSTOM_MODEL_FOLDER,
    );
    if (path) {
      setCustomModelsPath(path);
      window.electron.send(ELECTRON_COMMANDS.GET_MODELS_LIST, path);
    }
  };

  const resetAll = () => {
    if (
      confirm(
        "Reset all Upscayl Studio settings to defaults? The app will reload.",
      )
    ) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-theme="upscayl"
        hideCloseButton
        className="z-[100] max-h-[85vh] gap-0 overflow-hidden border-[#262a31] bg-[#15181d] p-0 text-[#e6e8ec] sm:max-w-[560px]"
      >
        {/* header */}
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: `1px solid ${C.border}`,
            background: C.titlebar,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>Preferences</span>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 26,
              height: 26,
              border: 0,
              borderRadius: 5,
              background: "transparent",
              color: C.textMute,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            ×
          </button>
        </div>

        <div
          className="dc-scroll-stable"
          style={{ maxHeight: "72vh", overflowY: "auto" }}
        >
          {/* PERFORMANCE */}
          <div style={sectionStyle}>
            <Label>PERFORMANCE</Label>
            <Row
              label="GPU"
              hint="Multi-GPU laptops should pick the dedicated GPU"
            >
              <select
                style={selectStyle}
                value={gpuId}
                onChange={(e) => setGpuId(e.target.value)}
              >
                <option value="">Auto</option>
                {gpuList.map((g) => (
                  <option key={g.index} value={String(g.index)}>
                    {g.index}: {g.name}
                  </option>
                ))}
                {/* fallback indices when detection returned nothing */}
                {gpuList.length === 0 &&
                  ["0", "1", "2"].map((i) => (
                    <option key={i} value={i}>
                      GPU {i}
                    </option>
                  ))}
                {gpuId !== "" &&
                  gpuList.length > 0 &&
                  !gpuList.some((g) => String(g.index) === gpuId) && (
                    <option value={gpuId}>{gpuId}</option>
                  )}
              </select>
            </Row>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>Tile size</span>
                <span style={{ fontFamily: C.mono, color: C.blueLt }}>
                  {tileSize ? `${tileSize} px` : "Auto"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1024}
                step={32}
                value={tileSize ?? 0}
                onChange={(e) =>
                  setTileSize(
                    Number(e.target.value) === 0
                      ? null
                      : Number(e.target.value),
                  )
                }
                style={{ width: "100%", accentColor: C.accent }}
              />
            </div>
            <Row label="TTA mode" hint="Slower, slightly higher quality">
              <Toggle on={tta} onClick={() => setTta((v) => !v)} />
            </Row>
          </div>

          {/* OUTPUT */}
          <div style={sectionStyle}>
            <Label>OUTPUT</Label>
            <Row label="Save format">
              <div
                style={{
                  display: "flex",
                  height: 28,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 5,
                  overflow: "hidden",
                  background: C.input,
                }}
              >
                {(["png", "jpg", "webp"] as ImageFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      width: 52,
                      border: 0,
                      borderRight: `1px solid ${C.border}`,
                      background: format === f ? C.accentBtn : "transparent",
                      color: format === f ? "#fff" : "#aeb5c0",
                      font: `600 10.5px ${C.mono}`,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Row>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>Compression</span>
                <span style={{ fontFamily: C.mono, color: C.blueLt }}>
                  {compression}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={compression}
                onChange={(e) => setCompression(Number(e.target.value))}
                style={{ width: "100%", accentColor: C.accent }}
              />
            </div>
            <Row label="Remember output folder">
              <Toggle on={remember} onClick={() => setRemember((v) => !v)} />
            </Row>
            <Row label="Overwrite existing files">
              <Toggle on={overwrite} onClick={() => setOverwrite((v) => !v)} />
            </Row>
            <Row label="Copy metadata to output">
              <Toggle on={copyMeta} onClick={() => setCopyMeta((v) => !v)} />
            </Row>
          </div>

          {/* MODELS */}
          <div style={sectionStyle}>
            <Label>MODELS</Label>
            <div
              onClick={browseModels}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${C.border2}`,
                borderRadius: 5,
                background: C.input,
                padding: "7px 9px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: C.mono,
                  fontSize: 10.5,
                  color: C.textDim,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {customModelsPath || "Custom models folder — click to choose"}
              </span>
              <span style={{ fontSize: 11, color: C.blue }}>Browse</span>
            </div>
          </div>

          {/* GENERAL */}
          <div style={sectionStyle}>
            <Label>GENERAL</Label>
            <Row label="Language">
              <select
                style={selectStyle}
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
              >
                {Object.entries(LOCALES)
                  .sort(([, a], [, b]) => a.localeCompare(b))
                  .map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
              </select>
            </Row>
            <Row label="Automatic updates">
              <Toggle
                on={autoUpdate}
                onClick={() => setAutoUpdate((v) => !v)}
              />
            </Row>
            <Row label="Desktop notifications">
              <Toggle
                on={!noNotifications}
                onClick={() => setNoNotifications((v) => !v)}
              />
            </Row>
            <Row
              label="Share anonymous usage"
              hint="Helps improve Upscayl Studio"
            >
              <Toggle
                on={contribute}
                onClick={() => setContribute((v) => !v)}
              />
            </Row>
          </div>

          {/* LOGS + ABOUT */}
          <div style={sectionStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Label>LOGS</Label>
              <span
                onClick={() =>
                  navigator.clipboard.writeText(logData.join("\n"))
                }
                style={{ fontSize: 10.5, color: C.blue, cursor: "pointer" }}
              >
                Copy
              </span>
            </div>
            <div
              style={{
                height: 96,
                overflowY: "auto",
                border: `1px solid ${C.border2}`,
                borderRadius: 5,
                background: C.input,
                padding: "6px 9px",
                fontFamily: C.mono,
                fontSize: 10,
                color: C.textMute,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              className="dc-scroll-stable"
            >
              {logData.length ? logData.join("\n") : "No logs yet."}
            </div>
          </div>

          <div style={{ ...sectionStyle, borderBottom: "none" }}>
            <Label>ABOUT</Label>
            <Row label="Version">
              <span
                style={{ fontFamily: C.mono, fontSize: 11, color: C.textMute }}
              >
                {version || "—"}
              </span>
            </Row>
            {systemInfo?.model && (
              <Row label="Device">
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: C.textMute,
                    maxWidth: 240,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {systemInfo.model}
                </span>
              </Row>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <a
                href="https://docs.upscayl.org/"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "7px 0",
                  borderRadius: 5,
                  border: `1px solid ${C.border2}`,
                  background: C.input,
                  color: C.text,
                  fontSize: 11.5,
                  textDecoration: "none",
                }}
              >
                Documentation
              </a>
              <a
                href="https://www.buymeacoffee.com/fossisthefuture"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "7px 0",
                  borderRadius: 5,
                  border: `1px solid ${C.border2}`,
                  background: C.input,
                  color: C.text,
                  fontSize: 11.5,
                  textDecoration: "none",
                }}
              >
                Donate
              </a>
              <button
                onClick={resetAll}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 5,
                  border: `1px solid #5c2a24`,
                  background: "#2a1613",
                  color: C.redText,
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                Reset all
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreferencesDialog;
