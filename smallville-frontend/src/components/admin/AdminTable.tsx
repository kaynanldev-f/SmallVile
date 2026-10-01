"use client";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

export interface AdminColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

/** Ação própria da tela, exibida antes de editar e remover. */
export interface AdminRowAction<T> {
  icon: React.ReactNode;
  label: string;
  onClick: (row: T) => void;
}

interface AdminTableProps<T> {
  rows: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  actions?: AdminRowAction<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export default function AdminTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage,
  actions = [],
  onEdit,
  onDelete,
}: AdminTableProps<T>) {
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-10 text-center text-sm text-grayScale-400">
        {emptyMessage}
      </p>
    );
  }

  const hasActions = !!actions.length || !!onEdit || !!onDelete;

  return (
    <div className="overflow-x-auto rounded-xl border border-grayScale-600 bg-gray-surface">
      <table className="w-full min-w-3xl text-left text-sm">
        <thead className="border-b border-grayScale-600 text-xs text-grayScale-400 uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column.header} className="px-4 py-3 font-bold">
                {column.header}
              </th>
            ))}

            {hasActions && (
              <th className="px-4 py-3 text-right font-bold">Ações</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-grayScale-600/50 last:border-0 hover:bg-grayScale-700/40"
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`px-4 py-3 ${column.className ?? ""}`}
                >
                  {column.render(row)}
                </td>
              ))}

              {hasActions && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => action.onClick(row)}
                        aria-label={action.label}
                        title={action.label}
                        className="cursor-pointer rounded p-1.5 text-grayScale-400 transition-colors hover:bg-grayScale-700 hover:text-white"
                      >
                        {action.icon}
                      </button>
                    ))}

                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        aria-label="Editar"
                        className="cursor-pointer rounded p-1.5 text-grayScale-400 transition-colors hover:bg-grayScale-700 hover:text-white"
                      >
                        <EditIcon className="text-[18px]" />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        aria-label="Remover"
                        className="cursor-pointer rounded p-1.5 text-grayScale-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                      >
                        <DeleteIcon className="text-[18px]" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
