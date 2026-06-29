"use client";

import { useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { FiChevronsRight, FiX } from "react-icons/fi";
import TrendingList, { Token } from "./TrendingList";

interface SplitTokenListsProps {
  tokens: Token[];
  cryptoTokens: Token[];
  graduatedTokens: Token[];
  bondingTokens: Token[];
  heldTokens: Token[];
  verifiedSet: Set<string>;
  selectedAddress: string;
  onSelect: (token: Token) => void;
  isLoading?: boolean;
  walletAddress?: string;
  watchlistAddresses: string[];
  onToggleWatchlist: (token: Token) => void;
}

type SplitAction = "rows" | "columns";

// Each column independently tracks how many cards (TrendingLists) are
// stacked inside it. Max 2 columns, max 2 rows per column.
interface ColumnLayout {
  rows: 1 | 2;
}

const STORAGE_KEY = "chadwallet-split-orientation";

function SplitButtons({
  action,
  onAction,
}: {
  action: SplitAction;
  onAction: () => void;
}) {
  return (
    <div className="mx-2 mt-1 flex items-center gap-2">
      <button
        onClick={onAction}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-bg-tertiary bg-bg-secondary py-1 text-xs text-text-tertiary hover:text-text-primary hover:opacity-80 focus:outline-none"
        aria-label={
          action === "rows" ? "Split into rows" : "Add discovery column"
        }
      >
        <svg width="14" height="14">
          <use
            href={`/images/sprite.svg#${action === "rows" ? "rows" : "columns"}`}
          />
        </svg>
        <span>{action === "rows" ? "Split bottom" : "Split right"}</span>
      </button>
    </div>
  );
}

function BothButtons({
  onRows,
  onColumns,
}: {
  onRows: () => void;
  onColumns: () => void;
}) {
  return (
    <div className="mx-2 mt-1 flex items-center gap-2">
      <button
        onClick={onRows}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-bg-tertiary bg-bg-secondary py-1 text-xs text-text-tertiary hover:text-text-primary hover:opacity-80 focus:outline-none"
        aria-label="Split into rows"
      >
        <svg width="14" height="14">
          <use href="/images/sprite.svg#rows" />
        </svg>
        <span>Split bottom</span>
      </button>
      <button
        onClick={onColumns}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-bg-tertiary bg-bg-secondary py-1 text-xs text-text-tertiary hover:text-text-primary hover:opacity-80 focus:outline-none"
        aria-label="Add discovery column"
      >
        <svg width="14" height="14">
          <use href="/images/sprite.svg#columns" />
        </svg>
        <span>Split right</span>
      </button>
    </div>
  );
}

function SeparatorRow() {
  return (
    <Separator
      className="shrink-0 flex items-center justify-center cursor-row-resize"
      style={{ height: 12 }}
    >
      <div className="rounded-full bg-bg-tertiary transition-colors w-7 h-1" />
    </Separator>
  );
}

function panelWrap(content: React.ReactNode) {
  return (
    <div className="h-full overflow-hidden flex flex-col min-h-0">
      {content}
    </div>
  );
}

export default function SplitTokenLists(props: SplitTokenListsProps) {
  const [columns, setColumns] = useState<ColumnLayout[]>(() => {
    if (typeof window === "undefined") {
      return [{ rows: 1 }];
    }

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }

    return [{ rows: 1 }];

    return [{ rows: 1 }];
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const splitBottom = (colIndex: number) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === colIndex ? { ...c, rows: 2 } : c)),
    );
  };

  const splitRight = () => {
    setColumns((prev) => (prev.length < 2 ? [...prev, { rows: 1 }] : prev));
  };

  const closePanel = (colIndex: number, rowIndex?: number) => {
    setColumns((prev) => {
      const next = [...prev];

      // Single row in a column
      if (rowIndex === undefined) {
        if (next.length === 2) {
          next.splice(colIndex, 1);

          // If only one column remains, keep it
          return next.length ? next : [{ rows: 1 }];
        }

        return [{ rows: 1 }];
      }

      // Bottom row closed
      next[colIndex] = {
        ...next[colIndex],
        rows: 1,
      };

      return next;
    });
  };

  const handleFirstSplit = (mode: SplitAction) => {
    if (mode === "rows") {
      splitBottom(0);
    } else {
      splitRight();
    }
  };
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  if (isCollapsed) {
    return (
      <div className="flex h-full items-start">
        <button
          onClick={() => setIsCollapsed(false)}
          className="m-2 rounded-lg border border-bg-tertiary bg-bg-secondary p-2 hover:bg-bg-tertiary"
        >
          <FiChevronsRight size={18} />
        </button>
      </div>
    );
  }
  const isSplit = columns.length > 1 || columns[0].rows === 2;

  if (!isSplit) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <TrendingList
          {...props}
          afterList={
            <BothButtons
              onRows={() => handleFirstSplit("rows")}
              onColumns={() => handleFirstSplit("columns")}
            />
          }
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
        />
      </div>
    );
  }

  const renderAfterList = (colIndex: number, col: ColumnLayout) => {
    if (col.rows === 1) {
      return (
        <SplitButtons action="rows" onAction={() => splitBottom(colIndex)} />
      );
    }
    if (columns.length === 1) {
      return <SplitButtons action="columns" onAction={() => splitRight()} />;
    }
    return undefined;
  };

  // Each column renders itself completely independently — its own private
  // vertical split (or lack of one) never affects the other column.
  const renderColumn = (col: ColumnLayout, colIndex: number) => {
    if (col.rows === 1) {
      return panelWrap(
        <TrendingList
          {...props}
          onClose={() => closePanel(colIndex)}
          afterList={renderAfterList(colIndex, col)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
        />,
      );
    }
    return (
      <Group orientation="vertical" className="h-full">
        <Panel defaultSize={50} minSize={20}>
          {panelWrap(
            <TrendingList
              {...props}
              onClose={() => closePanel(colIndex, 0)}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed((v) => !v)}
            />,
          )}
        </Panel>
        <SeparatorRow />
        <Panel defaultSize={50} minSize={20}>
          {panelWrap(
            <TrendingList
              {...props}
              onClose={() => closePanel(colIndex, 1)}
              afterList={renderAfterList(colIndex, col)}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed((v) => !v)}
            />,
          )}
        </Panel>
      </Group>
    );
  };

  // Single column: just render its own content, no outer horizontal Group needed.
  if (columns.length === 1) {
    return (
      <div className="flex flex-col flex-1 min-h-0 relative">
        <div className="flex-1 min-h-0">{renderColumn(columns[0], 0)}</div>
      </div>
    );
  }

  // Two fixed columns (not resizable)
  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div className="flex flex-1 min-h-0 gap-3">
        <div className="flex-1 min-w-0">{renderColumn(columns[0], 0)}</div>
        <div className="flex-1 min-w-0">{renderColumn(columns[1], 1)}</div>
      </div>
    </div>
  );
}
