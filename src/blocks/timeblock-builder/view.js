import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('timeblock-builder-container');
  if (!container) return;

  const root = createRoot(container);
  root.render(<ScheduleBuilder />);
})

const ScheduleBuilder = () => {
  // Add styles for drag-and-drop visual feedback
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
    .drag-over {
      background-color: rgba(59, 130, 246, 0.1);
      border: 2px dashed #3b82f6 !important;
    }
    .drag-over-block {
      background-color: rgba(59, 130, 246, 0.1);
      border: 2px dashed #3b82f6 !important;
      opacity: 0.8;
    }
  `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Predefined processes with colors
  const processes = [
    { id: 'marketing', name: 'Marketing', color: 'bg-blue-200' },
    { id: 'development', name: 'Development', color: 'bg-green-200' },
    { id: 'clientWork', name: 'Client Work', color: 'bg-purple-200' },
    { id: 'operations', name: 'Operations', color: 'bg-yellow-200' },
    { id: 'admin', name: 'Administrative', color: 'bg-gray-200' }
  ];

  // Task blocks - these are the original blocks with total hours
  const [taskBlocks, setTaskBlocks] = useState([
    { id: 1, title: 'Content Creation', hours: 4, process: 'marketing', totalHours: 4 },
    { id: 2, title: 'Market Research', hours: 6, process: 'marketing', totalHours: 6 },
    { id: 3, title: 'Feature Development', hours: 12, process: 'development', totalHours: 12 },
    { id: 4, title: 'Bug Fixes', hours: 5, process: 'development', totalHours: 5 },
    { id: 5, title: 'Client Meetings', hours: 3, process: 'clientWork', totalHours: 3 }
  ]);

  // Schedule blocks - these are instances of task blocks placed on specific days
  const [scheduleBlocks, setScheduleBlocks] = useState([
    { id: 101, taskId: 1, title: 'Content Creation', hours: 2, process: 'marketing', day: 'Monday-1' },
    { id: 102, taskId: 3, title: 'Feature Development', hours: 4, process: 'development', day: 'Tuesday-2' },
    { id: 103, taskId: 5, title: 'Client Meetings', hours: 1, process: 'clientWork', day: 'Wednesday-3' }
  ]);

  // Days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Track which block is being dragged
  const [draggedBlock, setDraggedBlock] = useState(null);
  // Track if we're trying to create an alternative
  const [creatingAlternative, setCreatingAlternative] = useState(false);
  // Track the target block for an alternative
  const [alternativeTarget, setAlternativeTarget] = useState(null);

  // New task block form
  const [showForm, setShowForm] = useState(false);
  const [newTaskBlock, setNewTaskBlock] = useState({
    title: '',
    hours: 1,
    process: 'marketing'
  });

  // Block being edited
  const [editingBlock, setEditingBlock] = useState(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      const savedTaskBlocks = localStorage.getItem('taskBlocks');
      const savedScheduleBlocks = localStorage.getItem('scheduleBlocks');

      if (savedTaskBlocks) {
        setTaskBlocks(JSON.parse(savedTaskBlocks));
      }

      if (savedScheduleBlocks) {
        setScheduleBlocks(JSON.parse(savedScheduleBlocks));
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('taskBlocks', JSON.stringify(taskBlocks));
    } catch (error) {
      console.error('Error saving taskBlocks to localStorage:', error);
    }
  }, [taskBlocks]);

  useEffect(() => {
    try {
      localStorage.setItem('scheduleBlocks', JSON.stringify(scheduleBlocks));
    } catch (error) {
      console.error('Error saving scheduleBlocks to localStorage:', error);
    }
  }, [scheduleBlocks]);

  // Handle block deletion - this also needs to handle alternatives
  const handleDeleteScheduleBlock = (id) => {
    const blockToDelete = scheduleBlocks.find(block => block.id === id);

    if (!blockToDelete) {
      return;
    }

    // Check if it's a primary block with alternatives
    if (blockToDelete.day?.endsWith('-3')) {
      // If it's a primary block (without alternativeGroupId)
      if (!blockToDelete.alternativeGroupId) {
        // Find alternatives that point to this block
        const alternatives = scheduleBlocks.filter(block =>
          block.alternativeGroupId === blockToDelete.id
        );

        if (alternatives.length > 0) {
          // Promote the first alternative to primary
          const newPrimary = { ...alternatives[0] };
          delete newPrimary.alternativeGroupId;

          // Update other alternatives to point to the new primary
          const otherAlternatives = alternatives.slice(1);
          const updatedBlocks = scheduleBlocks
            .filter(block => block.id !== id && block.id !== newPrimary.id)
            .map(block => {
              if (otherAlternatives.some(alt => alt.id === block.id)) {
                return { ...block, alternativeGroupId: newPrimary.id };
              }
              return block;
            });

          setScheduleBlocks([...updatedBlocks, newPrimary]);
          return;
        }
      }
    }

    // Simple deletion for other cases
    const updatedBlocks = scheduleBlocks.filter(block => block.id !== id);
    setScheduleBlocks(updatedBlocks);
    
    // Update process hours summary after deletion
    setTimeout(() => {
      const { processHours, rowHours } = getProcessHours();
      // Process hours summary is updated via state, no need to do anything else
    }, 0);
  };

  // Handle saving a new block (including alternatives)
  const handleSaveNewBlock = () => {
    if (!editingBlock || !editingBlock.title || editingBlock.hours <= 0) return;

    // For alternatives, create a block linked to the primary
    if (editingBlock.isAlternative && editingBlock.primaryBlock) {
      // Create the new alternative block
      const newBlock = {
        id: Date.now(),
        taskId: null, // Direct schedule block, not from a task
        title: editingBlock.title,
        hours: editingBlock.hours,
        process: editingBlock.process,
        day: editingBlock.day,
        alternativeGroupId: editingBlock.alternativeGroupId
      };

      setScheduleBlocks([...scheduleBlocks, newBlock]);
    } else {
      // Create a regular block
      const newBlock = {
        id: Date.now(),
        taskId: null, // Direct schedule block, not from a task
        title: editingBlock.title,
        hours: editingBlock.hours,
        process: editingBlock.process,
        day: editingBlock.day
      };

      setScheduleBlocks([...scheduleBlocks, newBlock]);
    }

    setEditingBlock(null);
  };

  // Add a new alternative to an existing block
  const handleAddAlternative = (primaryBlock) => {
    // Directly create a new alternative block
    const newAlternative = {
      id: Date.now(),
      taskId: primaryBlock.taskId || null,
      title: primaryBlock.title + " (Alt)",
      hours: primaryBlock.hours,
      process: primaryBlock.process,
      day: primaryBlock.day,
      alternativeGroupId: primaryBlock.id
    };

    // Add to schedule blocks
    setScheduleBlocks([...scheduleBlocks, newAlternative]);
  };

  // Handle drop for alternating tasks (row 3)
  const handleDropForAlternating = (block, dayAndRow) => {
    // If it's a new block from task blocks, add as a primary task
    if (!block.id) {
      const newBlock = {
        id: Date.now(),
        taskId: block.taskId,
        title: block.title,
        hours: block.hours,
        process: block.process,
        day: dayAndRow,
        // No alternativeGroupId means it's a primary block
      };

      setScheduleBlocks([...scheduleBlocks, newBlock]);
      return;
    }

    // If it's an existing block being moved
    // Check if it has alternatives or is an alternative itself
    if (block.alternativeGroupId) {
      // It's an alternative - find all related blocks
      const primaryId = block.alternativeGroupId;
      const primary = scheduleBlocks.find(b => b.id === primaryId);
      const alternatives = scheduleBlocks.filter(b =>
        b.alternativeGroupId === primaryId && b.id !== block.id
      );

      // Create updated blocks array
      let updatedBlocks = scheduleBlocks.map(b => {
        if (b.id === block.id) {
          return { ...b, day: dayAndRow };
        }
        return b;
      });

      setScheduleBlocks(updatedBlocks);
    } else {
      // It's a primary block - move it and all its alternatives
      const alternatives = scheduleBlocks.filter(b => b.alternativeGroupId === block.id);

      const updatedBlocks = scheduleBlocks.map(b => {
        if (b.id === block.id || b.alternativeGroupId === block.id) {
          return { ...b, day: dayAndRow };
        }
        return b;
      });

      setScheduleBlocks(updatedBlocks);
    }
  };

  // Calculate used hours for each task
  const getTaskUsedHours = (taskId) => {
    return scheduleBlocks
      .filter(block => block.taskId === taskId)
      .reduce((sum, block) => sum + block.hours, 0);
  };

  // Calculate remaining hours for a task
  const getTaskRemainingHours = (taskId) => {
    const task = taskBlocks.find(task => task.id === taskId);
    if (!task) return 0;

    const used = getTaskUsedHours(taskId);
    return task.totalHours - used;
  };

  // Calculate hours per process and row
  const getProcessHours = () => {
    // Initialize with 0 hours
    const processHours = {};
    const rowHours = {
      'row1': 0, // Svarbu
      'row2': 0, // Turi būti padaryta
      'row3': 0  // Ne kiekvieną savaitę
    };

    // Initialize process hours
    processes.forEach(process => {
      processHours[process.id] = 0;
    });

    // Sum up scheduled hours by process and row
    scheduleBlocks.forEach(block => {
      // Add to process total
      if (processHours[block.process] !== undefined) {
        processHours[block.process] += block.hours;
      }

      // Add to row total
      if (block.day) {
        if (block.day.endsWith('-1')) rowHours.row1 += block.hours;
        else if (block.day.endsWith('-2')) rowHours.row2 += block.hours;
        else if (block.day.endsWith('-3')) rowHours.row3 += block.hours;
      }
    });

    return { processHours, rowHours };
  };

  // Get process color by ID
  const getProcessColor = (processId) => {
    const process = processes.find(p => p.id === processId);
    return process ? process.color : 'bg-gray-200';
  };

  // Get process name by ID
  const getProcessName = (processId) => {
    const process = processes.find(p => p.id === processId);
    return process ? process.name : 'Unknown';
  };

  // Handle creating a new task block
  const handleCreateTaskBlock = () => {
    if (newTaskBlock.title && newTaskBlock.hours > 0) {
      const taskToAdd = {
        id: Date.now(),
        title: newTaskBlock.title,
        hours: parseFloat(newTaskBlock.hours),
        process: newTaskBlock.process,
        totalHours: parseFloat(newTaskBlock.hours)
      };

      setTaskBlocks([...taskBlocks, taskToAdd]);
      setNewTaskBlock({ title: '', hours: 1, process: 'marketing' });
      setShowForm(false);
    }
  };

  // Handle drag start for a task block
  const handleTaskDragStart = (e, task) => {
    const remainingHours = getTaskRemainingHours(task.id);
    if (remainingHours <= 0) {
      e.preventDefault();
      return; // Prevent dragging if no hours left
    }

    // Create a new schedule block based on the task
    const scheduleBlock = {
      taskId: task.id,
      title: task.title,
      hours: Math.min(remainingHours, task.hours), // Use either remaining hours or default task hours, whichever is smaller
      process: task.process
    };

    e.dataTransfer.setData('text/plain', JSON.stringify(scheduleBlock));
    setDraggedBlock(scheduleBlock);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drag start for a schedule block (moving it)
  const handleScheduleDragStart = (e, block) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(block));
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over a block in the third row to create alternative
  const handleDragOverBlock = (e, existingBlock) => {
    // Only allow alternatives in row 3
    if (!existingBlock.day.endsWith('-3')) return;

    // Only allow alternatives on primary blocks (not on alternatives)
    if (existingBlock.alternativeGroupId) return;

    e.preventDefault();
    e.stopPropagation();

    // Add visual feedback
    e.currentTarget.classList.add('drag-over-block');

    setCreatingAlternative(true);
    setAlternativeTarget(existingBlock);
  };

  // Handle drop
  const handleDrop = (e, day, existingBlock = null) => {
    e.preventDefault();
    e.stopPropagation();

    // For debugging - helps trace what's happening
    console.log("Drop event:", day, existingBlock ? existingBlock.id : 'no block');
    console.log("Alternative creation mode:", creatingAlternative ? "YES" : "NO");
    console.log("Dragged block from:", draggedBlock?.day || "task list");
    
    // Reset visual feedback
    document.querySelectorAll('.drag-over, .drag-over-block').forEach(el => {
      el.classList.remove('drag-over');
      el.classList.remove('drag-over-block');
    });

    // Improved data extraction
    // Get the block data from state first (more reliable)
    let blockToUse = draggedBlock;
  
    // Try to get data from dataTransfer as fallback
    if (!blockToUse) {
      try {
        const jsonData = e.dataTransfer.getData('text/plain');
        if (jsonData && jsonData.trim() !== '') {
          blockToUse = JSON.parse(jsonData);
        }
      } catch (err) {
        console.error("Error parsing drag data:", err);
      }
    }
 
    // If we still don't have block data, exit
    if (!blockToUse) {
      console.error("No block data found for drop");
      setDraggedBlock(null);
      setCreatingAlternative(false);
      setAlternativeTarget(null);
      return;
    }
    
    // Determine key information about the drag operation
    const isFromRow3 = blockToUse.day && blockToUse.day.endsWith('-3');
    const isToRow3 = day.endsWith('-3');
    
    // CRITICAL: Determine if we should create an alternative or move the block
    
    // Case 1: Dropping directly onto another block in row 3 (existingBlock is set)
    // This should ALWAYS create an alternative regardless of source
    const isDirectBlockDrop = existingBlock !== null;
    
    // Case 2: Dropping onto a cell without targeting a specific block
    // This should ALWAYS move the block regardless of source
    const isCellDrop = existingBlock === null;
    
    // Log the decision path
    console.log(`Decision path: directBlockDrop=${isDirectBlockDrop}, cellDrop=${isCellDrop}`);
    
    // If it's a direct block drop, force alternative creation mode
    if (isDirectBlockDrop) {
      setCreatingAlternative(true);
      setAlternativeTarget(existingBlock);
      console.log("Direct drop on block - creating alternative");
    } else {
      // Otherwise, explicitly disable alternative creation
      setCreatingAlternative(false);
      setAlternativeTarget(null);
      console.log("Cell drop - moving block");
    }


    // Case 1: Dropping onto an existing block to create an alternative
    if (creatingAlternative && alternativeTarget) {
      // Changed: Allow using existing blocks to create alternatives
      // This fixes the issue where we can't create alternatives from existing blocks
      
      // Determine hours to use - use the smaller of the two:
      // 1. The target's hours (maximum allowed)
      // 2. The dragged block's hours (if less than target)
      let hoursToUse = Math.min(alternativeTarget.hours, blockToUse.hours);

      // Check if we're using an existing block to create an alternative
      if (blockToUse.id) {
        // It's an existing block - create a copy as an alternative
        // but only if it's not already the same block or an alternative of it
        if (blockToUse.id === alternativeTarget.id) {
          console.log("Can't make a block an alternative of itself");
          setCreatingAlternative(false);
          setAlternativeTarget(null);
          setDraggedBlock(null);
          return;
        }
        
        if (blockToUse.alternativeGroupId === alternativeTarget.id) {
          console.log("Block is already an alternative of the target");
          setCreatingAlternative(false);
          setAlternativeTarget(null);
          setDraggedBlock(null);
          return;
        }
        
        // Create a new alternative block from the existing block
        const newAlternative = {
          id: Date.now(),
          taskId: blockToUse.taskId || null,
          title: blockToUse.title,
          hours: hoursToUse, // Use the determined hours
          process: blockToUse.process,
          day: alternativeTarget.day,
          alternativeGroupId: alternativeTarget.id
        };

        // Remove the original block and add the new alternative
        setScheduleBlocks([
          ...scheduleBlocks.filter(block => block.id !== blockToUse.id),
          newAlternative
        ]);
      } else {
        // It's a new block from the task list - create as normal
        const newAlternative = {
          id: Date.now(),
          taskId: blockToUse.taskId || null,
          title: blockToUse.title,
          hours: hoursToUse, // Use the determined hours
          process: blockToUse.process,
          day: alternativeTarget.day,
          alternativeGroupId: alternativeTarget.id
        };

        setScheduleBlocks([...scheduleBlocks, newAlternative]);
      }

      // Reset alternative creation state
      setCreatingAlternative(false);
      setAlternativeTarget(null);
      setDraggedBlock(null);
      return;
    }

    // Case 2: Regular drop on a day cell
    if (blockToUse) {
      // If the block already exists in our schedule (we're moving it)
      if (blockToUse.id) {
        // Check if the source block is from row 3 and is being moved to another row
        const isFromRow3 = blockToUse.day && blockToUse.day.endsWith('-3');
        const isMovingToRow3 = day.endsWith('-3');
        
        // If moving from row 3 to a different row
        if (isFromRow3 && !isMovingToRow3) {
          // If it's a primary block with alternatives
          if (!blockToUse.alternativeGroupId) {
            const alternatives = scheduleBlocks.filter(b => b.alternativeGroupId === blockToUse.id);
            
            // If it has alternatives, don't allow moving (must delete alternatives first)
            if (alternatives.length > 0) {
              alert('Please delete alternative blocks first before moving this task to another row.');
              setDraggedBlock(null);
              return;
            }
          }
          
          // If it's an alternative, remove it from the alternative group
          if (blockToUse.alternativeGroupId) {
            // Create a copy without the alternativeGroupId
            const updatedBlock = { ...blockToUse, day, alternativeGroupId: undefined };
            delete updatedBlock.alternativeGroupId; // Ensure it's fully removed
            
            // Update all blocks, removing this one and adding modified version
            setScheduleBlocks(
              scheduleBlocks
                .filter(block => block.id !== blockToUse.id)
                .concat(updatedBlock)
            );
            setDraggedBlock(null);
            return;
          }
        }
        
        // Check if destination is row 3 (alternating tasks)
        if (isMovingToRow3) {
          handleDropForAlternating(blockToUse, day);
        } else {
          // For rows 1-2, just move the block
          setScheduleBlocks(
            scheduleBlocks.map(block =>
              block.id === blockToUse.id ? { ...block, day } : block
            )
          );
        }
      } else {
        // It's a new block from the task list
        
        // For row 3, check if there are existing blocks to make it an alternative
        if (day.endsWith('-3')) {
          // Get existing blocks in this day cell
          const existingBlocks = scheduleBlocks.filter(block => 
            block.day === day && !block.alternativeGroupId);
          
          // If there are primary blocks, add this as an alternative to the first one
          if (existingBlocks.length > 0) {
            // Use the first primary block as target
            const targetBlock = existingBlocks[0];
            
            // Use the smaller of the two hour values
            const hoursToUse = Math.min(targetBlock.hours, blockToUse.hours);
            
            const newAlternative = {
              id: Date.now(),
              taskId: blockToUse.taskId,
              title: blockToUse.title,
              hours: hoursToUse, // Use the smaller of the two
              process: blockToUse.process,
              day: day,
              alternativeGroupId: targetBlock.id
            };
            
            setScheduleBlocks([...scheduleBlocks, newAlternative]);
            return;
          }
        }
        
        // Otherwise add as normal block
        const newBlock = {
          id: Date.now(),
          taskId: blockToUse.taskId,
          title: blockToUse.title,
          hours: blockToUse.hours,
          process: blockToUse.process,
          day
        };

        setScheduleBlocks([...scheduleBlocks, newBlock]);
      }
    }

    setDraggedBlock(null);
  };

  // Make schedule blocks in the third row droppable to create alternatives
  // and ensure all scheduled blocks have click handlers for editing
  // Handle drag events on primary blocks in row 3
  useEffect(() => {
    // Clean up function to remove event listeners and visual feedback
    const cleanupListeners = () => {
      document.querySelectorAll('.drag-over, .drag-over-block').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('drag-over-block');
      });
      setCreatingAlternative(false);
      setAlternativeTarget(null);
    };
    
    // Add direct listeners to primary blocks - more reliable than delegation
    const addPrimaryBlockListeners = () => {
      // First remove any existing listeners by replacing elements
      document.querySelectorAll('.primary-block').forEach(blockEl => {
        // Skip if this block already has our custom listeners
        if (blockEl.hasAttribute('data-has-listeners')) return;
        
        // Get the block ID and actual block data
        const blockId = parseInt(blockEl.dataset.blockId, 10);
        if (!blockId) return;
        
        const block = scheduleBlocks.find(b => b.id === blockId);
        if (!block || !block.day || !block.day.endsWith('-3')) return;
        
        // Mark this element as having listeners
        blockEl.setAttribute('data-has-listeners', 'true');
        
        // Add dragover handler - highlights the block for alternative creation
        blockEl.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();
          this.classList.add('drag-over-block');
          setCreatingAlternative(true);
          setAlternativeTarget(block);
        });
        
        // Add dragleave handler - removes highlight
        blockEl.addEventListener('dragleave', function(e) {
          e.preventDefault();
          e.stopPropagation();
          this.classList.remove('drag-over-block');
          
          // Only reset if we're leaving this block
          if (!e.relatedTarget || !this.contains(e.relatedTarget)) {
            setCreatingAlternative(false);
            setAlternativeTarget(null);
          }
        });
        
        // Add drop handler - creates alternative
        blockEl.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // This is a direct drop on a primary block - definitely create an alternative
          console.log("Direct drop on primary block - creating alternative");
          handleDrop(e, block.day, block);
        });
      });
    };
    
    // Call initially and set a timeout to handle any newly added blocks
    addPrimaryBlockListeners();
    const timer = setInterval(addPrimaryBlockListeners, 500);
    
    // Handle drops on row cells (not on blocks) - should just move blocks
    const handleRowCellEvents = (e) => {
      // Only process if we're not already handling a primary block drop
      // This prevents double-processing
      if (e.target.closest('.primary-block')) return;
      
      // Handle dragover on a row cell
      if (e.type === 'dragover') {
        e.preventDefault();
        e.stopPropagation();
        // We're over a cell but not a block, so reset alternative creation
        setCreatingAlternative(false);
        setAlternativeTarget(null);
      }
    };
    
    // Add event listeners for row cells
    const rowCells = document.querySelectorAll('td.ne-kiekviena-savaite-cell');
    rowCells.forEach(cell => {
      cell.addEventListener('dragover', handleRowCellEvents);
    });
    
    // Listen for dragend to ensure cleanup
    document.addEventListener('dragend', cleanupListeners);
    
    // Cleanup
    return () => {
      clearInterval(timer);
      cleanupListeners();
      
      rowCells.forEach(cell => {
        cell.removeEventListener('dragover', handleRowCellEvents);
      });
      
      document.removeEventListener('dragend', cleanupListeners);
    };
  }, [scheduleBlocks, draggedBlock]);

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();

    if (!e.currentTarget.classList.contains('drag-over')) {
      e.currentTarget.classList.add('drag-over');
    }
  };

  // Handle drag end - ensure all states are cleaned up
  const handleDragEnd = () => {
    // Clear all drag-related states
    setDraggedBlock(null);
    setCreatingAlternative(false);
    setAlternativeTarget(null);

    // Remove visual feedback
    document.querySelectorAll('.drag-over, .drag-over-block').forEach(el => {
      el.classList.remove('drag-over');
      el.classList.remove('drag-over-block');
    });
    
    // Ensure we're not in alternative creation mode
    console.log("Drag ended, reset all drag states");
  };

  // Start editing a schedule block
  const handleStartEdit = (block) => {
    // Make a clean copy to prevent reference issues
    setEditingBlock(JSON.parse(JSON.stringify(block)));
    
    // Cancel any ongoing drag operation
    setDraggedBlock(null);
    setCreatingAlternative(false);
    setAlternativeTarget(null);
    
    // Clean up any visual feedback
    document.querySelectorAll('.drag-over, .drag-over-block').forEach(el => {
      el.classList.remove('drag-over');
      el.classList.remove('drag-over-block');
    });
  };

  // Save edited schedule block
  const handleSaveBlockEdit = () => {
    if (!editingBlock) return;

    // Check if this is a task-based block or a direct schedule block
    if (editingBlock.taskId) {
      const task = taskBlocks.find(t => t.id === editingBlock.taskId);
      if (!task) return;

      // Calculate current used hours excluding this block
      const otherBlocksHours = scheduleBlocks
        .filter(block => block.taskId === editingBlock.taskId && block.id !== editingBlock.id)
        .reduce((sum, block) => sum + block.hours, 0);

      // Calculate available hours
      const availableHours = task.totalHours - otherBlocksHours;

      // Validate new hours
      const newHours = parseFloat(editingBlock.hours) || 0;
      if (newHours <= 0) {
        alert('Hours must be greater than 0');
        return;
      }

      if (newHours > availableHours) {
        alert(`Not enough hours available for this task. Maximum: ${availableHours.toFixed(1)} hours.`);
        return;
      }
    } else {
      // For direct schedule blocks, just validate hours > 0
      const newHours = parseFloat(editingBlock.hours) || 0;
      if (newHours <= 0) {
        alert('Hours must be greater than 0');
        return;
      }
    }

    // Check if this is part of an alternative group
    if (editingBlock.alternativeGroupId) {
      // This is an alternative - check if we need to update hours of all blocks in the group
      const primaryBlock = scheduleBlocks.find(b => b.id === editingBlock.alternativeGroupId);
      const alternatives = scheduleBlocks.filter(b => b.alternativeGroupId === editingBlock.alternativeGroupId);
      
      // If it's in row 3, alternatives can have same or fewer hours than primary
      if (editingBlock.day?.endsWith('-3')) {
        // If updating an alternative, set hours based on rules
        if (primaryBlock) {
          // Update primary block hours
          if (primaryBlock.id === editingBlock.id) {
            // We're updating the primary block
            const newHours = parseFloat(editingBlock.hours);
            
            // Get all alternatives for this primary
            const alternatives = scheduleBlocks.filter(block => 
              block.alternativeGroupId === editingBlock.id);
            
            if (alternatives.length > 0) {
              // Check if any alternative has more hours than the new primary hours
              const alternativesWithMoreHours = alternatives.filter(alt => 
                alt.hours > newHours);
              
              if (alternativesWithMoreHours.length > 0) {
                // Ask user if they want to update all alternatives
                if (confirm(`Some alternatives have more hours than your new value (${newHours}). Update all alternatives to match?`)) {
                  // Update all alternatives to the new primary hours
                  const updatedBlocks = scheduleBlocks.map(block => {
                    if (block.alternativeGroupId === editingBlock.id) {
                      return { ...block, hours: newHours };
                    } else if (block.id === editingBlock.id) {
                      return { ...block, hours: newHours, title: editingBlock.title };
                    }
                    return block;
                  });
                  
                  setScheduleBlocks(updatedBlocks);
                  setEditingBlock(null);
                  return;
                } else {
                  // Keep primary's new hours but don't change alternatives
                  const updatedBlocks = scheduleBlocks.map(block => {
                    if (block.id === editingBlock.id) {
                      return { ...block, hours: newHours, title: editingBlock.title };
                    }
                    return block;
                  });
                  
                  setScheduleBlocks(updatedBlocks);
                  setEditingBlock(null);
                  return;
                }
              } else {
                // No alternatives have more hours, just update primary
                const updatedBlocks = scheduleBlocks.map(block => {
                  if (block.id === editingBlock.id) {
                    return { ...block, hours: newHours, title: editingBlock.title };
                  }
                  return block;
                });
                
                setScheduleBlocks(updatedBlocks);
                setEditingBlock(null);
                return;
              }
            } else {
              // No alternatives, just update the primary
              const updatedBlocks = scheduleBlocks.map(block => {
                if (block.id === editingBlock.id) {
                  return { ...block, hours: newHours, title: editingBlock.title };
                }
                return block;
              });
              
              setScheduleBlocks(updatedBlocks);
              setEditingBlock(null);
              return;
            }
          } else {
            // We're updating an alternative
            const newHours = parseFloat(editingBlock.hours);
            
            // Check if hours are valid (can't be more than primary)
            if (newHours > primaryBlock.hours) {
              alert(`Alternative hours cannot exceed primary task hours (${primaryBlock.hours} hours)`);
              return;
            }
            
            // Update just this alternative
            const updatedBlocks = scheduleBlocks.map(block => {
              if (block.id === editingBlock.id) {
                return { ...block, hours: newHours, title: editingBlock.title };
              }
              return block;
            });
            
            setScheduleBlocks(updatedBlocks);
            setEditingBlock(null);
            return;
          }
        }
      }
    }

    // Update the block normally
    const updatedScheduleBlocks = scheduleBlocks.map(block =>
      block.id === editingBlock.id
        ? { ...block, hours: parseFloat(editingBlock.hours), title: editingBlock.title }
        : block
    );

    setScheduleBlocks(updatedScheduleBlocks);
    setEditingBlock(null);
    
    // Force update the process hours summary
    setTimeout(() => {
      // This triggers a re-calculation of process hours
      const { processHours, rowHours } = getProcessHours();
    }, 0);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingBlock(null);
  };

  // Delete a task block - will also delete all associated schedule blocks
  const handleDeleteTaskBlock = (id) => {
    if (scheduleBlocks.some(block => block.taskId === id)) {
      if (!window.confirm('This will also delete all scheduled instances of this task. Continue?')) {
        return;
      }
    }

    setTaskBlocks(taskBlocks.filter(task => task.id !== id));
    setScheduleBlocks(scheduleBlocks.filter(block => block.taskId !== id));
  };

  // Edit task total hours
  const handleEditTaskHours = (taskId, newHours) => {
    const usedHours = getTaskUsedHours(taskId);
    newHours = parseFloat(newHours) || 0;

    if (newHours < usedHours) {
      alert(`Cannot reduce hours below ${usedHours} as that's already scheduled.`);
      return;
    }

    setTaskBlocks(taskBlocks.map(task =>
      task.id === taskId ? { ...task, totalHours: newHours, hours: newHours } : task
    ));
  };

  // Clear all schedule blocks
  const handleClearSchedule = () => {
    if (window.confirm('Are you sure you want to clear all blocks from your schedule? This cannot be undone.')) {
      setScheduleBlocks([]);
    }
  };

  // Reset all data
  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset everything? This will clear your tasks and schedule.')) {
      localStorage.removeItem('taskBlocks');
      localStorage.removeItem('scheduleBlocks');

      // Reset to defaults
      setTaskBlocks([
        { id: 1, title: 'Content Creation', hours: 4, process: 'marketing', totalHours: 4 },
        { id: 2, title: 'Market Research', hours: 6, process: 'marketing', totalHours: 6 },
        { id: 3, title: 'Feature Development', hours: 12, process: 'development', totalHours: 12 },
        { id: 4, title: 'Bug Fixes', hours: 5, process: 'development', totalHours: 5 },
        { id: 5, title: 'Client Meetings', hours: 3, process: 'clientWork', totalHours: 3 }
      ]);

      setScheduleBlocks([]);
    }
  };

  // Process hour summary
  const { processHours, rowHours } = getProcessHours();

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Schedule Block Builder</h2>
        <div className="space-x-2">
          <button
            onClick={handleClearSchedule}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Clear Schedule
          </button>
          <button
            onClick={handleResetAll}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="mt-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-gray-700">
        <p className="font-semibold mb-2">Instructions:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create task blocks with the "Create Task" button</li>
          <li>Drag task blocks to any day in your schedule</li>
          <li>Remaining hours are shown on each task</li>
          <li>For row 3 "Ne kiekvieną savaitę", you can create alternative tasks by dragging a task onto an existing task</li>
          <li>Alternative tasks must have the same number of hours as the primary task</li>
          <li>Click on a schedule block to edit its details</li>
          <li>Your changes are automatically saved</li>
        </ul>
      </div>

      {/* Process hours summary */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Process Hours Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {processes.map(process => {
            const used = processHours[process.id] || 0;
            const total = taskBlocks
              .filter(task => task.process === process.id)
              .reduce((sum, task) => sum + task.totalHours, 0);
            const percentUsed = total > 0 ? (used / total) * 100 : 0;

            return (
              <div key={process.id} className={`${process.color} p-3 rounded shadow`}>
                <div className="font-medium">{process.name}</div>
                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold">
                    {used.toFixed(1)} hrs
                  </div>
                  <div className="text-sm">
                    of {total.toFixed(1)}
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${percentUsed}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-red-50 p-3 rounded shadow">
            <div className="font-medium">Svarbu</div>
            <div className="text-lg font-bold">{rowHours.row1.toFixed(1)} hrs</div>
          </div>
          <div className="bg-blue-50 p-3 rounded shadow">
            <div className="font-medium">Turi būti padaryta</div>
            <div className="text-lg font-bold">{rowHours.row2.toFixed(1)} hrs</div>
          </div>
          <div className="bg-green-50 p-3 rounded shadow">
            <div className="font-medium">Ne kiekvieną savaitę</div>
            <div className="text-lg font-bold">{rowHours.row3.toFixed(1)} hrs</div>
          </div>
        </div>
      </div>

      {/* Task blocks section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Task Blocks</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showForm ? 'Cancel' : 'Create Task'}
          </button>
        </div>

        {/* New task form */}
        {showForm && (
          <div className="mb-4 p-4 border rounded">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Process</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={newTaskBlock.process}
                  onChange={(e) => setNewTaskBlock({ ...newTaskBlock, process: e.target.value })}
                >
                  {processes.map(process => (
                    <option key={process.id} value={process.id}>
                      {process.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreateTaskBlock}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!newTaskBlock.title || newTaskBlock.hours <= 0}
            >
              Create Task
            </button>
          </div>
        )}

        {/* Task blocks - draggable */}
        <div className="flex flex-wrap gap-3 mb-6">
          {taskBlocks.map(task => {
            const remainingHours = getTaskRemainingHours(task.id);

            // Don't display tasks with 0 hours remaining
            if (remainingHours <= 0) return null;

            return (
              <div
                key={task.id}
                draggable="true"
                onDragStart={(e) => handleTaskDragStart(e, task)}
                onDragEnd={handleDragEnd}
                className={`${getProcessColor(task.process)} p-3 rounded shadow relative 
                          cursor-move border border-gray-300 hover:border-blue-500`}
                style={{ minWidth: '200px' }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium">{task.title}</div>
                  <button
                    onClick={() => handleDeleteTaskBlock(task.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">{getProcessName(task.process)}</div>
                  <div className="text-green-600">
                    {remainingHours.toFixed(1)} hrs left
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1">Drag to schedule</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule grid */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Weekly Schedule</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-50 w-20"></th>
                {days.map(day => (
                  <th key={day} className="border p-2 bg-gray-100">
                    {day}
                    {(() => {
                      // Calculate regular hours (rows 1-2)
                      const regularHours = scheduleBlocks
                        .filter(block => (block.day === `${day}-1` || block.day === `${day}-2`))
                        .reduce((sum, block) => sum + block.hours, 0);

                      // For row 3, only count one block per alternative group
                      const row3Blocks = scheduleBlocks.filter(block => block.day === `${day}-3`);

                      // Get unique group IDs
                      const processedGroups = new Set();
                      let alternatingHours = 0;

                      row3Blocks.forEach(block => {
                        const groupId = block.alternativeGroupId || block.id;

                        // Only count the first block in each group
                        if (!processedGroups.has(groupId)) {
                          alternatingHours += block.hours;
                          processedGroups.add(groupId);
                        }
                      });

                      // Total is regular hours plus alternating hours
                      const dayTotal = regularHours + alternatingHours;

                      if (dayTotal > 0) {
                        return (
                          <span className="ml-2 text-sm font-normal">
                            ({dayTotal.toFixed(1)} hrs)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Svarbu (Important) - limited to 4 hours */}
              <tr>
                <td className="border p-2 bg-red-50 font-medium">Svarbu</td>
                {days.map(day => {
                  const dayAndRow = `${day}-1`;
                  const rowBlocks = scheduleBlocks.filter(block => block.day === dayAndRow);
                  const totalHours = rowBlocks.reduce((sum, block) => sum + block.hours, 0);

                  return (
                    <td
                      key={dayAndRow}
                      className="border p-2 align-top h-32 bg-red-50"
                      onDragOver={(e) => totalHours < 4 && handleDragOver(e)}
                      onDrop={(e) => handleDrop(e, dayAndRow)}
                      onDragEnter={(e) => totalHours < 4 && e.currentTarget.classList.add('bg-red-100')}
                      onDragLeave={(e) => e.currentTarget.classList.remove('bg-red-100')}
                    >
                      <div className="min-h-full">
                        {totalHours >= 4 && (
                          <div className="text-xs text-red-500 mb-1">Limit: 4 hrs (used: {totalHours.toFixed(1)})</div>
                        )}
                        {rowBlocks
                          .sort((a, b) => b.hours - a.hours)
                          .map(block => (
                            <div
                              key={block.id}
                              data-block-id={block.id}
                              draggable="true"
                              onDragStart={(e) => handleScheduleDragStart(e, block)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleStartEdit(block)}
                              className={`${getProcessColor(block.process)} p-2 mb-2 rounded shadow cursor-pointer relative group scheduled-block`}
                              style={{ minHeight: '40px', height: `${Math.max(40, block.hours * 30)}px` }}
                            >
                              <div className="font-medium text-sm">{block.title}</div>
                              <div className="text-xs">{block.hours} {block.hours === 1 ? 'hour' : 'hours'}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteScheduleBlock(block.id);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Turi būti padaryta (Must be done) */}
              <tr>
                <td className="border p-2 bg-blue-50 font-medium">Turi būti padaryta</td>
                {days.map(day => {
                  const dayAndRow = `${day}-2`;
                  return (
                    <td
                      key={dayAndRow}
                      className="border p-2 align-top h-32 bg-blue-50"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dayAndRow)}
                      onDragEnter={(e) => e.currentTarget.classList.add('bg-blue-100')}
                      onDragLeave={(e) => e.currentTarget.classList.remove('bg-blue-100')}
                    >
                      <div className="min-h-full">
                        {scheduleBlocks
                          .filter(block => block.day === dayAndRow)
                          .sort((a, b) => b.hours - a.hours)
                          .map(block => (
                            <div
                              key={block.id}
                              data-block-id={block.id}
                              draggable="true"
                              onDragStart={(e) => handleScheduleDragStart(e, block)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleStartEdit(block)}
                              className={`${getProcessColor(block.process)} p-2 mb-2 rounded shadow cursor-pointer relative group scheduled-block`}
                              style={{ minHeight: '40px', height: `${Math.max(40, block.hours * 30)}px` }}
                            >
                              <div className="font-medium text-sm">{block.title}</div>
                              <div className="text-xs">{block.hours} {block.hours === 1 ? 'hour' : 'hours'}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteScheduleBlock(block.id);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Ne kiekvieną savaitę (Not every week) - with multiple alternatives */}
              <tr>
                <td className="border p-2 bg-green-50 font-medium">Ne kiekvieną savaitę</td>
                {days.map(day => {
                  const dayAndRow = `${day}-3`;
                  const rowBlocks = scheduleBlocks.filter(block => block.day === dayAndRow);

                  // Group blocks by their alternativeGroupId
                  const groups = {};

                  // First, add all primary blocks (those without alternativeGroupId)
                  rowBlocks
                    .filter(block => !block.alternativeGroupId)
                    .forEach(block => {
                      groups[block.id] = [block];
                    });

                  // Then add alternative blocks to their groups
                  rowBlocks
                    .filter(block => block.alternativeGroupId)
                    .forEach(block => {
                      if (groups[block.alternativeGroupId]) {
                        groups[block.alternativeGroupId].push(block);
                      } else {
                        // If primary doesn't exist, create a group for this alternative
                        groups[block.alternativeGroupId] = [block];
                      }
                    });

                  return (
                    <td
                      key={dayAndRow}
                      className="border p-2 align-top h-32 bg-green-50 ne-kiekviena-savaite-cell"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dayAndRow)}
                      onDragEnter={(e) => e.currentTarget.classList.add('bg-green-100')}
                      onDragLeave={(e) => e.currentTarget.classList.remove('bg-green-100')}
                    >
                      <div className="min-h-full">
                        {Object.keys(groups).map(groupId => (
                          <div key={groupId} className="mb-3 pb-3 border-b border-green-200">
                            {/* Primary task */}
                            <div className="mb-1">
                              {groups[groupId][0] && (
                                <div
                                  data-block-id={groups[groupId][0].id}
                                  draggable="true"
                                  onDragStart={(e) => handleScheduleDragStart(e, groups[groupId][0])}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => handleStartEdit(groups[groupId][0])}
                                  className={`${getProcessColor(groups[groupId][0].process)} p-2 rounded shadow cursor-pointer relative group scheduled-block primary-block ne-kiekviena-savaite`}
                                  style={{ minHeight: '40px', position: 'relative', zIndex: '1' }}
                                >
                                  <div className="font-medium text-sm">{groups[groupId][0].title}</div>
                                  <div className="text-xs">{groups[groupId][0].hours} hrs</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Drag another task here to create alternative
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteScheduleBlock(groups[groupId][0].id);
                                    }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Alternative tasks */}
                            {groups[groupId].length > 1 && (
                              <div className="pl-4 border-l-2 border-green-200" style={{ marginTop: '-10px' }}>
                                {groups[groupId].slice(1).map((block, index) => (
                                  <div
                                    key={block.id}
                                    data-block-id={block.id}
                                    draggable="true"
                                    onDragStart={(e) => handleScheduleDragStart(e, block)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleStartEdit(block)}
                                    className={`${getProcessColor(block.process)} p-2 rounded shadow cursor-pointer relative group scheduled-block alternative-block mt-1`}
                                    style={{ 
                                      minHeight: '40px', 
                                      position: 'relative',
                                      zIndex: (groups[groupId].length - index),
                                      marginTop: index === 0 ? '5px' : '-8px' 
                                    }}
                                  >
                                    <div className="font-medium text-sm">{block.title}</div>
                                    <div className="text-xs">{block.hours} hrs</div>
                                    <div className="text-xs text-gray-600">Alternative</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteScheduleBlock(block.id);
                                      }}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {Object.keys(groups).length === 0 && (
                          <div className="text-center text-gray-500 p-2">
                            Drag task blocks here for alternating weeks
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit schedule block modal */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Schedule Block</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={editingBlock.title}
                  onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hours</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  className="w-full px-3 py-2 border rounded"
                  value={editingBlock.hours}
                  onChange={(e) => setEditingBlock({ ...editingBlock, hours: parseFloat(e.target.value) || 0 })}
                />
                {editingBlock.taskId && (
                  <p className="text-xs text-gray-600 mt-1">
                    Task: {taskBlocks.find(t => t.id === editingBlock.taskId)?.title}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBlockEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleBuilder;