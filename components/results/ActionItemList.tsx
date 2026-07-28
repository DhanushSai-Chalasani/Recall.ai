"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Calendar, Mail } from "lucide-react"
import { toast } from "sonner"
import { getPriorityColor } from "@/lib/utils"
import type { ActionItem } from "@/lib/types"

interface ActionItemListProps {
  items: ActionItem[]
  onChange?: (items: ActionItem[]) => void
}

export function ActionItemList({ items, onChange }: ActionItemListProps) {
  const [localItems, setLocalItems] = useState(items)
  const [newText, setNewText] = useState("")
  const [showInput, setShowInput] = useState(false)

  function toggleDone(id: string) {
    const updated = localItems.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    )
    setLocalItems(updated)
    onChange?.(updated)
  }

  function addItem() {
    if (!newText.trim()) return
    const newItem: ActionItem = {
      id: `action-${Date.now()}`,
      text: newText.trim(),
      priority: 'medium',
      done: false,
    }
    const updated = [...localItems, newItem]
    setLocalItems(updated)
    onChange?.(updated)
    setNewText("")
    setShowInput(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addItem()
    if (e.key === "Escape") { setShowInput(false); setNewText("") }
  }

  function generateCalendarInvite(item: ActionItem) {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${item.text}
DESCRIPTION:Action item from Recall.ai Meeting Note Taker.\\n\\nAssignee: ${item.assignee || 'Unassigned'}
DTSTART:${new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}
DTEND:${new Date(Date.now() + 90000000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ActionItem_${item.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar invite downloaded");
  }

  function draftEmail(item: ActionItem) {
    const subject = encodeURIComponent(`Action Item: ${item.text}`);
    const body = encodeURIComponent(`Hi ${item.assignee || 'team'},\n\nFollowing up on our recent meeting action item:\n\n- ${item.text}\n\nPriority: ${item.priority}\n\nLet me know if you need any clarification!\n\nBest,`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success("Draft email opened");
  }

  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Action Items</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono font-medium">
          {localItems.filter(i => i.done).length} / {localItems.length} COMPLETED
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {localItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-start gap-3 p-3 rounded-lg border border-border bg-background group transition-colors ${item.done ? "opacity-50" : "hover:border-primary/30"}`}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleDone(item.id)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/40 bg-card cursor-pointer"
              />

              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed font-medium ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {item.text}
                </p>
                <div className="flex items-center gap-2 mt-1.5 font-medium text-[10px] uppercase tracking-wider">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      color: getPriorityColor(item.priority),
                      backgroundColor: getPriorityColor(item.priority) + '15',
                      border: `1px solid ${getPriorityColor(item.priority)}25`
                    }}
                  >
                    {item.priority}
                  </span>
                  {item.assignee && (
                    <span className="text-muted-foreground">Assignee: <span className="text-foreground">{item.assignee}</span></span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <button 
                  onClick={() => generateCalendarInvite(item)} 
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                  title="Calendar Invite"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => draftEmail(item)} 
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                  title="Draft Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showInput ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/40 bg-background">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Action task... Press Enter to save"
              autoFocus
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            <button 
              onClick={() => { setShowInput(false); setNewText("") }} 
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center justify-center gap-1.5 w-full p-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer font-medium uppercase tracking-wider mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Action Item
          </button>
        )}
      </div>
    </div>
  )
}
