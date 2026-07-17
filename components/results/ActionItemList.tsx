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
    <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Action Items Checklist</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 font-bold">
          {localItems.filter(i => i.done).length} / {localItems.length} COMPLETED
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {localItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-black/30 group transition-all ${item.done ? "opacity-45 bg-black/10" : "hover:border-white/10 hover:bg-black/40"}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleDone(item.id)}
                className="mt-0.5 w-4 h-4 rounded accent-purple-600 focus:ring-purple-500/40 bg-black/40 cursor-pointer"
              />

              {/* Text + metadata */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-relaxed ${item.done ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                  {item.text}
                </p>
                <div className="flex items-center gap-2 mt-2 font-bold text-[9px] uppercase tracking-wider">
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{
                      color: getPriorityColor(item.priority),
                      backgroundColor: getPriorityColor(item.priority) + '15',
                      border: `1px solid ${getPriorityColor(item.priority)}20`
                    }}
                  >
                    {item.priority}
                  </span>
                  {item.assignee && (
                    <span className="text-zinc-500">Assignee: <span className="text-zinc-400">{item.assignee}</span></span>
                  )}
                </div>
              </div>

              {/* Actions: Email & Calendar */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button 
                  onClick={() => generateCalendarInvite(item)} 
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm" 
                  title="Generate Calendar Invite"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => draftEmail(item)} 
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm" 
                  title="Draft Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add new item */}
        {showInput ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-500/30 bg-black/40 shadow-inner">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your action task, then press Enter..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text3)] outline-none font-semibold"
            />
            <button 
              onClick={() => { setShowInput(false); setNewText("") }} 
              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center justify-center gap-2 w-full p-3.5 rounded-xl border border-dashed border-white/10 text-xs text-zinc-500 hover:text-purple-400 hover:border-purple-500/35 hover:bg-purple-500/5 transition-all cursor-pointer font-bold uppercase tracking-wider mt-2 bg-white/[0.01]"
          >
            <Plus className="w-4 h-4" />
            Add new action item
          </button>
        )}
      </div>
    </div>
  )
}
