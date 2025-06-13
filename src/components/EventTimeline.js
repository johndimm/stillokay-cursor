import React from "react";
import historyStyles from "@/styles/HistoryPage.module.css";
import { DateTime } from "luxon";

export default function EventTimeline({ events, limit, formatEvent, className }) {
  const shownEvents = limit ? events.slice(0, limit) : events;
  return (
    <ul className={historyStyles.timeline + (className ? ` ${className}` : "") }>
      {shownEvents.length === 0 && <li>No events yet.</li>}
      {shownEvents.map((event, i) => (
        <li
          key={i}
          className={
            historyStyles.event +
            " " +
            (historyStyles[event.event_type + "Bg"] || historyStyles.eventBg)
          }
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          {/* Colored bullet */}
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: "50%",
              marginRight: 8,
              background:
                event.event_type === "checkin"
                  ? event.feeling_level <= 3
                    ? "#a5d6a7"  // light green
                    : event.feeling_level <= 6
                    ? "#66bb6a"  // medium green  
                    : event.feeling_level > 6
                    ? "#2e7d32"  // dark green
                    : "#43a047"  // default green for no feeling level
                  : event.event_type === "reminder"
                  ? "#ff9800"
                  : event.event_type === "missed_checkin_alert"
                  ? "#e53935"
                  : event.event_type === "caregiver_email_sent"
                  ? "#1976d2"
                  : event.event_type === "caregiver_updated"
                  ? "#8e24aa"
                  : event.event_type === "caregiver_optin"
                  ? "#009688"
                  : event.event_type === "caregiver_optout"
                  ? "#757575"
                  : "#bdbdbd",
              border: "2px solid #fff",
              boxShadow: "0 1px 4px #eee",
            }}
          />
          <div className={historyStyles.eventDetails}>
            <div className={historyStyles.eventType}>{formatEvent(event)}</div>
            <div className={historyStyles.eventTime}>
              {(() => {
                const dt = DateTime.fromISO(event.created_at);
                const now = DateTime.now().setZone(dt.zoneName);
                if (dt.year === now.year) {
                  // Show date and time, no year
                  return dt.toLocaleString({
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                } else {
                  // Show full date and time with year
                  return dt.toLocaleString(DateTime.DATETIME_MED);
                }
              })()}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
} 