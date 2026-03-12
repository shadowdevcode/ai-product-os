"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, AlertCircle, Compass, Users, Wrench, CheckCircle2 } from "lucide-react";
import { usePostHog } from 'posthog-js/react';

// Types
type Category = 'unblock' | 'strategy' | 'stakeholders' | 'ops';
type Priority = 'high' | 'medium' | 'low';
type Task = {
    id: string;
    raw_input: string;
    title: string;
    category: Category;
    priority: Priority;
    status: 'todo' | 'done';
    created_at: string;
};

// Domain Configs
const DOMAIN_CONFIG = {
    unblock: { title: "Unblock", icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-500/20" },
    strategy: { title: "Strategy", icon: Compass, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-500/20" },
    stakeholders: { title: "Stakeholders", icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-500/20" },
    ops: { title: "Ops & Chores", icon: Wrench, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/20" },
};

export default function TaskBoard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const posthog = usePostHog();

    // Fetch initial tasks
    useEffect(() => {
        fetch('/api/tasks')
            .then(res => res.json())
            .then(data => {
                if (data.tasks) setTasks(data.tasks);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load tasks", err);
                setIsLoading(false);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSubmitting) return;

        const rawInput = input;
        setInput("");
        setIsSubmitting(true);
        const startTime = Date.now();

        try {
            setErrorMsg(null);
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskText: rawInput }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to process task");
            }

            if (data.task) {
                setTasks(prev => [data.task, ...prev]);
                posthog?.capture('task_submitted', {
                    input_length: rawInput.length,
                    time_to_submit: Date.now() - startTime
                });
            }
        } catch (err: any) {
            console.error(err);
            setInput(rawInput); // Restore input on failure
            setErrorMsg(err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const markDone = async (task: Task) => {
        // Optimistic UI
        setTasks(prev => prev.filter(t => t.id !== task.id));

        posthog?.capture('task_completed', {
            task_id: task.id,
            category: task.category,
            time_since_creation: Date.now() - new Date(task.created_at).getTime()
        });

        try {
            const res = await fetch(`/api/tasks?id=${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'done' })
            });
            if (!res.ok) {
                throw new Error("Failed to mark done in DB");
            }
        } catch (err) {
            console.error("Failed to update status in DB", err);
            // In a full app, we would revert the optimistic UI update here
        }
    };

    const getTasksByCategory = (cat: Category) => tasks.filter(t => t.category === cat && t.status !== 'done');

    return (
        <div className="flex flex-col gap-8">
            {/* Brain Dump Input */}
            <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500 group-focus-within:opacity-50"></div>
                <div className="relative flex items-center bg-neutral-900 border border-neutral-700/50 rounded-2xl shadow-xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="What's heavily occupying your mind? (e.g. Need to review roadmap with Sarah)"
                        className="w-full bg-transparent px-6 py-5 text-lg text-white placeholder:text-neutral-500 focus:outline-none disabled:opacity-50"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isSubmitting}
                        className="px-6 py-5 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors flex items-center gap-2 font-medium"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-red-500/20"
                    >
                        <AlertCircle className="w-4 h-4" />
                        {errorMsg}
                    </motion.div>
                )}
            </motion.form>

            {/* Board Lanes */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-4">
                {isLoading ? (
                    <div className="col-span-full py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
                    </div>
                ) : (
                    Object.entries(DOMAIN_CONFIG).map(([key, config]) => {
                        const laneTasks = getTasksByCategory(key as Category);
                        const Icon = config.icon;

                        return (
                            <div key={key} className="flex flex-col gap-4">
                                {/* Lane Header */}
                                <div className={`flex items-center justify-between pb-3 border-b ${config.border}`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${config.bg}`}>
                                            <Icon className={`w-4 h-4 ${config.color}`} />
                                        </div>
                                        <span className="font-semibold text-neutral-200 tracking-wide">{config.title}</span>
                                    </div>
                                    <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-800/50 px-2.5 py-1 rounded-full">{laneTasks.length}</span>
                                </div>

                                {/* Task List */}
                                <div className="flex flex-col gap-3 min-h-[150px]">
                                    <AnimatePresence>
                                        {laneTasks.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-sm text-neutral-600 italic px-2 py-4 text-center border border-dashed border-neutral-800 rounded-xl"
                                            >
                                                Coast is clear.
                                            </motion.div>
                                        ) : (
                                            laneTasks.map((task, i) => (
                                                <motion.div
                                                    key={task.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="group relative bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-neutral-700 transition-all cursor-default"
                                                >
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => markDone(task)}
                                                            className="mt-0.5 text-neutral-600 hover:text-emerald-400 transition-colors flex-shrink-0"
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </button>
                                                        <div className="flex-1 space-y-2">
                                                            {/* Title */}
                                                            <h3 className="text-sm font-medium text-neutral-200 leading-snug">
                                                                {task.title}
                                                            </h3>
                                                            {/* Priority & Metadata */}
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${task.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                                                    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                                                        'bg-neutral-800 text-neutral-400'
                                                                    }`}>
                                                                    {task.priority}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

        </div>
    );
}
