"use client";
import { useAtom } from "jotai";
import { sanitizePath } from "@common/sanitize-path";
import { selectedQueueIdAtom } from "@/atoms/studio-atoms";
import { useStudio } from "./studio-context";
import { C, QUEUE_STATUS } from "./theme";

const BatchQueue = () => {
  const s = useStudio();
  const queue = s.queueItems;
  const running = s.queueRunning;
  const [selected, setSelected] = useAtom(selectedQueueIdAtom);

  const done = queue.filter((q) => q.status === "done").length;
  const runningCount = queue.filter((q) => q.status === "running").length;
  const isFolder = s.batchMode;

  const headerBtn: React.CSSProperties = {
    height: 23,
    padding: "0 10px",
    border: `1px solid ${C.border2}`,
    borderRadius: 4,
    background: C.input,
    color: C.text,
    fontSize: 11,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        flex: "none",
        height: 152,
        minHeight: 152,
        overflow: "hidden",
        background: C.panel,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      <div
        style={{
          height: 32,
          minHeight: 32,
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          borderBottom: "1px solid #22262d",
          background: C.panel2,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span style={{ flex: "none", fontSize: 11.5, fontWeight: 600 }}>
          Batch Queue
        </span>
        <span
          style={{
            flex: "none",
            fontFamily: C.mono,
            fontSize: 10.5,
            color: C.textMute,
          }}
        >
          {isFolder
            ? `${queue.length} items · ${done} done · ${runningCount} running`
            : "no folder tab active"}
        </span>
        <div style={{ flex: 1, minWidth: 8 }} />
        <div style={{ flex: "none", display: "flex", gap: 3 }}>
          <button className="dc-mini" style={headerBtn} onClick={s.clearDone}>
            Clear done
          </button>
          <button
            className="dc-run"
            style={{
              ...headerBtn,
              padding: "0 12px",
              border: `1px solid ${C.accentBorder}`,
              background: C.accentBtn,
              color: "#fff",
              fontWeight: 600,
              opacity: !isFolder || (s.busy && !running) ? 0.5 : 1,
              cursor:
                !isFolder || (s.busy && !running) ? "not-allowed" : "pointer",
            }}
            disabled={!isFolder || (s.busy && !running)}
            onClick={running ? s.stop : s.startQueue}
          >
            {running ? "Pause" : "Start queue"}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 8,
          padding: "10px 12px",
          overflowX: "auto",
          alignItems: "stretch",
        }}
      >
        {queue.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: C.textFaint,
              fontSize: 11.5,
              paddingLeft: 4,
            }}
          >
            {isFolder
              ? "This folder has no supported images."
              : "Open a folder (or drop several images) to batch — its images appear here."}
          </div>
        )}
        {queue.map((it) => {
          const [statusColor, statusBorder, statusBg, barColor] =
            QUEUE_STATUS[it.status];
          const sel = it.id === selected;
          return (
            <div
              key={it.id}
              className="dc-qcard"
              title={it.path}
              onClick={() => setSelected(it.id === selected ? null : it.id)}
              style={{
                flex: "none",
                width: 196,
                display: "flex",
                gap: 9,
                padding: 8,
                border: `1px solid ${sel ? C.accent : C.border}`,
                borderRadius: 7,
                background: sel ? C.accentSelBg : C.panel2,
                cursor: "pointer",
              }}
            >
              <img
                src={"file:///" + sanitizePath(it.path)}
                alt=""
                style={{
                  width: 62,
                  height: 46,
                  borderRadius: 4,
                  objectFit: "cover",
                  flex: "none",
                  background: "#1b1f25",
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {it.name}
                </span>
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 10,
                    color: C.textMute,
                  }}
                >
                  {it.meta}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: statusColor,
                      border: `1px solid ${statusBorder}`,
                      background: statusBg,
                      borderRadius: 3,
                      padding: "0 5px",
                    }}
                  >
                    {it.status}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: "#22262d",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${it.pct}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BatchQueue;
