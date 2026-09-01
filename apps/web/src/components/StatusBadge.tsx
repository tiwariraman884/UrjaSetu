/** Status badge — maps status strings to CSS badge classes. */
interface StatusBadgeProps {
  status: string;
  label?: string;
}

const statusMap: Record<string, { cls: string; label: string }> = {
  online:      { cls: "badge-online",      label: "Online"      },
  offline:     { cls: "badge-offline",     label: "Offline"     },
  good:        { cls: "badge-online",      label: "Fresh"       },
  stale:       { cls: "badge-stale",       label: "Stale"       },
  fresh:       { cls: "badge-online",      label: "Fresh"       },
  required:    { cls: "badge-required",    label: "Required"    },
  pending:     { cls: "badge-pending",     label: "Pending"     },
  verifying:   { cls: "badge-pending",     label: "Verifying"   },
  settling:    { cls: "badge-pending",     label: "Settling"    },
  settled:     { cls: "badge-settled",     label: "Settled"     },
  confirmed:   { cls: "badge-confirmed",   label: "Confirmed"   },
  verified:    { cls: "badge-verified",    label: "Verified"    },
  authorized:  { cls: "badge-authorized",  label: "Authorized"  },
  approved:    { cls: "badge-verified",    label: "Approved"    },
  executing:   { cls: "badge-executing",   label: "Executing"   },
  failed:      { cls: "badge-failed",      label: "Failed"      },
  error:       { cls: "badge-error",       label: "Error"       },
  fault:       { cls: "badge-error",       label: "Fault"       },
  skipped:     { cls: "badge-skipped",     label: "Skipped"     },
  created:     { cls: "badge-pending",     label: "Created"     },
  planned:     { cls: "badge-pending",     label: "Planned"     },
  issued:      { cls: "badge-pending",     label: "Issued"      },
  acked:       { cls: "badge-pending",     label: "Acked"       },
  done:        { cls: "badge-online",      label: "Done"        },
  IDLE:        { cls: "badge-offline",     label: "Idle"        },
  PAYMENT_REQUIRED: { cls: "badge-required", label: "402 Required" },
  WALLET_CONNECTING:{ cls: "badge-pending",  label: "Connecting"  },
  SIGNING:     { cls: "badge-pending",     label: "Signing"     },
  VERIFYING:   { cls: "badge-pending",     label: "Verifying"   },
  SETTLING:    { cls: "badge-pending",     label: "Settling"    },
  SETTLED:     { cls: "badge-settled",     label: "Settled"     },
  FAILED:      { cls: "badge-failed",      label: "Failed"      },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const map = statusMap[status] || { cls: "badge-offline", label: status };
  return <span className={`badge ${map.cls}`}>{label ?? map.label}</span>;
}
