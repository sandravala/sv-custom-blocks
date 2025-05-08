import React from 'react';

/**
 * Reusable TaskBlock component for both unscheduled and scheduled tasks.
 * Props:
 * - id: unique identifier
 * - title: block title
 * - hours: number of hours (for scheduled blocks)
 * - remainingHours: remaining hours (for unscheduled tasks)
 * - processColor: Tailwind class for background/border color
 * - processName: name of the process (for unscheduled tasks)
 * - onClick: click handler (e.g., open edit modal)
 * - onDragStart: drag start handler
 * - onDragEnd: drag end handler
 * - onDelete: delete handler
 * - style: optional inline styles (e.g., dimensions)
 */
export default function TaskBlock({
  id,
  taskTitle,
  blockTitle,
  hours,
  remainingHours,
  processColor,
  processName,
  onClick,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDelete,
  style
}) {
  return (
    <div
      data-block-id={id}
      draggable="true"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={onClick}
      className={
        `${processColor} p-3 rounded shadow relative cursor-move border border-gray-300 hover:border-blue-500`
      }
      style={style}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium text-sm leading-tight">{remainingHours !== undefined ? taskTitle : blockTitle}</div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="close ml-2"
          title="Delete"
        >
          ×
        </button>
      </div>

      {remainingHours !== undefined ? (
        <>
          <div className="text-xs text-gray-500 mb-1">{processName}</div>
          <div className="text-xs text-purple-600">Liko nesuplanuota: {remainingHours.toFixed(1)} h</div>
        </>
      ) : (
        <>
        <div className="text-xs">{hours} {hours === 1 ? 'h' : 'h'}</div>
        <div className="text-xs">
        {processName !== undefined ? `${processName} | ` : ''} {taskTitle} 
        </div>
        </>
      )}
    </div>
  );
}
